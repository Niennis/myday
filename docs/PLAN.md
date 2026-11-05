# Mi día: plan del proyecto

Resumen de lo conversado y decidido antes de empezar (9 de octubre de 2026). Actualizado el 10 de octubre con lo decidido al probar el prototipo.

## El problema

Un organizador personal para usar en el computador (Windows). Las herramientas probadas no funcionaron:

- **Se me olvida revisarlas.** Si no aparecen solas, dejo de usarlas.
- **Demasiadas opciones.** Me pierdo y se sienten hostiles.
- **Google Calendar:** me pierdo y es feo.
- **Trello:** muchas opciones y es incómodo mover tareas.

Lo uso principalmente en el computador. **El teléfono queda fuera por ahora** (no complicarlo). Más adelante quizás se lo pase a otra persona para que lo use.

## Principios de diseño

### 1. La app te busca a ti
- Se abre sola al iniciar sesión en Windows y muestra la tarjeta **"Hoy"**: bloques del día, las 3 a 5 tareas que importan y lo que quedó pendiente de ayer.
  - La columna "Hoy" tiene cuatro tarjetas: **En este momento**, **Pomodoro**, **Quedó de ayer** y **Lo que importa hoy**. Cada una se **minimiza** con un clic en su título; minimizada muestra un resumen ("3 pendientes", "18:42") y la app recuerda cuáles quedaron así. Si llega una tarea nueva a la lista minimizada, se abre sola.
  - **Pomodoro:** 25 min de concentración y 5 de descanso por defecto. Con el pomodoro detenido, una línea discreta ("25 min de concentración, 5 de descanso") abre dos campos para elegir otros minutos (de 1 a 180); se recuerdan. El descanso empieza solo; el siguiente pomodoro, cuando la persona quiera. Al terminar cada fase, un sonido suave. Mientras corre, el tiempo se ve en el título de la ventana (en la app irá en la bandeja). Botones: Empezar/Pausar/Seguir y Reiniciar o Saltar descanso.
- Después queda en la **bandeja del sistema** (junto al reloj), sin ocupar la pantalla.
- Opcional: una **pastilla flotante** pequeña, siempre visible, movible y escondible: "Ahora: Diseño (hasta 11:00) · Después: Almuerzo".
- Avisos **solo** al empezar un bloque, para las tareas marcadas con 🔔 y al terminar un pomodoro o su descanso. Nada más.

### 2. Pocas opciones, y escondidas
- Una sola forma de crear: **atajo de teclado global** (`Ctrl+Alt+Espacio`; `Ctrl+Espacio` lo usan VS Code y otros editores para autocompletar) que abre una caja donde se escribe en lenguaje natural: *"llamar al dentista el viernes 10:00"*.
  - Entiende fechas y horas escritas con palabras: hoy, mañana, pasado mañana, días de la semana ("el lunes que viene"), "15/10", "15 de octubre", "el 20", "en 3 días", "la próxima semana", "a las 5 de la tarde", y rangos: "de 13:00 a 14:00", "10:00 - 11:30", "de 4 a 6 de la tarde" (la segunda hora es el fin del bloque; sin ":" ni "las", "de 16 a 19" solo cuenta si empieza dentro del horario habitual (9:00 a 23:00), para no confundirlo con "leer de 2 a 3 capítulos"). Si una fecha ya pasó este año, se entiende la del próximo.
  - Debajo muestra cómo lo entendió. La fecha es un botón que abre un **calendario** para corregirla o elegirla (respaldo, no otra forma de crear).
  - Con hora y para hoy → bloque en el horario. Sin hora → tarea. Para otro día → queda en ese día (se ve en la vista semanal).
- Una tarea tiene solo: título, pasos (subtareas marcables), fecha opcional, alerta opcional y **marca opcional**. Sin etiquetas, prioridades, proyectos ni colores por tarea.
- **Marcas (opcionales, según la matriz de Eisenhower):** **Hoy sin falta** (urgente e importante), **Rrrrápido** (urgente, no importante), **Con tiempo** (importante, no urgente) y **Con calma** (ni urgente ni importante). La mayoría de las cosas no lleva marca.
  - Se ponen al anotar ("pagar la luz sin falta", "rrrápido", "con tiempo", "con calma"; "rápido" con una sola r no cuenta, para no confundirlo con un título) o en el panel de pasos, debajo de los pasos.
  - Se ven como una palabra con un punto de color, nunca solo como color.
  - **El bloque que está en "Ahora" decide el color de toda la página:** Hoy sin falta → fucsia, Rrrrápido → energía, Con tiempo → concentración, Con calma → calma. Si no hay bloque en curso o no tiene marca, se usa el mood elegido en la bandeja; ahí también se explica qué marca manda.
