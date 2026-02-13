import { parseGIF, decompressFrames } from 'gifuct-js';

interface DecompressedFrame {
  dims: { width: number; height: number; top: number; left: number };
  patch: Uint8ClampedArray;
  delay: number;
  disposalType: number;
}

export class GifPlayer {
  private frames: DecompressedFrame[] = [];
  private currentIndex = 0;
  private lastFrameTime = 0;
  private frameCanvas: HTMLCanvasElement;
  private frameCtx: CanvasRenderingContext2D;
  private patchCanvas: HTMLCanvasElement;
  private patchCtx: CanvasRenderingContext2D;
  private cachedPatchData: ImageData | null = null;
  private cachedPatchW = 0;
  private cachedPatchH = 0;
  width = 0;
  height = 0;

  constructor() {
    this.frameCanvas = document.createElement('canvas');
    this.frameCtx = this.frameCanvas.getContext('2d')!;
    this.patchCanvas = document.createElement('canvas');
    this.patchCtx = this.patchCanvas.getContext('2d')!;
  }

  async load(buffer: ArrayBuffer): Promise<void> {
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);

    if (frames.length === 0) {
      throw new Error('No frames found in GIF');
    }

    this.frames = frames;
    this.width = gif.lsd.width;
    this.height = gif.lsd.height;
    this.currentIndex = 0;
    this.lastFrameTime = performance.now();

    this.frameCanvas.width = this.width;
    this.frameCanvas.height = this.height;
    this.frameCtx.clearRect(0, 0, this.width, this.height);

    this.cachedPatchData = null;

    this.renderFrame(0);
  }

  private renderFrame(index: number): void {
    const frame = this.frames[index];
    const { dims, patch } = frame;

    if (!this.cachedPatchData || this.cachedPatchW !== dims.width || this.cachedPatchH !== dims.height) {
      this.patchCanvas.width = dims.width;
      this.patchCanvas.height = dims.height;
      this.cachedPatchData = this.patchCtx.createImageData(dims.width, dims.height);
      this.cachedPatchW = dims.width;
      this.cachedPatchH = dims.height;
    }

    this.cachedPatchData.data.set(patch);
    this.patchCtx.putImageData(this.cachedPatchData, 0, 0);

    if (index > 0) {
      const prevFrame = this.frames[index - 1];
      if (prevFrame.disposalType === 2) {
        this.frameCtx.clearRect(
          prevFrame.dims.left, prevFrame.dims.top,
          prevFrame.dims.width, prevFrame.dims.height,
        );
      }
    }

    this.frameCtx.drawImage(this.patchCanvas, dims.left, dims.top);
  }

  advance(): void {
    if (this.frames.length <= 1) return;

    const now = performance.now();
    const frame = this.frames[this.currentIndex];
    const delay = Math.max(20, (frame.delay || 10) * 10);

    if (now - this.lastFrameTime >= delay) {
      this.currentIndex = (this.currentIndex + 1) % this.frames.length;
      this.renderFrame(this.currentIndex);
      this.lastFrameTime = now;
    }
  }

  getCurrentFrame(): HTMLCanvasElement {
    return this.frameCanvas;
  }

  get frameCount(): number {
    return this.frames.length;
  }
}
