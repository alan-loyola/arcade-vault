# SPEC 08 — Juego BLOQUE BUSTER: portar `references/started-games/04-arkanoid` a la plataforma

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-26
> **Objetivo:** Portar el rompe-bloques de `references/started-games/04-arkanoid` como juego real en `/juegos/bloque-buster/jugar`, reemplazando al simulador de BLOQUE BUSTER e integrado con el HUD, la pausa, el guardado de puntuaciones y los rankings existentes.

---

## Por qué existe este spec

BLOQUE BUSTER (`bloque-buster`) está en el catálogo pero es simulado: suma puntos aleatorios sobre una arena CSS. Existe un juego real del mismo género en `references/started-games/04-arkanoid`: `index.html` con un canvas de 800×600, `game.js` (~270 líneas), `levels.js` (5 niveles) y `assets/spritesheet.js`, que carga `spritesheet-breakout.png` en un canvas auxiliar creado con `document.createElement`. Usa globals de módulo, `document.getElementById`, objetos `Audio`, HUD dibujado en el canvas, overlays de pausa, game over y victoria, y un selector de nivel clicable en la pausa. Este spec lo porta como motor TypeScript que cumple el contrato `CreateGameEngine` y lo registra en `REAL_GAMES` bajo el id `bloque-buster`. Las mecánicas del original (física de la pelota, 5 niveles, 10 puntos por bloque, 3 vidas, velocidad por nivel y explosiones) **no cambian**.

---

## Alcance

**Dentro:**

- Migración en `supabase/migrations/` que actualiza la columna `long` de la fila `bloque-buster` de `public.games`. `id`, `title`, `short`, `cat`, `color`, `cover` y `sort_order` no cambian. La fila no tiene puntuaciones simuladas, así que no se borra nada de `scores`.
- Motor portado a TypeScript en `lib/games/bloque-buster/`: `constants.ts`, `levels.ts` (los 5 niveles), `sprites.ts` (coordenadas del spritesheet y funciones de dibujo con contexto e imagen inyectados) y `engine.ts` (`createBloqueBusterEngine`). Sin globals ni acceso al DOM; recibe el canvas y los callbacks de `CreateGameEngine`.
- Entrada `bloque-buster` en `REAL_GAMES` (`components/games/registry.ts`) con resolución 800×600, vidas iniciales 3 y controles "RATÓN / ← → MOVER".
- Copia de `assets/spritesheet-breakout.png` a `public/games/bloque-buster/spritesheet-breakout.png` y carga con `new Image()` dentro del motor, dibujando directamente desde la imagen.
- Entrada por teclado (`ArrowLeft`, `ArrowRight`) y ratón (`mousemove` sobre el canvas, con conversión de coordenadas del canvas escalado) con `preventDefault` solo de esas teclas y solo con la partida activa.
- Se eliminan del original: el HUD del canvas (`Score:`, `Nivel:` y las pelotas de vidas), los overlays "GAME OVER" y "¡Completaste el juego!", el overlay de PAUSA con los botones de nivel 1–5 y su listener `click`, las teclas `P` y `Escape`, y los sonidos `ball-bounce.mp3` y `break-sound.mp3`.
- La victoria (romper el último bloque del nivel 5) termina la partida con `onGameOver({ score, level: 5 })`, igual que un game over.
- HUD, PAUSA/REANUDAR, FIN, modal de fin de partida, guardado con `saveScore`, pestaña en `/salon`, ranking global y `best`/`plays` son los existentes de la plataforma, sin cambios.

**Fuera de alcance (para otros specs):**

- Controles táctiles / móvil.
- Sonido y música (los dos `mp3` del original no se copian).
- Cambios de mecánica respecto al original: ángulo de rebote según el punto de impacto en la paleta, botón de saque, power-ups, bloques con varios golpes, más niveles o bucle de niveles tras el 5.
- Selector de nivel.
- Nueva portada: se conserva `.cover-bricks`.
- Cambios en `GamePlayer`, `GameCanvas`, el HUD, el marco CRT, `saveScore` o los rankings.
- Anti-trampas o verificación de puntuaciones (heredado de SPEC 04).
- Tests automatizados.

