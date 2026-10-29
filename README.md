# Mi día

Organizador personal para Windows, pensado para personas que dejaron de usar otros organizadores por tener demasiadas opciones.

- **Te busca a ti:** se abre sola al iniciar Windows, muestra lo de hoy y después queda en la bandeja del sistema, junto al reloj.
- **Pocas opciones:** se anota con un atajo (`Ctrl+Alt+Espacio`) escribiendo con palabras, por ejemplo *"llamar al dentista el viernes 10:00"*.
- **Nada hostil:** lo atrasado no se pone rojo; al día siguiente pregunta *"¿La pasamos a hoy?"*.
- **Vistas Día, Semana y Mes,** tareas con pasos, bloques que se arrastran y estiran, pomodoro y temas de color oscuros.
- **Accesible:** se puede usar con teclado y lector de pantalla, y funciona con letra agrandada (WCAG 2.2 AA).

## Instalar

1. Descarga el instalador (`Mi día_x.y.z_x64-setup.exe`) desde la sección **Releases** de este repositorio.
2. Ábrelo. Como la app no tiene firma digital, Windows puede mostrar "Windows protegió su PC": elige **Más información → Ejecutar de todas formas**.
3. No necesita permisos de administrador ni cuenta.

**Tus datos quedan en tu computador.** No hay servidor, cuenta ni login: cada persona que la instala empieza con su propia lista vacía, en un archivo SQLite local.

Requiere Windows 10 u 11 (usa el WebView2 que trae Windows).

## Desarrollo

Hecha con [Tauri 2](https://tauri.app), React y TypeScript.

Necesitas [Node](https://nodejs.org) 22, [pnpm](https://pnpm.io) y [Rust](https://rustup.rs) (con las herramientas de compilación de Visual Studio).

```
pnpm install
pnpm tauri dev      # la app en modo desarrollo
pnpm dev            # solo la interfaz, en el navegador (sin compilar Rust)
pnpm test           # pruebas de la lógica
pnpm tauri build    # el instalador
```

Con `pnpm dev`, la interfaz usa el almacenamiento del navegador en vez de SQLite. Agrega `?ejemplo` a la dirección para empezar con datos de ejemplo, `?hora=11:45` para verla a esa hora y `?rapido` para que el pomodoro vaya en segundos.

Las decisiones de diseño y el plan están en [`docs/PLAN.md`](docs/PLAN.md). Los colores de cada tema están en [`src/styles/colores.css`](src/styles/colores.css), con instrucciones para cambiarlos.

## Licencia

[MIT](LICENSE)
