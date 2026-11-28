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
// Mando virtual: cada botón envía keydown/keyup sintéticos en window con su
// `code`, que debe estar en GAME_KEYS del motor (si el motor cambia sus
// teclas, su `touch` debe cambiar a la vez).
export type TouchZone = "left" | "right";
export interface TouchButton {
  code: string; // e.code que se envía; debe estar en GAME_KEYS del motor
  label: string; // texto o símbolo visible ("←", "DISPARO")
  aria: string; // aria-label en español ("Girar a la izquierda")
  zone: TouchZone; // zona del mando: izquierda (pulgar izq.) o derecha
  repeat?: true; // reenvía keydown mientras se mantiene pulsado
}
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
  // Mando virtual en dispositivos táctiles. Sin él, no se muestra mando.
  touch?: TouchButton[];
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
    touch: [
      {
        code: "ArrowLeft",
        label: "←",
        aria: "Girar a la izquierda",
        zone: "left",
      },
      {
        code: "ArrowRight",
        label: "→",
        aria: "Girar a la derecha",
        zone: "left",
      },
      { code: "ArrowUp", label: "IMPULSO", aria: "Impulso", zone: "right" },
      { code: "Space", label: "DISPARO", aria: "Disparar", zone: "right" },
    ],
  },
  caida: {
    createEngine: createCaidaEngine,
    width: CAIDA_W,
    height: CAIDA_H,
    controls: "← → MOVER · ↑ / X ROTAR · ↓ BAJAR · ESPACIO CAER",
    initialLives: CAIDA_LIVES,
    label: "Juego CAÍDA",
    touch: [
      {
        code: "ArrowLeft",
        label: "←",
        aria: "Mover a la izquierda",
        zone: "left",
        repeat: true,
      },
      {
        code: "ArrowRight",
        label: "→",
        aria: "Mover a la derecha",
        zone: "left",
        repeat: true,
      },
      {
        code: "ArrowDown",
        label: "↓",
        aria: "Bajar",
        zone: "left",
        repeat: true,
      },
      { code: "ArrowUp", label: "ROTAR", aria: "Rotar pieza", zone: "right" },
      { code: "Space", label: "CAER", aria: "Dejar caer", zone: "right" },
    ],
  },
  "bloque-buster": {
    createEngine: createBloqueBusterEngine,
    width: BLOQUE_BUSTER_W,
    height: BLOQUE_BUSTER_H,
    controls: "RATÓN / ← → MOVER",
    initialLives: BLOQUE_BUSTER_LIVES,
    label: "Juego BLOQUE BUSTER",
    skins: true,
    touch: [
      {
        code: "ArrowLeft",
        label: "←",
        aria: "Mover la paleta a la izquierda",
        zone: "left",
      },
      {
        code: "ArrowRight",
        label: "→",
        aria: "Mover la paleta a la derecha",
        zone: "right",
      },
    ],
  },
  serpentina: {
    createEngine: createSerpentinaEngine,
    width: SERPENTINA_W,
    height: SERPENTINA_H,
    controls: "← ↑ → ↓ / WASD MOVER",
    initialLives: SERPENTINA_LIVES,
    label: "Juego SERPENTINA",
    skins: true,
    touch: [
      { code: "ArrowUp", label: "↑", aria: "Ir hacia arriba", zone: "left" },
      {
        code: "ArrowLeft",
        label: "←",
        aria: "Ir a la izquierda",
        zone: "left",
      },
      { code: "ArrowDown", label: "↓", aria: "Ir hacia abajo", zone: "left" },
      {
        code: "ArrowRight",
        label: "→",
        aria: "Ir a la derecha",
        zone: "left",
      },
    ],
  },
};
