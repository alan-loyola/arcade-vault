---
name: new-game
description: Designs the spec to add a real playable game to Arcade Vault (canvas engine + catalog row + leaderboard), either porting a game from references/started-games/ or from a game described by the user. Analyzes the source, asks clarifying questions, writes specs/NN-juego-<id>.md ready for /spec-impl, and stops. Use it whenever a new real game must be integrated into the platform.
disable-model-invocation: true
argument-hint: "<references/started-games/NN-name | short description of the game>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*), mcp__supabase__execute_sql
---

# /new-game — Spec designer for real games on the platform

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Reference games available:
!`ls references/started-games/ 2>/dev/null || echo "No references/started-games/ folder"`

Real games already registered (everything else in the catalog is simulated):
!`grep -oE '^  [a-z0-9-]+: \{' components/games/registry.ts 2>/dev/null || echo "components/games/registry.ts not found"`

---

This skill produces **one spec** that, once approved, `/spec-impl` turns into a real game integrated into Arcade Vault: a TypeScript canvas engine, a row in the `games` table, a cover, an entry in the real-games registry, and automatic presence in the per-game leaderboard, the global ranking and the `best`/`plays` stats. **You don't write code here.** Your job ends when the spec file is saved.

It is a specialization of the `/spec` skill: same philosophy, same phases, same output format. What it adds is the fixed knowledge of how a game plugs into this platform, so that the questions focus only on what is specific to the game.

**The `/spec` skill is the base reference for every spec this skill writes.** Its files live in `.claude/skills/spec/`:

- `.claude/skills/spec/SKILL.md` — the general spec-driven method: phases, how to ask questions, when to stop asking, how to write and save the spec, hard rules.
- `.claude/skills/spec/template.md` — the general shape of a spec: header, scope, data model, implementation plan, acceptance criteria, decisions, risks, and the global writing rules.

If `.claude/skills/spec/` does not exist, look in `.agents/skills/spec/`. If neither exists, tell the user and stop: do not write a spec without that reference.

Files in this skill's directory:

- `integration.md` — the platform contract (engine API, registry, catalog migration, cover, keyboard/mouse rules, assets). **Read it entirely before Phase 2.** Every spec you write must comply with it.
- `template.md` — the pre-filled spec skeleton for a game. It specializes `.claude/skills/spec/template.md` for games. The spec you write follows it.

Precedence when they disagree: `integration.md` and this skill's `template.md` win on game-specific content (platform contract, fixed items, file name `NN-juego-<id>.md`, Spanish). `/spec`'s files win on method and general writing rules (one-sentence objective, verifiable criteria, no TODOs, steps that leave the system working).

Your replies must be in the same language as the user's prompt. The spec itself is written in **Spanish**, matching `specs/05-juego-asteroids.md` and `specs/06-leaderboard-global-tabla-juegos.md` (headings, `Estado`, `Depende de`, etc.).

## Phase 1 — Context

1. Read `CLAUDE.md` (or `AGENTS.md` / `README.md` if it does not exist).
2. **Read the `/spec` skill entirely:** `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md`. Follow its method in every phase below. Do not invoke `/spec` itself; read its files as reference.
3. Read `integration.md` and `template.md` from this skill's directory.
4. Read `specs/05-juego-asteroids.md` and `specs/06-leaderboard-global-tabla-juegos.md`. They are the canonical precedent: SPEC 05 is the first real game port, SPEC 06 moved the catalog to Supabase.
5. Read the current integration code so the spec references real names: `components/games/registry.ts`, `components/game-player.tsx`, `lib/game-engine.ts`, and skim `lib/games/asteroids/` as the reference port.
6. Read the current catalog from the database with `mcp__supabase__execute_sql` (**read-only queries only**):
   `select id, title, cat, color, cover, sort_order from public.games order by sort_order;`
   If the MCP is unavailable, fall back to the latest `insert into public.games` in `supabase/migrations/` and say so.

## Phase 2 — Analyze the source

Decide the source from `$ARGUMENTS`:

- **A path or a name matching a folder in `references/started-games/`** (e.g. `03-tetris`, `tetris`, `references/started-games/04-arkanoid`): it is a **port**. Read the whole game: `README.md`, `CLAUDE.md`, `index.html`, every `.js` file, any `specs/` inside it, and list `assets/`. Do not skim — the spec must preserve the original mechanics exactly.
- **A free-text description**: it is a **new game from the user's design**. There is no code to port; Phase 3 must gather the full design.
- **Empty**: list the reference games from the session context and ask which one, or ask for a one-sentence description of the new game.

For a port, extract and write down (you will use it in the spec):

| Aspect                 | What to find                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Canvas                 | Logical resolution (`W`/`H`), extra DOM elements (side panels, next-piece preview…). |
| Constants              | Every tuning value (speeds, sizes, points, lives, probabilities, timers, `dt` cap).  |
| Score / level / lives  | Exactly how each is computed. Whether `lives` exists at all.                         |
| Input                  | Every key (`e.code`), mouse/pointer use, pause keys, restart keys, debug keys.       |
| Own UI to remove       | HUD drawn in canvas, overlays (pause, game over, victory), restart-on-key, menus.    |
| Globals and DOM access | `document.getElementById`, `window.*`, top-level `let` state, inline `onclick`.      |
| Loop                   | `requestAnimationFrame` vs `setInterval`, how `dt` is computed and capped.           |
| Assets                 | Images, spritesheets, sounds, fonts, and how they are loaded.                        |
| End states             | Game over, and also "win" / last level completed.                                    |

Then compare against the catalog: if an existing **simulated** game (one not in the real-games registry) covers the same genre or mechanics (e.g. a falling-blocks puzzle vs `caida`, a brick breaker vs `bloque-buster`), note it — Phase 3 must ask about it.

