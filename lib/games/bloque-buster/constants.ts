// Constantes del juego (portado de references/started-games/04-arkanoid/game.js
// y assets/spritesheet.js)
// --- Valores del original, sin cambios ---
export const W = 800;
export const H = 600;
export const BG_COLOR = "#000";
// Paleta
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_Y = 560;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
// Pelota
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200; // px/s
export const BASE_BALL_VY = -300; // px/s
// Bloques
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;
export const BLOCK_POINTS = 10;
// Px bajo la paleta en los que la pelota aún rebota
export const PADDLE_CATCH_MARGIN = 8;
export const INITIAL_LIVES = 3;
// Explosiones
export const EXPLOSION_DURATION = 150; // ms
export const EXPLOSION_FRAME_COUNT = 4;
// --- Integración con la plataforma ---
export const MAX_DT = 0.05; // s
export const SPRITESHEET_SRC = "/games/bloque-buster/spritesheet-breakout.png";
