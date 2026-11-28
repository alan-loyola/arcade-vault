# Platform integration contract for real games

This is the fixed contract every real game in Arcade Vault follows. It comes from SPEC 05 (Asteroids port) and SPEC 06 (catalog in Supabase). `/new-game` writes specs that comply with it, and `/spec-impl` implements them against it. If the code below no longer matches the repository, trust the repository and update this file.

---

## 1. How a game reaches the player

```
public.games (row)  ──►  /juegos, Home, /juegos/<id>      (cards, detail, stats)
        │
        └──►  /juegos/<id>/jugar  ──►  GamePlayer (components/game-player.tsx)
                                           │
                       REAL_GAMES[gameId] ─┤ found  → GameCanvas + engine
                                           └ absent → CSS simulator
```

- The catalog lives in the `public.games` table (SPEC 06). A row is enough for the game to appear in `/juegos`, Home, its detail page, `/salon` (its own tab) and the global ranking.
- `scores.game_id` has an FK to `games.id`. `saveScore(gameId, score, level)` (`app/juegos/[id]/jugar/actions.ts`) validates the id against the DB and is **not modified** per game.
- `best` and `plays` come from the `game_stats` view; the global ranking from `global_ranking`. Nothing to add per game.
- `components/games/registry.ts` decides whether a game is real. Without an entry, `GamePlayer` runs the simulator.

## 2. Engine contract (`lib/game-engine.ts`)

```ts
export interface GameStats {
  score: number;
  level: number;
  lives: number;
}
export interface GameCallbacks {
  onStats: (stats: GameStats) => void; // only when a value changes
  onGameOver: (result: { score: number; level: number }) => void; // once per run
}
export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  setSkin?(skin: SkinId): void; // optional: only games with skins (section 9)
}
export interface GameOptions {
  skin: SkinId; // from lib/skins.ts
}
export type CreateGameEngine = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions, // optional: without it the engine uses DEFAULT_SKIN
) => GameEngine;
```

Each game exports `create<Name>Engine: CreateGameEngine` from `lib/games/<id>/engine.ts`.

## 3. Registry entry (`components/games/registry.ts`)

```ts
export interface RealGame {
  createEngine: CreateGameEngine;
  width: number; // logical canvas resolution (from the game's constants)
  height: number;
  controls: string; // help line under the CRT, e.g. "← → MOVER · ↑ ROTAR · ESPACIO CAER"
  initialLives: number; // must equal the engine's initial lives
  label: string; // canvas aria-label, e.g. "Juego CAÍDA"
  skins?: true; // only when lib/games/<id>/skins.ts has the 3 skins (section 9)
  touch?: TouchButton[]; // on-screen gamepad for touch devices (section 10)
}
export type TouchZone = "left" | "right";
export interface TouchButton {
  code: string; // e.code sent; must be in the engine's GAME_KEYS
  label: string; // visible text or glyph ("←", "DISPARO")
  aria: string; // Spanish aria-label ("Girar a la izquierda")
  zone: TouchZone; // left thumb or right thumb
  repeat?: true; // re-sends keydown while held (only for keys the engine reads once per keydown)
}
```

`GamePlayer` already handles, for every registered game: HUD (player, score, lives, level), PAUSA/REANUDAR, FIN, SALIR, the game-over modal, saving, "JUGAR DE NUEVO" (remounts the engine through `key`), pause while the modal is open, pause on hidden tab (`visibilitychange`), the CRT frame scaled to the canvas aspect ratio (`--game-w` / `--game-h`), the controls help line, and the touch gamepad (section 10). **None of that is reimplemented per game.**

## 4. Porting rules (`lib/games/<id>/`)

File layout (mirror `lib/games/asteroids/`):

- `constants.ts` — every constant of the original, unchanged, including `W`, `H`, initial lives and the `dt` cap.
- `utils.ts` — pure helpers (only if the original has them).
- `entities.ts` (or several files) — classes/data of the original, typed. The 2D context and the key state are **injected** as parameters, never read from globals.
- `engine.ts` — `create<Name>Engine`.

