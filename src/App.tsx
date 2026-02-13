import { useState, useRef, useCallback, useEffect } from 'react';
import type { AppState, ViewTransform, MediaTransform, MediaType, Obj3dSettings } from './types';
import { DEFAULT_STATE } from './types';
import CanvasView from './components/CanvasView';
import Sidebar from './components/Sidebar';
import { preloadImage, preloadVideo, preloadGif, clearAllMedia } from './engine/imageProcessor';
import { load3DObject, clear3DObject } from './engine/objectLoader';
import { ShapetoneRenderer } from './engine/ShapetoneRenderer';

/** Showcase settings matching the demo screenshot */
const SHOWCASE_STATE: AppState = {
  ...DEFAULT_STATE,
  shape: 'circle',
  grid: { density: 6 },
  mapping: {
    invert: false,
    minSize: 0,
    maxSize: 100,
    contrast: 3.0,
    brightness: -100,
  },
  colors: {
    background: '#000000',
    foreground: '#ffffff',
  },
  mediaTransform: { scale: 0.88, offsetX: 0, offsetY: 0 },
};

export default function App() {
  const [state, setState] = useState<AppState>(SHOWCASE_STATE);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ShapetoneRenderer | null>(null);
  const showcaseLoaded = useRef(false);

  // Auto-load showcase video on first mount
  useEffect(() => {
    if (showcaseLoaded.current) return;
    showcaseLoaded.current = true;

    (async () => {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${base}earth-loop.mp4`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        await preloadVideo(url);
        setState(prev => ({
          ...prev,
          uploadedImage: url,
          mediaType: 'video' as MediaType,
        }));
      } catch (err) {
        console.warn('Showcase video not found, starting empty:', err);
      }
    })();
  }, []);

  const update = useCallback(<K extends keyof AppState>(key: K, val: AppState[K]) => {
    setState(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleMediaUpload = useCallback(async (dataUrl: string, mediaType: MediaType, file?: File) => {
    try {
      // Clear previous 3D object if switching away
      clear3DObject();

      if (mediaType === 'video') {
        await preloadVideo(dataUrl);
      } else if (mediaType === 'gif') {
        await preloadGif(dataUrl);
      } else if (mediaType === 'obj3d' && file) {
        clearAllMedia();
        await load3DObject(file);
      } else {
        await preloadImage(dataUrl);
      }

      setState(prev => ({
        ...prev,
        uploadedImage: dataUrl,
        mediaType,
        view: { scale: 1, offsetX: 0, offsetY: 0 },
        mediaTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      }));
    } catch (err) {
      console.error('Failed to load media:', err);
    }
  }, []);

  const handleClearImage = useCallback(() => {
    clear3DObject();
    clearAllMedia();
    setState(prev => ({
      ...prev,
      uploadedImage: null,
      mediaType: null,
      view: { scale: 1, offsetX: 0, offsetY: 0 },
      mediaTransform: { scale: 1, offsetX: 0, offsetY: 0 },
    }));
  }, []);

  const handleViewChange = useCallback((view: ViewTransform) => {
    setState(prev => ({ ...prev, view }));
  }, []);

  const handleMediaTransformChange = useCallback((mediaTransform: MediaTransform) => {
    setState(prev => ({ ...prev, mediaTransform }));
  }, []);

  const handleObj3dChange = useCallback((obj3d: Obj3dSettings) => {
    setState(prev => ({ ...prev, obj3d }));
  }, []);

  const handleCustomSvgUpload = useCallback((pathData: string, viewBox: { width: number; height: number }) => {
    setState(prev => ({
      ...prev,
      shape: 'custom',
      customSvgPath: pathData,
      customSvgViewBox: viewBox,
    }));
  }, []);

  const handleDownloadPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shapetone-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, []);

  const handleDownloadSvg = useCallback(() => {
    if (!rendererRef.current) return;
    const svg = rendererRef.current.toSVG();
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shapetone-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black flex">
      <div className="flex-1 relative">
        <CanvasView
          state={state}
          canvasRef={canvasRef}
          rendererRef={rendererRef}
          onViewChange={handleViewChange}
          onMediaTransformChange={handleMediaTransformChange}
          onObj3dChange={handleObj3dChange}
        />
      </div>
      <Sidebar
        state={state}
        onMediaUpload={handleMediaUpload}
        onClearImage={handleClearImage}
        onShapeChange={v => update('shape', v)}
        onCustomSvgUpload={handleCustomSvgUpload}
        onCustomTextCharChange={v => update('customTextChar', v)}
        onGridChange={v => update('grid', v)}
        onMappingChange={v => update('mapping', v)}
        onColorsChange={v => update('colors', v)}
        onMediaTransformChange={handleMediaTransformChange}
        onObj3dChange={handleObj3dChange}
        onDownloadPng={handleDownloadPng}
        onDownloadSvg={handleDownloadSvg}
      />
    </div>
  );
}
