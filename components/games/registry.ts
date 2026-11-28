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
import { createCaidaEngine } from "@/lib/games/caida/engine";
import {
  H as CAIDA_H,
  INITIAL_LIVES as CAIDA_LIVES,
  W as CAIDA_W,
} from "@/lib/games/caida/constants";
import { createBloqueBusterEngine } from "@/lib/games/bloque-buster/engine";
import {
  H as BLOQUE_BUSTER_H,
  INITIAL_LIVES as BLOQUE_BUSTER_LIVES,
  W as BLOQUE_BUSTER_W,
} from "@/lib/games/bloque-buster/constants";
import { createSerpentinaEngine } from "@/lib/games/serpentina/engine";
import {
  H as SERPENTINA_H,
  INITIAL_LIVES as SERPENTINA_LIVES,
  W as SERPENTINA_W,
} from "@/lib/games/serpentina/constants";
export interface RealGame {
  createEngine: CreateGameEngine;
  width: number; // resolución lógica del canvas
  height: number;
  controls: string; // ayuda bajo el marco CRT
  initialLives: number; // estado inicial del HUD (igual al del motor)
  label: string; // aria-label del canvas
  // Solo si lib/games/<id>/skins.ts tiene los 3 skins y el motor implementa
  // setSkin: GamePlayer muestra el selector CLÁSICO · NEÓN · RETRO.
  skins?: true;
}
export const REAL_GAMES: Record<string, RealGame> = {
  asteroids: {
    createEngine: createAsteroidsEngine,
    width: ASTEROIDS_W,
    height: ASTEROIDS_H,
    controls: "← → ROTAR · ↑ IMPULSO · ESPACIO DISPARAR",
    initialLives: ASTEROIDS_LIVES,
    label: "Juego ASTEROIDES",
    skins: true,
  },
  caida: {
    createEngine: createCaidaEngine,
    width: CAIDA_W,
    height: CAIDA_H,
    controls: "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAER",
    initialLives: CAIDA_LIVES,
    label: "Juego CAÍDA",
  },
  "bloque-buster": {
    createEngine: createBloqueBusterEngine,
    width: BLOQUE_BUSTER_W,
    height: BLOQUE_BUSTER_H,
    controls: "RATÓN / ← → MOVER",
    initialLives: BLOQUE_BUSTER_LIVES,
    label: "Juego BLOQUE BUSTER",
    skins: true,
  },
  serpentina: {
    createEngine: createSerpentinaEngine,
    width: SERPENTINA_W,
    height: SERPENTINA_H,
    controls: "← ↑ → ↓ / WASD MOVER",
    initialLives: SERPENTINA_LIVES,
    label: "Juego SERPENTINA",
    skins: true,
  },
};
