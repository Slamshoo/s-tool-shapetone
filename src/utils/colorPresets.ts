export interface ColorPreset {
  name: string;
  background: string;
  foreground: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  // Left column: light on dark
  { name: 'Pure Black',   background: '#000000', foreground: '#ffffff' },
  // Right column: dark on light
  { name: 'Pure White',   background: '#ffffff', foreground: '#000000' },

  { name: 'Lilac Night',  background: '#6b5b7b', foreground: '#d8b4fe' },
  { name: 'Teal Rose',    background: '#1b4d4d', foreground: '#f0b4d0' },

  { name: 'Acid Green',   background: '#2040e0', foreground: '#c0e830' },
  { name: 'Lavender Ice',  background: '#b8c8e0', foreground: '#7c5cbf' },

  { name: 'Ember Navy',   background: '#1a1a5c', foreground: '#f06030' },
  { name: 'Red Wine',     background: '#380000', foreground: '#dc2626' },
];
