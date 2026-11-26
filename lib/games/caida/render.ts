// Dibujo del juego (portado de references/started-games/03-tetris/game.js).
// El contexto 2D se inyecta; no se lee nada del DOM.
import type { Board, Cell, Piece } from "./board";
import { ghostY } from "./board";
import {
  BG_COLOR,
  BLOCK,
  BLOCK_HIGHLIGHT,
  BLOCK_HIGHLIGHT_H,
  BOARD_W,
  COLORS,
  COLS,
  GHOST_ALPHA,
  GRID_COLOR,
  GRID_LINE_W,
  H,
  LABEL_COLOR,
  NEXT_BLOCK,
  NEXT_CELLS,
  PANEL_SEPARATOR,
  PANEL_W,
  ROWS,
  VALUE_COLOR,
} from "./constants";
// Tipografías del panel lateral del original (style.css).
const LABEL_FONT = "600 10px system-ui, -apple-system, sans-serif";
const LABEL_SPACING = "2px";
const VALUE_FONT = "700 26px 'Courier New', Courier, monospace";
const VALUE_SPACING = "1px";
// Posiciones verticales dentro del panel.
const NEXT_LABEL_Y = 40;
const NEXT_TOP = 56;
const LINES_LABEL_Y = NEXT_TOP + NEXT_CELLS * NEXT_BLOCK + 44;
const LINES_VALUE_Y = LINES_LABEL_Y + 34;
// Bloque en la celda (x, y) de una rejilla de tamaño `size`, desplazada (ox, oy).
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: Cell,
  size: number,
  alpha = 1,
  ox = 0,
  oy = 0,
): void {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  if (!color) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(ox + x * size + 1, oy + y * size + 1, size - 2, size - 2);
  // brillo superior
  ctx.fillStyle = BLOCK_HIGHLIGHT;
  ctx.fillRect(
    ox + x * size + 1,
    oy + y * size + 1,
    size - 2,
    BLOCK_HIGHLIGHT_H,
  );
  ctx.globalAlpha = 1;
}
export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = GRID_LINE_W;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}
function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  y: number,
  alpha: number,
): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        drawBlock(ctx, piece.x + c, y + r, piece.shape[r][c], BLOCK, alpha);
}
// Tablero: fondo, rejilla, celdas fijas, pieza fantasma y pieza actual.
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  current: Piece,
): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, BOARD_W, H);
  drawGrid(ctx);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);
  drawPiece(ctx, current, ghostY(board, current), GHOST_ALPHA);
  drawPiece(ctx, current, current.y, 1);
}
// Panel lateral (x ∈ [300, 450)): siguiente pieza y contador de líneas.
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  next: Piece,
  lines: number,
): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(BOARD_W, 0, PANEL_W, H);
  // Separador
  ctx.strokeStyle = PANEL_SEPARATOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(BOARD_W + 0.5, 0);
  ctx.lineTo(BOARD_W + 0.5, H);
  ctx.stroke();
  const centerX = BOARD_W + PANEL_W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // SIGUIENTE
  ctx.font = LABEL_FONT;
  ctx.letterSpacing = LABEL_SPACING;
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText("SIGUIENTE", centerX, NEXT_LABEL_Y);
  // Pieza siguiente centrada en una caja de 4×4 celdas (como drawNext del original)
  const boxLeft = BOARD_W + (PANEL_W - NEXT_CELLS * NEXT_BLOCK) / 2;
  const shape = next.shape;
  const offX = Math.floor((NEXT_CELLS - shape[0].length) / 2);
  const offY = Math.floor((NEXT_CELLS - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(
        ctx,
        offX + c,
        offY + r,
        shape[r][c],
        NEXT_BLOCK,
        1,
        boxLeft,
        NEXT_TOP,
      );
  // LÍNEAS
  ctx.font = LABEL_FONT;
  ctx.letterSpacing = LABEL_SPACING;
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText("LÍNEAS", centerX, LINES_LABEL_Y);
  ctx.font = VALUE_FONT;
  ctx.letterSpacing = VALUE_SPACING;
  ctx.fillStyle = VALUE_COLOR;
  ctx.fillText(String(lines), centerX, LINES_VALUE_Y);
  ctx.letterSpacing = "0px";
}
