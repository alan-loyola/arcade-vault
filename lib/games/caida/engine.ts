import type { CreateGameEngine } from "@/lib/game-engine";
import {
  clearLines,
  collide,
  createBoard,
  merge,
  randomPiece,
  type Board,
  type Piece,
} from "./board";
import {
  DROP_STEP,
  INITIAL_DROP_INTERVAL,
  INITIAL_LIVES,
  LINE_SCORES,
  LINES_PER_LEVEL,
  MAX_DT,
  MIN_DROP_INTERVAL,
} from "./constants";
import { drawBoard, drawPanel } from "./render";
// Cumple el contrato común CreateGameEngine (lib/game-engine.ts).
type State = "playing" | "gameover";
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
  function update(dt: number) {
    if (state === "gameover") return;
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
      initGame();
      draw();
      lastTime = null;
      schedule();
    },
    pause() {
      if (!started || destroyed || paused) return;
      paused = true;
      stopLoop();
    },
    resume() {
      if (!started || destroyed || !paused) return;
      paused = false;
      lastTime = null; // no acumula el tiempo pausado
      schedule();
    },
    destroy() {
      destroyed = true;
      stopLoop();
    },
  };
};
