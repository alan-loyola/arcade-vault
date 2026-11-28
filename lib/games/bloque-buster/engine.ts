import type { CreateGameEngine } from "@/lib/game-engine";
import { isSkinId, resolveSkin } from "@/lib/skins";
import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_POINTS,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  EXPLOSION_DURATION,
  EXPLOSION_FRAME_COUNT,
  H,
  INITIAL_LIVES,
  MAX_DT,
  PADDLE_CATCH_MARGIN,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  SPRITESHEET_SRC,
  W,
} from "./constants";
import { LEVELS, type BlockColor } from "./levels";
import { SKINS } from "./skins";
import { drawFrame, drawSprite, EXPLOSION_FRAMES, SPRITES } from "./sprites";
import { drawVectorScene } from "./vector";
// Cumple el contrato común CreateGameEngine (lib/game-engine.ts).
// Portado de references/started-games/04-arkanoid/game.js sin HUD, overlays,
// pausa propia, selector de nivel ni sonido.
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Paddle = Rect;
interface Ball extends Rect {
  vx: number;
  vy: number;
}
interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}
interface Explosion extends Rect {
  color: BlockColor;
  elapsed: number; // ms
}
type State = "playing" | "gameover";
const LAST_LEVEL = LEVELS.length; // 5
// Únicas teclas que el motor intercepta (estado de tecla mantenida)
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
type GameKey = "ArrowLeft" | "ArrowRight";
function collideAABB(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
export const createBloqueBusterEngine: CreateGameEngine = (
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
  const paddle: Paddle = {
    x: (W - PADDLE_W) / 2,
    y: PADDLE_Y,
    w: PADDLE_W,
    h: PADDLE_H,
  };
  const ball: Ball = {
    x: 0,
    y: 0,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let state: State = "playing";
  // Skin actual (solo apariencia; setSkin lo cambia sin reiniciar)
  let palette = resolveSkin(SKINS, options?.skin);
  // Teclas mantenidas
  const keys: Record<GameKey, boolean> = {
    ArrowLeft: false,
    ArrowRight: false,
  };
  // Posición lógica pendiente del ratón (la aplica update) o null
  let pointerX: number | null = null;
  let image: HTMLImageElement | null = null;
  let imageLoaded = false;
  // ── Control del loop ────────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let started = false;
  let paused = false;
  let destroyed = false;
  let gameOverNotified = false;
  function clearInput() {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    pointerX = null;
  }
  // ── Entrada de teclado y ratón ──────────────────────────────────────────────
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
  // recuperan su comportamiento normal y el ratón no mueve la paleta.
  function isListening(): boolean {
    return started && !paused && !destroyed && state !== "gameover";
  }
  function onKeyDown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    if (!isListening()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTextField(e.target)) return;
    e.preventDefault();
    keys[e.code as GameKey] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    // Soltar siempre libera la tecla, aunque la partida no esté activa
    keys[e.code as GameKey] = false;
    if (!isListening()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTextField(e.target)) return;
    e.preventDefault();
  }
  // El canvas está escalado por CSS: se convierte a coordenadas lógicas.
  function onMouseMove(e: MouseEvent) {
    if (!isListening()) return;
    const r = canvas.getBoundingClientRect();
    if (r.width === 0) return;
    pointerX = (e.clientX - r.left) * (W / r.width);
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
  // Pelota sobre la paleta (en su x actual) con la velocidad del nivel
  function resetBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }
  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    resetBall();
  }
  function movePaddle(dt: number) {
    // Ratón pendiente: centra la paleta en el cursor y se consume
    if (pointerX !== null) {
      paddle.x = Math.max(0, Math.min(W - paddle.w, pointerX - paddle.w / 2));
      pointerX = null;
    }
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
  }
  function update(dt: number) {
    if (state !== "playing") return;
    // Paleta
    movePaddle(dt);
    // Movimiento de la pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Rebotes en paredes (izquierda, derecha, arriba)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }
    // Rebote en la paleta
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_CATCH_MARGIN
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }
    // Colisión con bloques: como máximo uno por frame
    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(ball, block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += BLOCK_POINTS;
        ball.vy = -ball.vy;
        if (blocks.every((b) => !b.alive)) {
          if (level < LAST_LEVEL) loadLevel(level + 1);
          else state = "gameover"; // victoria: termina como un game over
        }
        break;
      }
    }
    // Explosiones
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
    // Pelota perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        state = "gameover";
      } else {
        resetBall();
      }
    }
  }
  // Solo el juego: sin HUD ni overlays (los pone la plataforma)
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);
    // Fondo vacío hasta cargar la imagen en todos los skins, para que la
    // partida arranque igual
    if (!imageLoaded || !image) return;
    // NEÓN / RETRO: primitivas con la paleta
    if (palette.kind === "vector") {
      drawVectorScene(ctx, palette, { paddle, ball, blocks, explosions });
      return;
    }
    // CLÁSICO: spritesheet original
    for (const block of blocks) {
      if (block.alive)
        drawSprite(
          ctx,
          image,
          SPRITES.blocks[block.color],
          block.x,
          block.y,
          block.w,
          block.h,
        );
    }
    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * EXPLOSION_FRAME_COUNT),
        EXPLOSION_FRAME_COUNT - 1,
      );
      drawFrame(
        ctx,
        image,
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
      );
    }
    drawSprite(
      ctx,
      image,
      SPRITES.paddle,
      paddle.x,
      paddle.y,
      paddle.w,
      paddle.h,
    );
    drawSprite(ctx, image, SPRITES.ball, ball.x, ball.y, ball.w, ball.h);
  }
  function loadImage() {
    const img = new Image();
    img.onload = () => {
      if (destroyed) return; // no arrancar nada tras destroy()
      imageLoaded = true;
    };
    img.onerror = () => console.error("Failed to load spritesheet");
    img.src = SPRITESHEET_SRC;
    image = img;
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
    // Hasta que carga la imagen: frame negro, sin simular
    if (imageLoaded) update(dt);
    draw();
    emitStats();
    // Fin de partida (game over o victoria): una sola vez, el loop se detiene
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
  // Estado inicial antes del primer frame: score 0, nivel 1, 3 vidas
  loadLevel(1);
  return {
    start() {
      if (started || destroyed) return;
      started = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("mousemove", onMouseMove);
      loadImage();
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
    // Cambia solo la paleta: no reinicia ni toca score/level/lives. Si el loop
    // no corre (pausa o fin de partida) redibuja un frame para que se vea.
    setSkin(skin) {
      if (!isSkinId(skin) || destroyed) return;
      palette = SKINS[skin];
      if (started && rafId === null) draw();
    },
    destroy() {
      destroyed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      if (image) {
        image.onload = null;
        image.onerror = null;
      }
      stopLoop();
      clearInput();
    },
  };
};
