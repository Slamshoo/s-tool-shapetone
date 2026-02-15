# S:TOOL SHAPETONE

Real-time shape mosaic renderer that transforms images, videos, GIFs and 3D objects into halftone-style compositions using geometric shapes.

https://github.com/user-attachments/assets/72bbc47c-454e-4a4e-8a4b-df4ac6590b98



## Features

- **Multiple shape types** — circles, squares, triangles, any unicode character, custom SVG
- **Multi-format input** — images (PNG, JPG, WebP), video (MP4), animated GIF, 3D objects (OBJ, STL)
- **Real-time preview** — instant feedback as you adjust parameters
- **Brightness mapping** — contrast, brightness, invert, min/max size controls
- **Media transform** — scale and reposition source media independently of the grid
- **3D object support** — load OBJ/STL files with auto-rotation and manual rotation (Cmd+B+Drag)
- **Color presets** — curated foreground/background combinations
- **Export** — PNG and SVG output

## Quick Start

### Controls

| Action | Shortcut |
|---|---|
| Zoom canvas | Scroll wheel |
| Pan canvas | Drag |
| Scale media | Cmd + Scroll |
| Move media | Cmd + Drag |
| Rotate 3D object | Cmd + B + Drag |

### Tutorial

1. **Upload media** — drag & drop or click the input zone. Supports images, video, GIF, OBJ/STL files
2. **Choose a shape** — circle, square, triangle, unicode character (✻), or upload a custom SVG
3. **Adjust density** — lower values = more detail, higher = larger shapes
4. **Tune brightness** — use Contrast and Brightness sliders for the desired look. Try Contrast 3.0 + Brightness -100 for high-contrast results
5. **Pick colors** — set foreground/background or use a preset
6. **Transform media** — Cmd+Scroll to scale, Cmd+Drag to reposition the source within the grid
7. **Export** — download as PNG or SVG

### Recommended Settings for Showcase Look

- Shape: Circle
- Density: 6px
- Contrast: 3.0
- Brightness: -100
- Scale: 88%
- Colors: White on Black

## Tech Stack

- React 18 + TypeScript 5
- Vite 5
- Tailwind CSS 3
- Three.js (3D rendering)
- Canvas 2D API
- gifuct-js (GIF decoding)

## Development

```bash
npm install
npm run dev
```

## License

All rights reserved.

---

Vibecreated by [Slamshoo](https://www.behance.net/slamshoo) from [Accuraten](https://accuraten.com/)