---

## Modelo de datos

No introduce tablas ni cambios de esquema: reutiliza `games`, `scores`, `game_stats` y `global_ranking` (SPEC 06). `lib/supabase/database.types.ts` no se regenera.

```sql
-- supabase/migrations/<timestamp>_update_game_bloque_buster.sql
update public.games
set long = 'Mueve la paleta con el ratón o las flechas y rebota la pelota para romper muros de bloques de colores. Cinco niveles con patrones distintos y una pelota cada vez más rápida. Tienes tres vidas: cada pelota que cae te cuesta una.'
where id = 'bloque-buster';
```

```ts
// components/games/registry.ts — entrada nueva
"bloque-buster": {
  createEngine: createBloqueBusterEngine,
  width: BLOQUE_BUSTER_W,   // 800
  height: BLOQUE_BUSTER_H,  // 600
  controls: "RATÓN / ← → MOVER",
  initialLives: BLOQUE_BUSTER_LIVES, // 3
  label: "Juego BLOQUE BUSTER",
},
```

```ts
// lib/games/bloque-buster/ — estructuras
type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Paddle extends Rect {}
interface Ball extends Rect {
  vx: number;
  vy: number;
}
interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}
interface Explosion extends Rect {
  color: BlockColor;
  elapsed: number;
} // ms
interface LevelDef {
  speed: number;
  blocks: { col: number; row: number; color: BlockColor }[];
}
interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
```

Convenciones:

- Constantes del original sin cambios, en `constants.ts`:
  - `W = 800`, `H = 600`, fondo `#000`.
  - `PADDLE_SPEED = 400` (px/s), `PADDLE_Y = 560`, `PADDLE_W = 81`, `PADDLE_H = 14`.
  - `BALL_SIZE = 16`, `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300` (px/s).
  - `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`.
  - `BLOCKS_ORIGIN_X = (W − BLOCK_COLS × BLOCK_W) / 2 = 80`, `BLOCKS_ORIGIN_Y = 80`.
  - `BLOCK_POINTS = 10`, `PADDLE_CATCH_MARGIN = 8` (px bajo la paleta en los que aún rebota).
  - `INITIAL_LIVES = 3`, `EXPLOSION_DURATION = 150` (ms), `EXPLOSION_FRAME_COUNT = 4`.
- Constantes nuevas de la integración: `MAX_DT = 0.05` s y `SPRITESHEET_SRC = "/games/bloque-buster/spritesheet-breakout.png"`.
- `levels.ts` reproduce `LEVELS` del original (5 niveles; `col` 0–9, `row` 0–5):
  - Nivel 1, `speed 1.00`: parrilla completa 10×6 (60 bloques). Colores por fila: red, yellow, cyan, magenta, hotpink, green.
  - Nivel 2, `speed 1.10`: pirámide, columnas `[4..5]`, `[3..6]`, `[2..7]`, `[1..8]`, `[0..9]`, `[0..9]` por fila (40 bloques). Colores por fila: gray, cyan, hotpink, yellow, magenta, green.
  - Nivel 3, `speed 1.21`: ajedrez, celdas con `(col + row) % 2 === 0` (30 bloques). Filas 0–2 yellow y filas 3–5 magenta.
  - Nivel 4, `speed 1.33`: filas con huecos en las columnas `[2,5,8]`, `[0,4,7,9]`, `[1,3,6]`, `[2,5,8,9]`, `[0,4,7]`, `[1,3,6,9]` (39 bloques). Colores por fila: cyan, magenta, green, yellow, hotpink, red.
  - Nivel 5, `speed 1.46`: marco (`col 0`, `col 9`, `row 0`, `row 5`) en cyan y cruz interior (`col 4` o `row 2`, fuera del marco) en hotpink (39 bloques).
