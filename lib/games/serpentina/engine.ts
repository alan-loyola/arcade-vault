import type { CreateGameEngine } from "@/lib/game-engine";
import { isSkinId, resolveSkin } from "@/lib/skins";
import {
  BONUS_DURATION,
  BONUS_POINTS,
  COLS,
  FRUIT_POINTS,
  FRUITS_PER_LEVEL,
  INITIAL_LIVES,
  MAX_DT,
  ROWS,
  START_DIR,
  type Bonus,
  type Cell,
  type Dir,
  type Fruit,
  type FruitKind,
} from "./constants";
import { drawBoard, drawBonus, drawFruitCell, drawSnake } from "./render";
import { SKINS } from "./skins";
import {
  enqueueDir,
  freeCells,
  hitsBody,
  initialSnake,
  isOutOfBounds,
  nextHead,
  randomFreeCell,
  tickInterval,
} from "./snake";
// SERPENTINA (SPEC 09). Cumple el contrato común CreateGameEngine (lib/game-engine.ts).
type State = "playing" | "gameover";
const FRUIT_KINDS: readonly FruitKind[] = ["apple", "cherry", "grape", "lemon"];
const BOARD_CELLS = COLS * ROWS; // 400: llenarlo es la victoria
// Únicas teclas que el motor intercepta, con la dirección a la que giran
const GAME_KEYS: ReadonlyMap<string, Dir> = new Map<string, Dir>([
  ["ArrowUp", "up"],
  ["KeyW", "up"],
  ["ArrowDown", "down"],
  ["KeyS", "down"],
  ["ArrowLeft", "left"],
  ["KeyA", "left"],
  ["ArrowRight", "right"],
  ["KeyD", "right"],
]);
function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}
function sameCell(a: Cell | null, b: Cell): boolean {
  return a !== null && a.x === b.x && a.y === b.y;
}
export const createSerpentinaEngine: CreateGameEngine = (
  canvas,
  callbacks,
  options,
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const noop = () => {};
    return { start: noop, pause: noop, resume: noop, destroy: noop };
  }
  // ── Estado (en cierre, no en el módulo) ─────────────────────────────────────
  // Paleta del skin activo: solo cambia colores y glow, nunca el estado de juego
  let palette = resolveSkin(SKINS, options?.skin);
  let snake: Cell[] = initialSnake(); // cabeza en [0]
  let dir: Dir = START_DIR;
  let dirQueue: Dir[] = [];
  let fruit: Fruit | null = null;
  let bonus: Bonus | null = null;
  let normalEaten = 0;
  let score = 0;
  let level = 1;
  const lives = INITIAL_LIVES; // el juego no tiene vidas: constante 1
  let tickAcc = 0; // ms
  let state: State = "playing";
  // ── Control del loop ────────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let started = false;
  let paused = false;
  let destroyed = false;
  let gameOverNotified = false;
  // ── Entrada de teclado ──────────────────────────────────────────────────────
  // Cada keydown pasa por la cola de giros (máx. 2), validada contra el último
  // giro encolado; step() consume uno por paso.
  function clearInput() {
    dirQueue = [];
  }
  // Solo se atiende (y se hace preventDefault) mientras la partida está
  // activa: en pausa, con el modal abierto o tras el fin, las teclas
  // recuperan su comportamiento normal.
  function isListening(): boolean {
    return started && !paused && !destroyed && state !== "gameover";
  }
  function onKeyDown(e: KeyboardEvent) {
    const next = GAME_KEYS.get(e.code);
    if (!next) return;
    if (!isListening()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTextField(e.target)) return;
    e.preventDefault();
    dirQueue = enqueueDir(dirQueue, dir, next);
  }
  function onKeyUp(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    if (!isListening()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTextField(e.target)) return;
    e.preventDefault();
  }
  // ── Notificación a React (solo cuando cambian los valores) ──────────────────
  let emitted = { score, level, lives };
  function emitStats() {
    if (
      emitted.score === score &&
      emitted.level === level &&
      emitted.lives === lives
    )
      return;
    emitted = { score, level, lives };
    callbacks.onStats({ score, level, lives });
  }
  // ── Aparición de frutas ─────────────────────────────────────────────────────
  // Al azar uniforme entre las celdas que no ocupan la serpiente ni la otra fruta.
  function spawnFruit(): Fruit | null {
    const cell = randomFreeCell(freeCells(snake, bonus), Math.random);
    if (!cell) return null;
    const kind = FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
    return { x: cell.x, y: cell.y, kind };
  }
  function spawnBonus(): Bonus | null {
    const cell = randomFreeCell(freeCells(snake, fruit), Math.random);
    if (!cell) return null;
    return { x: cell.x, y: cell.y, remaining: BONUS_DURATION };
  }
  function initGame() {
    snake = initialSnake();
    dir = START_DIR;
    dirQueue = [];
    bonus = null;
    normalEaten = 0;
    score = 0;
    level = 1;
    tickAcc = 0;
    state = "playing";
    fruit = spawnFruit();
  }
  // ── Un paso de la serpiente, en el orden del spec ───────────────────────────
  function step() {
    // 1. Primer giro de la cola, si hay
    const turn = dirQueue.shift();
    if (turn) dir = turn;
    // 2. Nueva cabeza
    const head = nextHead(snake[0], dir);
    // 3. Fuera del tablero: fin (la serpiente queda en su último estado válido)
    if (isOutOfBounds(head)) {
      state = "gameover";
      return;
    }
    // 4. ¿Come fruta normal o bonus?
    const eatsFruit = sameCell(fruit, head);
    const eatsBonus = sameCell(bonus, head);
    // 5. Si no come, la cola se quita (antes de comprobar el choque)
    const body = eatsFruit || eatsBonus ? snake : snake.slice(0, -1);
    // 6. Choque con el cuerpo resultante: fin
    if (hitsBody(head, body)) {
      state = "gameover";
      return;
    }
    // 7. Insertar la cabeza
    snake = [head, ...body];
    // 8. Puntos, nivel y aparición de frutas
    if (eatsFruit) {
      score += FRUIT_POINTS * level;
      normalEaten += 1;
      const levelUp = normalEaten % FRUITS_PER_LEVEL === 0;
      if (levelUp) {
        level += 1;
        bonus = null; // el bonus nuevo sustituye al anterior
      }
      fruit = spawnFruit();
      if (levelUp) bonus = spawnBonus();
    } else if (eatsBonus) {
      score += BONUS_POINTS * level;
      bonus = null;
    }
    // 9. Tablero lleno: victoria
    if (snake.length >= BOARD_CELLS) {
      state = "gameover";
    }
  }
  function update(dt: number) {
    if (state === "gameover") return;
    const ms = dt * 1000;
    // Temporizador del bonus con el dt del juego (no corre en pausa)
    if (bonus) {
      bonus.remaining -= ms;
      if (bonus.remaining <= 0) bonus = null;
    }
    // Pasos de tiempo fijo
    tickAcc += ms;
    while (tickAcc >= tickInterval(level)) {
      tickAcc -= tickInterval(level);
      step();
      if (isOver()) return;
    }
  }
  // Lectura fuera del flujo de update: step() cambia state y TypeScript no lo ve.
  function isOver(): boolean {
    return state === "gameover";
  }
  // Solo el juego: sin HUD ni overlays de pausa/fin (los pone la plataforma)
  function draw() {
    if (!ctx) return;
    drawBoard(ctx, palette);
    if (fruit) drawFruitCell(ctx, fruit, palette);
    if (bonus) drawBonus(ctx, bonus, palette);
    drawSnake(ctx, snake, dir, palette);
  }
  // ── Loop principal ──────────────────────────────────────────────────────────
  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    draw();
    emitStats();
    // Fin de partida (choque o victoria): se avisa una sola vez y el loop se detiene
    if (state === "gameover") {
      if (!gameOverNotified) {
        gameOverNotified = true;
        stopLoop();
        clearInput();
        callbacks.onGameOver({ score, level });
      }
      return;
    }
    rafId = requestAnimationFrame(loop);
  }
  function schedule() {
    if (rafId === null && !destroyed && !paused && state !== "gameover") {
      rafId = requestAnimationFrame(loop);
    }
  }
  return {
    start() {
      if (started || destroyed) return;
      started = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      initGame();
      draw();
      lastTime = null;
      schedule();
    },
    pause() {
      if (!started || destroyed || paused) return;
      paused = true;
      stopLoop();
      clearInput(); // los giros pulsados antes de pausar no se aplican después
    },
    resume() {
      if (!started || destroyed || !paused) return;
      paused = false;
      lastTime = null; // no acumula el tiempo pausado
      schedule();
    },
    // Cambia la paleta sin reiniciar ni tocar score/level/lives. Si el loop
    // está parado (pausa o fin de partida) redibuja un frame para que se vea.
    setSkin(skin) {
      if (!isSkinId(skin) || destroyed) return;
      palette = SKINS[skin];
      if (started && rafId === null) draw();
    },
    destroy() {
      destroyed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      stopLoop();
      clearInput();
    },
  };
};
