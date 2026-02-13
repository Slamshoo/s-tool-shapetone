import { useRef, useEffect, useState, useCallback } from 'react';
import type { MediaType } from '../types';

interface ImageUploadZoneProps {
  onMediaUpload: (dataUrl: string, mediaType: MediaType, file?: File) => void;
  uploadedImage: string | null;
  mediaType: MediaType | null;
  onClear: () => void;
}

const ACCEPT_TYPES = 'image/*,video/mp4,video/webm,video/ogg,.obj,.stl';

function detectMediaType(file: File): MediaType {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'image/gif') return 'gif';
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'obj' || ext === 'stl') return 'obj3d';
  return 'image';
}

function isAcceptedFile(file: File): boolean {
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'obj' || ext === 'stl';
}

export default function ImageUploadZone({ onMediaUpload, uploadedImage, mediaType, onClear }: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!isAcceptedFile(file)) return;
    const type = detectMediaType(file);

    if (type === 'obj3d') {
      // 3D files: pass file reference + a placeholder URL
      onMediaUpload(`3d://${file.name}`, 'obj3d', file);
    } else if (type === 'video') {
      const objectUrl = URL.createObjectURL(file);
      onMediaUpload(objectUrl, 'video');
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onMediaUpload(reader.result, type);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onMediaUpload]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processFile(file);
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  if (uploadedImage) {
    return (
      <div className="relative">
        {mediaType === 'video' ? (
          <video
            src={uploadedImage}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-24 object-cover rounded-lg border border-white/10"
          />
        ) : mediaType === 'obj3d' ? (
          <div className="w-full h-24 rounded-lg border border-white/10 bg-zinc-800/50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-white/60 text-xs">3D Object</div>
              <div className="text-white/30 text-[10px] mt-0.5">{uploadedImage.replace('3d://', '')}</div>
            </div>
          </div>
        ) : (
          <img
            src={uploadedImage}
            alt="Uploaded"
            className="w-full h-24 object-cover rounded-lg border border-white/10"
          />
        )}
        <button
          onClick={onClear}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/70 text-white/70 hover:text-white rounded text-xs"
        >
          x
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
        isDragging
          ? 'border-white/50 bg-white/5'
          : 'border-white/20 hover:border-white/30'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="text-white/40 text-xs leading-relaxed">
        <div className="text-white/60 text-sm mb-1">Drop media or 3D object</div>
        <div>Image, Video, GIF, OBJ, STL</div>
        <div className="mt-2">
          <span className="text-white/60 border border-white/20 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider">
            Open file
          </span>
        </div>
      </div>
    </div>
  );
}
