import { useRef, useState } from 'react';
import type { ShapeType } from '../types';

interface ShapeSelectorProps {
  selected: ShapeType;
  onSelect: (shape: ShapeType) => void;
  onCustomSvgUpload: (pathData: string, viewBox: { width: number; height: number }) => void;
  hasCustomSvg: boolean;
  customTextChar: string;
  onCustomTextCharChange: (char: string) => void;
}

const SHAPES: { value: ShapeType; icon: (s: number) => React.ReactNode }[] = [
  {
    value: 'circle',
    icon: (s) => {
      const c = s / 2, r = s * 0.38;
      return <circle cx={c} cy={c} r={r} />;
    },
  },
  {
    value: 'square',
    icon: (s) => {
      const c = s / 2, r = s * 0.38;
      return <rect x={c - r} y={c - r} width={r * 2} height={r * 2} />;
    },
  },
  {
    value: 'triangle-up',
    icon: (s) => {
      const c = s / 2, r = s * 0.38, tri = r * Math.sqrt(3) / 2;
      return <polygon points={`${c},${c - r} ${c - tri},${c + r} ${c + tri},${c + r}`} />;
    },
  },
  {
    value: 'text',
    icon: (s) => {
      const c = s / 2;
      return (
        <text x={c} y={c} textAnchor="middle" dominantBaseline="central"
          fontSize={24} fill="currentColor" fontFamily="sans-serif">
          ✻
        </text>
      );
    },
  },
  {
    value: 'custom',
    icon: (s) => {
      const c = s / 2;
      return (
        <text x={c} y={c} textAnchor="middle" dominantBaseline="central"
          fontSize={20} fill="currentColor" fontFamily="'Geist Mono', monospace" fontWeight="500">
          SVG
        </text>
      );
    },
  },
];

function parseSvgFile(svgText: string): { pathData: string; viewBox: { width: number; height: number } } | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;

  const vb = svg.getAttribute('viewBox');
  let width = 24;
  let height = 24;
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    if (parts.length >= 4) {
      width = parts[2];
      height = parts[3];
    }
  } else {
    const w = svg.getAttribute('width');
    const h = svg.getAttribute('height');
    if (w) width = parseFloat(w);
    if (h) height = parseFloat(h);
  }

  const path = doc.querySelector('path');
  if (!path) return null;

  const d = path.getAttribute('d');
  if (!d) return null;

  return { pathData: d, viewBox: { width, height } };
}

export default function ShapeSelector({ selected, onSelect, onCustomSvgUpload, hasCustomSvg, customTextChar, onCustomTextCharChange }: ShapeSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState(customTextChar);

  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const parsed = parseSvgFile(reader.result);
      if (parsed) {
        onCustomSvgUpload(parsed.pathData, parsed.viewBox);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTextInput = (value: string) => {
    setTextInput(value);
    // Take first character (supports multi-byte unicode via spread)
    const chars = [...value];
    if (chars.length > 0) {
      onCustomTextCharChange(chars[0]);
      if (selected !== 'text') {
        onSelect('text');
      }
    }
  };

  const SIZE = 32;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        className="hidden"
        onChange={handleSvgUpload}
      />
      <div className="grid grid-cols-5 gap-1 bg-zinc-800/50 rounded-lg p-0.5">
        {SHAPES.map(s => (
          <button
            key={s.value}
            onClick={() => {
              if (s.value === 'custom' && !hasCustomSvg) {
                fileInputRef.current?.click();
              } else {
                onSelect(s.value);
              }
            }}
            className={`flex items-center justify-center px-1 py-1.5 rounded-md transition-colors ${
              selected === s.value
                ? 'bg-white/15 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
            title={s.value}
          >
            <svg width={16} height={16} viewBox={`0 0 ${SIZE} ${SIZE}`} fill="currentColor">
              {s.icon(SIZE)}
            </svg>
          </button>
        ))}
      </div>

      {/* Text character input */}
      {selected === 'text' && (
        <div className="mt-2">
          <input
            type="text"
            value={textInput}
            onChange={e => handleTextInput(e.target.value)}
            placeholder="*"
            className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-white/30"
            maxLength={2}
          />
        </div>
      )}

      {hasCustomSvg && selected === 'custom' && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-1.5 w-full text-[10px] text-white/40 hover:text-white/60 transition-colors"
        >
          Replace SVG
        </button>
      )}
    </div>
  );
}
