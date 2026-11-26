# Template for a game spec

Skeleton that `/new-game` fills in. It follows the general spec shape of `.claude/skills/spec/template.md` and the precedent of `specs/05-juego-asteroids.md`. The spec is written in **Spanish**.

- Text in `<…>` is a placeholder: replace it with concrete values. None may remain in the saved spec.
- Lines starting with `[NUEVO]` apply only when the game adds a new catalog row; lines starting with `[REEMPLAZO]` only when it takes over a simulated game's row. Keep the relevant ones (without the tag) and delete the others.
- Lines starting with `[ASSETS]` apply only if the game uses images.
- The fixed platform items (HUD, pause, modal, saving, leaderboard) stay as written: they are closed decisions from SPEC 05/06.
- Add game-specific items wherever `<específico: …>` appears. Be exhaustive with the original mechanics.

---

````markdown
# SPEC NN — Juego <TÍTULO>: <portar `references/started-games/<carpeta>` | crear> a la plataforma

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** <YYYY-MM-DD de la sesión>
> **Objetivo:** <Una frase: portar/crear <juego> como juego real en `/juegos/<id>/jugar`, integrado con el HUD, la pausa, el guardado de puntuaciones y los rankings existentes.>

---

## Por qué existe este spec

<2–4 frases: de dónde sale el juego (referencia y sus características técnicas: canvas W×H, archivos, globals, DOM, assets) o diseño del usuario; qué juego del catálogo queda afectado; qué no cambia (mecánicas del original). Mencionar que la integración usa el registro `REAL_GAMES` y el contrato `CreateGameEngine`.>

---

## Alcance

**Dentro:**

- [NUEVO] Migración en `supabase/migrations/` que inserta en `public.games` la fila `id: "<id>"`, título `<TÍTULO>`, categoría `<CAT>`, color `<color>`, portada `cover-<id>` y `sort_order` <n>.
- [REEMPLAZO] Migración en `supabase/migrations/` que actualiza la fila `<id>` de `public.games` (<columnas que cambian>) <y borra | y conserva> las puntuaciones simuladas de `scores` con `game_id = "<id>"`.
- [NUEVO] Portada `.cover-<id>` en `app/globals.css` (CSS pixel-art, mismo estilo que las demás).
- Motor portado a TypeScript en `lib/games/<id>/` (<archivos y clases concretas>), sin globals ni acceso al DOM; recibe el canvas y los callbacks de `CreateGameEngine`.
- Entrada `<id>` en `REAL_GAMES` (`components/games/registry.ts`) con resolución <W>×<H>, vidas iniciales <n> y controles "<TEXTO DE CONTROLES>".
- [ASSETS] Copia de <archivos> a `public/games/<id>/` y carga con `new Image()` dentro del motor.
- Entrada por <teclado (teclas) | teclado y ratón> con `preventDefault` solo de las teclas del juego y solo con la partida activa.
- Se eliminan del original: <HUD en canvas, overlays, teclas de pausa/reinicio/selector de nivel, sonido…>.
- <específico: adaptaciones necesarias, p. ej. qué significa `lives`, cómo se mapea la victoria, paneles extra dentro del canvas>.
- HUD, PAUSA/REANUDAR, FIN, modal de fin de partida, guardado con `saveScore`, pestaña en `/salon`, ranking global y `best`/`plays` son los existentes de la plataforma, sin cambios.

**Fuera de alcance (para otros specs):**

- Controles táctiles / móvil.
- Sonido y música.
- Cambios de mecánica respecto al original <o: respecto al diseño acordado>.
- Cambios en `GamePlayer`, `GameCanvas`, el HUD, el marco CRT, `saveScore` o los rankings.
- Anti-trampas o verificación de puntuaciones (heredado de SPEC 04).
- Tests automatizados.
- <específico: lo que surgió en las preguntas y se aplazó>.

---

## Modelo de datos

No introduce tablas ni cambios de esquema: reutiliza `games`, `scores`, `game_stats` y `global_ranking` (SPEC 06).

```sql
-- supabase/migrations/<timestamp>_add_game_<id>.sql
<insert into public.games (...) values (...); | update public.games set ... where id = '<id>';>
```

```ts
// components/games/registry.ts — entrada nueva
<id>: {
  createEngine: create<Nombre>Engine,
  width: <W>,
  height: <H>,
  controls: "<TEXTO DE CONTROLES>",
  initialLives: <n>,
  label: "Juego <TÍTULO>",
},
```

Convenciones:

- Constantes del original sin cambios: <lista exhaustiva con valores: W, H, velocidades, tamaños, puntos, niveles, vidas, temporizadores, `dt` máximo>.
- Estado del motor en variables de cierre dentro de `create<Nombre>Engine`.
- `onStats` solo cuando cambian `score`, `level` o `lives`; `onGameOver` una sola vez por partida.
- Estado inicial: `score = 0`, `level = 1`, `lives = <n>`, igual que el HUD.
- `score` = <regla exacta>; `level` = <regla exacta>; `lives` = <regla exacta o "constante 1: el juego no tiene vidas">.
- Colores del canvas: los del original.

---

## Plan de implementación

Antes del paso 1: leer `.claude/skills/new-game/integration.md`, `lib/game-engine.ts`, `components/games/registry.ts` y `lib/games/asteroids/` (port de referencia); revisar en `node_modules/next/dist/docs/` lo relativo a Client Components si hace falta (ver CLAUDE.md).

