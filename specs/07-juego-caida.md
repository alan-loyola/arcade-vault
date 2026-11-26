# SPEC 07 — Juego CAÍDA: portar `references/started-games/03-tetris` a la plataforma

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-26
> **Objetivo:** Portar el juego de piezas que caen de `references/started-games/03-tetris` como juego real en `/juegos/caida/jugar`, reemplazando al simulador de CAÍDA e integrado con el HUD, la pausa, el guardado de puntuaciones y los rankings existentes.

---

## Por qué existe este spec

CAÍDA (`caida`) está en el catálogo pero es simulado: suma puntos aleatorios sobre una arena CSS. Existe un juego real del mismo género en `references/started-games/03-tetris`: HTML + `style.css` + un único `game.js` de ~305 líneas, tablero 10×20 en un canvas de 300×600, un segundo canvas de 120×120 para la siguiente pieza y un panel DOM con puntos, líneas y nivel. Usa globals de módulo, `document.getElementById`, overlays DOM de pausa y fin, un botón de reinicio y un selector de tema claro/oscuro con `localStorage`. Este spec lo porta como motor TypeScript que cumple el contrato `CreateGameEngine` y lo registra en `REAL_GAMES` bajo el id `caida`. Las mecánicas del original (8 piezas, rotación con _wall kicks_, pieza fantasma, puntuación y velocidad) **no cambian**.

---

## Alcance

**Dentro:**

- Migración en `supabase/migrations/` que actualiza la columna `long` de la fila `caida` de `public.games`. `id`, `title`, `short`, `cat`, `color`, `cover` y `sort_order` no cambian. La fila no tiene puntuaciones simuladas, así que no se borra nada de `scores`.
- Motor portado a TypeScript en `lib/games/caida/`: `constants.ts`, `board.ts` (tablero y piezas, funciones puras), `render.ts` (dibujo con contexto 2D inyectado) y `engine.ts` (`createCaidaEngine`). Sin globals ni acceso al DOM; recibe el canvas y los callbacks de `CreateGameEngine`.
- Entrada `caida` en `REAL_GAMES` (`components/games/registry.ts`) con resolución 450×600, vidas iniciales 1 y controles "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAER".
- Panel lateral dentro del canvas: franja de 150 px a la derecha del tablero con la siguiente pieza (rótulo `SIGUIENTE`) y el contador de líneas (rótulo `LÍNEAS`).
- Entrada solo por teclado (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `KeyX`, `ArrowDown`, `Space`) con `preventDefault` solo de esas teclas y solo con la partida activa.
- Se eliminan del original: el panel DOM (`#score`, `#lines`, `#level`, lista de controles), el overlay de PAUSA / GAME OVER, el botón "Reiniciar", la tecla `KeyP`, el selector de tema y su clave `tetris-theme` en `localStorage`, y el título "TETRIS".
- `lives` es la constante 1: el HUD muestra un corazón y la partida termina solo por game over.
- HUD, PAUSA/REANUDAR, FIN, modal de fin de partida, guardado con `saveScore`, pestaña en `/salon`, ranking global y `best`/`plays` son los existentes de la plataforma, sin cambios.

**Fuera de alcance (para otros specs):**

- Controles táctiles / móvil.
- Sonido y música (el original no tiene).
- Cambios de mecánica respecto al original: generador por bolsa de 7, _hold_, rotación antihoraria, SRS completo, _lock delay_, DAS/ARR configurable.
- Tema claro del canvas.
- Nueva portada: se conserva `.cover-tetro`.
- Cambios en `GamePlayer`, `GameCanvas`, el HUD, el marco CRT, `saveScore` o los rankings.
- Anti-trampas o verificación de puntuaciones (heredado de SPEC 04).
- Tests automatizados.

---

## Modelo de datos

No introduce tablas ni cambios de esquema: reutiliza `games`, `scores`, `game_stats` y `global_ranking` (SPEC 06). `lib/supabase/database.types.ts` no se regenera.

