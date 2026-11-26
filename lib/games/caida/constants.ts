// Constantes del juego (portado de references/started-games/03-tetris/game.js)
// --- Valores del original, sin cambios ---
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30; // tablero de 300×600
// Indexados por tipo de pieza (1–8); el índice 0 es la celda vacía.
export const COLORS: readonly (string | null)[] = [
  null,
  "#4dd0e1", // I - cian
  "#ffd54f", // O - amarillo
  "#ba68c8", // T - morado
  "#81c784", // S - verde
  "#e57373", // Z - rojo
  "#90caf9", // J - azul pálido
  "#ffb74d", // L - naranja
  "#9e9e9e", // N - tuerca (gris metálico)
];
// Matrices de las piezas indexadas por tipo (1–8); el índice 0 no existe.
export const PIECES: readonly (readonly (readonly number[])[] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
export const PIECE_TYPES = 8;
// Puntos por líneas limpiadas a la vez (0–4), multiplicados por el nivel.
export const LINE_SCORES: readonly number[] = [0, 100, 300, 500, 800];
// Velocidad de caída (ms)
export const INITIAL_DROP_INTERVAL = 1000;
export const MIN_DROP_INTERVAL = 100;
export const DROP_STEP = 90;
export const LINES_PER_LEVEL = 10;
export const HARD_DROP_POINTS = 2; // por celda recorrida
export const SOFT_DROP_POINTS = 1; // por fila bajada
// Desplazamientos horizontales probados al rotar (wall kicks), en orden.
export const KICKS: readonly number[] = [0, -1, 1, -2, 2];
export const GHOST_ALPHA = 0.2;
// Dibujo del bloque
export const BLOCK_HIGHLIGHT = "rgba(255,255,255,0.12)";
export const BLOCK_HIGHLIGHT_H = 4;
// Colores del tema oscuro original
export const BG_COLOR = "#1a1a25";
export const GRID_COLOR = "#22222e";
export const GRID_LINE_W = 0.5;
export const LABEL_COLOR = "#555570";
export const VALUE_COLOR = "#7aa2f7";
// --- Integración con la plataforma ---
export const PANEL_W = 150;
export const BOARD_W = COLS * BLOCK; // 300
export const W = BOARD_W + PANEL_W; // 450
export const H = ROWS * BLOCK; // 600
export const NEXT_BLOCK = 30; // vista previa de 4×4 celdas (como el canvas de 120×120)
export const NEXT_CELLS = 4;
export const PANEL_SEPARATOR = "#2a2a3a";
export const INITIAL_LIVES = 1;
export const MAX_DT = 0.05;
