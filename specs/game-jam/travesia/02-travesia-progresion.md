# SPEC GJ-travesia-02 — Juego TRAVESÍA: progresión de dificultad y patos de goma

> **Estado:** Borrador
> **Depende de:** `specs/game-jam/travesia/01-juego-travesia.md`
> **Fecha:** 2026-11-26
> **Objetivo:** Añadir a TRAVESÍA una curva de dificultad por nivel con tráfico y corriente más rápidos, reloj más corto, patos de goma que se sumergen y trazados de carriles más exigentes.

---

## Por qué existe este spec

TRAVESÍA sale de la game jam con el tema «Cruza la carretera y el río sin convertirte en papilla». Es un diseño original sin código de referencia. El spec 01 dejó el juego real en `/juegos/travesia/jugar`, registrado en `REAL_GAMES` con `createTravesiaEngine: CreateGameEngine`, pero con la misma dificultad en todos los niveles: subir de nivel solo cambia el número del HUD.

Este spec da sentido al nivel. Cada nivel acelera los carriles y recorta el reloj, y a partir de ciertos niveles cambia el trazado: aparecen los patos de goma (plataformas que se sumergen), un segundo bólido y troncos más cortos. La fila `travesia` de `public.games` actualiza su `long` para describir estas mecánicas. Los extras (flor, nube, racha, vida extra y victoria) van en `specs/game-jam/travesia/03-travesia-extras.md`.

---

## Alcance

**Dentro:**

- Migración en `supabase/migrations/` que actualiza la columna `long` de la fila `travesia`. El resto de columnas no cambia y no se borra nada de `scores`.
- Multiplicador de velocidad de carriles por nivel, con tope en el nivel 8.
- Reloj por vida que baja 2 s por nivel, con mínimo de 18 s.
- Nuevo objeto de río: el pato de goma, en grupos que flotan, avisan y se sumergen en un ciclo fijo.
- Trazado de carriles por nivel: patos desde el nivel 2, segundo bólido desde el nivel 3 y troncos más cortos desde el nivel 4.
- Al subir de nivel, los carriles se reconstruyen con el trazado y la velocidad del nivel nuevo.
- Archivos que cambian en `lib/games/travesia/`:
  - `constants.ts`: tipo `ObjKind` con `"duck"`, campo `phase` en `MovingObj`, constantes nuevas y `LANE_OVERRIDES`.
  - `lanes.ts`: `speedMult`, `timePerLife`, `lanesForLevel`, `buildLanes(level)`, fase de los patos en `moveLanes`, `isSolid` y `rideAt` que ignora patos sumergidos.
  - `sprites.ts`: matrices `DUCK` y `DUCK_DIVE`.
  - `render.ts`: dibujo de patos por fase y barra del reloj proporcional a `timePerLife(level)`.
  - `engine.ts`: reconstrucción de carriles al subir de nivel y reloj de `timePerLife(level)` al reaparecer.
- HUD, PAUSA/REANUDAR, FIN, modal de fin de partida, guardado con `saveScore`, pestaña en `/salon`, ranking global y `best`/`plays` son los existentes de la plataforma, sin cambios.

**Fuera de alcance (para otros specs):**

- Flor bonus, nube de riego, racha de llegadas, vida extra y victoria final en el nivel 8: `specs/game-jam/travesia/03-travesia-extras.md`.
- Cambios en la tabla de puntos, las vidas iniciales, los controles o el tablero del spec 01.
- Nuevos tipos de vehículo o enemigos que persigan a Pincho.
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
set long = 'Guía a Pincho, un cactus saltarín, casilla a casilla con las flechas o WASD: cruza la carretera y salta sobre el río de tronco en tronco, porque el agua lo ahoga. Cada maceta de la orilla vale 50 puntos más 10 por segundo sobrante, y con las cinco llenas subes de nivel. Cada nivel acelera el tráfico y la corriente y recorta el reloj, y van apareciendo patos de goma que se sumergen, más bólidos y troncos más cortos; tienes tres vidas.'
where id = 'travesia';
```

```ts
// lib/games/travesia/constants.ts — cambios
type ObjKind = "car" | "moto" | "sport" | "truck" | "log" | "duck";
interface MovingObj {
  x: number;
  phase: number; // s dentro del ciclo del pato; 0 y sin uso en el resto
}
interface LaneOverride {
  fromLevel: number; // se aplica en este nivel y siguientes
  def: LaneDef; // sustituye al carril de la misma fila
}
```

Convenciones:

- Constantes nuevas en `constants.ts`:
  - `SPEED_STEP = 0.15`, `SPEED_MAX = 2.05`. `speedMult(level) = min(SPEED_MAX, 1 + SPEED_STEP × (level − 1))`: 1,00 en el nivel 1, 1,15 en el 2, 2,05 desde el 8.
  - `TIME_STEP = 2`, `TIME_MIN = 18` (s). `timePerLife(level) = max(TIME_MIN, TIME_PER_LIFE − TIME_STEP × (level − 1))`: 30 s en el nivel 1, 28 en el 2, 18 desde el 7.
  - `DUCK_SURFACE = 3.0`, `DUCK_WARN = 1.0`, `DUCK_UNDER = 1.5`, `DUCK_CYCLE = 5.5`, `DUCK_PHASE_STEP = 1.8` (s).
  - Colores del pato: cuerpo `#ffd23f`, pico `#ff8a1f`, ojo `#05070a`; burbujas del pato sumergido `#7fd4ff`.