```sql
-- supabase/migrations/<timestamp>_update_game_caida.sql
update public.games
set long = 'Ocho piezas distintas, incluida una tuerca hueca, caen sobre un pozo de 10 × 20. Muévelas, rótalas y suéltalas de golpe guiándote por su sombra para completar líneas. Cada 10 líneas subes de nivel y la caída se acelera.'
where id = 'caida';
```

```ts
// components/games/registry.ts — entrada nueva
caida: {
  createEngine: createCaidaEngine,
  width: CAIDA_W,   // 450
  height: CAIDA_H,  // 600
  controls: "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAER",
  initialLives: CAIDA_LIVES, // 1
  label: "Juego CAÍDA",
},
```

```ts
// lib/games/caida/board.ts — estructuras
type Cell = number; // 0 = vacía, 1–8 = índice de color del tipo de pieza
type Board = Cell[][]; // ROWS × COLS
interface Piece {
  type: number;
  shape: Cell[][];
  x: number;
  y: number;
}
```

Convenciones:

- Constantes del original sin cambios, en `constants.ts`:
  - `COLS = 10`, `ROWS = 20`, `BLOCK = 30` (tablero de 300×600).
  - `COLORS`: `[null, "#4dd0e1" (I), "#ffd54f" (O), "#ba68c8" (T), "#81c784" (S), "#e57373" (Z), "#90caf9" (J), "#ffb74d" (L), "#9e9e9e" (N, tuerca)]`.
  - `PIECES`: las 8 matrices del original con sus valores 1–8. I es 4×4 con la fila 1 llena. O es 2×2. T, S, Z, J y L son 3×3. La tuerca es `[[8,8,8],[8,0,8],[8,8,8]]`.
  - `LINE_SCORES = [0, 100, 300, 500, 800]`.
  - `INITIAL_DROP_INTERVAL = 1000`, `MIN_DROP_INTERVAL = 100`, `DROP_STEP = 90` (ms).
  - `LINES_PER_LEVEL = 10`, `HARD_DROP_POINTS = 2` (por celda), `SOFT_DROP_POINTS = 1` (por fila).
  - `KICKS = [0, -1, 1, -2, 2]`, `GHOST_ALPHA = 0.2`.
  - Dibujo del bloque: relleno en `x·size+1, y·size+1` de `size−2`, con franja superior `rgba(255,255,255,0.12)` de 4 px.
  - Colores del tema oscuro original: fondo `#1a1a25`, rejilla `#22222e` de 0,5 px, rótulos `#555570`, valores `#7aa2f7`.
- Constantes nuevas de la integración: `PANEL_W = 150`, `W = COLS × BLOCK + PANEL_W = 450`, `H = ROWS × BLOCK = 600`, `NEXT_BLOCK = 30` (vista previa de 4×4 celdas, como el canvas de 120×120), `INITIAL_LIVES = 1`, `MAX_DT = 0.05` s.
- Estado del motor en variables de cierre dentro de `createCaidaEngine`: `board`, `current`, `next`, `score`, `lines`, `level`, `dropInterval`, `dropAccum` (ms), `state` (`"playing" | "gameover"`).
- `onStats` solo cuando cambian `score`, `level` o `lives`; `onGameOver` una sola vez por partida.
- Estado inicial: `score = 0`, `level = 1`, `lives = 1`, `lines = 0`, `dropInterval = 1000`, igual que el HUD.
- `score` suma:
  - `LINE_SCORES[líneas limpiadas] × level`, con el `level` anterior a recalcularlo.
  - 2 por cada celda recorrida en caída rápida (`ghostY − y`).
  - 1 por cada fila bajada con `ArrowDown`.
- `level = floor(lines / 10) + 1`. Tras limpiar líneas, `dropInterval = max(100, 1000 − (level − 1) × 90)` ms.
- `lives` es la constante 1: el juego no tiene vidas.
- Pieza nueva: tipo uniforme entre 1 y 8 (`Math.floor(Math.random() * 8) + 1`), `x = floor(COLS/2) − floor(ancho/2)`, `y = 0`.
- Caída automática: `dropAccum += dt` en ms. Al llegar a `dropInterval`, `dropAccum = 0` y la pieza baja una fila o se fija si no puede.
- Colores del canvas: los del tema oscuro del original.

