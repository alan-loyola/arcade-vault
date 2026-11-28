# SPEC GJ-travesia-03 — Juego TRAVESÍA: flor bonus, nube de riego, racha, vida extra y victoria

> **Estado:** Borrador
> **Depende de:** `specs/game-jam/travesia/02-travesia-progresion.md`
> **Fecha:** 2026-11-26
> **Objetivo:** Completar TRAVESÍA con una flor bonus y una nube de riego en las macetas, multiplicador por racha de llegadas, vidas extra por puntos y victoria al completar el nivel 8.

---

## Por qué existe este spec

TRAVESÍA sale de la game jam con el tema «Cruza la carretera y el río sin convertirte en papilla». Es un diseño original sin código de referencia. Tras los specs 01 y 02, el juego es real en `/juegos/travesia/jugar` (registrado en `REAL_GAMES`, motor `createTravesiaEngine: CreateGameEngine`) y tiene una curva de dificultad por nivel, pero la orilla es estática y la partida no tiene final más allá del game over.

Este spec da decisiones a la llegada: una flor que premia elegir maceta, una nube de riego que la castiga, y una racha que premia no morir. Añade vidas extra para las partidas largas y una victoria al completar el nivel 8, donde la curva del spec 02 llega a su tope. La fila `travesia` de `public.games` actualiza su `long` con estas mecánicas.

---

## Alcance

**Dentro:**

- Migración en `supabase/migrations/` que actualiza la columna `long` de la fila `travesia`. El resto de columnas no cambia y no se borra nada de `scores`.
- Flor bonus: aparece en una maceta vacía cada 8 s durante 5 s y suma 200 puntos al entrar en esa maceta.
- Nube de riego, desde el nivel 3: cubre una maceta vacía cada 11 s durante 4 s, y entrar en ella ahoga a Pincho.
- Racha de llegadas: los puntos de maceta se multiplican por el número de llegadas seguidas sin morir, hasta ×5, con el rótulo `RACHA ×n` en la franja del reloj.
- Vida extra cada 5000 puntos, hasta un máximo de 5 vidas.
- Victoria al llenar las 5 macetas del nivel 8, terminada con `onGameOver({ score, level: 8 })`.
- Archivos que cambian en `lib/games/travesia/`:
  - `constants.ts`: constantes nuevas.
  - `bonus.ts` (nuevo): funciones puras `pickPot`, `potMultiplier` y `extraLivesFor`.
  - `sprites.ts`: matrices `FLOWER` y `CLOUD`.
  - `render.ts`: flor con parpadeo, nube con gotas y rótulo de racha.
  - `engine.ts`: temporizadores de flor y nube, racha, `addScore` con vida extra, resolución de maceta ampliada y victoria.
- HUD, PAUSA/REANUDAR, FIN, modal de fin de partida, guardado con `saveScore`, pestaña en `/salon`, ranking global y `best`/`plays` son los existentes de la plataforma, sin cambios.

**Fuera de alcance (para otros specs):**

- Más de 8 niveles, modo infinito tras la victoria o selector de nivel.
- Otros bonus en carriles (objetos que se recogen sobre troncos o en la carretera).
- Cambios en el tablero, los controles, los carriles o la curva de dificultad de los specs 01 y 02.
- Nueva portada.
- Controles táctiles / móvil, sonido y música.
- Cambios en `GamePlayer`, `GameCanvas`, el HUD, el marco CRT, `saveScore` o los rankings.
- Anti-trampas o verificación de puntuaciones (heredado de SPEC 04).
- Tests automatizados.

---

## Modelo de datos

No introduce tablas ni cambios de esquema. `lib/supabase/database.types.ts` no se regenera.