- `LANES` del spec 01 sigue siendo el trazado del nivel 1. `LANE_OVERRIDES: LaneOverride[]` sustituye carriles enteros por fila:

  | Desde nivel | Fila | Tipo  | Objeto  | Color     | `len` | `speed` | `count` | `spacing` | `offset` |
  | ----------- | ---- | ----- | ------- | --------- | ----- | ------- | ------- | --------- | -------- |
  | 2           | 4    | river | `duck`  | `#ffd23f` | 3     | −60     | 3       | 6         | 1        |
  | 2           | 2    | river | `duck`  | `#ffd23f` | 2     | −50     | 3       | 5         | 3        |
  | 3           | 8    | road  | `sport` | `#ff5a3c` | 1     | +140    | 2       | 7         | 3        |
  | 4           | 3    | river | `log`   | `#7a4a24` | 3     | +70     | 2       | 8         | 2        |
  | 4           | 1    | river | `log`   | `#7a4a24` | 2     | +55     | 3       | 6         | 1        |

- Todos los carriles sustituidos cumplen `count × spacing × CELL ≥ W + len × CELL` (720, 600, 560, 640 y 720 px).
- `lanesForLevel(level)` parte de `LANES` y aplica en orden cada override con `fromLevel ≤ level`.
- `buildLanes(level)` crea los carriles de `lanesForLevel(level)` con `speed = def.speed × speedMult(level)`, posiciones iniciales del spec 01 y, en carriles de patos, `phase = (i × DUCK_PHASE_STEP) mod DUCK_CYCLE` para el objeto `i`.
- Un grupo de patos ocupa `len` celdas y es un único objeto: todos sus patos se hunden a la vez.
- Ciclo de un grupo de patos: `moveLanes` suma `dt` a `phase` y aplica `mod DUCK_CYCLE`.
  - `phase < 3.0`: a flote, se dibuja `DUCK` en cada celda.
  - `3.0 ≤ phase < 4.0`: aviso, se dibuja `DUCK_DIVE` (medio hundido) en cada celda.
  - `phase ≥ 4.0`: sumergido, solo se dibujan dos burbujas por celda.
- `isSolid(obj, lane)` es `true` para troncos y para patos con `phase < 4.0`. `rideAt` y la comprobación de agua del spec 01 solo cuentan objetos sólidos.
- Si un grupo se sumerge con Pincho encima, en ese mismo `update` Pincho muere ahogado (`"water"`).
- Al subir de nivel (quinta maceta llena), en este orden: `level += 1`, `lanes = buildLanes(level)`, macetas vacías y reaparición de Pincho.
- Reaparición (tras maceta, tras subir de nivel o tras muerte): `timeLeft = timePerLife(level)`.
- La barra del reloj se rellena en proporción `timeLeft / timePerLife(level)`. Los umbrales de color (10 s y 5 s) no cambian.
- Las fases de los patos avanzan con el `dt` del juego: se congelan en pausa y siguen durante la animación de muerte.
- Pixel-art nuevo en `sprites.ts`, 10×10 a escala 4: `DUCK` (pato de goma visto de lado, mirando a la izquierda; se usa `flip` en carriles con `speed > 0`) y `DUCK_DIVE` (la mitad superior del pato con una línea de agua `#7fd4ff`).
- El orden de un `update(dt)` del spec 01 no cambia. La fase de los patos avanza dentro del paso 3 (mover carriles) y el hundimiento se detecta en el paso 6 (colisiones).

---

## Plan de implementación

