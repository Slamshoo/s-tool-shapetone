import { useState, useRef, useCallback, useEffect } from 'react';
import type { AppState, ViewTransform, MediaTransform, MediaType, Obj3dSettings } from './types';
import { DEFAULT_STATE } from './types';
import CanvasView from './components/CanvasView';
import Sidebar from './components/Sidebar';
import { preloadImage, preloadVideo, preloadGif, clearAllMedia } from './engine/imageProcessor';
import { load3DObject, clear3DObject } from './engine/objectLoader';
import { ShapetoneRenderer } from './engine/ShapetoneRenderer';
import { generateStandaloneHTML, blobUrlToDataUrl } from './utils/htmlExport';
import { compressImage, compressVideoForEmbed } from './utils/mediaCompressor';

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
  mediaTransform: { scale: 0.88, offsetX: 0, offsetY: 0, rotation: 0 },
};

export default function App() {
  const [state, setState] = useState<AppState>(SHOWCASE_STATE);
  const [isRecording, setIsRecording] = useState(false);
  const [htmlExportProgress, setHtmlExportProgress] = useState<number | null>(null); // null = idle, 0..1 = compressing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ShapetoneRenderer | null>(null);
  const showcaseLoaded = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

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
        const optimized = await compressImage(dataUrl);
        dataUrl = optimized;
        await preloadImage(optimized);
      }

      setState(prev => ({
        ...prev,
        uploadedImage: dataUrl,
        mediaType,
        view: { scale: 1, offsetX: 0, offsetY: 0 },
        mediaTransform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
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
      mediaTransform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
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

  const handleDownloadHtml = useCallback(async () => {
    if (!state.uploadedImage || !state.mediaType) return;

    let mediaDataUrl = state.uploadedImage;

    if (state.mediaType === 'video') {
      // Re-encode video at 640px / 600kbps — takes ~video.duration seconds
      setHtmlExportProgress(0);
      try {
        const src = mediaDataUrl.startsWith('blob:')
          ? mediaDataUrl
          : mediaDataUrl; // data: URLs are passed directly
        mediaDataUrl = await compressVideoForEmbed(src, 640, 600_000, setHtmlExportProgress);
      } catch (err) {
        console.error('Video compression failed, embedding original:', err);
        if (mediaDataUrl.startsWith('blob:')) {
          mediaDataUrl = await blobUrlToDataUrl(mediaDataUrl);
        }
      }
      setHtmlExportProgress(null);
    } else {
      // Images/GIFs are already data URLs (compressed on upload for images)
      if (mediaDataUrl.startsWith('blob:')) {
        mediaDataUrl = await blobUrlToDataUrl(mediaDataUrl);
      }
    }

    const html = generateStandaloneHTML(state, mediaDataUrl, state.mediaType);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shapetone-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const handleToggleRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    recordingChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shapetone-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [isRecording]);

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
        onDownloadHtml={handleDownloadHtml}
        htmlExportProgress={htmlExportProgress}
        onToggleRecording={handleToggleRecording}
        isRecording={isRecording}
      />
    </div>
  );
}
