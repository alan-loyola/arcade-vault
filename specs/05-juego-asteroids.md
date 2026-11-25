# SPEC 05 — Juego ASTEROIDES: portar `02-asteroids` a la plataforma

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 04
> **Fecha:** 2026-11-24
> **Objetivo:** Portar el juego de `references/started-games/02-asteroids` a TypeScript como primer juego real de la plataforma (`/juegos/asteroids/jugar`), integrado con el HUD, la pausa y el guardado de puntuaciones de Supabase existentes.

---

## Por qué existe este spec

Hasta ahora `GamePlayer` es un simulador: suma puntaje aleatorio con un `setInterval` sobre una arena CSS decorativa, igual para los 8 juegos del catálogo. Existe un juego real en `references/started-games/02-asteroids` (HTML + un único `game.js` de ~510 líneas, canvas 800×600, sin dependencias) que usa globals, `window` y `document.getElementById`, y no se puede montar tal cual en React. Este spec lo porta como motor TypeScript sin acceso global al DOM y lo conecta a lo que ya construyeron los SPEC 01 y 04: marco CRT, HUD, PAUSA/FIN, modal de fin de partida y `saveScore`. La lógica de juego (físicas, asteroides, power-up `3x`) **no cambia**.

---

## Alcance

**Dentro:**

- Nueva entrada en `lib/games.ts`: `id: "asteroids"`, título `ASTEROIDES`, categoría `SHOOTER`, color `magenta`, portada `cover-asteroids`, descripciones y `best`/`plays` mock coherentes. `ROCAS` se conserva sin cambios (sigue simulada).
- Portada nueva `.cover-asteroids` en `app/globals.css` (CSS pixel-art, mismo estilo que las demás portadas).
- Motor portado a TypeScript en `lib/games/asteroids/` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, constantes, utilidades y loop), sin globals ni `document`/`window` en el módulo de lógica; recibe el `CanvasRenderingContext2D` y callbacks.
- Componente cliente `components/games/asteroids-canvas.tsx` que monta el motor en `useEffect`, lo destruye al desmontar y reporta `score`, `level` y `lives`.
- Integración en `components/game-player.tsx`: para `gameId === "asteroids"` renderiza el canvas dentro de `.crt-screen` en lugar de la arena CSS; el resto de juegos conserva el simulador. HUD (jugador, puntuación, vidas, nivel), PAUSA, FIN y modal de fin de partida son los de la plataforma.
- Pausa real: PAUSA/REANUDAR, el modal y la pestaña oculta detienen la simulación sin acumular `dt`.
- Canvas con resolución lógica fija 800×600 y escalado por CSS (`width: 100%`, `aspect-ratio: 4 / 3`).
- Entrada por teclado (flechas + ESPACIO) con `preventDefault` solo mientras el juego está montado y enfocado en la partida.
- Fin de partida: al llegar a 0 vidas el motor llama `onGameOver(score, level)` y se abre el modal existente; "JUGAR DE NUEVO" remonta el motor desde cero.
- El guardado usa el `saveScore(gameId, score, level)` existente sin cambios; la puntuación y el nivel reales salen del motor.
- Indicación de controles (ayuda breve) visible bajo/junto al marco CRT.

**Fuera de alcance (para otros specs):**

- Controles táctiles / móvil (el juego es solo teclado).
- Los otros 7 juegos reales (siguen con el simulador).
- Rediseño del HUD o del marco CRT.
- Sonido y música.
- OVNIs u otras mecánicas no presentes en el original (la descripción de ROCAS los menciona; ASTEROIDES no).
- Anti-trampas o verificación de puntuaciones (heredado de SPEC 04).
- `Game.best` / `Game.plays` reales.
- Tests automatizados.

---

## Modelo de datos

No introduce tablas ni cambios en Supabase: reutiliza `scores` (SPEC 04) con `game_id = "asteroids"`. Estructuras nuevas, solo en memoria:

```ts
// lib/games/asteroids/engine.ts
export interface AsteroidsCallbacks {
  onStats: (stats: { score: number; level: number; lives: number }) => void;
  onGameOver: (result: { score: number; level: number }) => void;
}

export interface AsteroidsEngine {
  start(): void; // arranca el loop (requestAnimationFrame)
  pause(): void; // detiene la simulación y el dibujo del loop
  resume(): void; // reanuda sin acumular el tiempo pausado
  destroy(): void; // cancela el loop y quita todos los listeners
}

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine;
```

```ts
// lib/games.ts — entrada nueva
{
  id: "asteroids",
  title: "ASTEROIDES",
  short: "Rota, acelera y dispara en gravedad cero.",
  long: "...",            // redactar sin OVNIs; mencionar power-up de disparo triple
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "magenta",
  best: <mock>,
  plays: "<mock>",
}
```

Convenciones:

- Constantes y reglas del original se mantienen: `W = 800`, `H = 600`, `RADII`, `SPEEDS`, `POINTS` por tamaño, 3 vidas, `invincible = 3`, `POWERUP_DROP_CHANCE = 0.15`, `POWERUP_DURATION = 5`, `POWERUP_TTL = 12`, `dt` máximo 0,05 s.
- Estado interno del motor en variables de cierre dentro de `createAsteroidsEngine` (no en el módulo), para poder remontar el juego sin residuos.
- `onStats` se invoca solo cuando cambia `score`, `level` o `lives` (no en cada frame) para no re-renderizar React a 60 Hz.
- `onGameOver` se invoca una sola vez por partida.
- Se elimina del motor: el HUD dibujado en canvas, el overlay `GAME OVER` y el reinicio con ESPACIO.
- Colores del canvas: se mantienen los del original (blanco, cian del power-up, naranja del propulsor) sobre fondo negro; solo el marco y el HUD adoptan el estilo de la plataforma.
- La primera vez que se carga una partida `score = 0`, `level = 1`, `lives = 3`, igual que el estado inicial del HUD, para evitar desajustes de hidratación.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` lo relativo a Client Components, `"use client"` y `cacheComponents` (ver CLAUDE.md), y revisar `components/game-player.tsx` y `app/globals.css` (`.crt`, `.crt-screen`, `.game-arena`, `.cover-*`).

1. Añadir la entrada `asteroids` a `lib/games.ts` y la portada `.cover-asteroids` a `app/globals.css`. Verificación: `npx tsc --noEmit` sin errores y la card aparece en `/juegos` y en `/juegos/asteroids`; `/salon` muestra la pestaña con estado vacío.
2. Crear `lib/games/asteroids/` con las constantes, utilidades (`wrap`, `dist`, `rand`, `randInt`) y las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` portadas a TypeScript; el contexto 2D y el estado de teclado se inyectan en lugar de leer globals. Verificación: tipos y `npm run lint` sin errores.
3. Crear `lib/games/asteroids/engine.ts` con `createAsteroidsEngine`: estado en cierre, `update`/`draw`, loop con `requestAnimationFrame`, `pause`/`resume` sin acumular `dt`, `onStats` y `onGameOver`, y `destroy` que cancela el frame y quita listeners. Sin HUD ni overlay en canvas. Verificación: tipos y lint.
4. Entrada de teclado dentro del motor: `keydown`/`keyup` en `window` con `preventDefault` para `ArrowUp`, `ArrowLeft`, `ArrowRight` y `Space`, registrados en `start()` y quitados en `destroy()`; los campos de texto y modificadores no se interceptan. Verificación: tipos y lint.
5. Crear `components/games/asteroids-canvas.tsx` (Client Component): `<canvas width={800} height={600}>` con escalado CSS, `useEffect` que crea el motor, lo arranca y lo destruye al desmontar (compatible con el doble montaje de React Strict Mode), y props `paused`, `onStats`, `onGameOver`. Verificación: tipos y lint.
6. Integrar en `components/game-player.tsx`: si `gameId === "asteroids"`, renderizar el canvas en `.crt-screen` en vez de la arena CSS y desactivar el `setInterval` simulado; vidas, puntuación y nivel del HUD salen de `onStats`; `onGameOver` abre el modal; `FIN` termina la partida con la puntuación actual; `restart` remonta el canvas (por `key`). PAUSA/REANUDAR y el modal abierto pausan el motor, y `document.visibilitychange` lo pausa al ocultar la pestaña. El resto de juegos queda igual. Verificación: `npm run dev`, jugar `/juegos/asteroids/jugar`: la nave se mueve, dispara y el HUD cambia.
7. Estilos del contenedor y ayuda de controles: ajustar en `globals.css` el `.crt-screen` para el canvas (sin romper la arena de los demás juegos) y mostrar "← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR" bajo el marco. Verificación: el canvas conserva 4:3 al cambiar el ancho de ventana, sin barras de scroll por el canvas.
8. Verificar el guardado: con sesión, terminar una partida y guardar crea una fila en `scores` con `game_id = "asteroids"` y los `score`/`level` reales; sin sesión se muestra "INICIA SESIÓN PARA GUARDAR". La puntuación aparece en `/salon` y en `/juegos/asteroids`. Verificación: MCP `execute_sql` de lectura sobre `scores`.
9. Revisión final: `grep` de `document.getElementById` y `window.` en `lib/games/asteroids/` (solo permitido en entrada de teclado), `npm run lint`, `npm run build`, y partida completa en escritorio comprobando consola sin errores ni fugas de listeners al salir y volver a entrar.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos`, `/juegos/asteroids`, `/juegos/asteroids/jugar` y `/salon`.
- [ ] `/juegos` muestra la card ASTEROIDES con su portada `cover-asteroids`, y `ROCAS` sigue presente y sin cambios.
- [ ] `/juegos/asteroids/jugar` muestra un canvas con la nave en el centro y 4 asteroides grandes al inicio, sin ellos en el centro (distancia segura de 130 px).
- [ ] ← y → rotan la nave, ↑ la impulsa con inercia, ESPACIO dispara; los controles tienen el mismo comportamiento que el original.
- [ ] Los asteroides se dividen en 2 de tamaño menor al impactar (tamaño 1 desaparece) y dan 20, 50 y 100 puntos según tamaño 3, 2 y 1.
- [ ] El power-up `3x` aparece, se recoge y dispara tres balas durante 5 s.
- [ ] Al chocar la nave pierde una vida, reaparece tras 2 s con invencibilidad y las vidas del HUD se actualizan.
- [ ] Al limpiar todos los asteroides sube el nivel y aparecen `3 + nivel` asteroides.
- [ ] El HUD de la plataforma muestra puntuación, nivel y vidas reales; el canvas no dibuja HUD ni "GAME OVER".
- [ ] Al llegar a 0 vidas se abre el modal "FIN DEL JUEGO" con la puntuación final y el motor deja de aceptar entradas.
- [ ] "FIN" abre el modal con la puntuación actual; "JUGAR DE NUEVO" reinicia con `score = 0`, `level = 1` y 3 vidas.
- [ ] ESPACIO ya no reinicia la partida en el modal.
- [ ] PAUSA detiene todo movimiento; al REANUDAR el juego continúa sin saltos (sin acumular el tiempo pausado).
- [ ] Al ocultar la pestaña el juego se pausa y no hay un salto de `dt` al volver.
- [ ] Las flechas y ESPACIO no hacen scroll de la página mientras se juega; fuera de la partida el scroll funciona con normalidad.
- [ ] Con sesión, "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `game_id = "asteroids"` y el `score` y `level` de la partida.
- [ ] Sin sesión, el modal muestra "INICIA SESIÓN PARA GUARDAR" y no inserta nada.
- [ ] La puntuación guardada aparece en `/salon` (pestaña ASTEROIDES) y en `/juegos/asteroids` tras recargar.
- [ ] Salir y volver a entrar a la partida no duplica el loop ni los listeners (la velocidad del juego y el disparo son idénticos la segunda vez).
- [ ] El canvas mantiene proporción 4:3 en distintos anchos de ventana.
- [ ] Los otros 7 juegos se comportan igual que antes (simulador).

---

## Decisiones tomadas y descartadas

- **Sí:** juego nuevo `asteroids` junto a `ROCAS`. Decisión explícita del usuario. **No:** reemplazar `rocas` (se propuso como recomendación y se descartó).
- **Sí:** portar a TypeScript como motor sin globals + Client Component con `<canvas>`. Tipado, limpieza de listeners y control desde React. **No:** `iframe` con HTML estático (no permite leer score ni pausar) ni cargar `game.js` tal cual con `<Script>` (globals, sin cleanup).
- **Sí:** el HUD, la pausa, `FIN` y el modal de fin de partida son los de la plataforma; el canvas solo dibuja el juego. Un único estilo visual y reutiliza `saveScore`. **No:** mantener el HUD del canvas original.
- **Sí:** el motor notifica por callbacks (`onStats`, `onGameOver`) solo cuando cambian los valores. **No:** leer el estado del juego desde React en cada frame.
- **Sí:** fin de partida por modal de la plataforma; se elimina el reinicio con ESPACIO (evita reiniciar sin querer mientras se dispara).
- **Sí:** resolución lógica fija 800×600 con escalado por CSS. Física y dificultad idénticas al original. **No:** adaptar `W`/`H` al contenedor.
- **Sí:** pausa real con `pause`/`resume` y por visibilidad de pestaña. **No:** pausa solo visual.
- **Sí:** `preventDefault` en teclas del juego solo mientras está montado. Evita scroll de página sin afectar al resto de la app.
- **Sí:** solo teclado en este spec. **No:** controles táctiles (otro spec).
- **Sí:** los otros 7 juegos conservan el simulador; `GamePlayer` elige el motor real por `gameId`.
- **Sí:** `best` y `plays` de la nueva entrada son mock, como los demás (SPEC 04 los dejó fuera de alcance).

---

## Riesgos identificados

| Riesgo                                                                                | Mitigación                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces y duplica el loop o los listeners         | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners; el paso 9 comprueba que la segunda entrada no duplica el juego. |
| Llamar `setState` de React a 60 Hz desde el motor degrada el rendimiento              | `onStats` se emite solo cuando cambian `score`, `level` o `lives`.                                                                          |
| Gran salto de `dt` al reanudar tras pausa o pestaña oculta                            | `resume()` reinicia `lastTime`; el `dt` sigue limitado a 0,05 s.                                                                            |
| `preventDefault` en `Space` o flechas rompe botones enfocados o formularios del modal | Solo se intercepta con el juego montado y sin foco en `input`/`textarea`; ESPACIO sobre el modal abierto no dispara.                        |
| `Math.random()` y `performance.now()` en el render causan desajustes de hidratación   | El motor solo corre en `useEffect` (cliente); el primer render es un canvas vacío y el HUD inicia en 0.                                     |
| El motor sigue corriendo con el modal abierto y suma puntos tras el fin de partida    | `onGameOver` pausa el motor y marca estado `gameover`; el modal abierto lo mantiene pausado.                                                |
| Puntuaciones falsificables                                                            | Heredado de SPEC 04: aceptado, el rango máximo y RLS limitan el daño.                                                                       |
| Canvas escalado con CSS se ve borroso en pantallas pequeñas o grandes                 | Aceptado: estética retro; el CRT ya aplica efectos.                                                                                         |

---

## Qué **no** entra en este spec

- Controles táctiles o gamepad.
- Sonido y música.
- Portar los otros 7 juegos (siguen simulados).
- OVNIs, nuevos power-ups u otros cambios de mecánica.
- Cambios al marco CRT o al HUD fuera de lo necesario para el canvas.
- Anti-trampas, rate limiting o estadísticas reales (`best`, `plays`).
- Tests automatizados.
