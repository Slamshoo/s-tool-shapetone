/**
 * Resize + re-encode an image data URL to JPEG.
 * Safe to call even if the source is already small — returns as-is if under maxWidth.
 */
export async function compressImage(
  dataUrl: string,
  maxWidth = 1280,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= maxWidth) {
        // Already small enough — just re-encode to JPEG to strip metadata
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d')!.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', quality));
        return;
      }
      const scale = maxWidth / img.naturalWidth;
      const w = maxWidth;
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

/**
 * Re-encode a video (blob: or data: URL) to a smaller WebM data URL.
 * Runs in real-time (takes ~video.duration seconds to process).
 * onProgress callback receives 0..1.
 */
export async function compressVideoForEmbed(
  videoSrc: string,
  maxWidth = 640,
  bitrate = 600_000,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('error', () => reject(new Error('Video load failed')));

    video.addEventListener('loadedmetadata', () => {
      const aspect = video.videoWidth / video.videoHeight;
      const w = Math.min(maxWidth, video.videoWidth);
      const h = Math.round(w / aspect) & ~1; // must be even for codec
      const duration = video.duration;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(canvas.captureStream(30), {
        mimeType,
        videoBitsPerSecond: bitrate,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      };

      const startedAt = performance.now();
      let rafId: number;

      const drawFrame = () => {
        ctx.drawImage(video, 0, 0, w, h);

        if (isFinite(duration) && duration > 0) {
          const elapsed = (performance.now() - startedAt) / 1000;
          onProgress?.(Math.min(elapsed / duration, 1));
          if (elapsed >= duration) {
            recorder.stop();
            video.pause();
            cancelAnimationFrame(rafId);
            return;
          }
        }

        rafId = requestAnimationFrame(drawFrame);
      };

      recorder.start();
      video.addEventListener('play', () => { drawFrame(); }, { once: true });
      video.play().catch(reject);
    });
  });
}