```sql
-- supabase/migrations/<timestamp>_update_game_travesia.sql
update public.games
set long = 'Guía a Pincho, un cactus saltarín, casilla a casilla con las flechas o WASD por la carretera y por el río, donde solo flotan troncos y patos de goma que se sumergen. Cada maceta de la orilla da más puntos si encadenas llegadas sin morir, si recoges su flor o si te sobra tiempo, pero evita la que riega la nube. Cada nivel acelera el tráfico y recorta el reloj; tienes tres vidas, ganas una cada 5000 puntos y completar el nivel 8 es la victoria.'
where id = 'travesia';
```

```ts
// lib/games/travesia/ — estado nuevo del motor
interface PotEvent {
  pot: number; // índice 0–4 en GOAL_COLS
  remaining: number; // s de juego restantes
}
// variables de cierre nuevas en createTravesiaEngine
// flower: PotEvent | null; flowerTimer: number (s)
// cloud: PotEvent | null;  cloudTimer: number (s)
// streak: number; nextExtraLife: number
```

Convenciones:

- Constantes nuevas en `constants.ts`:
  - `FLOWER_INTERVAL = 8`, `FLOWER_DURATION = 5`, `FLOWER_BLINK_START = 1.5`, `FLOWER_BLINK_PERIOD = 0.2` (s), `FLOWER_POINTS = 200`.
  - `CLOUD_FROM_LEVEL = 3`, `CLOUD_INTERVAL = 11`, `CLOUD_DURATION = 4` (s).
  - `STREAK_MAX = 5`.
  - `EXTRA_LIFE_EVERY = 5000`, `MAX_LIVES = 5`.
  - `FINAL_LEVEL = 8`.
  - Colores: flor pétalos `#ff3fa4`, centro `#ffd23f`, tallo `#39ff6a`; nube `#c8d0e0` con sombra `#8a94aa` y gotas `#7fd4ff`; rótulo de racha `#ffd23f`.
- `INITIAL_LIVES` sigue siendo 3.
- Estado inicial nuevo: `flower = null`, `flowerTimer = 0`, `cloud = null`, `cloudTimer = 0`, `streak = 0`, `nextExtraLife = 5000`.
- Funciones puras en `bonus.ts`:
  - `pickPot(pots, exclude, rand)`: índice uniforme entre las macetas vacías distintas de `exclude` (o `null`), o `null` si no hay ninguna.
  - `potMultiplier(streak) = min(streak, STREAK_MAX)`.
  - `extraLivesFor(score, nextExtraLife)`: cuántos umbrales de 5000 cruza `score` y el siguiente umbral.
- Flor:
  - `flowerTimer` suma `dt` solo con `state === "playing"` y sin flor.
  - Al llegar a 8 s, `flowerTimer = 0` y la flor aparece en `pickPot(pots, cloud?.pot)` con `remaining = 5`. Si no hay maceta válida, no aparece y el temporizador vuelve a empezar.
  - Con flor, `remaining` baja con `dt` solo con `state === "playing"`; al llegar a 0 desaparece.
  - En su último 1,5 s se dibuja solo en semiperiodos alternos de 0,2 s.
- Nube:
  - Solo desde el nivel 3. `cloudTimer` suma `dt` solo con `state === "playing"` y sin nube.
  - Al llegar a 11 s, `cloudTimer = 0` y la nube aparece sobre `pickPot(pots, flower?.pot)` con `remaining = 4`. Si no hay maceta válida, no aparece.
  - Con nube, `remaining` baja con `dt` solo con `state === "playing"`; al llegar a 0 desaparece.
  - Se dibuja sobre la maceta con gotas cayendo; no parpadea.
- Flor y nube nunca están en la misma maceta.
- Racha:
  - `streak` sube en 1 al entrar en una maceta y vuelve a 0 al morir. Subir de nivel no la reinicia.
  - Los puntos de maceta pasan a ser `POT_POINTS × potMultiplier(streak)`, con `streak` ya incrementada. El bonus de tiempo y la flor no se multiplican.
  - Con `streak ≥ 2` se dibuja `RACHA ×n` (con `n = potMultiplier(streak)`) en `#ffd23f`, `700 12px monospace`, en `x = 434`, centrado en la fila 13 (zona libre del spec 01).