- **Cada cosa vive en un solo lugar:** o es una tarea de la lista, o es un bloque del horario. Se pasa de uno a otro arrastrando o con un botón, y sus pasos viajan con ella.
- **Cambiar el nombre y borrar** son un lápiz y un basurero: junto a la × en la tarjeta de un bloque (o de algo de la semana), y arriba a la derecha del panel de pasos de una tarea; no en cada fila. Al tocar el lápiz, el nombre se vuelve un campo ahí mismo. Los botones con solo un ícono tienen un tooltip propio (con mouse y con teclado, se cierra con Escape) en vez del `title` del navegador. Borrar no pide confirmación: aparece abajo "Se borró «…»" con **Deshacer**, que queda hasta cerrarlo.
- Los bloques del horario también tienen pasos: un clic en el bloque abre una tarjeta al lado con sus pasos; el bloque muestra el avance ("✓ 1 de 3").
- La configuración cabe en una pantalla.

### 3. Nada hostil
- Las tareas atrasadas **no se ponen rojas**: al día siguiente aparecen con *"¿La pasamos a hoy?"* y dos botones: "Sí, a hoy" y "Más adelante" (abre un calendario con mañana ya elegido, para decidir el día).
- Mover es arrastrar: de la lista a un horario y de vuelta, de un día a otro, estirar un bloque para cambiar su duración. Todo tiene también una forma con teclado.
- **Temas según el mood**, cambiables con un clic desde la bandeja: calma, energía, concentración y fucsia (reemplazó a noche, el 29 de octubre). Las marcas de las tareas usan estos mismos moods. **Todos oscuros** (los colores claros cansan la vista). Los colores están en un archivo aparte, con comentarios, para poder editarlos a mano.

## Vistas
Se cambia entre ellas con un selector **Día · Semana · Mes**.
- **Diaria:** el día completo en dos columnas, de 0:00 a 12:00 y de 12:00 a 24:00, con un solo scroll como en una agenda: se ven unas 6 horas por columna y las dos se desplazan juntas (se cambió el 5 de noviembre; antes eran dos columnas fijas de 9:00 a 16:00 y de 16:00 a 23:00). Al abrir hoy, se ubica en la hora actual; otro día, en lo primero que tenga anotado. Al arrastrar cerca del borde, el horario se desplaza solo; con teclado, el horario se enfoca y se desplaza con flechas o Av Pág, y un bloque movido con flechas sigue a la vista. Sin títulos "Mañana" y "Tarde". Bloques arrastrables (también de una columna a la otra) y estirables. Un bloque que cruza las 12:00 sigue en la segunda columna. Si un bloque crece más que su espacio (título largo, letra grande), el fondo se agranda para cubrirlo. Las columnas se definen en `HALVES` y el horario habitual (9:00 a 23:00, para buscar espacio libre, entender "de 4 a 7" y ubicar el horario) en `USUAL` (`src/lib/schedule.ts`). Con ‹ › se ve otro día (y "Volver a hoy"); lo que ese día no tiene hora aparece arriba, en una franja "Sin hora". Las tareas de "Lo que importa hoy" se pueden pasar (con el botón o arrastrando) al horario del día que se está viendo; en un día pasado, los bloques se ven y se abren, pero no se mueven.
- **Semanal:** 7 columnas de lunes a domingo; hoy destacado. Cambiar de día arrastrando o con las flechas ← →. No se puede mover nada a un día que ya pasó. Al pasar algo a hoy, si tiene hora queda como bloque; si no, como tarea.
- **Mensual:** solo para ver qué días están cargados (un punto por cosa anotada). Un clic en un día lleva a su semana.

## Prototipo visual

`prototipo/index.html` (se abre con doble clic) y `prototipo/colores.css`. Es la referencia de diseño y comportamiento para la app: HTML, CSS y JavaScript sin dependencias, con datos de ejemplo que no se guardan. Cumple WCAG 2.2 AA (verificado con axe, teclado y texto agrandado).

Lo que se probó y se descartó:
- **Moods claros:** cansan la vista; todos pasaron a oscuros.
- **Tarjeta "Próximos días":** se agregó cuando no había vista semanal; con la semana y el mes ya no aporta y alargaba la columna izquierda.

Decidido al usar la app (29 de octubre): el botón "Agregar pasos" visible en todas las tareas está bien, y si la columna de hoy en la vista semanal se alarga, se desplaza y listo.

## Decisiones técnicas