---

## Plan de implementación

Antes del paso 1: leer `.claude/skills/new-game/integration.md`, `lib/game-engine.ts`, `components/games/registry.ts` y `lib/games/asteroids/` (port de referencia); revisar en `node_modules/next/dist/docs/` lo relativo a Client Components si hace falta (ver CLAUDE.md).

1. Aplicar con `apply_migration` el `update` de `long` de la fila `caida` y guardar el SQL en `supabase/migrations/<timestamp>_update_game_caida.sql`. Verificación: `execute_sql` muestra el nuevo `long` y el resto de columnas iguales; `/juegos/caida` muestra la descripción nueva; `/juegos/caida/jugar` sigue abriendo el simulador.
2. Crear `lib/games/caida/constants.ts` con los valores del original y los de la integración. Verificación: `npx tsc --noEmit`.
3. Crear `lib/games/caida/board.ts` con funciones puras tipadas que reciben el tablero como parámetro: `createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate` (devuelve la pieza rotada y desplazada o `null`), `merge`, `clearLines` (devuelve el número de filas limpiadas) y `ghostY`. Verificación: tipos y `npx eslint lib`.
4. Crear `lib/games/caida/render.ts` con funciones que reciben el `CanvasRenderingContext2D`: `drawBlock`, `drawGrid`, `drawBoard` (tablero, pieza fantasma y pieza actual) y `drawPanel` (rótulo `SIGUIENTE`, pieza siguiente centrada en 4×4 celdas, rótulo `LÍNEAS` y su valor). El panel ocupa `x ∈ [300, 450)` con el mismo fondo y una línea separadora `#2a2a3a`. Verificación: tipos y lint.
5. Crear `lib/games/caida/engine.ts` con `createCaidaEngine: CreateGameEngine`: estado en cierre, `update`/`draw`, loop con `requestAnimationFrame` y `dt = min((ts − lastTime)/1000, MAX_DT)`, caída por `dropAccum`, `lockPiece` (merge + limpiar líneas + puntos + nivel + spawn), game over cuando la pieza nueva colisiona al aparecer, `pause`/`resume` sin acumular `dt`, `onStats`, `onGameOver` y `destroy`. Sin HUD ni overlays. Verificación: tipos y lint.
6. Entrada de teclado en el motor según `integration.md`: `keydown`/`keyup` en `window` registrados en `start()` y quitados en `destroy()`, con `GAME_KEYS = {ArrowLeft, ArrowRight, ArrowUp, KeyX, ArrowDown, Space}`. Cada `keydown` (incluidas las repeticiones del sistema operativo) encola una acción. La cola se consume al inicio del siguiente `update`, en orden. Verificación: tipos y lint.
7. Registrar `caida` en `REAL_GAMES` importando `W`, `H` e `INITIAL_LIVES` de `lib/games/caida/constants.ts`. Verificación: `npm run dev`, jugar `/juegos/caida/jugar`: las piezas caen, se mueven y rotan, y el HUD cambia al bajar con ↓.
8. Verificar el guardado: con sesión, terminar una partida y guardar crea una fila en `scores` con `game_id = "caida"` y el `score`/`level` reales; sin sesión se ve "INICIA SESIÓN PARA GUARDAR". La puntuación aparece en `/salon` (pestaña CAÍDA y GLOBAL) y `best`/`plays` cambian en `/juegos/caida`. Verificación: `execute_sql` de lectura sobre `scores`.
9. Revisión final: checks de la sección 8 de `integration.md`, `npx eslint app components lib`, `npm run build` y partida completa con la consola abierta.

---

## Criterios de aceptación

Plataforma:

