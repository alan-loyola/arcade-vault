# SPEC 04 — Supabase: autenticación real y puntuaciones persistentes

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 02, SPEC 03
> **Fecha:** 2026-11-24
> **Objetivo:** Integrar Supabase en la app de Next.js para tener registro e inicio de sesión reales (correo y contraseña, con nombre de usuario en un perfil) y guardar y mostrar las puntuaciones reales por juego en el Salón de la Fama y en el detalle del juego.

---

## Por qué existe este spec

Hasta ahora todo el backend era simulado: `AuthForm` solo navega a `/juegos`, las puntuaciones se guardan en `localStorage` (`av_scores`) y los rankings salen de `seededScores` (mock). Supabase aporta Auth y Postgres con RLS en un solo servicio. El pedido es cubrir infraestructura, auth y puntuaciones en un único spec, avanzando en pasos incrementales que dejan la app funcional en cada commit. El diseño visual existente no cambia; solo se conecta a datos reales.

---

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`; clientes en `lib/supabase/client.ts` (navegador) y `lib/supabase/server.ts` (servidor).
- Refresco de sesión mediante el proxy de Next 16 (`proxy.ts`, antes `middleware.ts`; confirmar en `node_modules/next/dist/docs/`).
- Proyecto Supabase **ya existente** (`https://kbxoxbvzmrpxytlwpgsd.supabase.co`, sin tablas en `public` hoy). Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` documentadas en `.env.example`.
- Migraciones SQL versionadas en `supabase/migrations/`, aplicadas con el MCP de Supabase (`apply_migration`). Tablas `profiles` y `scores` con RLS.
- Tipos generados en `lib/supabase/database.types.ts` (MCP `generate_typescript_types`) y clientes tipados con `Database`.
- Auth con correo y contraseña en `/auth`:
  - Pestaña INICIAR SESIÓN: campos **Correo** y Contraseña.
  - Pestaña CREAR CUENTA: Usuario (3–12 caracteres, único), Correo y Contraseña (mín. 8).
  - Server Actions `signIn`, `signUp` y `signOut` en `app/auth/actions.ts`, con estados de error visibles.
  - Confirmación de correo **desactivada** en el proyecto (paso manual documentado).
- Nav con sesión: reemplazar "Iniciar Sesión" por el nombre de usuario y un botón "CERRAR SESIÓN", en barra y panel móvil.
- Guardado de puntuaciones: `GamePlayer` llama a una Server Action `saveScore`; solo usuarios con sesión guardan. El invitado ve un aviso con enlace a `/auth`.
- Lectura de puntuaciones reales: top por juego en `/salon` y en el detalle `/juegos/[id]`, con estado vacío cuando no hay datos.
- Eliminar `seededScores` y el uso de `av_scores` en `localStorage`.

**Fuera de alcance (para otros specs):**

- OAuth con Google y GitHub (los botones siguen inertes).
- Confirmación de correo, recuperación de contraseña y cambio de correo.
- Sesiones anónimas de Supabase y guardado de puntuaciones de invitados.
- Anti-trampas real: el juego es una simulación en el cliente, el score no es verificable.
- Rate limiting de inserciones.
- Migrar o importar los `av_scores` existentes en `localStorage`.
- Datos reales en la Home (`lib/home.ts` sigue siendo mock) y en `Game.best` / `Game.plays`.
- Supabase local con CLI/Docker, Realtime, Storage y Edge Functions.
- Edición de perfil, avatares y página de perfil.
- Tests automatizados.

---

## Modelo de datos

SQL en `supabase/migrations/<timestamp>_init_profiles_scores.sql` (nombre exacto lo fija `apply_migration`).

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[A-Za-z0-9_]{3,12}$'),
  created_at timestamptz not null default now()
);

create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  score integer not null check (score between 0 and 9999999),
  level integer not null default 1 check (level between 1 and 999),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
