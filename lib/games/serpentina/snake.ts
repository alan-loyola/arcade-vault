// Lógica pura del tablero de SERPENTINA (SPEC 09): sin estado, sin DOM, sin canvas.
import {
  COLS,
  DIR_QUEUE_MAX,
  INITIAL_LENGTH,
  ROWS,
  START_DIR,
  START_HEAD,
  TICK_BASE,
  TICK_MIN,
  TICK_STEP,
  type Cell,
  type Dir,
} from "./constants";
const VECTORS: Record<Dir, Readonly<Cell>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
/** Serpiente inicial: cabeza en START_HEAD y el cuerpo detrás, contra START_DIR. Cabeza en [0]. */
export function initialSnake(): Cell[] {
  const v = VECTORS[START_DIR];
  const snake: Cell[] = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    snake.push({ x: START_HEAD.x - v.x * i, y: START_HEAD.y - v.y * i });
  }
  return snake;
}
/** Celda a la que avanza `head` en la dirección `dir`. */
export function nextHead(head: Cell, dir: Dir): Cell {
  const v = VECTORS[dir];
  return { x: head.x + v.x, y: head.y + v.y };
}
/** true si la celda está fuera del tablero 20×20. */
export function isOutOfBounds(cell: Cell): boolean {
  return cell.x < 0 || cell.x >= COLS || cell.y < 0 || cell.y >= ROWS;
}
/** true si `cell` coincide con algún segmento de `body`. */
export function hitsBody(cell: Cell, body: readonly Cell[]): boolean {
  return body.some((c) => c.x === cell.x && c.y === cell.y);
}
/** Celdas libres: las que no ocupan la serpiente ni ninguna de `others` (p. ej. la otra fruta). */
export function freeCells(
  snake: readonly Cell[],
  ...others: readonly (Cell | null | undefined)[]
): Cell[] {
  const taken = new Set<number>();
  for (const c of snake) taken.add(c.y * COLS + c.x);
  for (const c of others) if (c) taken.add(c.y * COLS + c.x);
  const cells: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(y * COLS + x)) cells.push({ x, y });
    }
  }
  return cells;
}
/** Una celda al azar uniforme de `cells`, o null si no hay ninguna. `rand` devuelve [0, 1). */
export function randomFreeCell(
  cells: readonly Cell[],
  rand: () => number,
): Cell | null {
  if (cells.length === 0) return null;
  const i = Math.min(cells.length - 1, Math.floor(rand() * cells.length));
  return cells[i];
}
/**
 * Cola de giros: compara `next` con la última dirección encolada (o con `current`
 * si la cola está vacía). Ignora la misma dirección, la opuesta o una cola llena.
 * Devuelve una cola nueva; no modifica `queue`.
 */
export function enqueueDir(
  queue: readonly Dir[],
  current: Dir,
  next: Dir,
): Dir[] {
  if (queue.length >= DIR_QUEUE_MAX) return [...queue];
  const last = queue.length > 0 ? queue[queue.length - 1] : current;
  if (next === last || next === OPPOSITE[last]) return [...queue];
  return [...queue, next];
}
/** Intervalo de paso en ms: max(TICK_MIN, TICK_BASE − TICK_STEP × (level − 1)). */
export function tickInterval(level: number): number {
  return Math.max(TICK_MIN, TICK_BASE - TICK_STEP * (level - 1));
}
