// Dibujo de SERPENTINA (SPEC 09). El contexto 2D se inyecta; no se lee nada del DOM.
// El canvas no dibuja HUD ni overlays: eso es de la plataforma.
import {
  BONUS_BLINK_PERIOD,
  BONUS_BLINK_START,
  CELL,
  COLS,
  H,
  ROWS,
  W,
  type Bonus,
  type Cell,
  type Dir,
  type Fruit,
} from "./constants";
import { BONUS_ART, FRUIT_ART, drawFruit } from "./fruits";
import type { SerpentinaPalette } from "./skins";
const GRID_LINE_W = 1;
/** Hueco entre segmentos para que se lean como bloques separados. */
const SEGMENT_INSET = 2;
const EYE_SIZE = 4;
/** Distancia del centro del ojo al centro de la celda, hacia delante y hacia los lados. */
const EYE_FORWARD = 4;
const EYE_SIDE = 5;
const FORWARD: Record<Dir, Readonly<Cell>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
/** Fondo y cuadrícula tenue. */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  palette: SerpentinaPalette,
): void {
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = GRID_LINE_W;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    const px = x * CELL + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
  }
  for (let y = 1; y < ROWS; y++) {
    const py = y * CELL + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
  }
  ctx.stroke();
}
/**
 * Serpiente con el glow del skin (`palette.snakeGlow`, 0 = sin glow): `shadowBlur`
 * se activa una sola vez para todo el cuerpo y se desactiva al terminar. La cabeza (`snake[0]`) lleva dos ojos según `dir`.
 */
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: readonly Cell[],
  dir: Dir,
  palette: SerpentinaPalette,
): void {
  if (snake.length === 0) return;
  const size = CELL - SEGMENT_INSET * 2;
  ctx.shadowColor = palette.body;
  ctx.shadowBlur = palette.snakeGlow;
  ctx.fillStyle = palette.body;
  for (let i = snake.length - 1; i >= 1; i--) {
    const c = snake[i];
    ctx.fillRect(
      c.x * CELL + SEGMENT_INSET,
      c.y * CELL + SEGMENT_INSET,
      size,
      size,
    );
  }
  const head = snake[0];
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    head.x * CELL + SEGMENT_INSET,
    head.y * CELL + SEGMENT_INSET,
    size,
    size,
  );
  ctx.shadowBlur = 0;
  // Ojos: adelantados en la dirección de avance y separados en el eje perpendicular.
  const f = FORWARD[dir];
  const side = { x: -f.y, y: f.x };
  const cx = head.x * CELL + CELL / 2 + f.x * EYE_FORWARD;
  const cy = head.y * CELL + CELL / 2 + f.y * EYE_FORWARD;
  ctx.fillStyle = palette.eye;
  for (const s of [1, -1]) {
    const ex = cx + side.x * EYE_SIDE * s - EYE_SIZE / 2;
    const ey = cy + side.y * EYE_SIDE * s - EYE_SIZE / 2;
    ctx.fillRect(ex, ey, EYE_SIZE, EYE_SIZE);
  }
}
/** Fruta normal con su pixel-art. */
export function drawFruitCell(
  ctx: CanvasRenderingContext2D,
  fruit: Fruit,
  palette: SerpentinaPalette,
): void {
  drawFruit(
    ctx,
    FRUIT_ART[fruit.kind],
    palette.fruits[fruit.kind],
    fruit.x,
    fruit.y,
    palette.fruitGlow,
  );
}
/**
 * Estrella bonus. En sus últimos BONUS_BLINK_START ms solo se dibuja en
 * semiperiodos alternos de BONUS_BLINK_PERIOD ms.
 */
export function drawBonus(
  ctx: CanvasRenderingContext2D,
  bonus: Bonus,
  palette: SerpentinaPalette,
): void {
  if (bonus.remaining <= 0) return;
  if (bonus.remaining <= BONUS_BLINK_START) {
    const half = Math.floor(bonus.remaining / BONUS_BLINK_PERIOD);
    if (half % 2 === 1) return;
  }
  drawFruit(ctx, BONUS_ART, palette.bonus, bonus.x, bonus.y, palette.fruitGlow);
}