- [ ] `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos`, `/juegos/caida`, `/juegos/caida/jugar` y `/salon`.
- [ ] `games` contiene la fila `caida` con el `long` nuevo y el mismo `title`, `short`, `cat`, `color`, `cover` y `sort_order` de antes; `/juegos` la muestra con la portada `cover-tetro`.
- [ ] `lib/games/caida/` no usa `document`, `getElementById` ni `localStorage`, y `window` solo para los listeners de teclado.
- [ ] El HUD muestra puntuación y nivel reales y un corazón de vida; el canvas no dibuja puntuación, nivel ni overlays de pausa/fin.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final y el motor deja de aceptar entradas.
- [ ] "FIN" abre el modal con la puntuación actual; "JUGAR DE NUEVO" reinicia con `score = 0`, `level = 1`, 1 vida, tablero vacío y `LÍNEAS 0`.
- [ ] PAUSA detiene la caída y las teclas; REANUDAR continúa sin saltos. Ocultar la pestaña pausa sin que la pieza baje de golpe al volver.
- [ ] Las flechas y ESPACIO no hacen scroll mientras se juega; fuera de la partida el scroll funciona.
- [ ] Salir y volver a entrar no duplica el loop ni los listeners (una pulsación de ← mueve exactamente una columna).
- [ ] El canvas mantiene la proporción 450:600 (3:4) en distintos anchos de ventana.
- [ ] Con sesión, "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `game_id = "caida"`, `score` y `level` de la partida; sin sesión no inserta nada.
- [ ] La puntuación aparece en `/salon` (pestaña CAÍDA y GLOBAL) y `best`/`plays` de `/juegos/caida` se actualizan tras recargar.
- [ ] ASTEROIDES y los juegos simulados se comportan igual que antes.

Juego:

- [ ] Al arrancar se ve el tablero 10×20 vacío con rejilla, una pieza en la fila superior, su sombra al fondo y la siguiente pieza en el panel con `LÍNEAS 0`.
- [ ] Aparecen los 8 tipos de pieza con sus colores del original, incluida la tuerca gris `#9e9e9e` con el hueco central.
- [ ] Cada pieza nueva aparece en `y = 0` y centrada según `floor(5 − ancho/2)`: I en la columna 3, O en la 4 y las de 3×3 en la 4.
- [ ] ← y → mueven la pieza una columna si no choca; mantener la tecla repite el movimiento con la repetición del teclado.
- [ ] ↑ y X rotan en sentido horario; si choca, prueban desplazamientos de 0, −1, +1, −2 y +2 columnas en ese orden y, si ninguno cabe, no rotan.
- [ ] ↓ baja la pieza una fila y suma 1 punto; si la pieza ya no puede bajar, se fija en ese momento sin sumar.
- [ ] ESPACIO deja caer la pieza hasta su sombra, suma 2 puntos por fila recorrida y la fija.
- [ ] La sombra se dibuja con opacidad 0,2 en la fila donde aterrizaría la pieza.
- [ ] Sin teclas, la pieza baja una fila cada 1000 ms en el nivel 1.
- [ ] Limpiar 1, 2, 3 o 4 líneas a la vez suma 100, 300, 500 u 800 × nivel, con el nivel previo a la limpieza.
- [ ] Las filas completas desaparecen y las de arriba bajan; el contador `LÍNEAS` del panel se actualiza.
- [ ] El nivel sube a 2 al llegar a 10 líneas, a 3 a las 20, y así sucesivamente.
- [ ] El intervalo de caída es `max(100, 1000 − (nivel − 1) × 90)` ms: 910 ms en el nivel 2 y 100 ms desde el nivel 11.
- [ ] La partida termina cuando una pieza nueva colisiona al aparecer, y entonces se llama a `onGameOver`.
- [ ] La tecla P no pausa ni hace nada.

---

## Decisiones tomadas y descartadas