- `sprites.ts` reproduce las coordenadas de `assets/spritesheet.js`:
  - `paddle {32,112,162,14}` y `ball {32,32,16,16}`.
  - Bloques (todos `sw 32`, `sh 16`, `sx 32`): gray `sy 288`, red `176`, yellow `240`, cyan `192`, magenta `224`, hotpink `256`, green `208`.
  - `EXPLOSION_FRAMES[color]`: 4 frames de 32×16 en `sx` 256, 288, 320 y 352, con `sy` red 176, cyan 192, green 208, magenta 224, yellow 240, hotpink 256 y gray 176 (gray usa los frames rojos, como el original).
  - `drawSprite(ctx, img, rect, x, y, w, h)` y `drawFrame(...)` reciben el contexto y la imagen como parámetros.
- Estado del motor en variables de cierre dentro de `createBloqueBusterEngine`: `paddle`, `ball`, `blocks`, `explosions`, `score`, `lives`, `level` (1–5), `keys` (`ArrowLeft`/`ArrowRight` pulsadas), `pointerX` (posición lógica pendiente del ratón o `null`), `image`, `imageLoaded`, `state` (`"playing" | "gameover"`).
- `onStats` solo cuando cambian `score`, `level` o `lives`; `onGameOver` una sola vez por partida.
- Estado inicial: `score = 0`, `level = 1`, `lives = 3`, paleta centrada en `x = (800 − 81) / 2`, pelota sobre la paleta con la velocidad del nivel 1, igual que el HUD.
- `score` suma 10 por cada bloque roto. Máximo posible: 2080 (208 bloques).
- `level` sube en 1 al romper el último bloque vivo de un nivel menor que 5. Al subir se cargan los bloques del nivel nuevo, se vacían las explosiones y la pelota vuelve sobre la paleta (en su `x` actual, sin recentrarla) con `vx = 200 × speed` y `vy = −300 × speed`.
- `lives` baja en 1 cuando `ball.y > 600`. Si queda en 0, la partida termina; si no, la pelota vuelve sobre la paleta con la velocidad del nivel actual.
- Orden de `update(dt)`, como el original: mover paleta (ratón pendiente y teclas) → mover pelota → rebotes en paredes → rebote en paleta → colisión con un solo bloque → avanzar explosiones → pelota perdida.
- Colores del canvas: fondo negro y sprites del original.

---

## Plan de implementación

Antes del paso 1: leer `.claude/skills/new-game/integration.md`, `lib/game-engine.ts`, `components/games/registry.ts`, `lib/games/asteroids/` y `lib/games/caida/` (ports de referencia); revisar en `node_modules/next/dist/docs/` lo relativo a Client Components y a archivos de `public/` si hace falta (ver CLAUDE.md).

