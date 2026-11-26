// Registro de juegos reales: gameId → motor y metadatos de presentación.
// Los juegos del catálogo (tabla `games`) que no estén aquí usan el simulador
// de GamePlayer. Para añadir uno: /new-game (genera el spec) y /spec-impl.
import type { CreateGameEngine } from "@/lib/game-engine";
import { createAsteroidsEngine } from "@/lib/games/asteroids/engine";
import {
  H as ASTEROIDS_H,
  INITIAL_LIVES as ASTEROIDS_LIVES,
  W as ASTEROIDS_W,
} from "@/lib/games/asteroids/constants";
export interface RealGame {
  createEngine: CreateGameEngine;
  width: number; // resolución lógica del canvas
  height: number;
  controls: string; // ayuda bajo el marco CRT
  initialLives: number; // estado inicial del HUD (igual al del motor)
  label: string; // aria-label del canvas
}
export const REAL_GAMES: Record<string, RealGame> = {
  asteroids: {
    createEngine: createAsteroidsEngine,
    width: ASTEROIDS_W,
    height: ASTEROIDS_H,
    controls: "← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR",
    initialLives: ASTEROIDS_LIVES,
    label: "Juego ASTEROIDES",
  },
};
