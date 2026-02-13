# s-tool-shapetone-v2

Конвертер изображений, видео и 3D-объектов в мозаику из геометрических шейпов. Агент: **s-tool-shapetone-v2**.

## Описание проекта

v2 расширяет оригинальный shapetone:
- **3D объекты**: загрузка .obj и .stl файлов, рендеринг через Three.js с автоматическим вращением
- **Media Transform**: независимое масштабирование и перемещение исходного медиа (Cmd+Scroll / Cmd+Drag) без изменения сетки паттерна

## Стек

- Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3
- Canvas 2D API для рендеринга мозаики
- Three.js для рендеринга 3D объектов
- gifuct-js для покадровой анимации GIF
- Geist Mono (CDN: jsdelivr)

## Архитектура

```
src/
├── types/index.ts                # ShapeType, MediaType, AppState, MediaTransform, etc.
├── engine/
│   ├── ShapetoneRenderer.ts      # Главный рендерер (dirty-flag rAF, DPR, container-based)
│   ├── imageProcessor.ts         # Загрузка медиа, brightness grid с поддержкой mediaTransform
│   ├── shapeDrawer.ts            # Рисование шейпов с батчингом
│   ├── gifPlayer.ts              # GIF анимация через gifuct-js
│   └── objectLoader.ts           # OBJ/STL парсинг + Three.js рендеринг
├── components/
│   ├── CanvasView.tsx            # Canvas + zoom/pan + Cmd modifier для media transform
│   ├── Sidebar.tsx               # Правый сайдбар со всеми контролами
│   ├── ImageUploadZone.tsx       # Drag & Drop / Paste / Open file (image, video, 3D)
│   └── ShapeSelector.tsx         # Селектор шейпов
├── utils/
│   └── colorPresets.ts           # 8 цветовых пресетов
├── App.tsx                       # Состояние + flex layout
├── index.css                     # Tailwind + Geist Mono
└── main.tsx                      # Точка входа
```

## Ключевые концепции

### Два режима трансформации
- **View Transform** (обычный scroll/drag): масштабирует/двигает весь паттерн вместе с контентом
- **Media Transform** (Cmd+scroll/drag): масштабирует/двигает только исходное медиа, паттерн остаётся на месте

### 3D Pipeline
1. Пользователь загружает .obj/.stl
2. `objectLoader.ts` парсит файл → THREE.BufferGeometry
3. Three.js рендерит в WebGL → копирует в 2D canvas
4. `imageProcessor.ts` сэмплирует яркость с этого canvas
5. `ShapetoneRenderer.ts` рисует шейпы как обычно

## Команды

```bash
npm install     # Установка зависимостей
npm run dev     # Dev-сервер
npm run build   # Продакшен-сборка
npm run preview # Превью сборки
```

## Уроки

- Three.js добавляет ~500KB к бандлу — можно оптимизировать через tree-shaking или dynamic import
- OBJ/STL парсинг реализован вручную (без three/examples/loaders) для контроля и минимального размера
- MediaTransform применяется в `computeBrightnessGrid` через масштабирование drawArea и смещение координат
