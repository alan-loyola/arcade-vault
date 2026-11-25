# SPEC 06 — Leaderboard global y tabla `games` con estadísticas reales

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 04, SPEC 05
> **Fecha:** 2026-11-25
> **Objetivo:** Mover el catálogo de juegos a una tabla `games` de Supabase (con FK desde `scores`), calcular `best` y `plays` reales por juego, y añadir una pestaña GLOBAL en `/salon` con el ranking de jugadores por suma de su mejor puntuación en cada juego.

---

## Por qué existe este spec

SPEC 04 dejó el Salón de la Fama con un top por juego, pero `game_id` es texto sin FK (los juegos viven en `lib/games.ts`) y `Game.best` / `Game.plays` siguen siendo mock, lo que enseña números falsos junto a rankings reales. Tampoco hay forma de comparar jugadores entre juegos. Este spec convierte la base de datos en fuente de verdad del catálogo, calcula las estadísticas desde `scores` y añade un ranking global. El diseño visual existente (cards, `HallOfFame`, podio) se reutiliza; no se rediseña nada.

---

## Alcance

**Dentro:**

- Migración que crea `public.games` (id, título, textos, categoría, color, portada, orden), la siembra con los 9 juegos actuales de `lib/games.ts` (textos idénticos) y añade FK `scores.game_id → games.id`.
- RLS en `games`: `select` público; sin `insert`/`update`/`delete` desde clientes.
- Vista `public.game_stats` (`game_id`, `best`, `plays`) calculada desde `scores`, con `security_invoker = true`.
- Vista `public.global_ranking` (`user_id`, `username`, `total`, `games_played`): por jugador, suma de su mejor `score` por juego; con `security_invoker = true`.
- `lib/games.ts` pasa de constante mock a lectura de BD: `getGames()` y `getGame(id)` (tipo `Game` sin `best`/`plays`; nuevo tipo `GameWithStats`). Se conservan `Category`, `AccentColor` y `CATS`.
- `lib/scores.ts`: nueva `getGlobalRanking(limit)`.
- `/salon`: nueva pestaña **GLOBAL** (primera) con top 12 (rango, usuario, puntos, juegos jugados) y podio de los 3 primeros; las pestañas por juego se generan desde `getGames()`.
- Cards (`/juegos`, Home) y detalle `/juegos/[id]` muestran `best` y `plays` reales; `plays` formateado en compacto (`1,2K`, `12,4K`).
- Estado vacío: juego sin partidas muestra `best = 0` y `plays = 0` sin errores; ranking global vacío usa "AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO".
- `saveScore` valida `gameId` contra la BD (además de la FK).
- Tipos regenerados en `lib/supabase/database.types.ts` y migración guardada en `supabase/migrations/`.

**Fuera de alcance (para otros specs):**

- Ruta nueva `/ranking` o enlace extra en el nav.
- Filtros por periodo (semanal, mensual), paginación o búsqueda de jugador.
- Resaltar la posición del usuario actual cuando queda fuera del top.
- Vista tabular alternativa de juegos en `/juegos` (se mantienen las cards).
- Panel o CRUD de juegos; el catálogo se edita por migración.
- Mover las portadas a Storage (siguen siendo clases CSS en `globals.css`; la BD guarda solo el nombre de la clase).
- Anti-trampas, rate limiting y puntuaciones verificables (heredado de SPEC 04).
- Caché con revalidación para las estadísticas (se leen por petición, como `getTopScores`).
- Tests automatizados.

---

## Modelo de datos

SQL en `supabase/migrations/<timestamp>_games_and_rankings.sql` (nombre exacto lo fija `apply_migration`).

```sql
create table public.games (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  color text not null check (color in ('cyan','magenta','yellow','green')),
  cover text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;
create policy "games_select_public" on public.games for select using (true);

-- insert de los 9 juegos actuales (id, textos, cat, color, cover y sort_order de lib/games.ts)

alter table public.scores
  add constraint scores_game_id_fkey
  foreign key (game_id) references public.games (id);

create view public.game_stats with (security_invoker = true) as
  select game_id, max(score) as best, count(*)::int as plays
  from public.scores
  group by game_id;

create view public.global_ranking with (security_invoker = true) as
  select p.id as user_id, p.username,
         sum(b.best)::int as total,
         count(*)::int as games_played
  from (
    select user_id, game_id, max(score) as best
    from public.scores
    group by user_id, game_id
  ) b
  join public.profiles p on p.id = b.user_id
  group by p.id, p.username;
```

Tipos de aplicación:

```ts
// lib/games.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: AccentColor;
}
export interface GameWithStats extends Game {
  best: number; // max(score), 0 si no hay partidas
  plays: number; // count(scores), 0 si no hay partidas
}

// lib/scores.ts
export interface GlobalRankEntry {
  rank: number;
  username: string;
  total: number;
  gamesPlayed: number;
}
```

