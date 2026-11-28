# SPEC GJ-travesia-01 — Juego TRAVESÍA: núcleo jugable de cruce de carretera y río

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-26
> **Objetivo:** Crear TRAVESÍA, un juego original de cruce por carriles, como juego real en `/juegos/travesia/jugar`, ocupando la fila del simulado RANARIA e integrado con el HUD, la pausa, el guardado de puntuaciones y los rankings existentes.

---

## Por qué existe este spec

Este juego sale de la game jam con el tema «Cruza la carretera y el río sin convertirte en papilla». Es un diseño original sin código de referencia: el género de cruce por carriles con identidad propia de Arcade Vault. El protagonista es Pincho, un cactus de neón saltarín al que el agua ahoga, que vuelve a casa a las macetas de la orilla. No se usa el nombre, el personaje ni el arte de ningún juego comercial.

En el catálogo existe RANARIA (`ranaria`), un simulado del mismo género con 0 puntuaciones. Este spec convierte esa fila en TRAVESÍA: cambia su `id` a `travesia` y su `title`, `short` y `long`, y conserva `cat`, `color`, `cover` y `sort_order`. El motor cumple el contrato `CreateGameEngine` (`lib/game-engine.ts`) y se registra en `REAL_GAMES` (`components/games/registry.ts`) bajo el id `travesia`.

Es el primero de tres specs: este deja el juego completo y jugable con un solo trazado de carriles. La progresión de dificultad va en `specs/game-jam/travesia/02-travesia-progresion.md` y los extras en `specs/game-jam/travesia/03-travesia-extras.md`.

---

## Alcance

**Dentro:**