1. Aplicar la migración del catálogo con `apply_migration` y guardar el SQL en `supabase/migrations/`. [NUEVO] Añadir `.cover-<id>` a `app/globals.css`. Verificación: `execute_sql` muestra la fila; `/juegos` y `/juegos/<id>` muestran la card y el detalle; `/juegos/<id>/jugar` abre con el simulador; `/salon` muestra la pestaña vacía.
2. Crear `lib/games/<id>/constants.ts` (y `utils.ts` si aplica) con los valores del original. Verificación: `npx tsc --noEmit`.
3. Portar las entidades a `lib/games/<id>/<archivos>` con contexto 2D y estado de entrada inyectados. [ASSETS] Copiar los assets a `public/games/<id>/`. Verificación: tipos y `npx eslint lib`.
4. Crear `lib/games/<id>/engine.ts` con `create<Nombre>Engine: CreateGameEngine`: estado en cierre, `update`/`draw`, loop con `requestAnimationFrame`, `pause`/`resume` sin acumular `dt`, `onStats`, `onGameOver`, `destroy`, sin HUD ni overlays. Verificación: tipos y lint.
5. Entrada <de teclado | de teclado y ratón> en el motor según `integration.md`, registrada en `start()` y quitada en `destroy()`. Verificación: tipos y lint.
6. Registrar el juego en `REAL_GAMES`. Verificación: `npm run dev`, jugar `/juegos/<id>/jugar`: <acción básica visible> y el HUD cambia.
7. Verificar el guardado: con sesión, terminar una partida y guardar crea una fila en `scores` con `game_id = "<id>"` y el `score`/`level` reales; sin sesión se ve "INICIA SESIÓN PARA GUARDAR". La puntuación aparece en `/salon` (pestaña y GLOBAL) y `best`/`plays` cambian en `/juegos/<id>`. Verificación: `execute_sql` de lectura sobre `scores`.
8. Revisión final: checks de la sección 8 de `integration.md`, `npx eslint app components lib`, `npm run build` y partida completa con la consola abierta.

---

## Criterios de aceptación

Plataforma:

- [ ] `npx eslint app components lib` y `npm run build` terminan sin errores.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos`, `/juegos/<id>`, `/juegos/<id>/jugar` y `/salon`.
- [ ] `games` contiene la fila `<id>` con los valores del spec y `/juegos` la muestra con la portada `<cover>`.
- [ ] `lib/games/<id>/` no usa `document` ni `getElementById`, y `window` solo para los listeners de entrada.
- [ ] El HUD muestra puntuación, nivel y vidas reales; el canvas no dibuja HUD ni overlays de pausa/fin.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final y el motor deja de aceptar entradas.
- [ ] "FIN" abre el modal con la puntuación actual; "JUGAR DE NUEVO" reinicia con `score = 0`, `level = 1` y <n> vidas.
- [ ] PAUSA detiene todo; REANUDAR continúa sin saltos. Ocultar la pestaña pausa sin salto de `dt` al volver.
- [ ] Las teclas del juego no hacen scroll mientras se juega; fuera de la partida el scroll funciona.
- [ ] Salir y volver a entrar no duplica el loop ni los listeners.
- [ ] El canvas mantiene la proporción <W>:<H> en distintos anchos de ventana.
- [ ] Con sesión, "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `game_id = "<id>"`, `score` y `level` de la partida; sin sesión no inserta nada.
- [ ] La puntuación aparece en `/salon` (pestaña <TÍTULO> y GLOBAL) y `best`/`plays` de `/juegos/<id>` se actualizan tras recargar.
- [ ] ASTEROIDES y los juegos simulados se comportan igual que antes.

Juego (uno por mecánica del original):

- [ ] <específico: estado inicial visible al arrancar>.
- [ ] <específico: cada control y su efecto, idéntico al original>.
- [ ] <específico: tabla de puntos exacta>.
- [ ] <específico: regla de subida de nivel y cambio de dificultad>.
- [ ] <específico: pérdida de vida / condición de fin>.
- [ ] <específico: ítems especiales, power-ups, paneles>.

---

## Decisiones tomadas y descartadas

- **Sí:** motor TypeScript que cumple `CreateGameEngine` y se registra en `REAL_GAMES`; HUD, pausa, modal y guardado de la plataforma. Precedente de SPEC 05. **No:** `iframe` o cargar el `game.js` original (globals, sin pausa ni lectura de score).
- **Sí:** resolución lógica fija <W>×<H> con escalado CSS; física y dificultad idénticas al original.
- [NUEVO] **Sí:** juego nuevo `<id>` junto a `<juego simulado parecido, si hay>`. **No:** reemplazarlo. <motivo del usuario>
- [REEMPLAZO] **Sí:** el juego real ocupa la fila `<id>` (misma URL y portada). **No:** crear una fila nueva. <motivo; qué pasa con las puntuaciones simuladas>
- **Sí:** nombre original en español (`<TÍTULO>`). **No:** nombres o arte de juegos comerciales.
- <específico: cada respuesta de las preguntas — vidas, victoria, sonido, assets, paneles, teclas eliminadas — con su alternativa descartada y su motivo>.

---

## Riesgos identificados

| Riesgo                                                                                                | Mitigación                                                                           |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Strict Mode monta el efecto dos veces y duplica loop o listeners                                      | `destroy()` cancela el frame y quita los listeners; se verifica al volver a entrar.  |
| `generateStaticParams` cacheado no incluye el nuevo `id`                                              | `getGameIds()` se cachea por horas: verificar con `npm run build` tras la migración. |
| <específico: p. ej. assets que cargan tarde, temporizadores fijos vs `dt`, ratón con canvas escalado> | <mitigación>                                                                         |

---

## Qué **no** entra en este spec

- Controles táctiles, gamepad, sonido y música.
- Cambios de mecánica respecto al original.
- Cambios en el HUD, el marco CRT, `GamePlayer`, `saveScore` o los rankings.
- Anti-trampas y tests automatizados.
- <específico>.
````