- Vida extra: toda suma de puntos pasa por `addScore(points)`. Tras sumar, por cada umbral cruzado `nextExtraLife += 5000` y, si `lives < 5`, `lives += 1`. Con 5 vidas el umbral se consume sin dar vida.
- Resolución de la maceta al llegar a la fila 0 (sustituye a la del spec 01), en este orden:
  1. Si `goalIndexAt(cx) = −1` o la maceta está llena: muerte `"splat"`.
  2. Si la nube está sobre esa maceta: muerte `"water"` y la maceta no se llena.
  3. Llenar la maceta y `streak += 1`.
  4. `addScore(POT_POINTS × potMultiplier(streak) + TIME_BONUS_PER_SEC × floor(timeLeft))`.
  5. Si la flor está en esa maceta: `addScore(FLOWER_POINTS)` y `flower = null`.
  6. Si las 5 macetas están llenas: `addScore(LEVEL_CLEAR_POINTS)`. Si `level === 8`, victoria. Si no, subida de nivel del spec 02, y además `flower = null`, `cloud = null`, `flowerTimer = 0` y `cloudTimer = 0`.
  7. Si no hubo victoria, reaparición.
- Victoria: `state = "gameover"` sin animación de muerte, Pincho queda dibujado sentado en la quinta maceta, el loop se detiene y se llama a `onGameOver({ score, level: 8 })`. `level` nunca llega a 9.
- Orden de un `update(dt)` (sustituye al del spec 01):
  1. Si `state === "dying"`: como en el spec 01. Fin del paso.
  2. Buscar el objeto sólido bajo `cx` (`ride`).
  3. Mover carriles (incluida la fase de los patos) y arrastrar a Pincho.
  4. Aplicar el salto en espera y, si llega a la fila 0, resolver la maceta como arriba. Si hubo victoria, fin del paso.
  5. Descontar `timeLeft`; si llega a 0, muerte `"splat"`.
  6. Avanzar flor y nube: caducidad y aparición.
  7. Comprobar colisiones de la fila actual.
- Pixel-art nuevo en `sprites.ts`, 10×10 a escala 4: `FLOWER` (flor de cinco pétalos con tallo, dibujada sobre la maceta) y `CLOUD` (nube redondeada dibujada sobre la maceta, con tres gotas `#7fd4ff` que se desplazan 4 px hacia abajo cada 0,2 s de juego).

---

## Plan de implementación

Antes del paso 1: leer `specs/game-jam/travesia/01-juego-travesia.md`, `specs/game-jam/travesia/02-travesia-progresion.md`, `.claude/skills/new-game/integration.md` y todo `lib/games/travesia/`.

1. Aplicar con `apply_migration` el `update` de `long` de la fila `travesia` y guardar el SQL en `supabase/migrations/<timestamp>_update_game_travesia.sql`. Verificación: `execute_sql` muestra el nuevo `long` y el resto de columnas iguales; el juego sigue funcionando como tras el spec 02.
2. Añadir las constantes nuevas a `constants.ts` y crear `lib/games/travesia/bonus.ts` con `pickPot`, `potMultiplier` y `extraLivesFor`. Verificación: `npx tsc --noEmit` y lint; `potMultiplier(7) = 5`; `pickPot` con 4 macetas llenas y la vacía excluida devuelve `null`; `extraLivesFor(10200, 5000)` indica 2 umbrales y siguiente umbral 15000.
3. Añadir `FLOWER` y `CLOUD` a `sprites.ts` y su dibujo, con el parpadeo y las gotas, a `render.ts`, junto al rótulo `RACHA ×n`. Verificación: tipos, lint y cada matriz tiene 10 filas de 10 caracteres.
4. En `engine.ts`: `addScore` con vida extra, sustituyendo toda suma directa a `score`. Verificación: `npm run dev`; los puntos de avance y de maceta siguen como antes.
5. En `engine.ts`: racha y resolución de maceta en el orden de este spec, incluida la nube como muerte. Verificación: dos macetas seguidas sin morir suman 50 y luego 100 de maceta, y aparece `RACHA ×2`.
6. En `engine.ts`: temporizadores de flor y nube en el paso 6 del `update`, y su reinicio al subir de nivel. Verificación: la flor aparece a los 8 s de juego; la nube aparece en el nivel 3 a los 11 s.
7. En `engine.ts`: victoria al llenar las 5 macetas del nivel 8. Verificación: con un `FINAL_LEVEL` temporal de 1 en local, llenar las 5 macetas abre el modal con nivel 1; restaurar `FINAL_LEVEL = 8` antes de seguir.
8. Revisión final: checks de la sección 8 de `integration.md`, `npx eslint app components lib`, `npm run build` y partida completa con la consola abierta, guardando una puntuación.