```

- Trigger `on auth.users insert` (`handle_new_user`, `security definer`, `search_path = ''`) que crea la fila de `profiles` leyendo `raw_user_meta_data->>'username'`. Si el nombre ya existe o es inválido, el alta falla y `signUp` devuelve error.
- RLS activado en ambas tablas:
  - `profiles`: `select` público; sin `insert`/`update`/`delete` desde clientes (lo crea el trigger).
  - `scores`: `select` público; `insert` solo con `auth.uid() = user_id`; sin `update`/`delete`.
- `game_id` no tiene FK porque los juegos viven en `lib/games.ts`; se valida en servidor contra `GAMES`.

Tipos de aplicación (en `lib/scores.ts`):

```ts
export interface ScoreEntry {
  rank: number;
  username: string;
  score: number;
  date: string; // "dd/mm/aaaa" (es-ES)
}

export type AuthState =
  { status: "idle" } | { status: "error"; message: string };

export type SaveScoreResult =
  { ok: true } | { ok: false; reason: "unauthenticated" | "invalid" | "send" };
```

Variables de entorno (públicas por diseño; la seguridad la da RLS, nunca se usa `service_role` en el repo):

```
NEXT_PUBLIC_SUPABASE_URL=https://kbxoxbvzmrpxytlwpgsd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Convenciones:

- `saveScore(gameId, score, level)` valida `gameId ∈ GAMES`, `score` entero 0–9 999 999 y `level` entero 1–999; el `user_id` sale siempre de `supabase.auth.getUser()`, nunca del cliente.
- Ranking = mejores `N` filas por `score desc, created_at asc`; N = 12 en `/salon` y 10 en el detalle.
- Errores de Supabase: `console.error` en servidor y mensaje genérico al cliente, salvo "usuario ya en uso" y "correo ya registrado", que se muestran tal cual.
- Fechas formateadas con `toLocaleDateString("es-ES")` en servidor.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` las guías `authentication.md` y `authentication-with-cache-components.md`, lo relativo a `proxy`, `cookies()`, Server Actions y `cacheComponents` (ver CLAUDE.md), y la documentación vigente de `@supabase/ssr` para Next.js (MCP `search_docs`).

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`; añadir las dos variables a `.env.example` y a `.env.local` (valores vía MCP `get_project_url` y `get_publishable_keys`). Crear `lib/supabase/client.ts` y `lib/supabase/server.ts` sin tipos aún. Verificación: `npx tsc --noEmit` sin errores.
2. Aplicar la migración de `profiles` y el trigger `handle_new_user` con RLS; guardar el SQL en `supabase/migrations/`. Verificación: `list_tables` muestra `profiles` con RLS y `get_advisors` (security) sin avisos críticos.
3. Aplicar la migración de `scores` con RLS e índice (archivo aparte en `supabase/migrations/`). Generar `lib/supabase/database.types.ts` y tipar ambos clientes con `Database`. Verificación: tipos sin errores y `get_advisors` limpio.
4. Crear `proxy.ts` en la raíz que refresca la sesión con `@supabase/ssr` y reenvía las cookies; matcher excluyendo estáticos. Verificación: `npm run dev` carga todas las rutas sin errores.
5. Crear `app/auth/actions.ts` (`"use server"`) con `signIn`, `signUp` (envía `username` en `options.data`) y `signOut`, con validación en servidor (correo válido, contraseña ≥ 8, usuario con la regex del esquema). Verificación: tipos y `npm run lint`.
6. Adaptar `components/auth-form.tsx` con `useActionState`: pestaña de login con campo Correo, registro con Usuario + Correo + Contraseña, estado pendiente y mensaje de error con clase de color existente; tras éxito, `redirect("/juegos")`. "JUGAR COMO INVITADO" se mantiene. Verificación: crear cuenta crea filas en `auth.users` y `profiles`, e iniciar sesión funciona.
7. Crear `lib/auth.ts` con `getCurrentUser()` (usuario + `username` de `profiles`) y actualizar `components/nav.tsx` para recibir el usuario desde `app/layout.tsx`: con sesión muestra `username` y "CERRAR SESIÓN" (formulario con `signOut`) en barra y panel móvil. Verificación: el nav cambia al iniciar y cerrar sesión; `/auth` con sesión activa redirige a `/juegos`.
8. Crear `lib/scores.ts` con `getTopScores(gameId, limit)` (join con `profiles`) y la Server Action `saveScore` en `app/juegos/[id]/jugar/actions.ts`. Verificación: tipos y lint; una inserción de prueba aparece en `scores`.
9. Conectar `components/game-player.tsx`: el nombre del HUD y del modal sale del perfil (prop `username`, `INVITADO` sin sesión); "GUARDAR PUNTUACIÓN" llama a `saveScore`; sin sesión el modal muestra "INICIA SESIÓN PARA GUARDAR" con enlace a `/auth`. Eliminar `av_scores`. Verificación: una partida guardada crea una fila con `user_id` correcto.
10. Reemplazar `seededScores` por `getTopScores` en `app/juegos/[id]/page.tsx` y en `/salon` (pasar los datos a `HallOfFame` por props por juego), con estado vacío ("AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO") y podio tolerante a menos de 3 filas. Eliminar `seededScores` y `ScoreRow` de `lib/games.ts`. Verificación: el ranking muestra las filas reales y los estados vacíos.
11. Revisión final: `grep` de `seededScores`, `av_scores` y `service_role`; ejecutar `get_advisors` (security y performance), `npm run lint`, `npm run build` y probar el flujo completo en escritorio y móvil.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/`, `/juegos`, `/juegos/<id>`, `/juegos/<id>/jugar`, `/salon`, `/auth` y `/acerca`.
- [ ] `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores secretos, y `.env.local` sigue ignorado por git.
- [ ] No existe `service_role` ni ninguna clave secreta de Supabase en el repo ni en el bundle del cliente.
- [ ] `list_tables` muestra `profiles` y `scores` con RLS activado, y `get_advisors` (security) no reporta tablas sin RLS.
- [ ] El SQL de ambas migraciones está en `supabase/migrations/` y `lib/supabase/database.types.ts` está versionado.
- [ ] Registrarse con usuario, correo y contraseña válidos crea sesión, una fila en `profiles` con ese `username` y redirige a `/juegos`.
- [ ] Registrarse con un usuario ya existente, un usuario fuera de 3–12 caracteres o con símbolos, un correo inválido o una contraseña < 8 muestra un error y no crea cuenta.
- [ ] Iniciar sesión con correo y contraseña correctos redirige a `/juegos`; con credenciales incorrectas muestra un mensaje de error genérico.
- [ ] Con sesión, el nav muestra el `username` y "CERRAR SESIÓN" (barra y panel móvil) y no muestra "Iniciar Sesión".
- [ ] "CERRAR SESIÓN" elimina la sesión y el nav vuelve a mostrar "Iniciar Sesión".
- [ ] La sesión persiste al recargar la página.
- [ ] Visitar `/auth` con sesión activa redirige a `/juegos`.
- [ ] "JUGAR COMO INVITADO" sigue llevando a `/juegos`.
- [ ] Con sesión, el HUD y el modal de fin de partida muestran el `username` del perfil.
- [ ] Con sesión, "GUARDAR PUNTUACIÓN" inserta una fila en `scores` con `user_id` del usuario, `game_id`, `score` y `level` de la partida, y el modal muestra "PUNTUACIÓN GUARDADA".
- [ ] Sin sesión, el modal de fin de partida muestra "INICIA SESIÓN PARA GUARDAR" con enlace a `/auth` y no inserta nada.
- [ ] Un insert directo a `scores` con otro `user_id`, o con `score` fuera de rango, es rechazado por la base de datos.
- [ ] `saveScore` rechaza un `gameId` que no está en `GAMES`.
- [ ] `/salon` muestra, por pestaña de juego, las filas reales ordenadas por puntuación descendente (máx. 12), y el podio con las 3 primeras.
- [ ] `/juegos/<id>` muestra el top real (máx. 10) de ese juego.
- [ ] Un juego sin puntuaciones muestra "AÚN NO HAY PUNTUACIONES · SÉ EL PRIMERO" sin errores; con 1 o 2 filas el podio no falla.
- [ ] Una puntuación guardada aparece en `/salon` y en el detalle del juego tras recargar.
- [ ] `grep` de `seededScores` y `av_scores` en `app/`, `components/` y `lib/` no devuelve resultados.

---

## Decisiones tomadas y descartadas