Engine rules:

1. **No module-level mutable state.** All game state lives in variables inside the `create…Engine` closure, so remounting starts clean.
2. **No `document.getElementById` or DOM lookups.** The engine only receives the canvas. `window` is allowed **only** for `keydown`/`keyup` (and pointer events if the game uses them).
3. **Loop:** `requestAnimationFrame`; `dt = min((ts - lastTime) / 1000, MAX_DT)` with `MAX_DT = 0.05` unless the original defines another cap. Games driven by fixed ticks (e.g. a gravity timer) accumulate `dt` into their own timer — never use `setInterval`.
4. **`pause()`** cancels the frame and clears pressed keys. **`resume()`** sets `lastTime = null` so paused time is not accumulated. Both are idempotent.
5. **`destroy()`** cancels the frame and removes every listener added in `start()`. It must be safe under React Strict Mode double mount.
6. **`onStats`** is emitted only when `score`, `level` or `lives` change (compare with the last emitted values), never every frame.
7. **`onGameOver`** is emitted exactly once; the loop stops and input is ignored afterwards. A "victory" (last level cleared) also ends with `onGameOver`.
8. **Remove from the original:** HUD drawn on canvas, pause overlay and pause keys, game-over/victory overlays, restart-on-key, level selectors, debug keys. Keep everything else (physics, scoring, difficulty, colors) identical.
9. **Initial state** before the first frame: `score = 0`, `level = 1`, `lives = initialLives`, matching the HUD's server render (avoids hydration mismatches). `Math.random()` and `performance.now()` only run inside the engine (client, in `useEffect`).
10. **Colors:** keep the original's colors in the canvas. Only the frame and the HUD use the platform style. Every canvas color lives in `lib/games/<id>/skins.ts` as the `clasico` palette (section 9); no hex/rgb/hsl literals in the other files of the game.

Keyboard rules:

- `keydown`/`keyup` on `window`, registered in `start()`, removed in `destroy()`.
- A `GAME_KEYS` set with the exact `e.code` values the game uses. Ignore every other key.
- `preventDefault()` only for `GAME_KEYS`, only while the run is active (started, not paused, not destroyed, not game over), never with Ctrl/Meta/Alt, never when the target is an `input`, `textarea`, `select` or `contentEditable`.
- Edge-triggered actions (shoot, rotate, hard drop) use a `justPressed` map consumed once per update, like Asteroids' `pressed()`.
- **Never filter by `e.isTrusted`.** The touch gamepad (section 10) sends synthetic `KeyboardEvent`s on `window`; they must reach the engine like real keys.

Mouse / pointer rules (only if the original uses them):

- Listen on the canvas, not on `window`, and remove in `destroy()`.
- The canvas is CSS-scaled: convert with `const r = canvas.getBoundingClientRect(); x = (e.clientX - r.left) * (W / r.width)`, same for `y`.

Assets:

- Images and spritesheets go to `public/games/<id>/` and load with `new Image()` inside the engine; the engine starts drawing once loaded (draw a black frame meanwhile). Spritesheet coordinate maps become a typed `sprites.ts`.
- Sound is out of scope unless a spec explicitly adds it.

## 5. Catalog row (migration)

New game — a migration saved in `supabase/migrations/<timestamp>_add_game_<id>.sql` and applied with `apply_migration`:

```sql
insert into public.games (id, title, short, long, cat, color, cover, sort_order)
values ('<id>', '<TÍTULO>', '<short>', '<long>', '<CAT>', '<color>', 'cover-<id>', <next sort_order>);
```

- `id`: `^[a-z0-9-]{2,40}$`. `cat`: `ARCADE | PUZZLE | SHOOTER | VERSUS`. `color`: `cyan | magenta | yellow | green`.
- `short`: one Spanish line (≤ 50 chars). `long`: 2–3 Spanish sentences describing only mechanics that really exist in the engine.
- `sort_order`: current max + 1 (read it with `execute_sql`).
- No schema change, so `lib/supabase/database.types.ts` does not need regenerating.
- `generateStaticParams` reads ids through `getGameIds()` (cached `hours`): after inserting, `npm run build` (or restarting dev) picks up the new id.