---

## Criterios de aceptación

Plataforma:

- [ ] `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos`, `/juegos/travesia`, `/juegos/travesia/jugar` y `/salon`.
- [ ] `games` contiene la fila `travesia` con el `long` de este spec y el mismo `title`, `short`, `cat`, `color`, `cover` y `sort_order` de antes.
- [ ] `lib/games/travesia/` sigue sin usar `document`, `getElementById`, `Image`, `Audio` ni `localStorage`, y `window` solo para los listeners de teclado.
- [ ] Todo lo de los specs 01 y 02 sigue funcionando igual: controles, carriles, patos, curva de dificultad, muertes, HUD, pausa, guardado y rankings.
- [ ] PAUSA congela los temporizadores de la flor y la nube; ocultar la pestaña no los consume.
- [ ] `FINAL_LEVEL` vale 8 en el código entregado.
- [ ] ASTEROIDES, CAÍDA, BLOQUE BUSTER, SERPENTINA y los juegos simulados se comportan igual que antes.

Juego:

- [ ] Tras 8 s de juego sin flor aparece una flor rosa en una maceta vacía; dura 5 s y parpadea cada 0,2 s en su último 1,5 s.
- [ ] Entrar en la maceta de la flor suma 200 puntos además de los de la maceta, y la flor desaparece.
- [ ] Cruzar sin volver atrás y entrar en la primera maceta con flor y 21,6 s restantes deja el HUD en 570 puntos: `110 + 50 + 210 + 200`.
- [ ] La flor nunca aparece en una maceta llena ni en la de la nube.
- [ ] En los niveles 1 y 2 no aparece la nube.
- [ ] Desde el nivel 3, tras 11 s de juego sin nube aparece una nube con gotas sobre una maceta vacía y desaparece a los 4 s.
- [ ] Entrar en la maceta de la nube quita una vida con las ondas de ahogo y la maceta sigue vacía.
- [ ] Cinco macetas seguidas sin morir suman 50, 100, 150, 200 y 250 puntos de maceta; la sexta seguida suma 250.
- [ ] Llenar las 5 macetas del nivel 1 sin morir, entrando siempre con 20 s restantes y en macetas sin flor, deja el HUD en 3300 puntos: `5 × 110` de avance, `750` de maceta, `5 × 200` de tiempo y `1000` de nivel.
- [ ] Morir devuelve la racha a 0 y la siguiente maceta suma 50; subir de nivel no la reinicia.
- [ ] Con racha de 2 o más se ve `RACHA ×n` a la derecha de la barra del reloj, con `n` máximo 5; con racha 0 o 1 no se ve.
- [ ] Al alcanzar 5000 puntos el HUD pasa de 3 a 4 vidas; al alcanzar 10000, a 5.
- [ ] Con 5 vidas, cruzar los 15000 puntos no añade vida, y tras perder una vida cruzar los 20000 sí la añade.
- [ ] Al subir de nivel desaparecen la flor y la nube, y sus temporizadores empiezan de cero.
- [ ] Durante la animación de muerte la flor y la nube no avanzan sus temporizadores.
- [ ] Llenar la quinta maceta del nivel 8 suma 1000, deja a Pincho sentado en ella, detiene los carriles y llama a `onGameOver({ score, level: 8 })`; el HUD nunca muestra nivel 9.