1. Aplicar con `apply_migration` el `update` de `long` de la fila `bloque-buster` y guardar el SQL en `supabase/migrations/<timestamp>_update_game_bloque_buster.sql`. Verificación: `execute_sql` muestra el nuevo `long` y el resto de columnas iguales; `/juegos/bloque-buster` muestra la descripción nueva; `/juegos/bloque-buster/jugar` sigue abriendo el simulador.
2. Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` a `public/games/bloque-buster/spritesheet-breakout.png`. Crear `lib/games/bloque-buster/constants.ts` con los valores del original y los de la integración. Verificación: `npx tsc --noEmit`; `http://localhost:3000/games/bloque-buster/spritesheet-breakout.png` responde con la imagen en `npm run dev`.
3. Crear `lib/games/bloque-buster/levels.ts` con `LEVELS: LevelDef[]` y `lib/games/bloque-buster/sprites.ts` con `SPRITES`, `EXPLOSION_FRAMES`, `drawSprite` y `drawFrame`. Verificación: tipos, `npx eslint lib` y recuento de bloques por nivel 60, 40, 30, 39 y 39.
4. Crear `lib/games/bloque-buster/engine.ts` con `createBloqueBusterEngine: CreateGameEngine`: estado en cierre, carga de la imagen con `new Image()`, `loadLevel`, `resetBall`, `update`/`draw`, loop con `requestAnimationFrame` y `dt = min((ts − lastTime)/1000, MAX_DT)`, `pause`/`resume` sin acumular `dt`, `onStats`, `onGameOver` (game over y victoria) y `destroy`. Mientras la imagen no ha cargado, se dibuja un frame negro y no se ejecuta `update`. Sin HUD ni overlays. Verificación: tipos y lint.
5. Entrada en el motor según `integration.md`: `keydown`/`keyup` en `window` con `GAME_KEYS = {ArrowLeft, ArrowRight}` como estado de tecla mantenida, y `mousemove` en el canvas que guarda `pointerX = (e.clientX − r.left) × (W / r.width)` solo con la partida activa. `update` aplica `pointerX` (paleta centrada en él y limitada a `[0, W − PADDLE_W]`) y lo vacía antes de aplicar las teclas. Todo se registra en `start()` y se quita en `destroy()`. Verificación: tipos y lint.
6. Registrar `bloque-buster` en `REAL_GAMES` importando `W`, `H` e `INITIAL_LIVES` de `lib/games/bloque-buster/constants.ts`. Verificación: `npm run dev`, jugar `/juegos/bloque-buster/jugar`: la pelota sale sola, la paleta se mueve con ratón y flechas, y al romper un bloque el HUD suma 10.
7. Verificar el guardado: con sesión, terminar una partida y guardar crea una fila en `scores` con `game_id = "bloque-buster"` y el `score`/`level` reales; sin sesión se ve "INICIA SESIÓN PARA GUARDAR". La puntuación aparece en `/salon` (pestaña BLOQUE BUSTER y GLOBAL) y `best`/`plays` cambian en `/juegos/bloque-buster`. Verificación: `execute_sql` de lectura sobre `scores`.
8. Revisión final: checks de la sección 8 de `integration.md`, `npx eslint app components lib`, `npm run build` y partida completa con la consola abierta.

---

## Criterios de aceptación

Plataforma:

- [ ] `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar` y `/salon`.
- [ ] `games` contiene la fila `bloque-buster` con el `long` nuevo y el mismo `title`, `short`, `cat`, `color`, `cover` y `sort_order` de antes; `/juegos` la muestra con la portada `cover-bricks`.
- [ ] `lib/games/bloque-buster/` no usa `document`, `getElementById`, `Audio` ni `localStorage`, y `window` solo para los listeners de teclado.
- [ ] `public/games/bloque-buster/` contiene solo `spritesheet-breakout.png`.
- [ ] El HUD muestra puntuación, nivel y vidas reales; el canvas no dibuja `Score:`, `Nivel:`, pelotas de vidas ni overlays de pausa, fin o victoria.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final y el motor deja de aceptar entradas.
- [ ] "FIN" abre el modal con la puntuación actual; "JUGAR DE NUEVO" reinicia con `score = 0`, `level = 1`, 3 vidas y los 60 bloques del nivel 1.
- [ ] PAUSA congela pelota, paleta y explosiones, y el ratón no mueve la paleta; REANUDAR continúa sin saltos. Ocultar la pestaña pausa sin que la pelota salte al volver.
- [ ] Las flechas no hacen scroll mientras se juega; fuera de la partida el scroll funciona.
- [ ] Salir y volver a entrar no duplica el loop ni los listeners (la paleta se mueve a 400 px/s, no al doble).
- [ ] El canvas mantiene la proporción 800:600 (4:3) en distintos anchos de ventana, y la paleta sigue al cursor sin desfase con el canvas escalado.
- [ ] Con sesión, "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `game_id = "bloque-buster"`, `score` y `level` de la partida; sin sesión no inserta nada.
- [ ] La puntuación aparece en `/salon` (pestaña BLOQUE BUSTER y GLOBAL) y `best`/`plays` de `/juegos/bloque-buster` se actualizan tras recargar.
- [ ] ASTEROIDES, CAÍDA y los juegos simulados se comportan igual que antes.