## Phase 3 — Clarify through questions

Same rules as `/spec`: blocks of 3–5 concrete questions with `AskUserQuestion`, recommendation first and labeled `(Recomendado)`, wait for answers between blocks. Do not ask what `integration.md` already fixes (engine API, HUD, pause, modal, saving, leaderboard) — those are closed decisions.

**Always ask:**

1. **Catalog slot** (only if Phase 2 found a similar simulated game): replace that entry (keep its `id`, its URL and its cover; `update` the row) or add a new game next to it (new row, like `asteroids` next to `rocas`). If replacing, also ask whether the existing `scores` for that `id` (produced by the simulator) are deleted or kept.
2. **Identity** (new row only): `id` (kebab-case, `^[a-z0-9-]{2,40}$`, Spanish and original), `title` (uppercase Spanish), `cat` (`ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`), `color` (`cyan` | `magenta` | `yellow` | `green`). Propose values. **Never use a commercial game's trademarked name or characters** as `id`/`title`/texts — propose an original Spanish name in the platform's style (CAÍDA, BLOQUE BUSTER, SERPENTINA…).
3. **Lives**: if the game has no lives (e.g. falling-blocks puzzles), what the HUD shows — recommendation: `lives = 1` constant, so the HUD shows one heart and game over is the only end.

**Ask when it applies:**

- **Sound**: the platform has no audio yet. Recommendation: leave sound out of scope (another spec).
- **Spritesheets / images**: copy to `public/games/<id>/` and load them inside the engine with `new Image()` (recommended) vs redraw with canvas primitives.
- **Original pause / restart / level-select keys**: recommendation: remove them; the platform's PAUSA/REANUDAR, FIN and JUGAR DE NUEVO replace them.
- **Victory** (last level cleared): recommendation: call `onGameOver(score, level)` like a game over, so the result can be saved.
- **Extra panels** (next piece, hold, lines counter): draw them inside the canvas (widening the logical resolution if needed) vs drop them.
- **Mouse input**: if the original uses the mouse, confirm coordinate conversion for the CSS-scaled canvas (see `integration.md`).
- **New game without reference**: mechanics, win/lose rules, scoring table, level progression, controls, canvas resolution. Keep asking until a programmer could write the engine without inventing rules.

Stop asking when you can answer, without assuming: which files appear or change, what the first and the last implementation steps are, and how to verify the game is finished.

If the request grows beyond one game (multiplayer, touch controls, sound system, new HUD fields), point out that it deserves its own spec and leave it out of scope.

## Phase 4 — Write the spec

**Before creating the spec file, read the `/spec` skill again** (`.claude/skills/spec/SKILL.md`, phases 3 and 4 and its hard rules, plus `.claude/skills/spec/template.md`), even if you read it in Phase 1. It is the reference for how the file is written and saved. Then check your draft against it:

- The objective is a single sentence.
- Scope has both "Dentro" and "Fuera de alcance", and nothing in the plan is outside the scope.
- Every implementation step leaves the system working and has its own verification.
- Every acceptance criterion is boolean and verifiable. None says "works well" or similar.
- Every decision has a reason and names the discarded alternative.
- Names are concrete (real paths, real `e.code` values, real constants). No TODOs.
- It follows `/spec`'s global writing rules: one idea per sentence, standard markdown, no long code.

Fix anything that fails before writing the file.

Write the whole spec in one go following this skill's `template.md`, shaped by `/spec`'s template (no section-by-section confirmation unless information is genuinely missing — same rule as `/spec`):

1. Number: highest number in `specs/` + 1, zero-padded to two digits.
2. File name: `specs/NN-juego-<id>.md`.
3. Header: `**Estado:** Borrador`, `**Depende de:** SPEC 05, SPEC 06`, `**Fecha:**` from the session context.
4. Replace every `<…>` placeholder in the template with the concrete values from Phases 2–3. Keep the fixed platform items. Add game-specific acceptance criteria for **every** mechanic of the original (points table, level rules, lives, special items) so the port can be checked mechanic by mechanic.
5. Do not leave TODOs or unresolved placeholders. If something is undecided, go back to Phase 3.
6. Do not overwrite an existing spec file; ask if the target path exists.
7. Check that every spec named in `**Depende de:**` exists in `specs/`, as `/spec` requires.
8. If `specs/.spec-config.yml` does not exist, create it with the exact default content from `/spec`'s Phase 4. If it exists, leave it untouched.

Then confirm to the user, in their language:

- The path of the created spec.
- That it is in `Borrador` state and must be changed to `Aprobado` after review.
- If you just created `specs/.spec-config.yml`, mention it and its defaults, as `/spec` does.
- Next step: `/spec-impl NN-juego-<id>`.

**Stop there.** Do not implement, do not offer to implement.

## Hard rules

- **Never write the spec file without reading the `/spec` skill first** (`.claude/skills/spec/SKILL.md` and `template.md`). Its method and writing rules apply to every game spec.
- **Never write code** in this skill — only the spec `.md` file (and `specs/.spec-config.yml` if it is missing).
- **Never run write queries** with `execute_sql` (no `insert`, `update`, `delete`, `alter`, `create`). The catalog change is a migration that `/spec-impl` applies.
- **Never change the original game's mechanics** (physics, scoring, difficulty, constants) beyond what the platform integration requires. If the user wants changes, record them explicitly in the spec's decisions section.
- **Never put HUD, pause, game-over or restart UI in the engine** — the platform owns them.
- **Never recreate a commercial game's branding** (name, characters, logos, art, music). Mechanics in a genre are fine; the name and look must be original.
- **Never skip Phase 3.** If the user wants to skip it, warn once that questions now save hours later; if they insist, record "Definición rápida sin aclaración detallada" in the decisions section.