Antes del paso 1: leer `specs/game-jam/travesia/01-juego-travesia.md`, `.claude/skills/new-game/integration.md` y todo `lib/games/travesia/`.

1. Aplicar con `apply_migration` el `update` de `long` de la fila `travesia` y guardar el SQL en `supabase/migrations/<timestamp>_update_game_travesia.sql`. Verificación: `execute_sql` muestra el nuevo `long` y el resto de columnas iguales; `/juegos/travesia` muestra la descripción nueva y el juego sigue funcionando como en el spec 01.
2. Añadir a `constants.ts` el tipo `"duck"`, el campo `phase`, `LaneOverride`, las constantes nuevas y `LANE_OVERRIDES`. Inicializar `phase = 0` en `buildLanes` del spec 01 para que compile. Verificación: `npx tsc --noEmit`; el juego del nivel 1 no cambia.
3. Añadir a `lanes.ts` `speedMult`, `timePerLife`, `lanesForLevel` y la firma `buildLanes(level)`. Verificación: tipos y lint; `speedMult(2) = 1.15`, `speedMult(9) = 2.05`, `timePerLife(2) = 28`, `timePerLife(10) = 18`; `lanesForLevel(1)` es igual a `LANES` y `lanesForLevel(4)` tiene patos en las filas 4 y 2, 2 bólidos en la 8 y troncos de 3 y 2 celdas en las filas 3 y 1.
4. Avanzar `phase` en `moveLanes` para los carriles de patos y añadir `isSolid`. Hacer que `rideAt` solo devuelva objetos sólidos. Verificación: tipos y lint.
5. Añadir `DUCK` y `DUCK_DIVE` a `sprites.ts` y su dibujo por fase a `render.ts`. Cambiar la barra del reloj para usar `timePerLife(level)`. Verificación: tipos, lint y cada matriz tiene 10 filas de 10 caracteres.
6. En `engine.ts`: usar `buildLanes(level)` al iniciar y al subir de nivel, y `timePerLife(level)` al reaparecer. Verificación: `npm run dev`, llenar las 5 macetas del nivel 1 y comprobar que en el nivel 2 hay patos en las filas 4 y 2, los vehículos van más rápido y el reloj empieza en 28 s.
7. Revisión final: checks de la sección 8 de `integration.md`, `npx eslint app components lib`, `npm run build` y partida completa hasta el nivel 4 con la consola abierta.

---

## Criterios de aceptación

Plataforma:

- [ ] `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos`, `/juegos/travesia`, `/juegos/travesia/jugar` y `/salon`.
- [ ] `games` contiene la fila `travesia` con el `long` de este spec y el mismo `title`, `short`, `cat`, `color`, `cover` y `sort_order` del spec 01.
- [ ] `lib/games/travesia/` sigue sin usar `document`, `getElementById`, `Image`, `Audio` ni `localStorage`, y `window` solo para los listeners de teclado.
- [ ] Todo lo del spec 01 sigue funcionando igual: controles, puntos, macetas, muertes, vidas, HUD, pausa, guardado y rankings.
- [ ] PAUSA congela también el ciclo de los patos; REANUDAR lo continúa sin saltos.
- [ ] ASTEROIDES, CAÍDA, BLOQUE BUSTER, SERPENTINA y los juegos simulados se comportan igual que antes.

Juego:

- [ ] En el nivel 1 el trazado, las velocidades y el reloj de 30 s son exactamente los del spec 01.
- [ ] Al llenar las 5 macetas, los carriles se reinician en sus posiciones iniciales con el trazado y la velocidad del nivel nuevo.
- [ ] En el nivel 2 todos los carriles van a 1,15 veces su velocidad base: el bólido de la fila 8 va a 161 px/s.
- [ ] Desde el nivel 8 el multiplicador es 2,05 y no sube más: en los niveles 8 y 9 el bólido va a 287 px/s.
- [ ] El reloj empieza en 30 s en el nivel 1, en 28 s en el 2, en 20 s en el 6 y en 18 s desde el 7.
- [ ] La barra del reloj empieza llena en cada nivel y se vacía en proporción al reloj del nivel.
- [ ] Desde el nivel 2, la fila 4 tiene 3 grupos de 3 patos y la fila 2 tiene 3 grupos de 2 patos, todos hacia la izquierda.
- [ ] Cada grupo de patos flota 3 s, se dibuja medio hundido 1 s y pasa 1,5 s sumergido, en bucle.
- [ ] Los grupos de un mismo carril empiezan desfasados 1,8 s, así que nunca se sumergen todos a la vez.
- [ ] Pincho puede ir montado en un grupo a flote o medio hundido y se desplaza con él.
- [ ] Si el grupo se sumerge con Pincho encima, Pincho muere ahogado y pierde una vida.
- [ ] Saltar sobre un grupo sumergido es caer al agua.
- [ ] Desde el nivel 3, la fila 8 tiene 2 bólidos separados 7 celdas.
- [ ] Desde el nivel 4, los troncos de la fila 3 miden 3 celdas y los de la fila 1 miden 2.
- [ ] Morir no reinicia los carriles ni las fases de los patos; solo subir de nivel lo hace.
- [ ] La tabla de puntos no cambia: llenar las 5 macetas del nivel 2 sigue sumando 1000 más los puntos de cada maceta.

