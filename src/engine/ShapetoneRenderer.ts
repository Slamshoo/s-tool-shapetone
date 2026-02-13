import type { AppState } from '../types';
import { getMediaElementFor3D, computeBrightnessGrid, ensureVideoPlaying, advanceGifFrame, isAnimating } from './imageProcessor';
import { has3DObject } from './objectLoader';
import { drawShape, batchDrawCircles, batchDrawTriangles } from './shapeDrawer';

export class ShapetoneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: AppState;
  private animId = 0;
  private running = false;
  private dirty = true;

  constructor(canvas: HTMLCanvasElement, state: AppState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = state;
    this.resize();
  }

  private getContainerSize(): { width: number; height: number } {
    const parent = this.canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const { width: w, height: h } = this.getContainerSize();
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dirty = true;
  }

  updateState(state: AppState): void {
    this.state = state;
    this.dirty = true;
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    if (this.dirty || this.state.mediaType === 'video' || this.state.mediaType === 'gif' || this.state.mediaType === 'obj3d' || isAnimating()) {
      this.dirty = false;
      this.render();
    }
    this.animId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const { width: w, height: h } = this.getContainerSize();
    const { colors, mapping, grid: gridSettings, shape, customSvgPath, customSvgViewBox, view, mediaTransform, obj3d } = this.state;
    const ctx = this.ctx;

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, w, h);

    // Advance animated media
    if (this.state.mediaType === 'video') {
      ensureVideoPlaying();
    }
    if (this.state.mediaType === 'gif') {
      advanceGifFrame();
    }

    const media = getMediaElementFor3D(w, h, obj3d.autoRotate, obj3d.rotationX, obj3d.rotationY);
    if (!media && !has3DObject()) {
      if (!this.state.uploadedImage) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '14px "Geist Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Drop an image, video, or 3D object to start', w / 2, h / 2);
        return;
      }
    }
    if (!media) return;

    // Apply zoom/pan transform
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);

    const spacing = gridSettings.density;
    const bgBr = this.state.mediaType === 'obj3d' ? obj3d.bgBrightness : 0;
    const { grid, cols, rows } = computeBrightnessGrid(
      media, w, h, spacing, mapping.contrast, mapping.brightness, mediaTransform, bgBr,
    );

    const maxRadius = spacing * 0.48;
    const minScale = mapping.minSize / 100;
    const maxScale = mapping.maxSize / 100;

    ctx.fillStyle = colors.foreground;

    if (shape === 'circle') {
      batchDrawCircles(ctx, grid, cols, rows, spacing, maxRadius, minScale, maxScale, mapping.invert);
    } else if (shape === 'triangle-up') {
      batchDrawTriangles(ctx, grid, cols, rows, spacing, maxRadius, minScale, maxScale, mapping.invert);
    } else {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let b = grid[row * cols + col];
          if (mapping.invert) b = 1 - b;

          const size = minScale + b * (maxScale - minScale);
          const clampedSize = size < 0 ? 0 : size > 1 ? 1 : size;
          const radius = maxRadius * clampedSize;

          if (radius < 0.3) continue;

          const cx = col * spacing + spacing * 0.5;
          const cy = row * spacing + spacing * 0.5;

          drawShape(ctx, shape, cx, cy, radius, customSvgPath, customSvgViewBox, this.state.customTextChar);
        }
      }
    }

    ctx.restore();
  }

  toSVG(): string {
    const { width: w, height: h } = this.getContainerSize();
    const { colors, mapping, grid: gridSettings, shape, customSvgPath, customSvgViewBox, mediaTransform, obj3d } = this.state;

    const media = getMediaElementFor3D(w, h, obj3d.autoRotate, obj3d.rotationX, obj3d.rotationY);
    if (!media) return '';

    const spacing = gridSettings.density;
    const bgBrSvg = this.state.mediaType === 'obj3d' ? obj3d.bgBrightness : 0;
    const { grid, cols, rows } = computeBrightnessGrid(
      media, w, h, spacing, mapping.contrast, mapping.brightness, mediaTransform, bgBrSvg,
    );

    const maxRadius = spacing * 0.48;
    const minScale = mapping.minSize / 100;
    const maxScale = mapping.maxSize / 100;

    const elements: string[] = [];
    elements.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`);
    elements.push(`<rect width="${w}" height="${h}" fill="${colors.background}" />`);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let brightness = grid[row * cols + col];
        if (mapping.invert) brightness = 1 - brightness;

        const size = minScale + brightness * (maxScale - minScale);
        const clampedSize = Math.max(0, Math.min(1, size));
        const r = maxRadius * clampedSize;
        if (r < 0.3) continue;

        const cx = (col * spacing + spacing / 2).toFixed(1);
        const cy = (row * spacing + spacing / 2).toFixed(1);
        const rs = r.toFixed(1);

        switch (shape) {
          case 'circle':
            elements.push(`<circle cx="${cx}" cy="${cy}" r="${rs}" fill="${colors.foreground}" />`);
            break;
          case 'square': {
            const x = (parseFloat(cx) - r).toFixed(1);
            const y = (parseFloat(cy) - r).toFixed(1);
            const s = (r * 2).toFixed(1);
            elements.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${colors.foreground}" />`);
            break;
          }
          case 'triangle-up': {
            const h2 = r * Math.sqrt(3);
            const cxn = parseFloat(cx);
            const cyn = parseFloat(cy);
            elements.push(`<polygon points="${cxn},${(cyn - r).toFixed(1)} ${(cxn - h2 / 2).toFixed(1)},${(cyn + r).toFixed(1)} ${(cxn + h2 / 2).toFixed(1)},${(cyn + r).toFixed(1)}" fill="${colors.foreground}" />`);
            break;
          }
          case 'text': {
            const fontSize = (r * 2).toFixed(1);
            elements.push(`<text x="${cx}" y="${cy}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central" fill="${colors.foreground}">${this.state.customTextChar}</text>`);
            break;
          }
          case 'custom': {
            if (customSvgPath && customSvgViewBox) {
              const scale = (r * 2) / Math.max(customSvgViewBox.width, customSvgViewBox.height);
              const tx = parseFloat(cx) - (customSvgViewBox.width * scale) / 2;
              const ty = parseFloat(cy) - (customSvgViewBox.height * scale) / 2;
              elements.push(`<path d="${customSvgPath}" transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})" fill="${colors.foreground}" />`);
            } else {
              elements.push(`<circle cx="${cx}" cy="${cy}" r="${rs}" fill="${colors.foreground}" />`);
            }
            break;
          }
        }
      }
    }

    elements.push('</svg>');
    return elements.join('\n');
  }
}