| Pieza | Elección | Por qué |
|---|---|---|
| App de escritorio | **Tauri 2** + React + TypeScript + Vite | Usa el WebView2 de Windows: liviana (~30–80 MB de RAM, instalador de pocos MB). Bandeja, inicio automático, atajo global y notificaciones nativas. |
| Paquetes | **pnpm** | Ya instalado y preferido. |
| Datos | **SQLite local** | Instantáneo, sin cuenta ni servidor, un archivo fácil de respaldar. |
| Arrastrar | Código propio (el del prototipo, pasado a React) | Se probó con mouse y teclado en el prototipo. dnd-kit no resuelve estirar bloques ni la grilla de 15 minutos en dos columnas: habría que escribir lo mismo encima. |
| Fechas en lenguaje natural | Reconocedor propio (`src/lib/parse.ts`, con pruebas) | Se probó chrono-node (`chrono.es`) y se descartó: no entiende "pasado mañana", "la próxima semana" ni "el 20", lee "a las 5 de la tarde" como las 5:00 de mañana y deja restos ("el", "que viene") en el título. |
| Selector de fecha | `<input type="date">` nativo | Accesible, se adapta al modo oscuro, sin dependencias. |
| Estilos | CSS del prototipo + temas con variables CSS (sin Tailwind) | El CSS del prototipo ya cumple WCAG 2.2 AA; pasarlo a Tailwind no aporta y arriesga errores. Colores de los moods en `src/styles/colores.css`, comentado. |
| Sistema | Complementos oficiales de Tauri: autostart, notification, global-shortcut, tray, sql | |

**Descartados:**
- **Next.js:** no hace falta servidor.
- **Electron:** demasiado pesado (~150–300 MB de RAM).
- **Neutralino.js:** sin inicio automático ni atajo global, menos maduro.
- **Electrobun:** muy nuevo en Windows.
- **PWA:** sin bandeja; el atajo solo funciona con la ventana activa y las alertas dependen del navegador. Justo lo central queda poco confiable.

### Preparado para el futuro (sin costo extra ahora)
Para poder agregar sincronización (otro dispositivo) o compartir la app más adelante:
- Separar la interfaz del acceso a datos (capa de repositorios, como en `alerta-ofertas`).
- IDs **UUID**, no correlativos.
- Cada registro con `updatedAt`, y borrado lógico (`deletedAt`) en vez de eliminar.

Compartir con otra persona: Tauri genera un instalador `.msi`/`.exe`. Sin firma de código, Windows SmartScreen muestra un aviso ("Más información → Ejecutar de todas formas"). Hay complemento de actualización automática para cuando haga falta.

## Etapas

1. **Lo básico:** inicio automático, tarjeta "Hoy", bandeja, captura rápida con atajo global (con fechas en lenguaje natural y calendario), tareas con pasos, vista diaria en dos columnas con bloques arrastrables y con pasos, pasar entre lista y horario, pomodoro (con tiempos editables), tarjetas minimizables, 4 moods oscuros y marcas que cambian el color. Se adelantaron de la etapa 2 las vistas **semanal y mensual** (29 de octubre, al probar la app).
2. **Planificar:** alertas 🔔 a una hora elegida, pastilla flotante. (Las vistas semanal y mensual ya están en la app.)
3. **Según el uso:** tareas que se repiten, resumen al final del día, lo que se eche de menos tras unas semanas de uso.

## Siguiente paso acordado

1. ~~Usar el prototipo~~ (hecho; está en `prototipo/`).
2. **Etapa 1 en Tauri** (29 de octubre): compilada y probada como app de escritorio. Se agregaron las vistas semanal y mensual y los tiempos editables del pomodoro. Instaladores generados: 0.1.0, 0.2.0 (navegación entre días) y 0.2.1 (horario de 24 horas con scroll, 5 de noviembre), con `pnpm tauri build`: `src-tauri/target/release/bundle/nsis/`. Para cada versión nueva: subir el número en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json`, generar el instalador e instalarlo encima (los datos se conservan).
3. Usar la app unos días y anotar qué sobra, qué confunde y qué falta. Luego, la etapa 2.

Repositorio público: https://github.com/Niennis/myday (licencia MIT). Los instaladores se publican en Releases.

## Cómo está hecha la app

- `src/lib/`: lógica sin pantalla (fechas, reconocedor de la captura, horario, marcas), con pruebas (`pnpm test`).
- `src/data/`: capa de datos. `sqliteRepo.ts` en la app; `browserRepo.ts` (localStorage) para probar la interfaz en el navegador con `pnpm dev`, sin compilar Rust. Con `?ejemplo` en la dirección empieza con datos de ejemplo; con `?hora=11:45`, a esa hora; con `?rapido`, el pomodoro va en segundos.
- `src/components/`, `src/hooks/`, `src/state/`: la interfaz en React.
- `src-tauri/src/lib.rs`: bandeja (abrir, anotar, mood, inicio con Windows, salir), atajo global, inicio automático (se activa solo la primera vez, en la versión compilada), una sola instancia, migraciones de SQLite. Cerrar la ventana la esconde en la bandeja.
- Avisos (notificaciones de Windows): al empezar un bloque y al terminar un pomodoro o su descanso.
