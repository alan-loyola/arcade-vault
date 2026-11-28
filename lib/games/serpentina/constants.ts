// Constantes y tipos de SERPENTINA (SPEC 09). Juego original, sin código de referencia.
// --- Tipos del modelo de datos ---
export type Dir = "up" | "down" | "left" | "right";
/** Celda del tablero, 0–19, origen arriba a la izquierda. */
export interface Cell {
  x: number;
  y: number;
}
export type FruitKind = "apple" | "cherry" | "grape" | "lemon";
export interface Fruit extends Cell {
  kind: FruitKind;
}
export interface Bonus extends Cell {
  /** ms de juego restantes. */
  remaining: number;
}
/** Colores de un pixel-art por clave de carácter (viven en skins.ts). */
export type PixelColors = Record<string, string>;
/**
 * 8 filas de 8 caracteres; cada carácter es una clave de `PixelColors` o "."
 * (transparente). `main` es la clave del color base (el del glow en NEÓN).
 */
export type PixelArt = { main: string; rows: string[] };
// --- Tablero ---
export const COLS = 20;
export const ROWS = 20;
export const CELL = 24;
export const W = COLS * CELL; // 480
export const H = ROWS * CELL; // 480
// --- Partida ---
export const INITIAL_LIVES = 1;
export const INITIAL_LENGTH = 3;
export const START_HEAD: Readonly<Cell> = { x: 10, y: 10 };
export const START_DIR: Dir = "right";
// --- Velocidad (ms por paso): max(TICK_MIN, TICK_BASE − TICK_STEP × (level − 1)) ---
export const TICK_BASE = 150;
export const TICK_STEP = 10;
export const TICK_MIN = 60;
// --- Puntuación y niveles ---
export const FRUIT_POINTS = 10;
export const BONUS_POINTS = 50;
export const FRUITS_PER_LEVEL = 5;
// --- Bonus (ms de juego) ---
export const BONUS_DURATION = 6000;
export const BONUS_BLINK_START = 2000;
export const BONUS_BLINK_PERIOD = 200;
// --- Entrada y loop ---
export const DIR_QUEUE_MAX = 2;
export const MAX_DT = 0.05; // s
// Los colores viven en skins.ts (CLÁSICO, NEÓN, RETRO).
