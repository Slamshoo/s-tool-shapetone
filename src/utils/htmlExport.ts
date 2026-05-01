import type { AppState, MediaType } from '../types';

// Vanilla JS renderer injected into the exported HTML.
// Must be kept in sync with the TypeScript engine logic.
const RENDERER_SCRIPT = /* js */`
(function () {
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var media = document.getElementById('m');

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', function () { resize(); render(); });
  resize();

  var offCanvas = document.createElement('canvas');
  var offCtx = offCanvas.getContext('2d');

  function computeBrightnessGrid(media, canvasW, canvasH, spacing, contrast, brightness, mt) {
    var mediaW = media.videoWidth || media.naturalWidth || 1;
    var mediaH = media.videoHeight || media.naturalHeight || 1;

    var imgAspect = mediaW / mediaH;
    var canvasAspect = canvasW / canvasH;
    var drawW, drawH, offsetX, offsetY;
    if (imgAspect > canvasAspect) {
      drawW = canvasW; drawH = canvasW / imgAspect;
      offsetX = 0; offsetY = (canvasH - drawH) / 2;
    } else {
      drawH = canvasH; drawW = canvasH * imgAspect;
      offsetX = (canvasW - drawW) / 2; offsetY = 0;
    }

    var scaledDrawW = drawW * mt.scale;
    var scaledDrawH = drawH * mt.scale;
    var finalOffsetX = offsetX + (drawW - scaledDrawW) / 2 + mt.offsetX;
    var finalOffsetY = offsetY + (drawH - scaledDrawH) / 2 + mt.offsetY;

    if (offCanvas.width !== mediaW || offCanvas.height !== mediaH) {
      offCanvas.width = mediaW; offCanvas.height = mediaH;
    }

    // Apply rotation if set
    if (mt.rotation && mt.rotation !== 0) {
      offCtx.save();
      offCtx.translate(mediaW / 2, mediaH / 2);
      offCtx.rotate(mt.rotation);
      offCtx.drawImage(media, -mediaW / 2, -mediaH / 2, mediaW, mediaH);
      offCtx.restore();
    } else {
      offCtx.clearRect(0, 0, mediaW, mediaH);
      offCtx.drawImage(media, 0, 0, mediaW, mediaH);
    }
    var pixels = offCtx.getImageData(0, 0, mediaW, mediaH).data;

    var scaleX = mediaW / scaledDrawW;
    var scaleY = mediaH / scaledDrawH;
    var cols = Math.ceil(canvasW / spacing);
    var rows = Math.ceil(canvasH / spacing);
    var grid = new Float32Array(cols * rows);

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var vx = col * spacing + spacing * 0.5;
        var vy = row * spacing + spacing * 0.5;
        var mx = ((vx - finalOffsetX) * scaleX) | 0;
        var my = ((vy - finalOffsetY) * scaleY) | 0;

        if (mx < 0 || mx >= mediaW || my < 0 || my >= mediaH) {
          grid[row * cols + col] = 0; continue;
        }
        var idx = (my * mediaW + mx) * 4;
        var a = pixels[idx + 3];
        if (a < 10) { grid[row * cols + col] = 0; continue; }

        var r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
        var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (a < 255) lum = lum * (a / 255);
        lum = (lum - 0.5) * contrast + 0.5 + brightness / 255;
        grid[row * cols + col] = lum < 0 ? 0 : lum > 1 ? 1 : lum;
      }
    }
    return { grid: grid, cols: cols, rows: rows };
  }

  var TWO_PI = Math.PI * 2;
  var SQRT3 = Math.sqrt(3);
  var cachedPathData = null, cachedPath2D = null;

  function render() {
    var w = window.innerWidth, h = window.innerHeight;
    ctx.fillStyle = S.colors.background;
    ctx.fillRect(0, 0, w, h);

    var spacing = S.grid.density;
    var bg = computeBrightnessGrid(media, w, h, spacing, S.mapping.contrast, S.mapping.brightness, S.mediaTransform);
    var grid = bg.grid, cols = bg.cols, rows = bg.rows;

    var maxRadius = spacing * 0.48;
    var minScale = S.mapping.minSize / 100;
    var maxScale = S.mapping.maxSize / 100;
    var invert = S.mapping.invert;

    ctx.fillStyle = S.colors.foreground;

    if (S.shape === 'circle') {
      var batch = new Path2D();
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var bv = grid[row * cols + col];
          if (invert) bv = 1 - bv;
          var cs = minScale + bv * (maxScale - minScale);
          cs = cs < 0 ? 0 : cs > 1 ? 1 : cs;
          var rr = maxRadius * cs;
          if (rr < 0.3) continue;
          var cx = col * spacing + spacing * 0.5;
          var cy = row * spacing + spacing * 0.5;
          batch.moveTo(cx + rr, cy);
          batch.arc(cx, cy, rr, 0, TWO_PI);
        }
      }
      ctx.fill(batch);
    } else if (S.shape === 'triangle-up') {
      var batch = new Path2D();
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var bv = grid[row * cols + col];
          if (invert) bv = 1 - bv;
          var cs = minScale + bv * (maxScale - minScale);
          cs = cs < 0 ? 0 : cs > 1 ? 1 : cs;
          var rr = maxRadius * cs;
          if (rr < 0.3) continue;
          var cx = col * spacing + spacing * 0.5;
          var cy = row * spacing + spacing * 0.5;
          var hh = rr * SQRT3;
          batch.moveTo(cx, cy - rr);
          batch.lineTo(cx - hh / 2, cy + rr);
          batch.lineTo(cx + hh / 2, cy + rr);
          batch.closePath();
        }
      }
      ctx.fill(batch);
    } else {
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var bv = grid[row * cols + col];
          if (invert) bv = 1 - bv;
          var cs = minScale + bv * (maxScale - minScale);
          cs = cs < 0 ? 0 : cs > 1 ? 1 : cs;
          var rr = maxRadius * cs;
          if (rr < 0.3) continue;
          var cx = col * spacing + spacing * 0.5;
          var cy = row * spacing + spacing * 0.5;

          if (S.shape === 'square') {
            ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
          } else if (S.shape === 'text') {
            ctx.font = (rr * 2) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(S.customTextChar || '*', cx, cy);
          } else if (S.shape === 'custom' && S.customSvgPath) {
            if (cachedPathData !== S.customSvgPath) {
              cachedPath2D = new Path2D(S.customSvgPath);
              cachedPathData = S.customSvgPath;
            }
            var scale = (rr * 2) / Math.max(S.customSvgViewBox.width, S.customSvgViewBox.height);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-S.customSvgViewBox.width / 2, -S.customSvgViewBox.height / 2);
            ctx.fill(cachedPath2D);
            ctx.restore();
          }
        }
      }
    }
  }

  var isVideo = S.mediaType === 'video';
  var isGif = S.mediaType === 'gif';
  var needsLoop = isVideo || isGif;
  var rafId = 0;
  var loopRunning = false;

  function loop() {
    render();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (loopRunning) return;
    loopRunning = true;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    loopRunning = false;
    cancelAnimationFrame(rafId);
  }

  // Pause animation when tab is hidden — saves CPU/battery (important for embedding)
  if (needsLoop) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopLoop();
        if (isVideo) media.pause();
      } else {
        if (isVideo) media.play().catch(function () {});
        startLoop();
      }
    });
  }

  if (isVideo) {
    media.addEventListener('canplay', function onReady() {
      media.removeEventListener('canplay', onReady);
      startLoop();
    });
    media.play().catch(function () {
      document.addEventListener('click', function () { media.play(); }, { once: true });
      render();
    });
  } else if (needsLoop) {
    // GIF: browser animates the <img>, we sample each rAF
    if (media.complete) {
      startLoop();
    } else {
      media.addEventListener('load', startLoop, { once: true });
    }
  } else {
    // Static image: render once then only on resize (no rAF loop needed)
    if (media.complete) {
      render();
    } else {
      media.addEventListener('load', function () { render(); }, { once: true });
    }
  }
})();
`;

export async function blobUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function generateStandaloneHTML(
  state: AppState,
  mediaDataUrl: string,
  mediaType: MediaType,
): string {
  const stateJson = JSON.stringify({
    shape: state.shape,
    grid: state.grid,
    mapping: state.mapping,
    colors: state.colors,
    mediaTransform: state.mediaTransform,
    customTextChar: state.customTextChar || '*',
    customSvgPath: state.customSvgPath || null,
    customSvgViewBox: state.customSvgViewBox || { width: 24, height: 24 },
    mediaType,
  });

  const isVideo = mediaType === 'video';
  const mediaTag = isVideo
    ? `<video id="m" autoplay loop muted playsinline style="display:none" src="${mediaDataUrl}"></video>`
    : `<img id="m" style="display:none" src="${mediaDataUrl}">`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shapetone</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${state.colors.background};overflow:hidden}canvas{display:block}</style>
</head>
<body>
<canvas id="c"></canvas>
${mediaTag}
<script>
var S=${stateJson};
${RENDERER_SCRIPT}
</script>
</body>
</html>`;
}
