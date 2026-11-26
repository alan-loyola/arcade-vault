// Tablero y piezas (portado de references/started-games/03-tetris/game.js).
// Sin estado de módulo: todas las funciones reciben el tablero como parámetro.
import { COLS, KICKS, PIECE_TYPES, PIECES, ROWS } from "./constants";
export type Cell = number; // 0 = vacía, 1–8 = índice de color del tipo de pieza
export type Board = Cell[][]; // ROWS × COLS
export interface Piece {
  type: number;
  shape: Cell[][];
  x: number;
  y: number;
}
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<Cell>(COLS).fill(0));
}
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_TYPES) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
export function collide(
  board: Board,
  shape: Cell[][],
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
export function rotateCW(shape: Cell[][]): Cell[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<Cell>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
// Rota en sentido horario probando los KICKS en orden.
// Devuelve la pieza rotada y desplazada, o null si ningún desplazamiento cabe.
export function tryRotate(board: Board, piece: Piece): Piece | null {
  const rotated = rotateCW(piece.shape);
  for (const kick of KICKS) {
    if (!collide(board, rotated, piece.x + kick, piece.y)) {
      return { ...piece, shape: rotated, x: piece.x + kick };
    }
  }
  return null;
}
// Fija la pieza en el tablero (lo modifica en sitio, como el original).
export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
}
// Elimina las filas completas (en sitio) y devuelve cuántas se limpiaron.
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<Cell>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}
// Fila donde aterrizaría la pieza si cayera en vertical.
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
