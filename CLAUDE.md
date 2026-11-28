# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: a platform to play retro arcade games online and compete for the highest score. UI copy, code comments and specs are in Spanish. Development is spec-driven: every feature is a spec in `specs/NN-slug.md` (01–09 so far: MVP screens, home, about/contact, Supabase auth + scores, Asteroids, global leaderboard, Caída, Bloque Buster, Serpentina), implemented on a `spec-NN-slug` branch and merged via PR.

## Commands

```bash
npm run dev           # next dev
npm run build         # next build
npm run lint          # eslint (flat config, eslint.config.mjs + eslint-config-prettier)
npm run format        # prettier --write .
npm run format:check  # prettier --check .
```

There is no test runner. Verify UI changes in the browser (Playwright MCP is available).

## Next.js version caveat

Next 16.4.6 / React 19.3 — APIs differ from older training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`; start at `index.md`) before writing Next code, and heed deprecation notices. `AGENTS.md` is re-added by `next dev`, so commit it rather than removing it.

## Architecture

### Routes (`app/`, App Router only)

- `/` home landing · `/juegos` library · `/juegos/[id]` game detail · `/juegos/[id]/jugar` player · `/salon` hall of fame (per-game top + global ranking tab) · `/acerca` about + contact form · `/auth` login/register.
- Server Actions live next to their route in `actions.ts`: `app/auth/actions.ts` (Supabase auth), `app/juegos/[id]/jugar/actions.ts` (`saveScore`: validates score/level/game, takes `user_id` from the session, never from the client), `app/acerca/actions.ts` (contact via Resend).
- `proxy.ts` (Next 16's replacement for middleware) refreshes the Supabase session on every request and redirects logged-in users away from `/auth`.
- The root layout uses the globally-typed `LayoutProps<"/">` helper (no import needed).

### Caching and data

- `next.config.ts` enables `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`. With `cacheComponents`, any component that reads request data (cookies, session, Supabase via `createClient()`) must be inside `<Suspense>`; the data helpers call `await connection()` for this reason.
- Supabase clients in `lib/supabase/`: `server.ts` (cookie-based, for request-time reads and actions), `public.ts` (anonymous, no cookies — for `"use cache"` functions and `generateStaticParams`), `client.ts` (browser). Types in `database.types.ts` (regenerate with the Supabase MCP `generate_typescript_types` after schema changes).
- Data modules: `lib/games.ts` (catalog from the `games` table; server-only — Client Components import types from `lib/game-types.ts`), `lib/scores.ts` (`getTopScores`, `getGlobalRanking`), `lib/auth.ts` (`getCurrentUser`, wrapped in React `cache`), `lib/home.ts`.
- Database (`supabase/migrations/`): `profiles` (auto-created by `handle_new_user` trigger), `scores`, `games`, and the `game_stats` / `global_ranking` views (`security_invoker`). RLS: public select, users insert only their own scores. New games are added with a migration inserting into `games`.
- Env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (Resend keys are server-only).

### Games

- **Real games** (Asteroids, Caída, Bloque Buster, Serpentina) are canvas engines in `lib/games/<id>/` (`engine.ts`, `constants.ts` exporting `W`, `H`, `INITIAL_LIVES`, plus helper modules). Each implements `CreateGameEngine` from `lib/game-engine.ts` (`start/pause/resume/destroy`, callbacks `onStats` only on change and `onGameOver` once). Engine state lives in closure variables, not module scope.
- They are registered in `components/games/registry.ts` (`REAL_GAMES`: engine, logical size, controls hint, initial lives, aria-label) and mounted by `components/games/game-canvas.tsx`. `components/game-player.tsx` uses the registry entry if present; every other catalog game falls back to the built-in simulator.
- Game assets go in `public/games/<id>/`. Source material for porting lives in `references/` (`started-games/`, `source-assets/`, `templates/` with the original design mockups).

### Styling

- Tailwind CSS v4 through Turbopack, not PostCSS: `next.config.ts` has a `turbopack.rules` entry running `@tailwindcss/turbopack` on `*.css` (no `postcss.config`). Theme tokens are in `app/globals.css` via `@theme inline`.
- Fonts: Geist Sans/Mono loaded with `next/font/google` in `app/layout.tsx` as CSS variables.

## Tooling

- `.claude/settings.json` has a PostToolUse hook (`.claude/hooks/format-lint.mjs`) that runs on every Write/Edit: it **strips blank lines from JS/TS files** (house style: no blank lines inside code), then runs Prettier and `eslint --fix`. Lint errors fail the hook, so fix them rather than working around it.
- `.mcp.json` configures the Supabase MCP server for this project (migrations, SQL, type generation, advisors).
- `specs/.spec-config.yml`: `/spec-impl` creates the branch automatically (`AutoCreateBranch: true`) and does not auto-commit steps (`AutoCommitSteps: false`).

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

- `/spec` y `/spec-impl` (de `Klerith/fernando-skills`, instaladas con `npx skills@latest add Klerith/fernando-skills`; ver `skills-lock.json`): `/spec` diseña un spec en `specs/NN-slug.md`; cuando su estado pasa a "Aprobado", `/spec-impl NN-slug` lo implementa paso a paso en la rama `spec-NN-slug`.
- `/new-game` (skill propia en `.claude/skills/new-game/`, con el contrato de plataforma en `integration.md`) para añadir un juego real (desde `references/started-games/` o desde una descripción): genera el spec `specs/NN-juego-<id>.md`; impleméntalo con `/spec-impl`. Los juegos reales se registran en `components/games/registry.ts` (contrato en `lib/game-engine.ts`); el resto del catálogo usa el simulador.
- Subagente `game-planner` (`.claude/agents/game-planner.md`): decide qué juego encaja en la plataforma antes de `/new-game`. Su memoria es el TO DO `references/games-suggestions.md` (Pendientes / En curso / Implementados / Descartados), que crea y actualiza en cada ejecución.
- Subagente `game-jam` (`.claude/agents/game-jam.md`): recibe un tema, diseña un juego original y escribe 2–3 specs incrementales (núcleo jugable, progresión, extras) en `specs/game-jam/<game-id>/`, en estado Borrador y con el formato de SPEC 07–09. Solo escribe specs; se implementan después con `/spec-impl`.
- Subagente `skin-designer` (`.claude/agents/skin-designer.md`): aplica los skins CLÁSICO (por defecto), NEÓN y RETRO a **un solo juego real por ejecución, el que indique el usuario**, cumpliendo las reglas de contraste en modo oscuro, con selector de skin en el reproductor (persistido en `localStorage` por juego; solo en juegos con `skins: true` en `REAL_GAMES`). Paletas en `lib/games/<id>/skins.ts`, tipos en `lib/skins.ts`. Registro de qué juegos ya tienen skins: `references/game-with-themes.md`.
- Subagente `mobile-porter` (`.claude/agents/mobile-porter.md`): audita y corrige con Playwright que la web se vea y se use bien en el navegador móvil (vertical, puntero grueso) sin cambiar escritorio; usa SPEC 10 como contrato del mando táctil del reproductor. Trabaja las rutas que indique el usuario (o todas) y registra el estado en `references/mobile-audit.md`. No toca motores, Server Actions ni Supabase, ni hace commit.
- Las skills están duplicadas en `.claude/skills/` y `.agents/skills/`; si modificas una, mantén ambas copias sincronizadas.
