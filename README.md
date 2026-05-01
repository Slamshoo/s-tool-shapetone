# S:TOOL SHAPETONE

Real-time shape mosaic renderer that transforms images, videos, GIFs and 3D objects into halftone-style compositions using geometric shapes.

https://github.com/user-attachments/assets/72bbc47c-454e-4a4e-8a4b-df4ac6590b98



## Features

- **Multiple shape types** — circles, squares, triangles, any unicode character, custom SVG
- **Multi-format input** — images (PNG, JPG, WebP), video (MP4), animated GIF, 3D objects (OBJ, STL)
- **Real-time preview** — instant feedback as you adjust parameters
- **Brightness mapping** — contrast, brightness, invert, min/max size controls
- **Media transform** — scale, reposition and rotate source media independently of the grid
- **3D object support** — load OBJ/STL files with auto-rotation and manual rotation (Cmd+B+Drag)
- **Color presets** — curated foreground/background combinations with hex input
- **Export** — PNG, SVG, WebM video recording, and self-contained HTML canvas loop

## Quick Start

### Controls

| Action | Shortcut |
|---|---|
| Zoom canvas | Scroll wheel |
| Pan canvas | Drag |
| Scale media | Cmd + Scroll |
| Move media | Cmd + Drag |
| Rotate media | Ctrl + Drag |
| Rotate media (snap 45°) | Ctrl + Shift + Drag |
| Rotate 3D object | Cmd + B + Drag |

### Tutorial

1. **Upload media** — drag & drop or click the input zone. Supports images, video, GIF, OBJ/STL files
2. **Choose a shape** — circle, square, triangle, unicode character (✻), or upload a custom SVG
3. **Adjust density** — lower values = more detail, higher = larger shapes
4. **Tune brightness** — use Contrast and Brightness sliders for the desired look. Try Contrast 3.0 + Brightness -100 for high-contrast results
5. **Pick colors** — set foreground/background via color swatch or hex input field, or use a preset
6. **Transform media** — Cmd+Scroll to scale, Cmd+Drag to reposition, Ctrl+Drag to rotate the source within the grid
7. **Export** — choose the format that fits your use case (see below)

### Recommended Settings for Showcase Look

- Shape: Circle
- Density: 6px
- Contrast: 3.0
- Brightness: -100
- Scale: 88%
- Colors: White on Black

## Export Formats

| Format | Button | Best for |
|---|---|---|
| PNG | PNG | Static frames, design assets |
| SVG | SVG | Vector output, scalable graphics |
| WebM | WEBM | Short video clips to share or edit |
| HTML | HTML · canvas loop | Embedding on websites, full-screen animation |

### HTML Canvas Loop Export

The HTML export generates a fully self-contained file with the shapetone animation running in real-time via Canvas API. No external dependencies, no video codec issues.

**Why it's the lightest option for web embedding:**
- Canvas re-renders geometry in real time — no video file decoding overhead
- Static image source: zero CPU after initial render (no rAF loop)
- Animated source (video/GIF): rAF loop pauses automatically when the browser tab is hidden
- Media is compressed on export: images → JPEG 1280px max, video → WebM 640p / 600 kbps

**Embed as iframe:**
```html
<iframe
  src="shapetone.html"
  style="width:100%;height:100%;border:none;pointer-events:none"
  loading="lazy"
></iframe>
```

The exported HTML fills `window.innerWidth × window.innerHeight`, making it ideal for full-screen hero backgrounds.

### WebM Recording

Click **WEBM** to start recording the canvas in real time. Click again to stop — the file downloads automatically. Recorded at 8 Mbps / 30 fps.

## Tech Stack

- React 18 + TypeScript 5
- Vite 5
- Tailwind CSS 3
- Three.js (3D rendering)
- Canvas 2D API
- gifuct-js (GIF decoding)
- MediaRecorder API (WebM export)

## Development

```bash
npm install
npm run dev        # dev server (localhost:5173)
npm run build      # production build → dist/
npm run preview    # preview production build
```

## Known Limitations

- WebM recording requires a browser with `MediaRecorder` support (Chrome, Firefox, Safari 16+). For older Safari compatibility, use the HTML canvas loop export instead.
- HTML export does not support 3D objects (OBJ/STL) — no Three.js in the inline renderer.
- Video compression during HTML export runs in real time (~video.duration seconds to process).
- GIF export: the browser animates the `<img>` natively; the renderer samples each rAF frame.

## License

All rights reserved.

---

Vibecreated by [Slamshoo](https://www.behance.net/slamshoo) from [Accuraten](https://accuraten.com/)