- Migración en `supabase/migrations/` que borra las puntuaciones de `ranaria` (hay 0) y actualiza la fila `ranaria` de `public.games` a `id = 'travesia'`, `title = 'TRAVESÍA'`, `short` y `long` nuevos. `cat` (`ARCADE`), `color` (`green`), `cover` (`cover-rana`) y `sort_order` (8) no cambian.
- Motor TypeScript en `lib/games/travesia/`: `constants.ts`, `sprites.ts` (pixel-art en matrices y `drawArt`), `lanes.ts` (lógica pura de carriles, colisiones y metas), `render.ts` (dibujo con contexto inyectado) y `engine.ts` (`createTravesiaEngine`). Sin globals ni acceso al DOM.
- Entrada `travesia` en `REAL_GAMES` con resolución 520×560, vidas iniciales 3 y controles "← ↑ → ↓ / WASD SALTAR".
- Tablero de 13 columnas × 14 filas de 40 px: orilla con 5 macetas, río de 5 carriles de troncos, mediana segura, carretera de 5 carriles de vehículos, acera de salida y franja del reloj.
- Movimiento casilla a casilla, con un salto por pulsación y un salto en espera como máximo.
- Muerte por atropello, por caer al agua, por salir del canvas arrastrado por un tronco, por chocar con el seto o una maceta ocupada, y por agotar el tiempo.
- Temporizador de 30 s por vida, dibujado como barra en la franja inferior del canvas.
- Puntos por avance, por maceta y por tiempo sobrante; nivel +1 al llenar las 5 macetas.
- Tres vidas y game over al perder la última.
- Entrada por teclado (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`) con `preventDefault` solo de esas teclas y solo con la partida activa.
- HUD, PAUSA/REANUDAR, FIN, modal de fin de partida, guardado con `saveScore`, pestaña en `/salon`, ranking global y `best`/`plays` son los existentes de la plataforma, sin cambios.

**Fuera de alcance (para otros specs):**

- Curva de dificultad por nivel (velocidad, reloj más corto), patos de goma que se sumergen y trazados de carriles por nivel: `specs/game-jam/travesia/02-travesia-progresion.md`.
- Flor bonus, nube de riego, racha de llegadas, vida extra y victoria final en el nivel 8: `specs/game-jam/travesia/03-travesia-extras.md`.
- Nueva portada: se conserva `.cover-rana` (carriles cian y un círculo verde, válida para el nuevo juego).
- Controles táctiles / móvil.
- Sonido y música.
- Cambios en `GamePlayer`, `GameCanvas`, el HUD, el marco CRT, `saveScore` o los rankings.
- Anti-trampas o verificación de puntuaciones (heredado de SPEC 04).
- Tests automatizados.

---

## Modelo de datos

No introduce tablas ni cambios de esquema: reutiliza `games`, `scores`, `game_stats` y `global_ranking` (SPEC 06). `lib/supabase/database.types.ts` no se regenera.

```sql
-- supabase/migrations/<timestamp>_update_game_travesia.sql
delete from public.scores where game_id = 'ranaria';
update public.games
set id = 'travesia',
    title = 'TRAVESÍA',
    short = 'Lleva a Pincho al otro lado sin hacerse papilla.',
    long = 'Guía a Pincho, un cactus saltarín, casilla a casilla con las flechas o WASD: cruza cinco carriles de tráfico y salta de tronco en tronco sobre el río, porque el agua lo ahoga. Llévalo a las cinco macetas de la orilla antes de que se agote el reloj: cada maceta vale 50 puntos más 10 por segundo sobrante. Con las cinco macetas llenas subes de nivel; tienes tres vidas.'
where id = 'ranaria';
```

```ts
// components/games/registry.ts — entrada nueva
travesia: {
  createEngine: createTravesiaEngine,
  width: TRAVESIA_W,   // 520
  height: TRAVESIA_H,  // 560
  controls: "← ↑ → ↓ / WASD SALTAR",
  initialLives: TRAVESIA_LIVES, // 3
  label: "Juego TRAVESÍA",
},
```

```ts
// lib/games/travesia/constants.ts — estructuras
type Dir = "up" | "down" | "left" | "right";
type LaneKind = "road" | "river";
type ObjKind = "car" | "moto" | "sport" | "truck" | "log";
interface LaneDef {
  row: number; // fila del tablero
  kind: LaneKind;
  obj: ObjKind;
  color: string; // color principal del objeto
  len: number; // celdas por objeto
  speed: number; // px/s; signo = sentido (+ derecha, − izquierda)
  count: number; // objetos en el carril
  spacing: number; // celdas entre el inicio de dos objetos
  offset: number; // celda inicial del primer objeto
}
interface MovingObj {
  x: number; // px, borde izquierdo
}
interface Lane {
  def: LaneDef;
  speed: number; // px/s efectiva
  loop: number; // px = count × spacing × CELL
  objs: MovingObj[];
}
interface Player {
  x: number; // px, borde izquierdo de la caja de 40 px (fraccional en el río)
  row: number; // 0–12
}
type DeathKind = "splat" | "water";
type PixelArt = { palette: Record<string, string>; rows: string[] };
```

Convenciones:

- Constantes de tablero en `constants.ts`:
  - `COLS = 13`, `ROWS = 14`, `CELL = 40`, `W = 520`, `H = 560`.
  - Filas: `GOAL_ROW = 0` (orilla con macetas), río en las filas 1–5 (`RIVER_TOP = 1`, `RIVER_BOTTOM = 5`), `MEDIAN_ROW = 6`, carretera en las filas 7–11 (`ROAD_TOP = 7`, `ROAD_BOTTOM = 11`), `START_ROW = 12`, `TIMER_ROW = 13` (no jugable).
  - `START_COL = 6`: Pincho aparece en `x = 240`, fila 12.
  - `GOAL_COLS = [1, 3, 6, 9, 11]` (5 macetas); el resto de la fila 0 es seto.
  - `GOAL_TOLERANCE = 14` (px entre el centro de Pincho y el centro de la maceta).
- Constantes de partida:
  - `INITIAL_LIVES = 3`, `TIME_PER_LIFE = 30` (s), `DEATH_TIME = 0.8` (s), `HOP_COOLDOWN = 0.1` (s), `MAX_DT = 0.05` (s).
  - `STEP_POINTS = 10`, `POT_POINTS = 50`, `TIME_BONUS_PER_SEC = 10`, `LEVEL_CLEAR_POINTS = 1000`.
  - `PLAYER_INSET = 8` (px recortados a cada lado de la caja de Pincho para colisionar con vehículos), `CAR_INSET = 2` (px recortados a cada lado de un vehículo).
- `LANES: LaneDef[]` (velocidades en px/s; `spacing` y `offset` en celdas):

  | Fila | Tipo  | Objeto  | Color     | `len` | `speed` | `count` | `spacing` | `offset` |
  | ---- | ----- | ------- | --------- | ----- | ------- | ------- | --------- | -------- |
  | 11   | road  | `car`   | `#ffd23f` | 1     | −60     | 3       | 6         | 0        |
  | 10   | road  | `moto`  | `#ff3fa4` | 1     | +80     | 3       | 5         | 1        |
  | 9    | road  | `car`   | `#00f5ff` | 1     | −70     | 4       | 4         | 2        |
  | 8    | road  | `sport` | `#ff5a3c` | 1     | +140    | 1       | 14        | 3        |
  | 7    | road  | `truck` | `#9b7bff` | 2     | −50     | 2       | 8         | 0        |
  | 5    | river | `log`   | `#7a4a24` | 3     | +40     | 3       | 6         | 0        |
  | 4    | river | `log`   | `#7a4a24` | 2     | −60     | 3       | 5         | 1        |
  | 3    | river | `log`   | `#7a4a24` | 4     | +70     | 2       | 9         | 2        |
  | 2    | river | `log`   | `#7a4a24` | 2     | −50     | 3       | 5         | 3        |
  | 1    | river | `log`   | `#7a4a24` | 3     | +55     | 3       | 6         | 1        |

- En todos los carriles `loop = count × spacing × CELL ≥ W + len × CELL`, así un objeto nunca aparece ni desaparece dentro del canvas.
- Posición inicial del objeto `i`: `x = (offset + i × spacing) × CELL`.
- Movimiento de un objeto: `x += speed × dt`. Si `speed > 0` y `x ≥ W`, `x −= loop`. Si `speed < 0` y `x + len × CELL ≤ 0`, `x += loop`.
- Estado del motor en variables de cierre dentro de `createTravesiaEngine`: `lanes: Lane[]`, `player: Player`, `bestRow` (fila más alta alcanzada en esta vida), `pots: boolean[]` (5), `timeLeft` (s), `hopCooldown` (s), `pendingHop: Dir | null`, `deathTimer` (s), `deathKind`, `deathX`, `deathRow`, `score`, `level`, `lives`, `state` (`"playing" | "dying" | "gameover"`).
- `onStats` solo cuando cambian `score`, `level` o `lives`; `onGameOver` una sola vez por partida.
- Estado inicial: `score = 0`, `level = 1`, `lives = 3`, Pincho en `(x = 240, row = 12)`, `bestRow = 12`, 5 macetas vacías, `timeLeft = 30`, `hopCooldown = 0`, sin salto en espera, carriles en su posición inicial. Igual que el HUD.
- `score` suma:
  - `STEP_POINTS` (10) cada vez que un salto hacia arriba deja a Pincho en una fila `1–11` menor que `bestRow`; entonces `bestRow` pasa a esa fila. Volver atrás y avanzar de nuevo no suma.
  - Al entrar en una maceta vacía: `POT_POINTS` (50) + `TIME_BONUS_PER_SEC × floor(timeLeft)`.
  - Al llenar la quinta maceta: además `LEVEL_CLEAR_POINTS` (1000).
- `level` sube en 1 cada vez que las 5 macetas quedan llenas. En este spec el nivel no cambia carriles, velocidades ni reloj: lo hace el spec 02.
- `lives` baja en 1 en el instante de la muerte. Si queda en 0, la partida termina al acabar la animación de muerte.
- Salto (`hop`):
  - Desplaza a Pincho exactamente una celda (40 px o una fila) en la dirección pulsada.
  - Se ignora si deja `x` fuera de `[0, 480]`, si baja de la fila 12 o si `state` no es `"playing"`.
  - Si la fila de destino no es de río (0, 6–12), `x` se ajusta a la columna más cercana: `x = round(x / 40) × 40`, limitado a `[0, 480]`.
  - Cada pulsación nueva guarda su dirección en `pendingHop` (sustituye a la anterior). El salto se aplica cuando `hopCooldown ≤ 0`, y entonces `hopCooldown = 0.1`.
- Centro de Pincho: `cx = player.x + 20`.
- En la carretera, hay atropello si en la misma fila se solapan `[x + 8, x + 32]` y `[obj.x + 2, obj.x + len × 40 − 2]` (solape estricto).
- En el río, Pincho está a salvo si `cx` está en `[obj.x, obj.x + len × 40]` de algún tronco de su fila. Si no, cae al agua.
- Arrastre: si Pincho está sobre un tronco al empezar el frame, se desplaza `speed × dt` con él. Si `cx < 0` o `cx > W`, muere ahogado.
- Llegada a la fila 0: se busca la maceta `i` con `|cx − (GOAL_COLS[i] × 40 + 20)| ≤ 14`. Si existe y está vacía, se llena. Si no existe o ya está llena, Pincho muere contra el seto (`"splat"`).
- Tras llenar una maceta (sin llenar las 5, o tras subir de nivel), Pincho reaparece en `(240, 12)` con `bestRow = 12`, `timeLeft = 30`, `hopCooldown = 0` y sin salto en espera. No es una muerte y no resta vida.
- Muerte: `state = "dying"`, `deathTimer = 0.8`, se guarda la posición y el tipo (`"water"` si cae al agua o sale del canvas por el río, `"splat"` en el resto). `pendingHop` se vacía. Al llegar `deathTimer` a 0, si `lives > 0`, Pincho reaparece como tras una maceta; si no, `state = "gameover"`.
- Orden de un `update(dt)`:
  1. Si `state === "dying"`: mover carriles, descontar `deathTimer` y, al llegar a 0, reaparecer o terminar. Fin del paso.
  2. Si Pincho está en el río, buscar el tronco bajo `cx` (`ride`).
  3. Mover todos los objetos de todos los carriles. Si hay `ride`, sumar `ride.speed × dt` a `player.x`.
  4. Descontar `hopCooldown`. Si hay `pendingHop` y `hopCooldown ≤ 0`, aplicar el salto, los puntos de avance y, si llega a la fila 0, resolver la maceta (puede llenar, subir de nivel o matar).
  5. Descontar `timeLeft`. Si llega a 0, muerte `"splat"`.
  6. Comprobar colisiones de la fila actual: atropello en carretera; agua o salida del canvas en el río.
- Dibujo (de atrás adelante): filas de fondo, objetos de los carriles, macetas (vacías o con un Pincho sentado), Pincho (o la papilla / las ondas si está muriendo), franja del reloj.
- Colores del canvas:
  - Seto `#0f3d22` con hojas `#0a2a17`; maceta `#c2603a` con borde `#e07a4f`.
  - Río `#0b2a4a` con ondas `#12406b`; tronco `#7a4a24` con vetas `#5a3418` y extremos `#a8703c`.
  - Mediana y acera `#2a1f3d` con borde `#4a3a6a`.
  - Carretera `#14141c` con líneas discontinuas `#3a3a4a` (16 px de trazo y 16 de hueco) entre carriles.
  - Pincho: cuerpo `#39ff6a`, espinas `#b6ffc8`, ojos `#05070a`, con `shadowBlur` 8 del color del cuerpo.
  - Papilla `#39ff6a` y `#1d8a3a`; ondas de ahogo `#7fd4ff`.
  - Vehículos: color de su carril, ventanas y ruedas `#05070a`, faros `#fff6c2`.
  - Franja del reloj: fondo `#05070a`, rótulo `TIEMPO` en `#8a8aa0` (`700 12px monospace`, en `x = 20`, centrado en la fila 13), barra de fondo `#1a1a24` en `x = 120`, `y = 532`, 300×16 px, relleno proporcional a `timeLeft / 30`: `#39ff6a` con más de 10 s, `#ffd23f` entre 10 y 5 s, `#ff3f5a` con 5 s o menos. La zona `x ∈ [430, 520)` queda libre.
- Pixel-art en `sprites.ts`, 10×10 píxeles lógicos a escala 4 (una celda), salvo `TRUCK` (20×10). `drawArt(ctx, art, x, y, flip)` pinta con `fillRect`, recibe el contexto como parámetro y `flip` invierte en horizontal. Matrices: `CACTUS` (Pincho de frente, brazos en U, espinas claras, dos ojos), `POT` (maceta), `SPLAT` (papilla aplastada), `CAR`, `MOTO`, `SPORT` y `TRUCK` (vistos desde arriba, mirando a la derecha; se usa `flip` en carriles con `speed < 0` y el color principal se toma del carril). Los troncos y las ondas se dibujan con primitivas.

---

## Plan de implementación

Antes del paso 1: leer `.claude/skills/new-game/integration.md`, `lib/game-engine.ts`, `components/games/registry.ts`, `lib/games/serpentina/` y `lib/games/caida/` (motores de referencia); revisar en `node_modules/next/dist/docs/` lo relativo a Client Components si hace falta (ver CLAUDE.md).

1. Aplicar con `apply_migration` el SQL del modelo de datos y guardarlo en `supabase/migrations/<timestamp>_update_game_travesia.sql`. Reiniciar `npm run dev` para que `getGameIds()` vea el `id` nuevo. Verificación: `execute_sql` muestra la fila `travesia` con `title = 'TRAVESÍA'`, el `short` y el `long` nuevos, `cat = 'ARCADE'`, `color = 'green'`, `cover = 'cover-rana'` y `sort_order = 8`, y no existe la fila `ranaria`. `/juegos` muestra la card TRAVESÍA en el mismo lugar que RANARIA. `/juegos/travesia/jugar` abre con el simulador.
2. Crear `lib/games/travesia/constants.ts` con los tipos, las constantes y `LANES` del modelo de datos. Verificación: `npx tsc --noEmit`; cada carril cumple `count × spacing × 40 ≥ 520 + len × 40`.
3. Crear `lib/games/travesia/sprites.ts` con `CACTUS`, `POT`, `SPLAT`, `CAR`, `MOTO`, `SPORT`, `TRUCK` y `drawArt`. Verificación: tipos, `npx eslint lib`, y cada `rows` tiene 10 filas de 10 caracteres (20 en `TRUCK`) con claves presentes en su `palette` o `.` transparente.
4. Crear `lib/games/travesia/lanes.ts` con funciones puras: `buildLanes()`, `moveLanes(lanes, dt)`, `isRiverRow(row)`, `isRoadRow(row)`, `rideAt(lane, cx)` (tronco bajo `cx` o `null`), `hitsVehicle(lane, x)`, `goalIndexAt(cx)` (índice de maceta o `-1`), `snapX(x)` y `canHop(player, dir)`. Verificación: tipos y lint; `goalIndexAt(60)` devuelve 0, `goalIndexAt(250)` devuelve 2 y `goalIndexAt(100)` devuelve −1.
5. Crear `lib/games/travesia/render.ts` con `drawField`, `drawLanes`, `drawPots`, `drawPlayer` (Pincho, papilla u ondas) y `drawTimer`. Recibe el contexto como parámetro. Verificación: tipos y lint.
6. Crear `lib/games/travesia/engine.ts` con `createTravesiaEngine: CreateGameEngine`. Incluye el estado en cierre, `update` en el orden del modelo de datos, `respawn`, `killPlayer(kind)`, `draw`, loop con `requestAnimationFrame` y `dt = min((ts − lastTime)/1000, MAX_DT)`, `pause`/`resume` sin acumular `dt`, `onStats`, `onGameOver` y `destroy`. Sin HUD ni overlays. Verificación: tipos y lint.
7. Entrada en el motor según `integration.md`: `keydown`/`keyup` en `window` con `GAME_KEYS` = las 8 teclas, mapeadas a `Dir`. El `keydown` sin `e.repeat` guarda la dirección en `pendingHop` solo con la partida activa y `state === "playing"`. `pause()` vacía `pendingHop`. Todo se registra en `start()` y se quita en `destroy()`. Verificación: tipos y lint.
8. Registrar `travesia` en `REAL_GAMES` importando `W`, `H` e `INITIAL_LIVES` de `lib/games/travesia/constants.ts`. Verificación: `npm run dev`, jugar `/juegos/travesia/jugar`: los carriles se mueven, Pincho salta con flechas y WASD, el primer salto hacia arriba suma 10 en el HUD y un vehículo le quita una vida.
9. Verificar el guardado: con sesión, terminar una partida y guardar crea una fila en `scores` con `game_id = "travesia"` y el `score`/`level` reales; sin sesión se ve "INICIA SESIÓN PARA GUARDAR". La puntuación aparece en `/salon` (pestaña TRAVESÍA y GLOBAL) y `best`/`plays` cambian en `/juegos/travesia`. Verificación: `execute_sql` de lectura sobre `scores`.
10. Revisión final: checks de la sección 8 de `integration.md`, `npx eslint app components lib`, `npm run build` y partida completa con la consola abierta.

---

## Criterios de aceptación

Plataforma:

- [ ] `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos`, `/juegos/travesia`, `/juegos/travesia/jugar` y `/salon`.
- [ ] `games` contiene la fila `travesia` con `title`, `short` y `long` del spec, `cat = 'ARCADE'`, `color = 'green'`, `cover = 'cover-rana'` y `sort_order = 8`; ya no existe la fila `ranaria`.
- [ ] `/juegos` muestra TRAVESÍA con la portada `cover-rana` en el lugar que ocupaba RANARIA.
- [ ] `lib/games/travesia/` no usa `document`, `getElementById`, `Image`, `Audio` ni `localStorage`, y `window` solo para los listeners de teclado.
- [ ] No existe `public/games/travesia/`.
- [ ] El HUD muestra puntuación, nivel y 3 corazones; el canvas no dibuja puntuación, nivel, vidas ni overlays de pausa o fin.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final y el motor deja de aceptar entradas.
- [ ] "FIN" abre el modal con la puntuación actual; "JUGAR DE NUEVO" reinicia con `score = 0`, `level = 1`, 3 vidas, macetas vacías, reloj lleno y Pincho en la acera de salida.
- [ ] PAUSA congela carriles, reloj y animación de muerte; REANUDAR continúa sin saltos. Ocultar la pestaña pausa sin que los vehículos ni el reloj avancen de golpe al volver.
- [ ] Las flechas no hacen scroll mientras se juega; fuera de la partida el scroll funciona y WASD se puede escribir en campos de texto.
- [ ] Salir y volver a entrar no duplica el loop ni los listeners (una pulsación de ↑ sube exactamente una fila y el bólido de la fila 8 cruza el canvas en unos 4 s, no en 2).
- [ ] El canvas mantiene la proporción 520:560 (13:14) en distintos anchos de ventana.
- [ ] Con sesión, "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `game_id = "travesia"`, `score` y `level` de la partida; sin sesión no inserta nada.
- [ ] La puntuación aparece en `/salon` (pestaña TRAVESÍA y GLOBAL) y `best`/`plays` de `/juegos/travesia` se actualizan tras recargar.
- [ ] `/juegos/ranaria` ya no existe tras `npm run build` (404).
- [ ] ASTEROIDES, CAÍDA, BLOQUE BUSTER, SERPENTINA y los juegos simulados se comportan igual que antes.

Juego:

- [ ] Al arrancar se ven, de arriba abajo: seto con 5 macetas vacías en las columnas 1, 3, 6, 9 y 11; 5 carriles de río con troncos; la mediana; 5 carriles de carretera con vehículos; la acera con Pincho en la columna 6; y la barra del reloj llena en verde.
- [ ] Pincho es un cactus verde neón de pixel-art 10×10 con espinas claras y dos ojos, distinto de cualquier personaje comercial.
- [ ] Los carriles se mueven desde el primer frame, sin tecla de inicio, con las velocidades y sentidos de `LANES`.
- [ ] Ningún vehículo ni tronco aparece o desaparece de golpe dentro del canvas: entran y salen por los bordes.
- [ ] Los vehículos se dibujan mirando hacia su sentido de marcha; el camión ocupa 2 celdas.
- [ ] `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` hacen saltar a Pincho exactamente una celda arriba, abajo, izquierda o derecha.
- [ ] Mantener pulsada una tecla produce un solo salto; las repeticiones del sistema operativo se ignoran.
- [ ] Dos pulsaciones en menos de 0,1 s producen dos saltos seguidos separados 0,1 s; una tercera en ese intervalo sustituye a la segunda.
- [ ] Desde la acera de salida, ↓ no hace nada; en la columna 0, ← no hace nada; en la columna 12, → no hace nada.
- [ ] Cada fila nueva alcanzada hacia arriba (filas 11 a 1) suma 10 puntos; volver atrás y avanzar de nuevo no suma. Cruzar de la acera a la fila 1 suma 110.
- [ ] Tocar un vehículo en la carretera quita una vida y muestra la papilla verde durante 0,8 s.
- [ ] Sobre un tronco, Pincho se desplaza con él a su misma velocidad.
- [ ] Saltar a una fila de río fuera de un tronco, o quedarse en el río cuando el tronco ya no está bajo su centro, quita una vida y muestra las ondas de ahogo.
- [ ] Si un tronco arrastra a Pincho hasta que su centro sale del canvas, muere ahogado.
- [ ] Al saltar del río a la mediana o a la orilla, Pincho queda alineado a la columna más cercana.
- [ ] Entrar en una maceta vacía la muestra ocupada por un Pincho sentado, suma `50 + 10 × floor(segundos restantes)` y devuelve a Pincho a la acera con el reloj lleno, sin perder vida.
- [ ] Cruzar sin volver atrás y entrar en la primera maceta con 21,6 s restantes deja el HUD en 370 puntos: `110 + 50 + 210`.
- [ ] Llegar a la fila 0 sobre el seto, o a una maceta ya ocupada, quita una vida con la papilla.
- [ ] El reloj baja de 30 s a 0 con el tiempo de juego; la barra pasa a amarillo con 10 s y a rojo con 5 s.
- [ ] Agotar el reloj quita una vida con la papilla.
- [ ] Al llenar la quinta maceta se suman además 1000 puntos, el HUD sube 1 nivel, las 5 macetas quedan vacías y Pincho vuelve a la acera.
- [ ] Durante la animación de muerte los carriles siguen moviéndose, el reloj no corre y las teclas no hacen nada.
- [ ] Tras una muerte con vidas restantes, Pincho reaparece en la acera, columna 6, con el reloj lleno; las macetas llenas siguen llenas.
- [ ] Al perder la tercera vida, el HUD muestra 0 vidas, la papilla se ve 0,8 s y después se llama a `onGameOver` con el nivel actual.
- [ ] Las teclas P y Escape no pausan ni hacen nada en el canvas.

---

## Decisiones tomadas y descartadas

- **Sí:** motor TypeScript que cumple `CreateGameEngine` y se registra en `REAL_GAMES`; HUD, pausa, modal y guardado de la plataforma. Precedente de SPEC 05, 07, 08 y 09. **No:** un juego fuera del contrato o embebido en `iframe`.
- **Sí:** el juego ocupa la fila de RANARIA, el simulado del mismo género, conservando `cat`, `color`, `cover` y `sort_order`. Convierte un simulado en real, como CAÍDA, BLOQUE BUSTER y SERPENTINA. **No:** una fila nueva junto a RANARIA (dos juegos de cruce, uno falso).
- **Sí:** cambiar el `id` de la fila a `travesia` y su `title` a TRAVESÍA. El encargo pide un nombre y un protagonista originales, y `ranaria` remite a una rana. La fila tiene 0 puntuaciones, así que la migración puede cambiar la clave sin romper la FK de `scores`. **No:** conservar `id` y título `ranaria` (la URL hablaría de una rana que no existe en el juego). **No:** insertar `travesia` y borrar `ranaria` en dos operaciones (mismo efecto, más SQL).
- **Sí:** el `delete` de `scores` con `game_id = 'ranaria'` va antes del `update` en la misma migración. Hoy hay 0 filas, pero si alguien guardara una partida del simulador antes de aplicarla, la FK sin `on update cascade` haría fallar el cambio de `id`. **No:** conservar puntuaciones simuladas (no son de este juego).
- **Sí:** nombre original en español (TRAVESÍA) y protagonista propio, Pincho, un cactus de neón. El agua lo ahoga y su casa es una maceta, así que las reglas del género tienen sentido dentro de su mundo. **No:** una rana, el nombre "Frogger" o derivados, ni arte o personajes de juegos comerciales.
- **Sí:** conservar la portada `.cover-rana` (franjas cian y un círculo verde). Encaja con carriles y un cactus verde, y evita tocar `app/globals.css`. **No:** una portada nueva (fuera de alcance; el nombre de la clase no es visible).
- **Sí:** tablero de 13×14 celdas de 40 px (520×560), con la última fila reservada para el reloj. **No:** 600×600 (celdas no enteras con 13 columnas) ni el reloj fuera del canvas (exigiría tocar el HUD de la plataforma).
- **Sí:** la barra del reloj dentro del canvas. Es un elemento del juego, como el panel `LÍNEAS` de CAÍDA. **No:** añadir el tiempo al HUD (cambio de plataforma).
- **Sí:** 3 vidas que el HUD muestra como corazones. El género pierde vidas por contacto y el HUD ya las soporta. **No:** `lives` constante 1 (cada error acabaría la partida).
- **Sí:** un salto por pulsación, sin repetición al mantener la tecla, con un salto en espera y 0,1 s entre saltos. Evita saltos involuntarios sobre el tráfico y no pierde pulsaciones rápidas. **No:** repetición del sistema operativo (salta varias celdas sin querer) ni descartar pulsaciones durante el enfriamiento.
- **Sí:** saltos instantáneos sin animación de vuelo. Simplifica las colisiones a la posición actual. **No:** interpolar el salto (exige reglas de colisión a mitad de salto).
- **Sí:** en el río la posición es fraccional y se alinea a la columna al pisar tierra. Es la regla natural de ir montado en un tronco. **No:** alinear también en el río (Pincho daría tirones sobre el tronco).
- **Sí:** puntos por fila nueva, por maceta y por segundo sobrante, y 1000 por llenar las 5. Premian avanzar, llegar y hacerlo rápido. **No:** puntos solo por maceta (sin incentivo para arriesgar en cada fila).
- **Sí:** la muerte resta la vida al instante y el game over llega tras 0,8 s de animación. El HUD refleja la pérdida en cuanto ocurre y el jugador ve qué le mató. **No:** `onGameOver` inmediato (el modal taparía la papilla).
- **Sí:** en este spec subir de nivel solo cambia el número del HUD y vacía las macetas. La dificultad por nivel va en el spec 02. **No:** meter la curva de dificultad aquí (el spec dejaría de ser incremental).
- **Sí:** arte en pixel-art dibujado en código con matrices 10×10 y primitivas. **No:** imágenes en `public/` ni assets de `references/source-assets/`.
- **Sí:** el reloj y los carriles usan el `dt` del juego, limitado a 0,05 s. Así la pausa y la pestaña oculta no consumen tiempo. **No:** `setInterval` ni `performance.now()` absoluto.
- **Sí:** sin teclas propias de pausa, reinicio ni selector de nivel; los sustituyen PAUSA/REANUDAR, FIN y JUGAR DE NUEVO. **No:** dos formas de pausar.
- **Sí:** sin sonido. La plataforma no tiene sistema de audio. **No:** efectos con `Audio` en el motor.

---

## Riesgos identificados

| Riesgo                                                                         | Mitigación                                                                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y duplica loop o listeners               | `destroy()` cancela el frame y quita los listeners; se verifica la velocidad del bólido y que ↑ sube una sola fila al volver.                 |
| `generateStaticParams` cacheado no incluye el `id` nuevo                       | `getGameIds()` se cachea por horas: reiniciar `npm run dev` tras la migración y verificar con `npm run build`.                                |
| El cambio de `id` falla por la FK de `scores`                                  | El `delete` de `scores` de `ranaria` va antes del `update` en la misma migración.                                                             |
| Enlaces o cachés antiguas a `/juegos/ranaria`                                  | No hay referencias en el código (`grep` sin resultados fuera de la migración inicial); la ruta pasa a dar 404, como cualquier id inexistente. |
| Un vehículo rápido atraviesa a Pincho entre dos frames                         | Con `MAX_DT = 0,05` el bólido avanza como mucho 7 px por frame, menos que la caja de colisión de Pincho (24 px).                              |
| Pincho muere al saltar a un tronco porque el tronco se movió en el mismo frame | Los carriles se mueven antes de aplicar el salto y la colisión se comprueba al final del paso con las posiciones ya actualizadas.             |
| Pulsaciones durante la pausa o la muerte se aplican después                    | `pause()` y `killPlayer` vacían `pendingHop`; el `keydown` solo lo rellena con la partida activa y `state === "playing"`.                     |
| Un tronco recién envuelto aparece bajo Pincho de golpe                         | `loop ≥ W + len × CELL` en todos los carriles: los objetos se envuelven fuera del canvas.                                                     |
| WASD intercepta la escritura en formularios de la página                       | `preventDefault` solo con la partida activa y nunca si el destino es `input`, `textarea`, `select` o editable.                                |

---

## Qué **no** entra en este spec

- Curva de dificultad, patos de goma y trazados por nivel (spec 02).
- Flor bonus, nube de riego, racha, vida extra y victoria final (spec 03).
- Controles táctiles, gamepad, sonido y música.
- Nueva portada.
- Cambios en el HUD, el marco CRT, `GamePlayer`, `saveScore` o los rankings.
- Anti-trampas y tests automatizados.
