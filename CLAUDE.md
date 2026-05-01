# s-tool-shapetone-v2

Конвертер изображений, видео и 3D-объектов в мозаику из геометрических шейпов. Агент: **s-tool-shapetone-v2**.

## Описание проекта

v2 расширяет оригинальный shapetone:
- **3D объекты**: загрузка .obj и .stl файлов, рендеринг через Three.js с автоматическим вращением
- **Media Transform**: независимое масштабирование, перемещение и вращение исходного медиа (Cmd+Scroll / Cmd+Drag / Ctrl+Drag) без изменения сетки паттерна
- **HTML canvas loop export**: самодостаточный HTML с рендерером на ванильном JS — для вставки на сайты
- **WebM recording**: запись canvas в реальном времени через MediaRecorder API
- **Media compression**: сжатие изображений при загрузке (JPEG 1280px), видео при HTML-экспорте (WebM 640p/600kbps)
- **Hex color input**: ввод цвета через hex-поле под каждым свотчем

## Стек

- Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3
- Canvas 2D API для рендеринга мозаики
- Three.js для рендеринга 3D объектов
- gifuct-js для покадровой анимации GIF
- MediaRecorder API для WebM записи
- Geist Mono (CDN: jsdelivr)

## Архитектура

```
src/
├── types/index.ts                # ShapeType, MediaType, AppState, MediaTransform (+ rotation), etc.
├── engine/
│   ├── ShapetoneRenderer.ts      # Главный рендерер (dirty-flag rAF, DPR, container-based)
│   ├── imageProcessor.ts         # Загрузка медиа, brightness grid + rotation в mediaTransform
│   ├── shapeDrawer.ts            # Рисование шейпов с батчингом
│   ├── gifPlayer.ts              # GIF анимация через gifuct-js
│   └── objectLoader.ts           # OBJ/STL парсинг + Three.js рендеринг
├── components/
│   ├── CanvasView.tsx            # Canvas + zoom/pan + Cmd (scale/move) + Ctrl (rotate) модификаторы
│   ├── Sidebar.tsx               # Правый сайдбар: контролы + HexInput + WEBM/HTML экспорт
│   ├── ImageUploadZone.tsx       # Drag & Drop / Paste / Open file (image, video, 3D)
│   └── ShapeSelector.tsx         # Селектор шейпов
├── utils/
│   ├── colorPresets.ts           # 8 цветовых пресетов
│   ├── htmlExport.ts             # Генерация standalone HTML (inline renderer + base64 медиа)
│   └── mediaCompressor.ts        # compressImage (JPEG 1280px) + compressVideoForEmbed (WebM 640p)
├── App.tsx                       # Состояние + handleDownloadHtml + handleToggleRecording
├── index.css                     # Tailwind + Geist Mono
└── main.tsx                      # Точка входа
```

## Ключевые концепции

### Три режима трансформации медиа
- **View Transform** (обычный scroll/drag): масштабирует/двигает весь паттерн
- **Media Transform scale/move** (Cmd+scroll/drag): масштабирует/двигает только исходное медиа
- **Media Transform rotate** (Ctrl+Drag): вращает медиа, Ctrl+Shift+Drag — снап к 45°

### HTML Export — как работает

Файл `htmlExport.ts` генерирует standalone `.html` без зависимостей:
1. State сериализуется в JSON (включая `mediaType`)
2. Медиа встраивается как base64 data URL (`<video>` или `<img>`)
3. Inline рендерер на ванильном JS воспроизводит логику `imageProcessor.ts` + `shapeDrawer`

**Оптимизации в рендерере:**
- `mediaType === 'image'` → рендер один раз + re-render только при resize (нет rAF = нет CPU)
- `mediaType === 'video' | 'gif'` → rAF loop, автопауза при `document.hidden` (экономия CPU/батарея)
- Ротация медиа воспроизводится через offscreen canvas rotate

### 3D Pipeline
1. Пользователь загружает .obj/.stl
2. `objectLoader.ts` парсит файл → THREE.BufferGeometry
3. Three.js рендерит в WebGL → копирует в 2D canvas
4. `imageProcessor.ts` сэмплирует яркость с этого canvas
5. `ShapetoneRenderer.ts` рисует шейпы как обычно

## Паттерны использования

### Embedding в ceth (Next.js hero)

Для вставки shapetone-анимации в первый экран ceth-ui:
1. Экспортировать как **HTML · canvas loop** (не WebM — нет проблем с кодеком на Safari)
2. Положить `.html` файл в `ceth-ui/public/`
3. Встроить через `<iframe>`:

```tsx
// Hero section
<div className="relative h-screen">
  <iframe
    src="/shapetone.html"
    className="absolute inset-0 w-full h-full border-none pointer-events-none"
    loading="lazy"
  />
  {/* контент поверх */}
</div>
```

**Почему HTML, а не WebM:**
- WebM через `<video>` требует Safari 16+ для полной поддержки
- HTML canvas loop работает во всех современных браузерах без ограничений
- Canvas рендерит геометрию в реальном времени — нет артефактов сжатия видео
- rAF пауза при скрытой вкладке — не жрёт CPU в фоне

## Команды

```bash
npm install     # Установка зависимостей
npm run dev     # Dev-сервер (localhost:5173)
npm run build   # Продакшен-сборка → dist/
npm run preview # Превью сборки
```

## Уроки

- Three.js добавляет ~500KB к бандлу — можно оптимизировать через tree-shaking или dynamic import
- OBJ/STL парсинг реализован вручную (без three/examples/loaders) для контроля и минимального размера
- MediaTransform применяется в `computeBrightnessGrid` через масштабирование drawArea и смещение координат
- Ротация медиа в `imageProcessor.ts`: обратное вращение к каждой viewport-точке перед маппингом в координаты медиа
- WebM recording через `canvas.captureStream(30)` + `MediaRecorder` — работает только на Chromium и Firefox, Safari 16+
- HTML export для статичных изображений должен рендерить один раз и не запускать rAF — иначе 60fps впустую
- `document.visibilitychange` + rAF cancel — обязательный паттерн для embedded canvas анимации