Juego:

- [ ] Al arrancar se ven, sobre fondo negro, los 60 bloques del nivel 1 en 6 filas de colores red, yellow, cyan, magenta, hotpink y green, empezando en `x = 80`, `y = 80`, con bloques de 64×24.
- [ ] La paleta mide 81×14, está en `y = 560` y empieza centrada; la pelota de 16×16 aparece sobre ella y sale sola hacia arriba a la derecha (`vx = 200`, `vy = −300`), sin tecla de saque.
- [ ] ← y → mueven la paleta a 400 px/s mientras se mantienen, sin salir del canvas.
- [ ] Mover el ratón sobre el canvas centra la paleta en el cursor, limitada a `[0, 719]`.
- [ ] La pelota rebota en las paredes izquierda, derecha y superior invirtiendo la componente correspondiente.
- [ ] La pelota rebota en la paleta solo si baja (`vy > 0`), se solapa en horizontal y su borde inferior está entre `y = 560` y `y = 582`; el rebote invierte `vy` y no cambia `vx`.
- [ ] Al tocar un bloque, este desaparece, suma exactamente 10 puntos e invierte `vy`; como máximo se rompe un bloque por frame.
- [ ] Cada bloque roto muestra una explosión de 4 frames de su color durante 150 ms, y los bloques grises usan los frames rojos.
- [ ] Al romper el último bloque de los niveles 1–4 se carga el siguiente nivel, el HUD muestra el nivel nuevo y la pelota vuelve sobre la paleta sin recentrar esta.
- [ ] Los niveles 2–5 tienen 40, 30, 39 y 39 bloques con los patrones de `levels.ts` (pirámide, ajedrez, huecos, marco + cruz).
- [ ] La velocidad de la pelota es `(200, −300) × speed` con `speed` 1.00, 1.10, 1.21, 1.33 y 1.46 en los niveles 1 a 5.
- [ ] Cuando la pelota cae por debajo de `y = 600` se pierde una vida y la pelota vuelve sobre la paleta con la velocidad del nivel actual.
- [ ] Con la tercera pelota perdida, las vidas quedan en 0 y se llama a `onGameOver` con el nivel actual.
- [ ] Al romper el último bloque del nivel 5 se llama a `onGameOver({ score, level: 5 })` y se abre el modal.
- [ ] Las teclas P y Escape no pausan ni hacen nada en el canvas, y hacer clic en el canvas no cambia de nivel.

---

## Decisiones tomadas y descartadas

