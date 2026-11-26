import {
  H,
  INITIAL_ASTEROIDS,
  INITIAL_LIVES,
  MAX_DT,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  RESPAWN_DELAY,
  SAFE_DIST,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  type Keys,
} from "./entities";
import { dist, rand } from "./utils";
import type { GameCallbacks, GameEngine } from "@/lib/game-engine";
// Cumple el contrato común CreateGameEngine (lib/game-engine.ts).
export type AsteroidsCallbacks = GameCallbacks;
export type AsteroidsEngine = GameEngine;
type State = "playing" | "dead" | "gameover";
// Únicas teclas que el motor intercepta
const GAME_KEYS = new Set(["ArrowUp", "ArrowLeft", "ArrowRight", "Space"]);
export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const noop = () => {};
    return { start: noop, pause: noop, resume: noop, destroy: noop };
  }
  // ── Estado (en cierre, no en el módulo) ─────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  // ── Control del loop ────────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastTs = 0;
  let started = false;
  let paused = false;
  let destroyed = false;
  let gameOverNotified = false;
  // ── Entrada de teclado ──────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};
  function pressed(code: string): boolean {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  }
  function clearInput() {
    for (const code of Object.keys(keys)) keys[code] = false;
    for (const code of Object.keys(justPressed)) justPressed[code] = false;
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
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    keys[e.code] = false;
    if (isListening() && !isTextField(e.target)) e.preventDefault();
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
  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    state = "playing";
    spawnAsteroids(INITIAL_ASTEROIDS);
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  }
  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }
    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += a.points;
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }
  // Solo el juego: sin HUD ni overlay "GAME OVER" (los pone la plataforma)
  function draw(now: number) {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx, now));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);
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
    lastTs = ts;
    update(dt);
    draw(ts);
    emitStats();
    // Fin de partida: se avisa una sola vez y el loop se detiene (sin entradas)
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
      draw(lastTs);
      lastTime = null;
      schedule();
    },
    pause() {
      if (!started || destroyed || paused) return;
      paused = true;
      stopLoop();
      clearInput(); // evita teclas "pegadas" si el keyup ocurre en pausa
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
}
