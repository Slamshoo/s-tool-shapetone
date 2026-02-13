import type { ShapeType } from '../types';

const TWO_PI = Math.PI * 2;
const SQRT3 = Math.sqrt(3);

let cachedSvgPathData: string | null = null;
let cachedSvgPath2D: Path2D | null = null;

function getCachedPath2D(pathData: string): Path2D {
  if (cachedSvgPathData !== pathData) {
    cachedSvgPath2D = new Path2D(pathData);
    cachedSvgPathData = pathData;
  }
  return cachedSvgPath2D!;
}

export function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TWO_PI);
  ctx.fill();
}

export function drawSquare(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

export function drawTriangleUp(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const h = r * SQRT3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx - h / 2, cy + r);
  ctx.lineTo(cx + h / 2, cy + r);
  ctx.closePath();
  ctx.fill();
}

export function drawText(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, char: string): void {
  const fontSize = r * 2;
  if (fontSize < 1) return;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, cx, cy);
}

export function drawCustomSvg(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  pathData: string,
  viewBox: { width: number; height: number },
): void {
  const path = getCachedPath2D(pathData);
  const scale = (r * 2) / Math.max(viewBox.width, viewBox.height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-viewBox.width / 2, -viewBox.height / 2);
  ctx.fill(path);
  ctx.restore();
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  cx: number,
  cy: number,
  r: number,
  customSvgPath?: string | null,
  customSvgViewBox?: { width: number; height: number } | null,
  customTextChar?: string,
): void {
  switch (shape) {
    case 'circle':
      drawCircle(ctx, cx, cy, r);
      break;
    case 'square':
      drawSquare(ctx, cx, cy, r);
      break;
    case 'triangle-up':
      drawTriangleUp(ctx, cx, cy, r);
      break;
    case 'text':
      drawText(ctx, cx, cy, r, customTextChar || '*');
      break;
    case 'custom':
      if (customSvgPath && customSvgViewBox) {
        drawCustomSvg(ctx, cx, cy, r, customSvgPath, customSvgViewBox);
      } else {
        drawCircle(ctx, cx, cy, r);
      }
      break;
  }
}

export function batchDrawCircles(
  ctx: CanvasRenderingContext2D,
  grid: Float32Array,
  cols: number,
  rows: number,
  spacing: number,
  maxRadius: number,
  minScale: number,
  maxScale: number,
  invert: boolean,
): void {
  const batch = new Path2D();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let b = grid[row * cols + col];
      if (invert) b = 1 - b;
      const size = minScale + b * (maxScale - minScale);
      const cs = size < 0 ? 0 : size > 1 ? 1 : size;
      const r = maxRadius * cs;
      if (r < 0.3) continue;
      const cx = col * spacing + spacing * 0.5;
      const cy = row * spacing + spacing * 0.5;
      batch.moveTo(cx + r, cy);
      batch.arc(cx, cy, r, 0, TWO_PI);
    }
  }
  ctx.fill(batch);
}

export function batchDrawTriangles(
  ctx: CanvasRenderingContext2D,
  grid: Float32Array,
  cols: number,
  rows: number,
  spacing: number,
  maxRadius: number,
  minScale: number,
  maxScale: number,
  invert: boolean,
): void {
  const batch = new Path2D();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let b = grid[row * cols + col];
      if (invert) b = 1 - b;
      const size = minScale + b * (maxScale - minScale);
      const cs = size < 0 ? 0 : size > 1 ? 1 : size;
      const r = maxRadius * cs;
      if (r < 0.3) continue;
      const cx = col * spacing + spacing * 0.5;
      const cy = row * spacing + spacing * 0.5;
      const h = r * SQRT3;
      batch.moveTo(cx, cy - r);
      batch.lineTo(cx - h / 2, cy + r);
      batch.lineTo(cx + h / 2, cy + r);
      batch.closePath();
    }
  }
  ctx.fill(batch);
}
