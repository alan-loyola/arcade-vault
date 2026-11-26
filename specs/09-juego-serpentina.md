# SPEC 09 — Juego SERPENTINA: crear el juego de la serpiente en la plataforma

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-26
> **Objetivo:** Crear un juego de serpiente original como juego real en `/juegos/serpentina/jugar`, reemplazando al simulador de SERPENTINA e integrado con el HUD, la pausa, el guardado de puntuaciones y los rankings existentes.

---

## Por qué existe este spec

SERPENTINA (`serpentina`) está en el catálogo pero es simulado: suma puntos aleatorios sobre una arena CSS. No hay código de referencia: el juego sale del diseño acordado con el usuario en este spec. En `references/source-assets/snake-assets/` hay un `fruits.png` con un `sprites.js`, pero su cabecera indica que el arte está extraído de un juego comercial, así que **no se usa**. Las frutas se dibujan como pixel-art original en código. El motor cumple el contrato `CreateGameEngine` y se registra en `REAL_GAMES` bajo el id `serpentina`.

---

## Alcance

**Dentro:**

- Migración en `supabase/migrations/` que actualiza la columna `long` de la fila `serpentina` de `public.games`. `id`, `title`, `short`, `cat`, `color`, `cover` y `sort_order` no cambian. La fila tiene 0 puntuaciones, así que no se borra nada de `scores`.
- Motor TypeScript en `lib/games/serpentina/`: `constants.ts`, `fruits.ts` (matrices de pixel-art y `drawFruit`), `snake.ts` (lógica pura del tablero), `render.ts` (dibujo con contexto inyectado) y `engine.ts` (`createSerpentinaEngine`). Sin globals ni acceso al DOM; recibe el canvas y los callbacks de `CreateGameEngine`.
- Entrada `serpentina` en `REAL_GAMES` (`components/games/registry.ts`) con resolución 480×480, vidas iniciales 1 y controles "← ↑ → ↓ / WASD MOVER".
- Tablero de 20×20 celdas de 24 px, muerte al chocar con la pared o con el propio cuerpo.
- Fruta normal (4 dibujos: manzana, cereza, uva, limón) y fruta bonus temporal (estrella dorada).
- Nivel +1 cada 5 frutas normales, con más velocidad por nivel.
- Victoria al ocupar las 400 celdas, terminada con `onGameOver` como un game over.
- Entrada por teclado (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`) con `preventDefault` solo de esas teclas y solo con la partida activa.
- HUD, PAUSA/REANUDAR, FIN, modal de fin de partida, guardado con `saveScore`, pestaña en `/salon`, ranking global y `best`/`plays` son los existentes de la plataforma, sin cambios.

**Fuera de alcance (para otros specs):**

- Controles táctiles / móvil.
- Sonido y música.
- Usar `references/source-assets/snake-assets/fruits.png` o `sprites.js` (arte de un juego comercial). No se copia nada a `public/`.
- Modo con paredes atravesables, obstáculos, varias vidas o mapas por nivel.
- Nueva portada: se conserva `.cover-snake`.
- Cambios en `GamePlayer`, `GameCanvas`, el HUD, el marco CRT, `saveScore` o los rankings.
- Anti-trampas o verificación de puntuaciones (heredado de SPEC 04).
- Tests automatizados.

---

## Modelo de datos

No introduce tablas ni cambios de esquema: reutiliza `games`, `scores`, `game_stats` y `global_ranking` (SPEC 06). `lib/supabase/database.types.ts` no se regenera.

```sql
-- supabase/migrations/<timestamp>_update_game_serpentina.sql
update public.games
set long = 'Guía la serpiente de neón con las flechas o WASD y come frutas para crecer: cada una vale 10 puntos por nivel. Cada cinco frutas sube el nivel, la serpiente acelera y aparece durante seis segundos una estrella dorada que vale 50 puntos por nivel. Chocar con la pared o con tu propia cola termina la partida.'
where id = 'serpentina';
```

```ts
// components/games/registry.ts — entrada nueva
serpentina: {
  createEngine: createSerpentinaEngine,
  width: SERPENTINA_W,   // 480
  height: SERPENTINA_H,  // 480
  controls: "← ↑ → ↓ / WASD MOVER",
  initialLives: SERPENTINA_LIVES, // 1
  label: "Juego SERPENTINA",
},
```

```ts
// lib/games/serpentina/ — estructuras
type Dir = "up" | "down" | "left" | "right";
interface Cell {
  x: number;
  y: number;
} // 0–19, origen arriba a la izquierda
type FruitKind = "apple" | "cherry" | "grape" | "lemon";
interface Fruit extends Cell {
  kind: FruitKind;
}
interface Bonus extends Cell {
  remaining: number;
} // ms de juego restantes
type PixelArt = { palette: Record<string, string>; rows: string[] }; // 8 filas de 8 caracteres
```

Convenciones:

- Constantes en `constants.ts`:
  - `COLS = 20`, `ROWS = 20`, `CELL = 24`, `W = 480`, `H = 480`.
  - `INITIAL_LIVES = 1`, `INITIAL_LENGTH = 3`, `START_HEAD = { x: 10, y: 10 }`, `START_DIR = "right"`.
  - `TICK_BASE = 150`, `TICK_STEP = 10`, `TICK_MIN = 60` (ms). Intervalo de paso: `max(TICK_MIN, TICK_BASE − TICK_STEP × (level − 1))`.
  - `FRUIT_POINTS = 10`, `BONUS_POINTS = 50`, `FRUITS_PER_LEVEL = 5`.
  - `BONUS_DURATION = 6000`, `BONUS_BLINK_START = 2000`, `BONUS_BLINK_PERIOD = 200` (ms).
  - `DIR_QUEUE_MAX = 2`, `MAX_DT = 0.05` (s).
  - Colores: fondo `#05070a`, cuadrícula `#0f1a14`, cuerpo `#39ff6a`, cabeza `#b6ffc8`, ojos `#05070a`.
- `fruits.ts` define `FRUIT_ART: Record<FruitKind, PixelArt>` y `BONUS_ART` (estrella dorada `#ffd700`), cada uno de 8×8 píxeles lógicos a escala 3 (24 px = una celda). `drawFruit(ctx, art, cellX, cellY)` pinta con `fillRect` y recibe el contexto como parámetro.
- Estado del motor en variables de cierre dentro de `createSerpentinaEngine`: `snake: Cell[]` (cabeza en `[0]`), `dir`, `dirQueue: Dir[]`, `fruit`, `bonus | null`, `normalEaten`, `score`, `level`, `lives`, `tickAcc` (ms), `state` (`"playing" | "gameover"`).
- `onStats` solo cuando cambian `score`, `level` o `lives`; `onGameOver` una sola vez por partida.
- Estado inicial: `score = 0`, `level = 1`, `lives = 1`, serpiente en `(10,10)`, `(9,10)`, `(8,10)` moviéndose a la derecha, `normalEaten = 0`, sin bonus, una fruta normal en una celda libre al azar. Igual que el HUD.
- `score`: fruta normal suma `FRUIT_POINTS × level` con el nivel en el momento de comerla. Bonus suma `BONUS_POINTS × level` con el nivel en el momento de comerlo.
- `level`: tras sumar los puntos de una fruta normal, `normalEaten` sube en 1. Si `normalEaten % 5 === 0`, `level` sube en 1 y aparece un bonus con `remaining = 6000`. El bonus no cuenta para el nivel.
- `lives` es la constante 1: el juego no tiene vidas y el choque es el único final, además de la victoria.
- Orden de un paso (`step`):
  1. Tomar la primera dirección de `dirQueue`, si hay.
  2. Calcular la nueva cabeza.
  3. Si sale del tablero, fin.
  4. Comprobar si come fruta normal o bonus.
  5. Si no come, quitar la cola.
  6. Si la nueva cabeza coincide con un segmento del cuerpo resultante, fin.
  7. Insertar la cabeza.
  8. Aplicar puntos, nivel y aparición de frutas.
  9. Si la longitud es 400, victoria.
- Mover la cabeza a la celda que la cola libera en ese mismo paso es legal (la cola se quita antes de comprobar).
- Cola de giros: cada pulsación compara con la última dirección de `dirQueue` (o con `dir` si está vacía). Se ignora si es la misma o la opuesta, o si la cola ya tiene 2 entradas.
- Aparición: la fruta normal y el bonus se colocan al azar uniforme entre las celdas que no ocupan la serpiente ni la otra fruta. Si se come la fruta normal, aparece otra en el mismo paso. Si ya hay un bonus cuando toca otro, el nuevo lo sustituye. Si no hay celda libre, no aparece.
- El bonus descuenta `remaining` con el `dt` del juego (no corre en pausa) y desaparece al llegar a 0. Durante sus últimos 2000 ms se dibuja solo en semiperiodos alternos de 200 ms.
- Al morir, la serpiente queda dibujada en su último estado válido (la cabeza no entra en la pared ni en el cuerpo).
- Colores del canvas: los de `constants.ts`. La serpiente usa `shadowBlur` con el color del cuerpo para el brillo neón.

---

## Plan de implementación

Antes del paso 1: leer `.claude/skills/new-game/integration.md`, `lib/game-engine.ts`, `components/games/registry.ts`, `lib/games/caida/` y `lib/games/asteroids/` (motores de referencia); revisar en `node_modules/next/dist/docs/` lo relativo a Client Components si hace falta (ver CLAUDE.md).

1. Aplicar con `apply_migration` el `update` de `long` de la fila `serpentina` y guardar el SQL en `supabase/migrations/<timestamp>_update_game_serpentina.sql`. Verificación: `execute_sql` muestra el nuevo `long` y el resto de columnas iguales; `/juegos/serpentina` muestra la descripción nueva; `/juegos/serpentina/jugar` sigue abriendo el simulador.
2. Crear `lib/games/serpentina/constants.ts` con todos los valores del modelo de datos. Verificación: `npx tsc --noEmit`.
3. Crear `lib/games/serpentina/fruits.ts` con `FRUIT_ART`, `BONUS_ART` y `drawFruit`. Verificación: tipos, `npx eslint lib`, y cada `rows` tiene 8 filas de 8 caracteres con claves presentes en su `palette`.
4. Crear `lib/games/serpentina/snake.ts` con funciones puras: `initialSnake`, `nextHead`, `isOutOfBounds`, `hitsBody`, `freeCells`, `randomFreeCell(cells, rand)`, `enqueueDir` y `tickInterval(level)`. Verificación: tipos y lint; `tickInterval` da 150, 140 y 60 para los niveles 1, 2 y 10 o más.
5. Crear `lib/games/serpentina/render.ts` con `drawBoard`, `drawSnake` (cabeza con ojos según `dir`) y el dibujo de fruta y bonus (con parpadeo). Recibe el contexto como parámetro. Verificación: tipos y lint.
6. Crear `lib/games/serpentina/engine.ts` con `createSerpentinaEngine: CreateGameEngine`. Incluye estado en cierre, `step` en el orden del modelo de datos, acumulador `tickAcc` alimentado con `dt` en ms y un `while (tickAcc >= tickInterval(level))`, loop con `requestAnimationFrame` y `dt = min((ts − lastTime)/1000, MAX_DT)`, `pause`/`resume` sin acumular `dt`, `onStats`, `onGameOver` (choque y victoria) y `destroy`. Sin HUD ni overlays. Verificación: tipos y lint.
7. Entrada en el motor según `integration.md`: `keydown`/`keyup` en `window` con `GAME_KEYS` = las 8 teclas, mapeadas a `Dir` y pasadas a `enqueueDir` en el `keydown` solo con la partida activa. Todo se registra en `start()` y se quita en `destroy()`. Verificación: tipos y lint.
8. Registrar `serpentina` en `REAL_GAMES` importando `W`, `H` e `INITIAL_LIVES` de `lib/games/serpentina/constants.ts`. Verificación: `npm run dev`, jugar `/juegos/serpentina/jugar`: la serpiente avanza sola, gira con flechas y WASD, y al comer una fruta crece y el HUD suma 10.
9. Verificar el guardado: con sesión, terminar una partida y guardar crea una fila en `scores` con `game_id = "serpentina"` y el `score`/`level` reales; sin sesión se ve "INICIA SESIÓN PARA GUARDAR". La puntuación aparece en `/salon` (pestaña SERPENTINA y GLOBAL) y `best`/`plays` cambian en `/juegos/serpentina`. Verificación: `execute_sql` de lectura sobre `scores`.
10. Revisión final: checks de la sección 8 de `integration.md`, `npx eslint app components lib`, `npm run build` y partida completa con la consola abierta.

---

## Criterios de aceptación

Plataforma:

- [ ] `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos`, `/juegos/serpentina`, `/juegos/serpentina/jugar` y `/salon`.
- [ ] `games` contiene la fila `serpentina` con el `long` nuevo y el mismo `title`, `short`, `cat`, `color`, `cover` y `sort_order` de antes; `/juegos` la muestra con la portada `cover-snake`.
- [ ] `lib/games/serpentina/` no usa `document`, `getElementById`, `Image`, `Audio` ni `localStorage`, y `window` solo para los listeners de teclado.
- [ ] No existe `public/games/serpentina/` y ningún archivo del repo fuera de `references/` referencia `fruits.png`.
- [ ] El HUD muestra puntuación, nivel y un corazón; el canvas no dibuja HUD ni overlays de pausa o fin.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final y el motor deja de aceptar entradas.
- [ ] "FIN" abre el modal con la puntuación actual; "JUGAR DE NUEVO" reinicia con `score = 0`, `level = 1`, 1 vida y la serpiente de 3 segmentos en el centro.
- [ ] PAUSA congela la serpiente y el temporizador del bonus; REANUDAR continúa sin saltos. Ocultar la pestaña pausa sin que la serpiente avance varias celdas de golpe al volver.
- [ ] Las flechas no hacen scroll mientras se juega; fuera de la partida el scroll funciona y WASD se puede escribir en campos de texto.
- [ ] Salir y volver a entrar no duplica el loop ni los listeners (la serpiente avanza una celda cada 150 ms en el nivel 1, no al doble).
- [ ] El canvas mantiene la proporción 1:1 en distintos anchos de ventana.
- [ ] Con sesión, "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `game_id = "serpentina"`, `score` y `level` de la partida; sin sesión no inserta nada.
- [ ] La puntuación aparece en `/salon` (pestaña SERPENTINA y GLOBAL) y `best`/`plays` de `/juegos/serpentina` se actualizan tras recargar.
- [ ] ASTEROIDES, CAÍDA, BLOQUE BUSTER y los juegos simulados se comportan igual que antes.

Juego:

- [ ] Al arrancar se ve un tablero 20×20 con cuadrícula `#0f1a14` sobre fondo `#05070a`, una serpiente verde neón de 3 segmentos con la cabeza en la celda `(10,10)` y una fruta normal en una celda libre.
- [ ] La serpiente avanza sola hacia la derecha desde el primer frame, sin tecla de inicio.
- [ ] `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` giran arriba, abajo, izquierda y derecha.
- [ ] Pulsar la dirección opuesta a la actual no hace nada; la serpiente nunca invierte 180° sobre sí misma.
- [ ] Dos giros pulsados dentro del mismo paso (p. ej. ↑ y luego ← yendo a la derecha) se aplican en dos pasos consecutivos; un tercero en ese intervalo se ignora.
- [ ] La cabeza se dibuja en `#b6ffc8` con dos ojos orientados según la dirección.
- [ ] La fruta normal se dibuja como una de 4 figuras de pixel-art 8×8 (manzana, cereza, uva, limón) elegida al azar en cada aparición.
- [ ] Comer una fruta normal alarga la serpiente 1 segmento, suma `10 × nivel` y hace aparecer otra fruta en una celda libre en el mismo paso.
- [ ] Al comer la 5.ª, 10.ª, 15.ª… fruta normal, el HUD sube 1 nivel y aparece una estrella dorada en una celda libre.
- [ ] El intervalo de paso es 150 ms en el nivel 1, baja 10 ms por nivel y se queda en 60 ms desde el nivel 10.
- [ ] La estrella dura 6 s de juego, parpadea cada 200 ms en sus últimos 2 s y desaparece si no se come.
- [ ] Comer la estrella alarga la serpiente 1 segmento, suma `50 × nivel` y no cambia el contador de frutas normales.
- [ ] Comer 5 frutas normales desde el inicio y luego la estrella deja el HUD en 150 puntos y nivel 2: `5 × 10 × 1 = 50` por las frutas y `50 × 2 = 100` por la estrella.
- [ ] La fruta y la estrella nunca aparecen sobre la serpiente ni sobre la otra fruta.
- [ ] Que la cabeza salga del tablero por cualquiera de los 4 bordes termina la partida.
- [ ] Que la cabeza entre en una celda de su cuerpo termina la partida, salvo la celda que deja la cola en ese mismo paso.
- [ ] Al morir, la serpiente queda dibujada en su último estado válido y se llama a `onGameOver` con el nivel actual.
- [ ] Si la serpiente llega a 400 segmentos se llama a `onGameOver({ score, level })` y se abre el modal.

---

## Decisiones tomadas y descartadas

- **Sí:** motor TypeScript que cumple `CreateGameEngine` y se registra en `REAL_GAMES`; HUD, pausa, modal y guardado de la plataforma. Precedente de SPEC 05, 07 y 08. **No:** un juego fuera del contrato o embebido en `iframe`.
- **Sí:** el juego real ocupa la fila `serpentina` (misma URL, título SERPENTINA y portada `cover-snake`), con `long` actualizado a las mecánicas reales. **No:** una fila nueva junto a SERPENTINA (dos juegos de serpiente, uno falso). La fila tiene 0 puntuaciones, así que no hay datos simulados que borrar.
- **Sí:** nombre original en español (SERPENTINA). **No:** nombres o marcas de juegos comerciales.
- **Sí:** frutas de pixel-art original dibujadas en código con matrices 8×8. **No:** `references/source-assets/snake-assets/fruits.png`, porque su `sprites.js` indica que es arte extraído de un juego comercial. **No:** formas simples (menos personalidad) ni esperar sprites propios del usuario (bloquearía el spec).
- **Sí:** sin assets de imagen, así que no hay carga asíncrona y el motor dibuja desde el primer frame. **No:** `new Image()` y `public/games/serpentina/`.
- **Sí:** tablero 20×20 de 24 px (480×480). Cuadrado y adecuado al marco CRT. **No:** 600×400 ni 600×600.
- **Sí:** chocar con la pared termina la partida. **No:** paredes atravesables.
- **Sí:** fruta normal `10 × nivel` y estrella bonus `50 × nivel` durante 6 s tras cada 5.ª fruta normal. Premia avanzar de nivel y arriesgar. **No:** 10 puntos fijos (sin incentivo) ni valores por tipo de fruta o bonus al azar (menos predecible).
- **Sí:** el nivel sube cada 5 frutas normales y el paso baja de 150 a 60 ms en 10 ms por nivel. **No:** cada 10 frutas ni velocidad constante.
- **Sí:** `lives` constante 1, como CAÍDA: el HUD muestra un corazón y el choque es el final. **No:** 3 vidas con reaparición (añade reglas de reaparición sin valor claro).
- **Sí:** llenar las 400 celdas es una victoria que llama a `onGameOver`. Permite guardar la partida perfecta. **No:** dejar la partida bloqueada sin celdas libres.
- **Sí:** flechas y WASD, arranque automático hacia la derecha y cola de 2 giros. La cola evita perder giros rápidos dentro de un mismo paso. **No:** esperar la primera tecla, solo flechas, o aplicar solo el último giro pulsado (permitiría girar 180° con dos teclas rápidas).
- **Sí:** pasos de tiempo fijo acumulando `dt` del loop con `requestAnimationFrame`, limitado a 0,05 s. Contrato de la plataforma. **No:** `setInterval`.
- **Sí:** el temporizador del bonus usa el `dt` del juego. Así la pausa y la pestaña oculta no lo consumen. **No:** `performance.now()` absoluto.
- **Sí:** estilo neón verde sobre negro con cuadrícula tenue, coherente con el color `green` de la fila. **No:** tablero ajedrezado ni negro liso.
- **Sí:** sin sonido. La plataforma no tiene sistema de audio. **No:** efectos con `Audio` en el motor.

---

## Riesgos identificados

| Riesgo                                                               | Mitigación                                                                                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y duplica loop o listeners     | `destroy()` cancela el frame y quita los listeners; se verifica la velocidad de 150 ms/celda al volver a entrar. |
| `generateStaticParams` cacheado no incluye el `id`                   | No aplica: `serpentina` ya existe en `games`. Se comprueba igualmente con `npm run build`.                       |
| Dos giros rápidos en el mismo paso producen un giro de 180° y muerte | Cola de giros validada contra la última dirección encolada, no contra `dir`.                                     |
| Con `dt` alto se ejecutan varios pasos en un frame y se saltan giros | `MAX_DT = 50 ms` y `TICK_MIN = 60 ms`: como mucho un paso por frame; cada paso consume un giro de la cola.       |
| Morder la cola justo cuando esta se mueve se interpreta como choque  | El paso quita la cola antes de comprobar el choque con el cuerpo, salvo cuando la serpiente come.                |
| `shadowBlur` en 400 segmentos baja los FPS                           | Se activa una sola vez para todo el cuerpo y se desactiva antes de dibujar la cuadrícula y las frutas.           |
| WASD intercepta la escritura en formularios de la página             | `preventDefault` solo con la partida activa y nunca si el destino es `input`, `textarea`, `select` o editable.   |

---

## Qué **no** entra en este spec

- Controles táctiles, gamepad, sonido y música.
- El arte de `references/source-assets/snake-assets/` o cualquier arte de juegos comerciales.
- Paredes atravesables, obstáculos, mapas por nivel o varias vidas.
- Nueva portada.
- Cambios en el HUD, el marco CRT, `GamePlayer`, `saveScore` o los rankings.
- Anti-trampas y tests automatizados.
