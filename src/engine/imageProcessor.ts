import { GifPlayer } from './gifPlayer';
import { render3DToCanvas, has3DObject } from './objectLoader';
import type { MediaTransform } from '../types';

let cachedImage: HTMLImageElement | null = null;
let cachedVideo: HTMLVideoElement | null = null;
let cachedDataUrl: string | null = null;
let gifPlayer: GifPlayer | null = null;

// Reusable offscreen canvas
let offCanvas: HTMLCanvasElement | null = null;
let offCtx: CanvasRenderingContext2D | null = null;
let offW = 0;
let offH = 0;

function getOffscreenCtx(w: number, h: number): CanvasRenderingContext2D {
  if (!offCanvas || offW !== w || offH !== h) {
    offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    offCtx = offCanvas.getContext('2d', { willReadFrequently: true })!;
    offW = w;
    offH = h;
  }
  return offCtx!;
}

// Reusable grid buffer
let cachedGrid: Float32Array | null = null;
let cachedGridSize = 0;

function getGridBuffer(size: number): Float32Array {
  if (!cachedGrid || cachedGridSize !== size) {
    cachedGrid = new Float32Array(size);
    cachedGridSize = size;
  }
  return cachedGrid;
}

function clearGif(): void {
  gifPlayer = null;
}

export function preloadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    cachedVideo = null;
    clearGif();

    if (cachedDataUrl === dataUrl && cachedImage) {
      resolve(cachedImage);
      return;
    }
    const img = new Image();
    img.onload = () => {
      cachedImage = img;
      cachedDataUrl = dataUrl;
      resolve(img);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function preloadGif(dataUrl: string): Promise<void> {
  cachedImage = null;
  cachedVideo = null;

  if (cachedDataUrl === dataUrl && gifPlayer) return;

  const response = await fetch(dataUrl);
  const buffer = await response.arrayBuffer();

  const player = new GifPlayer();
  await player.load(buffer);

  gifPlayer = player;
  cachedDataUrl = dataUrl;
}

export function preloadVideo(dataUrl: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    cachedImage = null;
    clearGif();

    if (cachedDataUrl === dataUrl && cachedVideo) {
      resolve(cachedVideo);
      return;
    }
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';

    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(fallbackTimer);
      cachedVideo = video;
      cachedDataUrl = dataUrl;
      video.play().catch(() => {});
      resolve(video);
    };

    video.oncanplaythrough = done;
    video.onloadeddata = done;
    video.onerror = () => {
      clearTimeout(fallbackTimer);
      reject(new Error('Failed to load video'));
    };
    const fallbackTimer = setTimeout(() => {
      if (!resolved && video.readyState >= 2) {
        done();
      }
    }, 5000);
    video.src = dataUrl;
  });
}

export type MediaElement = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

export function getMediaElement(): MediaElement | null {
  if (has3DObject()) return null; // 3D handled separately
  if (cachedVideo) return cachedVideo;
  if (gifPlayer) return gifPlayer.getCurrentFrame();
  return cachedImage;
}

/** Get the media element including 3D render target */
export function getMediaElementFor3D(
  canvasW: number,
  canvasH: number,
  autoRotate = true,
  manualRotX = 0,
  manualRotY = 0,
): MediaElement | null {
  if (has3DObject()) {
    const renderSize = Math.min(512, Math.max(canvasW, canvasH));
    return render3DToCanvas(renderSize, renderSize, autoRotate, manualRotX, manualRotY);
  }
  return getMediaElement();
}

export function isAnimating(): boolean {
  return cachedVideo !== null || (gifPlayer !== null && gifPlayer.frameCount > 1) || has3DObject();
}

export function advanceGifFrame(): void {
  if (gifPlayer) {
    gifPlayer.advance();
  }
}

export function ensureVideoPlaying(): void {
  if (cachedVideo && cachedVideo.paused) {
    cachedVideo.play().catch(() => {});
  }
}

export function clearAllMedia(): void {
  cachedImage = null;
  cachedVideo = null;
  cachedDataUrl = null;
  clearGif();
}

function getMediaSize(media: MediaElement): { width: number; height: number } {
  if (media instanceof HTMLVideoElement) {
    return { width: media.videoWidth, height: media.videoHeight };
  }
  if (media instanceof HTMLCanvasElement) {
    return { width: media.width, height: media.height };
  }
  return { width: media.naturalWidth, height: media.naturalHeight };
}

