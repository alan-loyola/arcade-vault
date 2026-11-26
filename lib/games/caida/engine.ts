import type { CreateGameEngine } from "@/lib/game-engine";
import {
  clearLines,
  collide,
  createBoard,
  ghostY,
  merge,
  randomPiece,
  tryRotate,
  type Board,
  type Piece,
} from "./board";
import {
  DROP_STEP,
  HARD_DROP_POINTS,
  INITIAL_DROP_INTERVAL,
  INITIAL_LIVES,
  LINE_SCORES,
  LINES_PER_LEVEL,
  MAX_DT,
  MIN_DROP_INTERVAL,
  SOFT_DROP_POINTS,
} from "./constants";
import { drawBoard, drawPanel } from "./render";
// Cumple el contrato común CreateGameEngine (lib/game-engine.ts).
type State = "playing" | "gameover";
// Únicas teclas que el motor intercepta
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "KeyX",
  "ArrowDown",
  "Space",
]);
export const createCaidaEngine: CreateGameEngine = (canvas, callbacks) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const noop = () => {};
    return { start: noop, pause: noop, resume: noop, destroy: noop };
  }
  // ── Estado (en cierre, no en el módulo) ─────────────────────────────────────
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  const lives = INITIAL_LIVES; // el juego no tiene vidas: constante 1
  let dropInterval = INITIAL_DROP_INTERVAL;
  let dropAccum = 0; // ms
  let state: State = "playing";
  // ── Control del loop ────────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let started = false;
  let paused = false;
  let destroyed = false;
  let gameOverNotified = false;
  // ── Entrada de teclado ──────────────────────────────────────────────────────
  // Cada keydown (incluidas las repeticiones del sistema) encola una acción,
  // como el original actuaba en cada keydown. La cola se consume al inicio
  // del siguiente update, en orden, para que el estado solo cambie en el loop.
  let actions: string[] = [];
  function clearInput() {
    actions = [];
  }
  function isTextField(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    );
  }
  // Solo se atiende (y se hace preventDefault) mientras la partida está
  // activa: en pausa, con el modal abierto o tras el fin, las teclas
  // recuperan su comportamiento normal.
  function isListening(): boolean {
    return started && !paused && !destroyed && state !== "gameover";
  }
  function onKeyDown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    if (!isListening()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTextField(e.target)) return;
    e.preventDefault();
    actions.push(e.code);
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
  // ── Lógica de juego ─────────────────────────────────────────────────────────
  function spawn() {
    current = next;
    next = randomPiece();
    // Game over: la pieza nueva colisiona al aparecer
    if (collide(board, current.shape, current.x, current.y)) {
      state = "gameover";
    }
  }
  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] ?? 0) * level; // nivel previo a recalcular
      level = Math.floor(lines / LINES_PER_LEVEL) + 1;
      dropInterval = Math.max(
        MIN_DROP_INTERVAL,
        INITIAL_DROP_INTERVAL - (level - 1) * DROP_STEP,
      );
    }
    spawn();
  }
  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = INITIAL_DROP_INTERVAL;
    dropAccum = 0;
    state = "playing";
    next = randomPiece();
    spawn();
  }
  function move(dx: number) {
    if (!collide(board, current.shape, current.x + dx, current.y)) {
      current.x += dx;
    }
  }
  function rotate() {
    const rotated = tryRotate(board, current);
    if (rotated) current = rotated;
  }
  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += SOFT_DROP_POINTS;
    } else {
      lockPiece();
    }
  }
  function hardDrop() {
    const gy = ghostY(board, current);
    score += (gy - current.y) * HARD_DROP_POINTS;
    current.y = gy;
    lockPiece();
  }
  // Lectura fuera del flujo de update: spawn() puede cambiar state a "gameover"
  // dentro de applyAction y TypeScript no lo ve con el estrechamiento de tipos.
  function isOver(): boolean {
    return state === "gameover";
  }
  function applyAction(code: string) {
    switch (code) {
      case "ArrowLeft":
        move(-1);
        break;
      case "ArrowRight":
        move(1);
        break;
      case "ArrowUp":
      case "KeyX":
        rotate();
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "Space":
        hardDrop();
        break;
    }
  }
  function update(dt: number) {
    if (state === "gameover") return;
    // Acciones de teclado encoladas, en orden
    const queued = actions;
    actions = [];
    for (const code of queued) {
      applyAction(code);
      if (isOver()) {
        clearInput();
        return;
      }
    }
    // Caída automática
    dropAccum += dt * 1000;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  // Solo el juego: sin HUD ni overlays de pausa/fin (los pone la plataforma)
  function draw() {
    if (!ctx) return;
    drawBoard(ctx, board, current);
    drawPanel(ctx, next, lines);
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
    // Fin de partida: se avisa una sola vez y el loop se detiene
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
      clearInput(); // las teclas pulsadas antes de pausar no se aplican después
    },
    resume() {
      if (!started || destroyed || !paused) return;
      paused = false;
      lastTime = null; // no acumula el tiempo pausado
      schedule();
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
