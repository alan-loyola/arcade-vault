// Contrato común de los motores de juego reales de la plataforma.
// Cada juego en lib/games/<id>/engine.ts exporta una función CreateGameEngine
// y se registra en components/games/registry.ts.
import type { SkinId } from "@/lib/skins";
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
  // Opcional (solo juegos con skins): cambia la paleta sin reiniciar la
  // partida ni tocar score/level/lives; en pausa redibuja un frame.
  setSkin?(skin: SkinId): void;
}
// Opciones de creación. Sin ellas el motor usa DEFAULT_SKIN (lib/skins.ts).
export interface GameOptions {
  skin: SkinId;
}
export type CreateGameEngine = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
) => GameEngine;