export interface BrightnessGridResult {
  grid: Float32Array;
  cols: number;
  rows: number;
  imgOffsetX: number;
  imgOffsetY: number;
  imgDrawWidth: number;
  imgDrawHeight: number;
}

/**
 * Compute brightness grid with optional mediaTransform.
 * mediaTransform scales/offsets the source media independently of the pattern grid.
 */
export function computeBrightnessGrid(
  media: MediaElement,
  canvasWidth: number,
  canvasHeight: number,
  spacing: number,
  contrast: number,
  brightness: number,
  mediaTransform?: MediaTransform,
  bgBrightness = 0,
): BrightnessGridResult {
  const { width: mediaW, height: mediaH } = getMediaSize(media);
  if (mediaW === 0 || mediaH === 0) {
    return { grid: new Float32Array(0), cols: 0, rows: 0, imgOffsetX: 0, imgOffsetY: 0, imgDrawWidth: 0, imgDrawHeight: 0 };
  }

  // Compute base aspect-ratio-preserving fit
  const imgAspect = mediaW / mediaH;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawW: number, drawH: number, offsetX: number, offsetY: number;
  if (imgAspect > canvasAspect) {
    drawW = canvasWidth;
    drawH = canvasWidth / imgAspect;
    offsetX = 0;
    offsetY = (canvasHeight - drawH) / 2;
  } else {
    drawH = canvasHeight;
    drawW = canvasHeight * imgAspect;
    offsetX = (canvasWidth - drawW) / 2;
    offsetY = 0;
  }

  // Apply mediaTransform: scale the draw area and offset it
  const mt = mediaTransform || { scale: 1, offsetX: 0, offsetY: 0 };
  const scaledDrawW = drawW * mt.scale;
  const scaledDrawH = drawH * mt.scale;
  // Center the scaled version, then apply offset
  const finalOffsetX = offsetX + (drawW - scaledDrawW) / 2 + mt.offsetX;
  const finalOffsetY = offsetY + (drawH - scaledDrawH) / 2 + mt.offsetY;

  // Sample at native media resolution
  const ctx = getOffscreenCtx(mediaW, mediaH);
  // Clear previous frame (critical for transparent 3D renders)
  ctx.clearRect(0, 0, mediaW, mediaH);
  ctx.drawImage(media, 0, 0, mediaW, mediaH);
  const imageData = ctx.getImageData(0, 0, mediaW, mediaH);
  const pixels = imageData.data;

  // Viewport -> media coordinate mapping (using scaled/offset draw area)
  const scaleX = mediaW / scaledDrawW;
  const scaleY = mediaH / scaledDrawH;

  const cols = Math.ceil(canvasWidth / spacing);
  const rows = Math.ceil(canvasHeight / spacing);
  const grid = getGridBuffer(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const vx = col * spacing + spacing * 0.5;
      const vy = row * spacing + spacing * 0.5;

      // Map viewport coords -> media coords using the transformed draw area
      const mx = ((vx - finalOffsetX) * scaleX) | 0;
      const my = ((vy - finalOffsetY) * scaleY) | 0;

      if (mx < 0 || mx >= mediaW || my < 0 || my >= mediaH) {
        grid[row * cols + col] = bgBrightness;
        continue;
      }

      const idx = (my * mediaW + mx) * 4;
      const a = pixels[idx + 3];

      // Transparent pixel = background (use bgBrightness)
      if (a < 10) {
        grid[row * cols + col] = bgBrightness;
        continue;
      }

      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // Blend with bgBrightness for semi-transparent pixels
      if (a < 255) {
        const alpha = a / 255;
        lum = lum * alpha + bgBrightness * (1 - alpha);
      }
      lum = ((lum - 0.5) * contrast) + 0.5 + brightness / 255;
      grid[row * cols + col] = lum < 0 ? 0 : lum > 1 ? 1 : lum;
    }
  }

  return {
    grid,
    cols,
    rows,
    imgOffsetX: finalOffsetX,
    imgOffsetY: finalOffsetY,
    imgDrawWidth: scaledDrawW,
    imgDrawHeight: scaledDrawH,
  };
}