- **Sí:** motor TypeScript que cumple `CreateGameEngine` y se registra en `REAL_GAMES`; HUD, pausa, modal y guardado de la plataforma. Precedente de SPEC 05 y SPEC 07. **No:** `iframe` o cargar el `game.js` original (globals, sin pausa ni lectura de score).
- **Sí:** resolución lógica fija 800×600 con escalado CSS; física y dificultad idénticas al original. **No:** adaptar el campo al contenedor.
- **Sí:** el juego real ocupa la fila `bloque-buster` (misma URL, título BLOQUE BUSTER y portada `cover-bricks`), con `long` actualizado a las mecánicas reales. **No:** crear una fila nueva junto a BLOQUE BUSTER (dos rompe-bloques, uno falso). La fila tiene 0 puntuaciones, así que no hay datos simulados que borrar.
- **Sí:** nombre original en español (BLOQUE BUSTER). **No:** el nombre "Arkanoid" del original ni arte o marcas de juegos comerciales en textos y portada.
- **Sí:** copiar `spritesheet-breakout.png` a `public/games/bloque-buster/` y cargarlo con `new Image()`, dibujando directamente desde la imagen. Conserva el aspecto del original. **No:** el canvas auxiliar de `spritesheet.js` (usa `document.createElement`, prohibido en el motor) ni redibujar con primitivas (cambia el aspecto).
- **Sí:** ratón y teclado, como el original. El `mousemove` guarda una posición pendiente que `update` aplica, para que la paleta no se mueva en pausa ni tras el fin. **No:** solo teclado (cambia el control) ni mover la paleta directamente en el listener (cambiaría el estado fuera del loop).
- **Sí:** la victoria del nivel 5 llama a `onGameOver({ score, level: 5 })`. Permite guardar la partida completa. **No:** reiniciar en el nivel 1 conservando el score (cambio de mecánica).
- **Sí:** se eliminan `P`, `Escape`, el overlay de pausa y su selector de nivel 1–5; los sustituyen PAUSA/REANUDAR, FIN y JUGAR DE NUEVO. **No:** conservarlos (dos formas de pausar y el selector permitiría saltar niveles e inflar la puntuación guardada).
- **Sí:** sin sonido; los `mp3` no se copian. La plataforma no tiene sistema de audio. **No:** reproducir los efectos con `Audio` en el motor (audio sin volumen ni silencio comunes; irá en su propio spec).
- **Sí:** paleta de 81 px, como `game.js`. El código es la fuente de verdad del juego que se juega hoy. **No:** los 162 px que dicen el README y el spec 01 del original (paleta el doble de ancha y juego más fácil).
- **Sí:** `lives` empieza en 3 y el HUD de la plataforma las muestra. **No:** dibujar las pelotas de vidas en el canvas (HUD duplicado).
- **Sí:** `dt` limitado a 0,05 s (contrato de la plataforma). El original no lo limitaba; a 60 Hz no cambia nada y evita que la pelota atraviese bloques tras un salto de tiempo. **No:** `dt` sin límite.
- **Sí:** las teclas usan `e.code` (`ArrowLeft`, `ArrowRight`) como estado mantenido. Equivale al `e.key` del original para las flechas. **No:** `justPressed` (la paleta se mueve mientras la tecla está pulsada).
- **Sí:** hasta que carga la imagen se dibuja negro y no corre `update`, como el original, que arrancaba el loop al cargar el spritesheet. **No:** simular sin dibujar (la pelota podría caer sin verse).

---

## Riesgos identificados

| Riesgo                                                                  | Mitigación                                                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode monta el efecto dos veces y duplica loop o listeners        | `destroy()` cancela el frame y quita los listeners de `window` y del canvas; se verifica al volver a entrar.                   |
| `generateStaticParams` cacheado no incluye el `id`                      | No aplica: `bloque-buster` ya existe en `games`. Se comprueba igualmente con `npm run build`.                                  |
| El spritesheet no carga (ruta mal copiada) y el canvas queda negro      | El paso 2 verifica la URL de la imagen; `onerror` registra un `console.error` como el original.                                |
| La imagen termina de cargar tras `destroy()` y arranca un loop huérfano | El `onload` comprueba que el motor no está destruido antes de activar `imageLoaded`; `destroy()` también anula `image.onload`. |
| El ratón da posiciones desfasadas con el canvas escalado por CSS        | Conversión con `getBoundingClientRect()` y `W / r.width`; se revisa con varios anchos de ventana.                              |
| Rebotes con `vy` invertido en bloques producen bucles entre dos filas   | Es el comportamiento del original (solo invierte `vy`, un bloque por frame) y se conserva a propósito.                         |
| El cursor sale del canvas y la paleta deja de seguirlo                  | Igual que el original: el ratón solo actúa sobre el canvas y las flechas siguen disponibles.                                   |

---

## Qué **no** entra en este spec

- Controles táctiles, gamepad, sonido y música.
- Cambios de mecánica respecto al original (ángulo de rebote, saque manual, power-ups, más niveles o bucle de niveles).
- Selector de nivel y nueva portada.
- Cambios en el HUD, el marco CRT, `GamePlayer`, `saveScore` o los rankings.
- Anti-trampas y tests automatizados.
