export type ShapeType = 'circle' | 'square' | 'triangle-up' | 'text' | 'custom';

export type MediaType = 'image' | 'video' | 'gif' | 'obj3d';

export interface BrightnessMapping {
  invert: boolean;
  minSize: number;     // 0-100
  maxSize: number;     // 0-100
  contrast: number;    // 0.1-3.0
  brightness: number;  // -100 to 100
}

export interface GridSettings {
  density: number;     // 5-100 (spacing in px)
}

export interface ColorSettings {
  background: string;
  foreground: string;
}

export interface ViewTransform {
  scale: number;       // 1.0 = 100%
  offsetX: number;     // pan X
  offsetY: number;     // pan Y
}

/** Transform applied to the source media/object independently of the pattern grid */
export interface MediaTransform {
  scale: number;       // 1.0 = original size, >1 = bigger object
  offsetX: number;     // media offset X within viewport
  offsetY: number;     // media offset Y within viewport
}

export interface Obj3dSettings {
  autoRotate: boolean;
  rotationX: number;   // manual rotation X (radians)
  rotationY: number;   // manual rotation Y (radians)
  bgBrightness: number; // 0-1: brightness for background pixels (0 = no shapes, 1 = full shapes)
}

export interface AppState {
  uploadedImage: string | null;
  mediaType: MediaType | null;
  shape: ShapeType;
  customSvgPath: string | null;
  customSvgViewBox: { width: number; height: number } | null;
  customTextChar: string;  // unicode character for 'text' shape
  grid: GridSettings;
  mapping: BrightnessMapping;
  colors: ColorSettings;
  view: ViewTransform;
  mediaTransform: MediaTransform;
  obj3d: Obj3dSettings;
}

export const DEFAULT_STATE: AppState = {
  uploadedImage: null,
  mediaType: null,
  shape: 'circle',
  customSvgPath: null,
  customSvgViewBox: null,
  customTextChar: '*',
  grid: { density: 20 },
  mapping: {
    invert: false,
    minSize: 0,
    maxSize: 100,
    contrast: 1.0,
    brightness: 0,
  },
  colors: {
    background: '#000000',
    foreground: '#ffffff',
  },
  view: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },
  mediaTransform: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },
  obj3d: {
    autoRotate: true,
    rotationX: 0,
    rotationY: 0,
    bgBrightness: 0,
  },
};
