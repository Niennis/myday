// Mi día: la parte de escritorio. Bandeja del sistema, atajo global para anotar,
// inicio automático con Windows, una sola instancia abierta y la base de datos SQLite.

use std::sync::Mutex;

use tauri::menu::{CheckMenuItem, Menu, MenuBuilder, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent, Wry};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_sql::{Migration, MigrationKind};

const TRAY_ID: &str = "main";
/// Atajo global para anotar. Ctrl+Espacio lo usan VS Code y otros editores para autocompletar.
const SHORTCUT: &str = "ctrl+alt+space";
const MOODS: [(&str, &str); 4] = [
    ("calma", "Calma"),
    ("energia", "Energía"),
    ("concentracion", "Concentración"),
    ("fucsia", "Fucsia"),
];

/// Lo que muestra el menú de la bandeja: el mood elegido y, si una marca lo cambia, por qué.
#[derive(Default)]
struct TrayInfo {
    mood: String,
    note: Option<String>,
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn build_menu(app: &AppHandle, info: &TrayInfo) -> tauri::Result<Menu<Wry>> {
    let mut menu = MenuBuilder::new(app)
        .item(&MenuItem::with_id(app, "open", "Abrir Hoy", true, None::<&str>)?)
        .item(&MenuItem::with_id(app, "capture", "Anotar algo (Ctrl+Alt+Espacio)", true, None::<&str>)?)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&MenuItem::with_id(app, "mood-label", "Mood", false, None::<&str>)?);
    for (id, name) in MOODS {
        let item = CheckMenuItem::with_id(app, format!("mood:{id}"), name, true, info.mood == id, None::<&str>)?;
        menu = menu.item(&item);
    }
    if let Some(note) = &info.note {
        menu = menu.item(&MenuItem::with_id(app, "note", note, false, None::<&str>)?);
    }
    let autostart = app.autolaunch().is_enabled().unwrap_or(false);
    menu.item(&PredefinedMenuItem::separator(app)?)
        .item(&CheckMenuItem::with_id(app, "autostart", "Abrir al iniciar Windows", true, autostart, None::<&str>)?)
        .item(&MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?)
        .build()
}

fn refresh_menu(app: &AppHandle) {
    let info = app.state::<Mutex<TrayInfo>>();
    let info = info.lock().unwrap();
    if let (Some(tray), Ok(menu)) = (app.tray_by_id(TRAY_ID), build_menu(app, &info)) {
        let _ = tray.set_menu(Some(menu));
    }
}

/// La interfaz avisa qué mood está elegido y si una marca lo está cambiando.
#[tauri::command]
fn tray_state(app: AppHandle, info: State<Mutex<TrayInfo>>, mood: String, note: Option<String>) {
    {
        let mut info = info.lock().unwrap();
        if info.mood == mood && info.note == note {
            return;
        }
        info.mood = mood;
        info.note = note;
    }
    refresh_menu(&app);
}

/// Texto al pasar el mouse por el ícono (por ejemplo, el tiempo del pomodoro).
#[tauri::command]
fn tray_tooltip(app: AppHandle, text: String) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_tooltip(Some(text));
    }
}

fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "tareas, bloques y ajustes",
        kind: MigrationKind::Up,
        // IDs UUID, updated_at y borrado lógico (deleted_at): preparado para sincronizar más adelante.
        sql: "
            CREATE TABLE items (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                date TEXT,
                start_min INTEGER,
                end_min INTEGER,
                done INTEGER NOT NULL DEFAULT 0,
                alert INTEGER NOT NULL DEFAULT 0,
                tone TEXT,
                steps TEXT NOT NULL DEFAULT '[]',
                sort REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT
            );
            CREATE INDEX items_date ON items (date);
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        ",
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Si ya está abierta (por ejemplo, porque arrancó con Windows), se muestra la que hay.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_sql::Builder::default().add_migrations("sqlite:mi-dia.db", migrations()).build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        show_main(app);
                        let _ = app.emit("capture", ());
                    }
                })
                .build(),
        )
        .manage(Mutex::new(TrayInfo { mood: "calma".into(), note: None }))
        .invoke_handler(tauri::generate_handler![tray_state, tray_tooltip])
        .setup(|app| {
            let handle = app.handle();

            // Si otra app ya usa el atajo, Mi día abre igual (se puede anotar con el botón o desde la bandeja).
            if let Err(e) = handle.global_shortcut().register(SHORTCUT) {
                eprintln!("No se pudo registrar el atajo {SHORTCUT}: {e}");
            }

            // La primera vez, se activa el inicio con Windows. Si después se desactiva desde la bandeja, queda así.
            #[cfg(not(debug_assertions))]
            {
                let marker = app.path().app_data_dir()?.join("inicio-automatico-configurado");
                if !marker.exists() {
                    let _ = app.autolaunch().enable();
                    std::fs::create_dir_all(marker.parent().unwrap())?;
                    std::fs::write(&marker, "")?;
                }
            }

            let menu = build_menu(handle, &TrayInfo { mood: "calma".into(), note: None })?;
            TrayIconBuilder::with_id(TRAY_ID)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Mi día")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        show_main(app);
                        let _ = app.emit("open-today", ());
                    }
                    "capture" => {
                        show_main(app);
                        let _ = app.emit("capture", ());
                    }
                    "autostart" => {
                        let al = app.autolaunch();
                        let _ = if al.is_enabled().unwrap_or(false) { al.disable() } else { al.enable() };
                        refresh_menu(app);
                    }
                    "quit" => app.exit(0),
                    id => {
                        if let Some(mood) = id.strip_prefix("mood:") {
                            let _ = app.emit("mood", mood);
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        // Cerrar la ventana la esconde: la app sigue en la bandeja, junto al reloj.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Mi día");
}