Replacing a simulated game — `update public.games set ... where id = '<id>'` only for the columns that change (usually `long`, and `short` if needed); keep `id`, URL and cover. Decide in the spec whether simulator scores are deleted (`delete from public.scores where game_id = '<id>'` inside the same migration) or kept.

## 6. Cover (`app/globals.css`)

- New game: a `.cover-<id>` class (plus `::before` / `::after`) next to the other `.cover-*` classes. Pure CSS pixel-art: gradients, box-shadows, unicode glyphs; a dark radial background; the accent color of the row; a soft `drop-shadow`/`text-shadow` glow. Use `.cover-asteroids` as the model.
- Replacing a simulated game: keep its existing cover unless the spec decides otherwise.

## 7. Files touched by a game spec

| File                                         | Change                               |
| -------------------------------------------- | ------------------------------------ |
| `supabase/migrations/<ts>_add_game_<id>.sql` | new (insert or update in `games`)    |
| `app/globals.css`                            | `.cover-<id>` (new game only)        |
| `lib/games/<id>/*`                           | new engine                           |
| `components/games/registry.ts`               | one new `REAL_GAMES` entry + `touch` |
| `public/games/<id>/*`                        | assets, only if the game has images  |
| `lib/games/<id>/skins.ts`                    | palettes per skin (section 9)        |
| `references/game-with-themes.md`             | the game's row (section 9)           |

`components/game-player.tsx`, `components/games/game-canvas.tsx`, `lib/game-engine.ts`, `lib/games.ts`, `lib/scores.ts` and `saveScore` are **not** modified. If a game seems to need a change there, it is a platform change: call it out in the spec's decisions and keep it backwards compatible with Asteroids.

## 8. Final checks for every game

- `grep -rn "document\.\|getElementById" lib/games/<id>/` → no results; `grep -rn "window\." lib/games/<id>/` → only the key/pointer listeners.
- `npx tsc --noEmit`, `npx eslint app components lib`, `npm run build` without errors.
- `execute_sql`: the row exists in `games`; after saving a run, a row in `scores` with `game_id = '<id>'` and the real `score`/`level`.
- Play `/juegos/<id>/jugar`: HUD updates, PAUSA freezes, hidden tab pauses without a `dt` jump, FIN and real game over open the modal, JUGAR DE NUEVO resets to `0 / 1 / initialLives`, arrows and space do not scroll the page, leaving and re-entering does not duplicate speed or input.
- `/salon` shows the game's tab and the score; the global ranking includes it; `/juegos/<id>` shows real `best` / `plays`.
- `/juegos/asteroids/jugar` still works and other simulated games are unchanged.
- Touch (mobile emulation with `hasTouch` + `isMobile`, e.g. 390×844): the gamepad shows the declared buttons and no keyboard help line; every button does its action; holding works (and repeats only on `repeat` buttons); sliding a finger off a held button and lifting it releases the key; HUD, full canvas and gamepad fit without vertical scroll. On desktop the gamepad does not appear.
- If the game has skins: `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" lib/games/<id>/ --exclude=skins.ts` → no results; switching skin keeps score/level/lives and works while paused; the choice survives a reload.

## 9. Skins (CLÁSICO · NEÓN · RETRO)

Platform pieces (already built, do not modify per game): `lib/skins.ts`, the optional `options`/`setSkin` of the engine contract, the `skin` prop of `GameCanvas`, and the selector in `GamePlayer` (`components/games/use-game-skin.ts`, persisted in `localStorage` under `arcade-vault:skin:<gameId>`, shown only when the registry entry has `skins: true`). The `skin-designer` subagent (`.claude/agents/skin-designer.md`) applies skins to existing games; a new game can ship them from the start.