Convenciones:

- Ranking global = `total desc, games_played desc, username asc`; N = 12.
- `best` y `plays` salen de `game_stats`; los juegos sin filas se completan con 0 en `lib/games.ts`.
- `getGames()` ordena por `sort_order` y no incluye estadísticas; `getGamesWithStats()` las une. Las páginas que no muestran estadísticas usan solo `getGames()`.
- Las lecturas se hacen con el cliente de servidor existente y dentro de `<Suspense>`, igual que `getTopScores` (`await connection()`).
- `plays` se formatea con `Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 })`.
- Las clases `cover-*` y el valor `color` siguen definidos en `globals.css`; la BD solo guarda sus nombres.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` lo relativo a `cacheComponents`, `generateStaticParams`, `connection()` y `Suspense` (ver CLAUDE.md), y revisar `lib/games.ts`, `lib/scores.ts`, `components/hall-of-fame.tsx`, `components/library.tsx`, `components/game-card.tsx`, `components/home/mini-card.tsx`, `app/page.tsx`, `app/salon/page.tsx` y `app/juegos/[id]/page.tsx`.

1. Aplicar la migración (`games` + RLS + siembra + FK + `game_stats` + `global_ranking`) con `apply_migration` y guardar el SQL en `supabase/migrations/`. Verificación: `list_tables` muestra `games` con RLS; `execute_sql` devuelve 9 filas en `games`; `get_advisors` (security) sin avisos críticos (revisar vistas `security_invoker`).
2. Regenerar `lib/supabase/database.types.ts` con `generate_typescript_types`. Verificación: `npx tsc --noEmit` sin errores.
3. Reescribir `lib/games.ts`: mantener `Category`, `AccentColor`, `CATS`; añadir `Game`, `GameWithStats`, `getGames()`, `getGame(id)` y `getGamesWithStats()` con el cliente de servidor; eliminar el arreglo `GAMES` mock. Verificación: `tsc` muestra solo los usos de `GAMES` pendientes de migrar.
4. Migrar los consumidores de `GAMES` (`app/juegos/[id]/jugar/page.tsx`, `app/juegos/[id]/jugar/actions.ts`, `app/juegos/[id]/page.tsx`, `app/page.tsx`, `app/salon/page.tsx`, `components/library.tsx`, `components/hall-of-fame.tsx`) a `getGames()` / `getGame()`: `generateStaticParams` y listas pasan a datos de BD (en `<Suspense>` o con la API de caché vigente), `saveScore` valida con `getGame`. Verificación: `tsc` y `npm run lint` sin errores y `npm run dev` carga `/`, `/juegos`, `/juegos/asteroids`, `/juegos/asteroids/jugar` y `/salon`.
5. Mostrar estadísticas reales: `GameCard`, `MiniCard` y el detalle `/juegos/[id]` usan `GameWithStats`; añadir el formateo de `plays`. Verificación: tras una partida guardada, `best` y `plays` del juego cambian al recargar; un juego sin partidas muestra 0.
6. Añadir `getGlobalRanking(limit)` a `lib/scores.ts` (lee `global_ranking`, ordena y numera). Verificación: tipos y lint; consulta de prueba contra la BD.
7. Añadir la pestaña GLOBAL a `components/hall-of-fame.tsx` (primera y por defecto), con podio de 3 tolerante a menos filas, tabla (rango, usuario, puntos, juegos) y estado vacío; `app/salon/page.tsx` pasa `globalRanking` por props. Verificación: la pestaña aparece con datos reales y con ranking vacío no falla.
8. Revisión final: `grep` de `GAMES`, `seededScores` y `game.best`/`game.plays` mock en `app/`, `components/` y `lib/`; `get_advisors` (security y performance); `npm run lint`, `npm run build`; recorrer escritorio y móvil con la consola abierta.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/`, `/juegos`, `/juegos/<id>`, `/juegos/<id>/jugar` y `/salon`.
- [ ] `list_tables` muestra `games` con RLS activado y `get_advisors` (security) no reporta tablas sin RLS ni vistas inseguras.
- [ ] El SQL de la migración está en `supabase/migrations/` y `lib/supabase/database.types.ts` incluye `games`, `game_stats` y `global_ranking`.
- [ ] `games` contiene los 9 juegos actuales con los mismos textos, categoría, color y portada que tenía `lib/games.ts`.
- [ ] Un insert directo a `scores` con un `game_id` inexistente es rechazado por la FK.
- [ ] Ningún cliente puede insertar, actualizar ni borrar filas de `games`.
- [ ] `/juegos` y la Home muestran los mismos juegos y en el mismo orden que antes, con sus portadas.
- [ ] `best` y `plays` de cards y detalle salen de `scores`; guardar una partida los actualiza tras recargar.
- [ ] Un juego sin partidas muestra `best = 0` y `plays = 0` sin errores.
- [ ] `/salon` muestra la pestaña GLOBAL primero, seguida de una pestaña por juego.
- [ ] El ranking global suma, por jugador, su mejor `score` en cada juego (una sola vez por juego) y ordena por total descendente (máx. 12).
- [ ] El ranking global muestra rango, usuario, puntos y juegos jugados, y su podio con las 3 primeras filas.
- [ ] Con 0, 1 o 2 jugadores en el ranking global no hay errores y con 0 aparece "AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO".
- [ ] Un jugador con 2 partidas en el mismo juego cuenta solo la mejor en el total global.
- [ ] `saveScore` rechaza un `gameId` que no existe en `games`.
- [ ] `grep` de `GAMES` (constante) y de `best`/`plays` mock en `app/`, `components/` y `lib/` no devuelve resultados.
- [ ] Las páginas de `/juegos/<id>` y `/juegos/<id>/jugar` siguen funcionando para los 9 ids, y un id inexistente devuelve 404.

