import type { AppState, ShapeType, GridSettings, BrightnessMapping, ColorSettings, MediaType, MediaTransform, Obj3dSettings } from '../types';
import { COLOR_PRESETS } from '../utils/colorPresets';
import ImageUploadZone from './ImageUploadZone';
import ShapeSelector from './ShapeSelector';

interface SidebarProps {
  state: AppState;
  onMediaUpload: (dataUrl: string, mediaType: MediaType, file?: File) => void;
  onClearImage: () => void;
  onShapeChange: (shape: ShapeType) => void;
  onCustomSvgUpload: (pathData: string, viewBox: { width: number; height: number }) => void;
  onCustomTextCharChange: (char: string) => void;
  onGridChange: (grid: GridSettings) => void;
  onMappingChange: (mapping: BrightnessMapping) => void;
  onColorsChange: (colors: ColorSettings) => void;
  onMediaTransformChange: (mt: MediaTransform) => void;
  onObj3dChange: (obj3d: Obj3dSettings) => void;
  onDownloadPng: () => void;
  onDownloadSvg: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">{children}</div>;
}

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-white/50 text-[10px]">{label}</span>
        <span className="text-white/70 tabular-nums text-[10px]">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full appearance-none cursor-pointer"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-white/50 text-[10px]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors ${checked ? 'bg-white/30' : ''}`}
        style={!checked ? { backgroundColor: 'rgba(39, 39, 42, 0.8)' } : undefined}
      >
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'left-4' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export default function Sidebar(props: SidebarProps) {
  const { state } = props;
  const { mapping, grid, colors, mediaTransform } = state;

  const updateMapping = <K extends keyof BrightnessMapping>(key: K, val: BrightnessMapping[K]) => {
    props.onMappingChange({ ...mapping, [key]: val });
  };

  const resetMediaTransform = () => {
    props.onMediaTransformChange({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  return (
    <aside className="w-72 h-screen bg-black/90 backdrop-blur-xl border-l border-white/10 flex flex-col z-40 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white text-sm font-medium tracking-widest">S:TOOL SHAPETONE</span>
        <button
          onClick={props.onDownloadPng}
          className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white/80"
          title="Download PNG"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Input */}
        <div className="px-4 py-3 border-b border-white/10">
          <SectionLabel>Input</SectionLabel>
          <ImageUploadZone
            onMediaUpload={props.onMediaUpload}
            uploadedImage={state.uploadedImage}
            mediaType={state.mediaType}
            onClear={props.onClearImage}
          />
        </div>

        {/* Shape */}
        <div className="px-4 py-3 border-b border-white/10">
          <SectionLabel>Shape</SectionLabel>
          <ShapeSelector
            selected={state.shape}
            onSelect={props.onShapeChange}
            onCustomSvgUpload={props.onCustomSvgUpload}
            hasCustomSvg={!!state.customSvgPath}
            customTextChar={state.customTextChar}
            onCustomTextCharChange={props.onCustomTextCharChange}
          />
        </div>

        {/* Grid */}
        <div className="px-4 py-3 border-b border-white/10">
          <SectionLabel>Grid</SectionLabel>
          <Slider
            label="Density"
            value={grid.density}
            min={5}
            max={100}
            step={1}
            onChange={v => props.onGridChange({ density: v })}
            format={v => `${v}px`}
          />
        </div>

        {/* Brightness Mapping */}
        <div className="px-4 py-3 border-b border-white/10 space-y-3">
          <SectionLabel>Brightness</SectionLabel>
          <Toggle
            label="Invert"
            checked={mapping.invert}
            onChange={v => updateMapping('invert', v)}
          />
          <Slider
            label="Min Size"
            value={mapping.minSize}
            min={0}
            max={100}
            step={1}
            onChange={v => updateMapping('minSize', v)}
            format={v => `${v}%`}
          />
          <Slider
            label="Max Size"
            value={mapping.maxSize}
            min={0}
            max={100}
            step={1}
            onChange={v => updateMapping('maxSize', v)}
            format={v => `${v}%`}
          />
          <Slider
            label="Contrast"
            value={mapping.contrast}
            min={0.1}
            max={3}
            step={0.1}
            onChange={v => updateMapping('contrast', v)}
            format={v => v.toFixed(1)}
          />
          <Slider
            label="Brightness"
            value={mapping.brightness}
            min={-100}
            max={100}
            step={1}
            onChange={v => updateMapping('brightness', v)}
          />
        </div>

        {/* Media Transform */}
        <div className="px-4 py-3 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Media Transform</SectionLabel>
            {(mediaTransform.scale !== 1 || mediaTransform.offsetX !== 0 || mediaTransform.offsetY !== 0) && (
              <button
                onClick={resetMediaTransform}
                className="text-[10px] text-white/40 hover:text-white/60 transition-colors -mt-1"
              >
                Reset
              </button>
            )}
          </div>
          <Slider
            label="Scale"
            value={mediaTransform.scale}
            min={0.1}
            max={5}
            step={0.05}
            onChange={v => props.onMediaTransformChange({ ...mediaTransform, scale: v })}
            format={v => `${(v * 100).toFixed(0)}%`}
          />
          <div className="text-white/30 text-[10px] leading-relaxed">
            Cmd+Scroll: scale media | Cmd+Drag: move media
          </div>
        </div>

        {/* 3D Object Settings */}
        {state.mediaType === 'obj3d' && (
          <div className="px-4 py-3 border-b border-white/10 space-y-3">
            <SectionLabel>3D Object</SectionLabel>
            <Toggle
              label="Auto Rotate"
              checked={state.obj3d.autoRotate}
              onChange={v => props.onObj3dChange({ ...state.obj3d, autoRotate: v })}
            />
            <Slider
              label="Background"
              value={state.obj3d.bgBrightness}
              min={0}
              max={1}
              step={0.01}
              onChange={v => props.onObj3dChange({ ...state.obj3d, bgBrightness: v })}
              format={v => `${(v * 100).toFixed(0)}%`}
            />
            <div className="text-white/30 text-[10px] leading-relaxed">
              Cmd+B+Drag: rotate manually
            </div>
            {(state.obj3d.rotationX !== 0 || state.obj3d.rotationY !== 0) && (
              <button
                onClick={() => props.onObj3dChange({ ...state.obj3d, rotationX: 0, rotationY: 0 })}
                className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
              >
                Reset rotation
              </button>
            )}
          </div>
        )}

        {/* Output (Colors) */}
        <div className="px-4 py-3 border-b border-white/10 space-y-3">
          <SectionLabel>Output</SectionLabel>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <span className="text-white/50 text-[10px]">Foreground</span>
              <label className="block relative w-full h-8 rounded-lg cursor-pointer border border-white/10 overflow-hidden" style={{ backgroundColor: colors.foreground }}>
                <input
                  type="color"
                  value={colors.foreground}
                  onChange={e => props.onColorsChange({ ...colors, foreground: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-white/50 text-[10px]">Background</span>
              <label className="block relative w-full h-8 rounded-lg cursor-pointer border border-white/10 overflow-hidden" style={{ backgroundColor: colors.background }}>
                <input
                  type="color"
                  value={colors.background}
                  onChange={e => props.onColorsChange({ ...colors, background: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-white/50 text-[10px]">Presets</span>
            <div className="grid grid-cols-2 gap-1.5 bg-white/5 rounded-lg p-1.5">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => props.onColorsChange({ background: preset.background, foreground: preset.foreground })}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-white/60 hover:bg-white/10 transition-colors border border-white/5 text-left"
                >
                  <span className="flex items-center gap-0.5 shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.foreground }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.background }} />
                  </span>
                  <span className="truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="px-4 py-3 border-b border-white/10">
          <SectionLabel>Export</SectionLabel>
          <div className="flex gap-2">
            <button
              onClick={props.onDownloadPng}
              className="flex-1 px-2 py-1.5 bg-zinc-800 text-white/70 text-[10px] rounded-lg border border-white/10 hover:bg-zinc-700 transition-colors"
            >
              PNG
            </button>
            <button
              onClick={props.onDownloadSvg}
              className="flex-1 px-2 py-1.5 bg-zinc-800 text-white/70 text-[10px] rounded-lg border border-white/10 hover:bg-zinc-700 transition-colors"
            >
              SVG
            </button>
            <button
              disabled
              className="flex-1 px-2 py-1.5 bg-zinc-900 text-white/25 text-[10px] rounded-lg border border-white/5 cursor-not-allowed"
            >
              MP4 <span className="text-[8px]">(SOON)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 text-center">
          <div className="text-white/30 text-[10px] leading-relaxed">
            Vibecreated by{' '}
            <a href="https://www.behance.net/slamshoo" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white/70 transition-colors">Slamshoo</a>
          </div>
          <div className="text-white/20 text-[10px]">
            from{' '}
            <a href="https://accuraten.com/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 transition-colors">Accuraten</a>
          </div>
        </div>
      </div>
    </aside>
  );
}