- **Sí:** un solo spec para infra, auth y puntuaciones, con pasos incrementales. Decisión explícita del usuario pese a tocar varias áreas; cada paso deja la app ejecutable.
- **No:** dividir en dos specs (04 infra+auth, 05 puntuaciones). Se propuso y se descartó.
- **Sí:** proyecto Supabase remoto ya existente y cambios de esquema vía MCP. **No:** Supabase local con CLI/Docker.
- **Sí:** migraciones como archivos en `supabase/migrations/`. Esquema reproducible y revisable en git. **No:** esquema solo en el dashboard.
- **Sí:** tipos generados con el MCP en `lib/supabase/database.types.ts`.
- **Sí:** correo + contraseña, con el usuario en `profiles`. Es el flujo nativo de Supabase Auth. **No:** usuario + contraseña con correo sintético (frágil).
- **Sí:** login por correo; el campo "Usuario" solo existe al registrarse. **No:** resolver usuario→correo con RPC (más código y expone qué usuarios existen).
- **No:** OAuth Google/GitHub en este spec. Requiere configurar providers y callback; los botones quedan inertes.
- **Sí:** confirmación de correo desactivada. Evita SMTP, pantalla intermedia y ruta de callback; un arcade no la necesita. Requiere desactivarla en el dashboard (Authentication → Providers → Email).
- **Sí:** solo usuarios con sesión guardan puntuaciones; el invitado juega pero ve un aviso. **No:** sesiones anónimas ni insert público (abuso y filas sin dueño).
- **Sí:** insert mediante Server Action con validación de `game_id` y rango, además de RLS y `CHECK`. **No:** insert directo desde el cliente (no valida `game_id`).
- **Sí:** el Salón y el detalle muestran solo datos reales con estado vacío. **No:** mezclar con mock de relleno (confunde datos falsos y reales).
- **Sí:** `scores` sin `update`/`delete`: el historial es inmutable. Las mejores filas se obtienen por orden, sin tabla de "mejor por usuario".
- **Sí:** `game_id` como texto sin FK, porque los juegos están en `lib/games.ts`.
- **Sí:** clave publishable en `NEXT_PUBLIC_*`; la protección es RLS. Nunca `service_role` en el proyecto.
- **Sí:** `proxy.ts` para refrescar sesión (convención de Next 16).

---

## Riesgos identificados

| Riesgo                                                                                                  | Mitigación                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cacheComponents` hace que leer `cookies()` fuera de `Suspense` rompa el build o fuerce rutas dinámicas | Leer las guías `authentication-with-cache-components.md` antes del paso 1; envolver el nav/`getCurrentUser` en `Suspense` si el build lo exige.    |
| `generateStaticParams` en `/juegos/[id]` choca con leer el ranking dinámico                             | Mantener la carga del ranking en un componente en `Suspense` o con la API de caché vigente; verificar en `npm run build`.                          |
| La API de `@supabase/ssr` o los nombres de claves difieren de lo conocido                               | Consultar `search_docs` del MCP y la doc oficial antes de implementar; usar la clave publishable, no la `anon` legada si el proyecto ofrece ambas. |
| Confirmación de correo activa en el proyecto: el registro no inicia sesión                              | Paso manual documentado en el spec; el paso 6 lo comprueba y, si falla, se muestra el aviso de configuración.                                      |
| El trigger `handle_new_user` falla por usuario duplicado y el mensaje de Supabase es opaco              | Pre-validar unicidad del usuario en `signUp` y mapear el error a "USUARIO YA EN USO".                                                              |
| Puntuaciones falsificables (el score lo envía el cliente)                                               | Aceptado: el juego es una simulación. Rango máximo y RLS limitan el daño; anti-trampas va en otro spec.                                            |
| Spam de inserciones por un usuario autenticado                                                          | Fuera de alcance; si hay abuso, rate limit en otro spec.                                                                                           |
| Pérdida de los `av_scores` locales existentes                                                           | Aceptado: eran datos de prueba del MVP y no se migran.                                                                                             |

---

## Qué **no** entra en este spec

- OAuth con Google/GitHub, recuperación de contraseña y confirmación de correo.
- Sesiones anónimas o puntuaciones de invitados.
- Anti-trampas, verificación de puntuaciones y rate limiting.
- Estadísticas reales en la Home, `Game.best` y `Game.plays`.
- Perfil de usuario, avatares y edición de datos.
- Supabase local (CLI/Docker), Realtime, Storage y Edge Functions.
- Migración de datos de `localStorage`.
- Cambios de diseño respecto a SPEC 01–03.
- Tests automatizados.