- **Sí:** motor TypeScript que cumple `CreateGameEngine` y se registra en `REAL_GAMES`; HUD, pausa, modal y guardado de la plataforma. Precedente de SPEC 05. **No:** `iframe` o cargar el `game.js` original (globals, sin pausa ni lectura de score).
- **Sí:** resolución lógica fija 450×600 con escalado CSS; física y dificultad idénticas al original. **No:** adaptar el tablero al contenedor.
- **Sí:** el juego real ocupa la fila `caida` (misma URL, título CAÍDA y portada `cover-tetro`), con `long` actualizado a las mecánicas reales. **No:** crear una fila nueva junto a CAÍDA (dos juegos del mismo género, uno falso). La fila tiene 0 puntuaciones, así que no hay datos simulados que borrar.
- **Sí:** nombre original en español (CAÍDA). **No:** el nombre ni el título "TETRIS" del original ni arte de juegos comerciales.
- **Sí:** `lives` constante 1: el HUD muestra un corazón y el game over es el único final. **No:** `initialLives = 0` (el HUD mostraría "—" desde el inicio y parecería una partida perdida).
- **Sí:** siguiente pieza y contador de líneas dibujados en una franja de 150 px dentro del canvas. Conserva la información del original que el nivel necesita. **No:** quitar el panel (se pierde la vista previa) ni añadir `lines` al HUD de la plataforma (cambio de plataforma fuera de alcance).
- **Sí:** 8 piezas, como el `game.js`, incluida la tuerca. **No:** 7 piezas como dice el README (sería un cambio de mecánica respecto al código).
- **Sí:** tema oscuro fijo con los colores del original. **No:** portar el selector claro/oscuro y su `localStorage` (la plataforma es oscura y la regla prohíbe DOM/storage en el motor).
- **Sí:** se eliminan `KeyP`, el overlay y el botón "Reiniciar"; los sustituyen PAUSA/REANUDAR, FIN y JUGAR DE NUEVO. **No:** mantener dos formas de pausar.
- **Sí:** las acciones de teclado se encolan en cada `keydown`, incluidas las repeticiones del sistema, y se consumen en el siguiente `update`. Reproduce el comportamiento del original, que actuaba en cada `keydown`, y respeta que el estado solo cambie dentro del loop. **No:** `justPressed` de un solo disparo por pulsación (quitaría la repetición al mantener ← → ↓, que el original tiene).
- **Sí:** `dt` limitado a 0,05 s (contrato de la plataforma) y acumulado en ms en `dropAccum`, que vuelve a 0 al bajar como en el original. El original no limitaba `dt`, pero a 60 Hz el límite no cambia nada y evita caídas bruscas tras un salto de tiempo. **No:** `setInterval` para la gravedad.
- **Sí:** sin sonido. El original no tiene y la plataforma tampoco.

---

## Riesgos identificados

| Riesgo                                                                             | Mitigación                                                                                                             |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y duplica loop o listeners                   | `destroy()` cancela el frame y quita los listeners; se verifica al volver a entrar.                                    |
| `generateStaticParams` cacheado no incluye el `id`                                 | No aplica: `caida` ya existe en `games`. Se comprueba igualmente con `npm run build`.                                  |
| Teclas pulsadas durante la pausa o justo antes del fin se aplican después          | `pause()` y el game over vacían la cola de acciones; `keydown` solo encola con la partida activa.                      |
| La partida termina por una tecla (caída rápida) y no dentro de la caída automática | El game over se detecta en `spawn()` y el loop lo comprueba tras cada `update`, venga de la cola o del temporizador.   |
| El canvas 3:4 queda muy alto en pantallas bajas                                    | Lo resuelve el escalado CSS existente (`--game-w` / `--game-h`); se revisa en el paso 7 con varios tamaños de ventana. |
| La tuerca no puede completar su fila central por sí sola y frustra                 | Es la mecánica del original y se conserva a propósito (decisión registrada).                                           |

---

## Qué **no** entra en este spec

- Controles táctiles, gamepad, sonido y música.
- Cambios de mecánica respecto al original (bolsa de 7, _hold_, _lock delay_, rotación antihoraria, SRS).
- Tema claro del canvas y nueva portada.
- Cambios en el HUD, el marco CRT, `GamePlayer`, `saveScore` o los rankings.
- Anti-trampas y tests automatizados.
