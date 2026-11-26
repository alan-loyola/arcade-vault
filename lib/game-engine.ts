// Contrato común de los motores de juego reales de la plataforma.
// Cada juego en lib/games/<id>/engine.ts exporta una función CreateGameEngine
// y se registra en components/games/registry.ts.

export interface GameStats {
  score: number;
  level: number;
  lives: number;
}

export interface GameCallbacks {
  // Solo cuando cambia score, level o lives (no en cada frame).
  onStats: (stats: GameStats) => void;
  // Una sola vez por partida.
  onGameOver: (result: { score: number; level: number }) => void;
}

export interface GameEngine {
  start(): void; // arranca el loop (requestAnimationFrame) y los listeners
  pause(): void; // detiene la simulación y el dibujo del loop
  resume(): void; // reanuda sin acumular el tiempo pausado
  destroy(): void; // cancela el loop y quita todos los listeners
}

export type CreateGameEngine = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameEngine;