---

## Decisiones tomadas y descartadas

- **Sí:** flor bonus en una maceta vacía. Obliga a elegir maceta en lugar de llenar siempre la más cercana. **No:** un objeto que se recoge montado en un tronco (más reglas de transporte y se parece a un bonus comercial concreto).
- **Sí:** nube de riego que ahoga a Pincho, desde el nivel 3. Es el peligro natural de un cactus y ocupa temporalmente una meta. **No:** un enemigo en la maceta copiado de juegos comerciales del género ni activarla desde el nivel 1 (el nivel 1 debe ser de aprendizaje).
- **Sí:** flor y nube en macetas distintas y con temporizadores separados. Cada una es legible sola. **No:** un único temporizador que elija entre flor y nube al azar (menos predecible).
- **Sí:** racha que multiplica solo los puntos de maceta, hasta ×5, y se pierde al morir. Premia no morir sin disparar la puntuación. **No:** multiplicar también tiempo y flor (puntuaciones dominadas por la racha) ni racha sin tope.
- **Sí:** el rótulo `RACHA ×n` dentro del canvas, en la zona libre de la franja del reloj. Es información del juego, como `LÍNEAS` en CAÍDA. **No:** añadir la racha al HUD de la plataforma (cambio de plataforma).
- **Sí:** vida extra cada 5000 puntos con máximo de 5. Recompensa las partidas largas y el HUD ya muestra las vidas. **No:** vidas extra sin tope (partidas eternas) ni ninguna vida extra (el nivel 8 sería casi inalcanzable).
- **Sí:** victoria al completar el nivel 8 con `onGameOver({ score, level: 8 })`, como BLOQUE BUSTER. En el nivel 8 la curva del spec 02 llega a su tope, así que seguir no añade nada. **No:** niveles infinitos (rankings dominados por la paciencia) ni reiniciar en el nivel 1 conservando la puntuación.
- **Sí:** temporizadores de flor y nube con el `dt` del juego y congelados durante la muerte. La pausa, la pestaña oculta y la papilla no los consumen. **No:** `performance.now()` absoluto.
- **Sí:** sin sonido y sin cambios de plataforma, como en los specs 01 y 02. **No:** fanfarria de victoria con `Audio`.

---

## Riesgos identificados

| Riesgo                                                                   | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode monta el efecto dos veces y duplica loop o listeners         | Sin cambios respecto al spec 01: `destroy()` cancela el frame y quita los listeners.                                           |
| `generateStaticParams` cacheado no incluye el `id`                       | No aplica: `travesia` ya existe en `games` desde el spec 01. Se comprueba igualmente con `npm run build`.                      |
| La victoria llama a `onGameOver` dos veces (resolución de maceta y loop) | La victoria solo cambia `state`; el loop es el único que llama a `onGameOver`, protegido por `gameOverNotified`.               |
| Con una sola maceta vacía, la nube la tapa y el jugador queda bloqueado  | La nube dura 4 s y no vuelve hasta 11 s después: el jugador espera o rodea; el reloj de 18 s mínimo deja margen.               |
| Una suma de puntos fuera de `addScore` se salta la vida extra            | El paso 4 sustituye toda suma directa; se verifica con `grep -n "score +=" lib/games/travesia/engine.ts` (solo en `addScore`). |
| El valor temporal de `FINAL_LEVEL` del paso 7 llega al código entregado  | Criterio explícito: `FINAL_LEVEL` vale 8 en el código entregado.                                                               |

---

## Qué **no** entra en este spec

- Más de 8 niveles, modo infinito o selector de nivel.
- Bonus en los carriles.
- Cambios en el tablero, los controles, los carriles o la curva de dificultad.
- Controles táctiles, gamepad, sonido y música.
- Nueva portada.
- Cambios en el HUD, el marco CRT, `GamePlayer`, `saveScore` o los rankings.
- Anti-trampas y tests automatizados.