---

## Decisiones tomadas y descartadas

- **Sí:** multiplicador de velocidad del 15 % por nivel con tope de 2,05 en el nivel 8. Con `MAX_DT = 0,05` el objeto más rápido avanza 14,4 px por frame, menos que la caja de colisión de Pincho (24 px). **No:** velocidad sin tope (a partir de cierto nivel los vehículos atravesarían a Pincho entre frames).
- **Sí:** reloj de 30 s menos 2 s por nivel, con mínimo de 18 s. Cruzar 12 filas y esperar troncos cabe de sobra en 18 s. **No:** reloj fijo (la presión no crece) ni bajar más de 18 s (las llegadas dejarían de dar bonus de tiempo).
- **Sí:** patos de goma que se sumergen como plataforma traicionera del río. Es la mecánica de plataforma temporal del género con un objeto original. **No:** tortugas ni cualquier objeto o personaje de un juego comercial.
- **Sí:** cada grupo de patos se hunde entero y los grupos de un carril van desfasados 1,8 s. Hay siempre algún grupo a flote y el aviso de 1 s permite reaccionar. **No:** patos que se hunden por separado (más reglas y más difícil de leer) ni hundimiento sin aviso.
- **Sí:** trazado por nivel con sustitución de carriles enteros (`LANE_OVERRIDES`). Cada cambio es una fila de tabla verificable. **No:** generar carriles al azar (rompe la comparabilidad de puntuaciones entre partidas).
- **Sí:** los carriles se reinician al subir de nivel y no al morir. Al subir de nivel el trazado puede cambiar; al morir, el mundo sigue como estaba. **No:** reiniciar también al morir (permitiría esperar un patrón favorable muriendo).
- **Sí:** la tabla de puntos del spec 01 no cambia. Los niveles altos ya puntúan más porque se llega a ellos tras más macetas. **No:** multiplicar los puntos por nivel (la racha del spec 03 ya añade multiplicador).
- **Sí:** sin sonido y sin cambios de plataforma, como en el spec 01. **No:** avisos sonoros del hundimiento.

---

## Riesgos identificados

| Riesgo                                                                         | Mitigación                                                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y duplica loop o listeners               | Sin cambios respecto al spec 01: `destroy()` cancela el frame y quita los listeners.                                |
| `generateStaticParams` cacheado no incluye el `id`                             | No aplica: `travesia` ya existe en `games` desde el spec 01. Se comprueba igualmente con `npm run build`.           |
| Vehículos muy rápidos atraviesan a Pincho entre frames                         | Tope de velocidad en el nivel 8 (287 px/s, 14,4 px por frame con `MAX_DT`).                                         |
| Pincho muere al saltar a un pato justo cuando empieza a sumergirse             | Es la regla: el aviso de 1 s medio hundido lo anuncia; se verifica que el pato medio hundido aún sostiene a Pincho. |
| Reiniciar carriles al subir de nivel deja un vehículo sobre la acera de salida | Los vehículos solo ocupan las filas 7–11 y Pincho reaparece en la fila 12: nunca coinciden.                         |
| Una fase de pato acumulada con `dt` grande salta el aviso                      | `MAX_DT = 0,05 s` es menor que el aviso de 1 s: el aviso siempre se ve al menos 20 frames.                          |

---

## Qué **no** entra en este spec

- Flor bonus, nube de riego, racha, vida extra y victoria final (spec 03).
- Cambios en la tabla de puntos, las vidas, los controles o el tablero.
- Nuevos vehículos o enemigos.
- Controles táctiles, gamepad, sonido y música.
- Nueva portada.
- Cambios en el HUD, el marco CRT, `GamePlayer`, `saveScore` o los rankings.
- Anti-trampas y tests automatizados.