---

## Decisiones tomadas y descartadas

- **Sí:** ranking global como suma del mejor score por juego. Premia variedad y evita que un solo juego domine. **No:** suma de todas las partidas (premia farmeo) ni mejor score individual (compara escalas incomparables: 24 en DUELO PIXEL vs 184.220 en CAÍDA).
- **Sí:** tabla `games` en Supabase como fuente de verdad, con FK desde `scores`. Integridad referencial y estadísticas por SQL. **No:** tabla solo para integridad con la UI leyendo `lib/games.ts` (dos fuentes que mantener sincronizadas).
- **Sí:** las portadas siguen como clases CSS; la BD guarda el nombre de la clase. **No:** Storage ni imágenes (otro spec).
- **Sí:** `best` y `plays` calculados desde `scores` con una vista; se eliminan los valores mock. **No:** mantener mock ni columnas desnormalizadas que haya que sincronizar.
- **Sí:** vistas con `security_invoker = true` para respetar RLS. **No:** vistas que ejecutan con permisos del dueño.
- **Sí:** el ranking global es una pestaña de `/salon`. Sin ruta ni nav nuevos. **No:** `/ranking` aparte.
- **Sí:** top 12 con rango, usuario, puntos y juegos jugados, igual que el Salón por juego.
- **Sí:** el catálogo se edita por migración. **No:** panel de administración ni escritura desde clientes.
- **Sí:** estadísticas leídas por petición, dentro de `<Suspense>`, como `getTopScores`. **No:** caché con revalidación (otro spec si hace falta).

---

## Riesgos identificados

| Riesgo                                                                                      | Mitigación                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateStaticParams` y listas leen la BD y chocan con `cacheComponents` o rompen el build | Leer las guías de `cacheComponents` antes del paso 1; resolver `generateStaticParams` con una consulta cacheable o `connection()` según la doc, y verificar en `npm run build`. |
| Vistas sin `security_invoker` saltan RLS o disparan avisos de `get_advisors`                | Crearlas con `security_invoker = true`; el paso 1 revisa `get_advisors`.                                                                                                        |
| La siembra difiere de `lib/games.ts` (texto o `sort_order`)                                 | Generar el `insert` desde el archivo actual y comprobar con `execute_sql` los 9 registros antes de borrar el mock.                                                              |
| `scores` existentes con `game_id` inválido hacen fallar la FK                               | Antes de añadir la FK, `execute_sql` con `select distinct game_id from scores`; limpiar o sembrar los faltantes.                                                                |
| Más consultas por página (juegos + estadísticas + rankings) empeoran la latencia            | Consultas únicas con `in`/vista (no una por juego en la lista); `/salon` ya hace una por pestaña, se acepta con 9 juegos.                                                       |
| El ranking global es manipulable (el score lo envía el cliente)                             | Heredado de SPEC 04: aceptado; rango máximo y RLS limitan el daño.                                                                                                              |
| El orden de empates en el ranking varía entre cargas                                        | Orden total determinista: `total desc, games_played desc, username asc`.                                                                                                        |

---

## Qué **no** entra en este spec

- Ruta `/ranking`, filtros por periodo, paginación, búsqueda o posición propia fuera del top.
- Vista tabular alternativa de `/juegos`.
- Panel de administración o escritura de `games` desde la app.
- Portadas en Storage o imágenes.
- Anti-trampas, rate limiting y puntuaciones verificables.
- Caché con revalidación de estadísticas.
- Tests automatizados.
