import { useRef, useEffect } from 'react';
import type { AppState, ViewTransform, MediaTransform, Obj3dSettings } from '../types';
import { ShapetoneRenderer } from '../engine/ShapetoneRenderer';

interface CanvasViewProps {
  state: AppState;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  rendererRef?: React.MutableRefObject<ShapetoneRenderer | null>;
  onViewChange: (view: ViewTransform) => void;
  onMediaTransformChange: (mt: MediaTransform) => void;
  onObj3dChange: (obj3d: Obj3dSettings) => void;
}

export default function CanvasView({ state, canvasRef: externalRef, rendererRef: externalRendererRef, onViewChange, onMediaTransformChange, onObj3dChange }: CanvasViewProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasEl = externalRef || internalRef;
  const internalRendererRef = useRef<ShapetoneRenderer | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const onMediaTransformChangeRef = useRef(onMediaTransformChange);
  onMediaTransformChangeRef.current = onMediaTransformChange;
  const onObj3dChangeRef = useRef(onObj3dChange);
  onObj3dChangeRef.current = onObj3dChange;

  useEffect(() => {
    const canvas = canvasEl.current;
    if (!canvas) return;

    const renderer = new ShapetoneRenderer(canvas, state);
    internalRendererRef.current = renderer;
    if (externalRendererRef) externalRendererRef.current = renderer;
    renderer.start();

    const handleResize = () => renderer.resize();
    window.addEventListener('resize', handleResize);

    const ro = new ResizeObserver(() => renderer.resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // --- Wheel handler: Command = media zoom, otherwise = view zoom ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.metaKey) {
        // Command+scroll: scale the media/object, pattern stays same
        const { mediaTransform } = stateRef.current;
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newScale = Math.max(0.1, Math.min(20, mediaTransform.scale * delta));
        onMediaTransformChangeRef.current({
          ...mediaTransform,
          scale: newScale,
        });
      } else {
        // Normal scroll: zoom the view (pattern + everything)
        const { view } = stateRef.current;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(10, view.scale * delta));

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const newOffsetX = mx - (mx - view.offsetX) * (newScale / view.scale);
        const newOffsetY = my - (my - view.offsetY) * (newScale / view.scale);

        onViewChangeRef.current({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // --- Track B key for 3D rotation mode ---
    let bKeyDown = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') bKeyDown = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') bKeyDown = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- Mouse handlers ---
    // Cmd+B+drag = 3D rotation, Cmd+drag = media pan, normal drag = view pan
    let isPanning = false;
    let isMediaPanning = false;
    let is3dRotating = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;

      if (e.metaKey && bKeyDown && stateRef.current.mediaType === 'obj3d') {
        is3dRotating = true;
        canvas.style.cursor = 'crosshair';
      } else if (e.metaKey) {
        isMediaPanning = true;
        canvas.style.cursor = 'move';
      } else {
        isPanning = true;
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      if (is3dRotating) {
        // Cmd+B+drag: rotate the 3D object manually
        const { obj3d } = stateRef.current;
        onObj3dChangeRef.current({
          ...obj3d,
          rotationY: obj3d.rotationY + dx * 0.01,
          rotationX: obj3d.rotationX + dy * 0.01,
        });
      } else if (isMediaPanning) {
        const { mediaTransform } = stateRef.current;
        onMediaTransformChangeRef.current({
          ...mediaTransform,
          offsetX: mediaTransform.offsetX + dx,
          offsetY: mediaTransform.offsetY + dy,
        });
      } else if (isPanning) {
        const { view } = stateRef.current;
        onViewChangeRef.current({
          scale: view.scale,
          offsetX: view.offsetX + dx,
          offsetY: view.offsetY + dy,
        });
      }
    };

    const handleMouseUp = () => {
      isPanning = false;
      isMediaPanning = false;
      is3dRotating = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      renderer.stop();
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (externalRendererRef) externalRendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (internalRendererRef.current) {
      internalRendererRef.current.updateState(state);
    }
  }, [state]);

  return (
    <canvas
      ref={canvasEl}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block', cursor: 'grab' }}
    />
  );
}
