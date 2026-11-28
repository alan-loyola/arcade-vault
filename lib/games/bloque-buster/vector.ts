// Dibujo con primitivas de canvas para los skins NEÓN y RETRO.
// Sin estado de módulo: el contexto, las entidades y la paleta se inyectan.
// Solo cambia la apariencia: los rectángulos son los mismos que usa la
// colisión (pelota 16×16, paleta 81×14, bloque 64×24).
import { EXPLOSION_DURATION } from "./constants";
import type { BlockColor } from "./levels";
import type { BloqueBusterVectorPalette } from "./skins";
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface VectorScene {
  paddle: Rect;
  ball: Rect;
  blocks: readonly (Rect & { color: BlockColor; alive: boolean })[];
  explosions: readonly (Rect & { elapsed: number })[];
}
// Separación entre bloques vecinos (px por lado)
const BLOCK_GAP = 1;
function setGlow(
  ctx: CanvasRenderingContext2D,
  palette: BloqueBusterVectorPalette,
  color: string,
) {
  if (palette.glow <= 0) return;
  ctx.shadowBlur = palette.glow;
  ctx.shadowColor = color;
}
function drawBlock(
  ctx: CanvasRenderingContext2D,
  palette: BloqueBusterVectorPalette,
  block: Rect & { color: BlockColor },
) {
  const color = palette.blocks[block.color];
  const x = block.x + BLOCK_GAP;
  const y = block.y + BLOCK_GAP;
  const w = block.w - BLOCK_GAP * 2;
  const h = block.h - BLOCK_GAP * 2;
  ctx.fillStyle = color;
  if (palette.blockLineWidth > 0) {
    // Tubo de neón: relleno translúcido + contorno con glow
    const lw = palette.blockLineWidth;
    ctx.globalAlpha = palette.blockFillAlpha;
    ctx.fillRect(x + lw, y + lw, w - lw * 2, h - lw * 2);
    ctx.globalAlpha = 1;
    ctx.save();
    setGlow(ctx, palette, color);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
    ctx.restore();
  } else {
    // Bloque sólido de bordes duros
    ctx.globalAlpha = palette.blockFillAlpha;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
}
// 4 fragmentos que salen del centro del bloque y se encogen (sin glow)
function drawExplosion(
  ctx: CanvasRenderingContext2D,
  palette: BloqueBusterVectorPalette,
  exp: Rect & { elapsed: number },
) {
  const t = Math.min(exp.elapsed / EXPLOSION_DURATION, 1);
  const size = Math.max(1, (exp.h / 2) * (1 - t));
  const cx = exp.x + exp.w / 2;
  const cy = exp.y + exp.h / 2;
  const dx = (exp.w / 2) * t;
  const dy = (exp.h / 2) * t;
  ctx.fillStyle = palette.explosion;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    ctx.fillRect(cx + sx * dx - size / 2, cy + sy * dy - size / 2, size, size);
  }
}
function drawPaddle(
  ctx: CanvasRenderingContext2D,
  palette: BloqueBusterVectorPalette,
  paddle: Rect,
) {
  const cap = Math.min(8, paddle.w / 4);
  ctx.save();
  setGlow(ctx, palette, palette.paddle);
  ctx.fillStyle = palette.paddle;
  ctx.fillRect(paddle.x + cap, paddle.y, paddle.w - cap * 2, paddle.h);
  setGlow(ctx, palette, palette.paddleAccent);
  ctx.fillStyle = palette.paddleAccent;
  ctx.fillRect(paddle.x, paddle.y, cap, paddle.h);
  ctx.fillRect(paddle.x + paddle.w - cap, paddle.y, cap, paddle.h);
  ctx.restore();
}
function drawBall(
  ctx: CanvasRenderingContext2D,
  palette: BloqueBusterVectorPalette,
  ball: Rect,
) {
  ctx.save();
  setGlow(ctx, palette, palette.ball);
  ctx.fillStyle = palette.ball;
  if (palette.ballShape === "circle") {
    ctx.beginPath();
    ctx.arc(
      ball.x + ball.w / 2,
      ball.y + ball.h / 2,
      Math.min(ball.w, ball.h) / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  } else {
    ctx.fillRect(ball.x, ball.y, ball.w, ball.h);
  }
  ctx.restore();
}
// Mismo orden que el dibujo con sprites: bloques, explosiones, paleta, pelota
export function drawVectorScene(
  ctx: CanvasRenderingContext2D,
  palette: BloqueBusterVectorPalette,
  scene: VectorScene,
): void {
  for (const block of scene.blocks) {
    if (block.alive) drawBlock(ctx, palette, block);
  }
  for (const exp of scene.explosions) drawExplosion(ctx, palette, exp);
  drawPaddle(ctx, palette, scene.paddle);
  drawBall(ctx, palette, scene.ball);
}