`lib/skins.ts` exports `SkinId = "clasico" | "neon" | "retro"`, `SKIN_IDS`, `DEFAULT_SKIN = "clasico"`, `SKIN_LABELS`, `isSkinId`, `SkinSet<P> = Record<SkinId, P>`, `resolveSkin(skins, skin?)`, `skinStorageKey(gameId)`, `relativeLuminance(hex)` and `contrastRatio(a, b)`.

Per game:

1. `lib/games/<id>/skins.ts` — `export interface <Id>Palette { … }` (one field per drawable role: `background`, each entity, text, decoratives, plus `glow: number` and line widths if the game strokes) and `export const SKINS: SkinSet<<Id>Palette>` with the 3 keys. It is the **only** file of the game with color literals.
   - `clasico`: the original colors, exact. It is the default; choosing it changes nothing.
   - `neon`: near-black background (not lighter than the CRT frame `#050507`, e.g. `#04040a`), saturated entities (cyan, magenta, lime, electric yellow), `shadowBlur` 6–14 with a same-tone `shadowColor` **only on entities**, reset to 0 (or `restore()`) after drawing them.
   - `retro`: one phosphor family (amber `#ffb000`, green `#33ff66`) or a 4-color CGA palette, 4–6 tones, no glow, distinct elements separated by luminance.
2. Engine: `let palette = resolveSkin(SKINS, options?.skin);` inside the closure. Pass `palette` as a parameter to every draw function/method (`entity.draw(ctx, palette)`, `drawBoard(ctx, state, palette)`); no module-level state.
3. Engine: return `setSkin(skin) { if (!isSkinId(skin) || destroyed) return; palette = SKINS[skin]; if (started && rafId === null) draw(lastTs); }` — never touches game state, timers or `runKey`; redraws one frame when the loop is stopped (paused or game over).
4. Registry: add `skins: true` to the `REAL_GAMES` entry.
5. Skins only change colors, glow and line width — never collision sizes, speeds, scoring or rules.
6. Dark-mode rules (blocking, check with `contrastRatio` in a throwaway script): background luminance ≤ 0.05 and not lighter than `#050507`; playable entities ≥ 3:1 vs background; in-canvas text ≥ 4.5:1; decoratives (grid, separators, particles) 1.1–2:1; no repeated hex among piece/enemy types and ≥ 1.5:1 or clearly different hue between things the player must tell apart; no large fill with luminance > 0.4.
7. Add/update the game's row in `references/game-with-themes.md` (✅ / ⚠️ / ❌ per skin, date, RETRO family, min contrast).

## 10. Touch gamepad (SPEC 10)

Platform pieces (already built, do not modify per game): `components/games/touch-controls.tsx` (`TouchControls`), `components/games/use-coarse-pointer.ts` (`useCoarsePointer`, `(pointer: coarse)`, `false` on the server) and the integration in `GamePlayer`, which renders the gamepad under the CRT instead of the controls help line only when the entry has `touch` and the pointer is coarse. The gamepad turns Pointer Events into synthetic `keydown`/`keyup` on `window` with each button's `code`, supports several fingers at once, and releases every key when the run stops (pause, game over, hidden tab) or unmounts.

Per game:

1. Every real game declares `touch` in its `REAL_GAMES` entry. Every `code` must be in the engine's `GAME_KEYS`; if the game changes its keys, `touch` changes in the same spec (there is no automatic check).
2. Layout: directions on the `left` zone (glyph labels `←` `→` `↑` `↓`), actions on the `right` zone (short uppercase Spanish words, e.g. `DISPARO`, `ROTAR`). A zone with exactly the four arrows renders as a D-pad; a single arrow per zone renders as a wide key. Keep it to ≤ 4 buttons per zone.
3. `repeat: true` only for keys the engine handles once per `keydown` and that should auto-repeat when held (e.g. CAÍDA's `←` `→` `↓`). Games that read the held key state (`keys[code]`) or ignore repeats do not use it.
4. `aria` is a Spanish description of the action ("Mover a la izquierda", "Disparar").
5. Engines need nothing else: no `isTrusted` checks, no touch listeners. Native gestures (swipe, drag) are out of scope unless a spec adds them.
