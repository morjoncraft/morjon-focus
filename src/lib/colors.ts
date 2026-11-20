import type React from 'react';
import type {
  CardVariant,
  ColorPaletteTheme,
  SurfaceTheme,
  TaskColor,
} from '../types';

export const ACCENT_SWATCHES: string[] = [
  '#e05a5a',
  '#df7a57',
  '#d89b48',
  '#c5b338',
  '#4caf6a',
  '#0fa988',
  '#3aa0b5',
  '#1388ba',
  '#455fa8',
  '#6c529e',
  '#9364b8',
  '#d56aa6',
  '#aba49e',
  '#918f8d',
];

export const COLOR_ME_PALETTES: ColorPaletteTheme[] = [
  {
    id: 'rainbow-bliss',
    name: 'Rainbow Bliss',
    nameTr: 'Gökkuşağı Keyfi',
    colors: ['#e05a5a', '#df7a57', '#d8b438', '#4caf6a', '#3aa0b5', '#6c529e', '#d56aa6'],
  },
  {
    id: 'ocean-mist',
    name: 'Ocean Mist',
    nameTr: 'Okyanus Sisi',
    colors: ['#0f766e', '#0d9488', '#06b6d4', '#0284c7', '#2563eb', '#4f46e5'],
  },
  {
    id: 'crunchy-grape',
    name: 'Crunchy Grape',
    nameTr: 'Üzüm Şöleni',
    colors: ['#4c1d95', '#6d28d9', '#7c3aed', '#9333ea', '#c026d3', '#db2777'],
  },
  {
    id: 'rustling-leaves',
    name: 'Rustling Leaves',
    nameTr: 'Hışırdayan Yapraklar',
    colors: ['#9a3412', '#c2410c', '#d97706', '#ca8a04', '#65a30d', '#15803d'],
  },
  {
    id: 'lavender-cupcake',
    name: 'Lavender Cupcake',
    nameTr: 'Lavanta Kek',
    colors: ['#8b5cf6', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'],
  },
  {
    id: 'clear-skies',
    name: 'Clear Skies',
    nameTr: 'Açık Gökyüzü',
    colors: ['#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#22d3ee', '#2dd4bf'],
  },
  {
    id: 'passionfruit-delight',
    name: 'Passionfruit Delight',
    nameTr: 'Çarkıfelek Lezzeti',
    colors: ['#be185d', '#e11d48', '#f43f5e', '#fb7185', '#f97316', '#f59e0b'],
  },
  {
    id: 'bubble-yum',
    name: 'Bubble Yum',
    nameTr: 'Sakız Şekeri',
    colors: ['#ec4899', '#f472b6', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4'],
  },
  {
    id: 'tangerine-twist',
    name: 'Tangerine Twist',
    nameTr: 'Mandalina Esintisi',
    colors: ['#ea580c', '#f97316', '#fb923c', '#f59e0b', '#fbbf24', '#ef4444'],
  },
  {
    id: 'winter-blues',
    name: 'Winter Blues',
    nameTr: 'Kış Mavileri',
    colors: ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#6366f1', '#818cf8'],
  },
  {
    id: 'cornfield-breeze',
    name: 'Cornfield Breeze',
    nameTr: 'Başak Esintisi',
    colors: ['#a16207', '#ca8a04', '#eab308', '#facc15', '#84cc16', '#22c55e'],
  },
  {
    id: 'watermelon-pop',
    name: 'Watermelon Pop',
    nameTr: 'Karpuz Patlaması',
    colors: ['#e11d48', '#f43f5e', '#fb7185', '#10b981', '#059669', '#14b8a6'],
  },
  {
    id: 'vibrant-day',
    name: 'Vibrant Day',
    nameTr: 'Canlı Gün',
    colors: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    nameTr: 'Altın Saat',
    colors: ['#b45309', '#d97706', '#f59e0b', '#fbbf24', '#f97316', '#e11d48'],
  },
  {
    id: 'minty-slice',
    name: 'Minty Slice',
    nameTr: 'Nane Dilimi',
    colors: ['#047857', '#059669', '#10b981', '#34d399', '#2dd4bf', '#22d3ee'],
  },
  {
    id: 'herb-garden',
    name: 'Herb Garden',
    nameTr: 'Bitki Bahçesi',
    colors: ['#166534', '#15803d', '#16a34a', '#4d7c0f', '#65a30d', '#0d9488'],
  },
];

const LEGACY_COLOR_HEX: Record<string, string> = {
  none: 'none',
  zinc: '#71717a',
  rose: '#e05a5a',
  amber: '#d89b48',
  emerald: '#0fa988',
  sky: '#3aa0b5',
  violet: '#9364b8',
  fuchsia: '#d56aa6',
  orange: '#df7a57',
};

const HEX_REGEX = /^#[0-9a-f]{6}$/i;

export function isValidTaskColor(value: string): boolean {
  if (!value) return false;
  if (value === 'none' || value in LEGACY_COLOR_HEX) return true;
  return HEX_REGEX.test(value.trim());
}

export function normalizeHex(color: TaskColor | undefined): string | null {
  if (!color || color === 'none') return null;
  const trimmed = color.trim();
  if (HEX_REGEX.test(trimmed)) return trimmed.toLowerCase();
  const mapped = LEGACY_COLOR_HEX[trimmed.toLowerCase()];
  if (mapped && mapped !== 'none') return mapped;
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = Number.parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function samplePaletteForCount(colors: string[], count: number): string[] {
  if (count <= 0) return [];
  if (colors.length === 0) return Array(count).fill('#9364b8');
  if (count === 1) return [colors[0]];

  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const scaled = t * (colors.length - 1);
    const idx = Math.floor(scaled);
    const frac = scaled - idx;
    const c1 = colors[idx];
    const c2 = colors[Math.min(colors.length - 1, idx + 1)];
    const [r1, g1, b1] = hexToRgb(c1);
    const [r2, g2, b2] = hexToRgb(c2);
    result.push(
      rgbToHex(r1 + (r2 - r1) * frac, g1 + (g2 - g1) * frac, b1 + (b2 - b1) * frac),
    );
  }
  return result;
}

export function resolveTaskCardStyle(
  color: TaskColor,
  isDark: boolean,
  variant: CardVariant,
): {
  style: React.CSSProperties;
  accentHex: string;
  isNeutral: boolean;
} {
  const hex = normalizeHex(color);
  if (!hex) {
    return {
      style: {},
      accentHex: isDark ? '#71717a' : '#a1a1aa',
      isNeutral: true,
    };
  }

  if (variant === 'solid') {
    return {
      style: {
        backgroundColor: hexToRgba(hex, isDark ? 0.34 : 0.24),
        borderColor: hexToRgba(hex, isDark ? 0.65 : 0.55),
      },
      accentHex: hex,
      isNeutral: false,
    };
  }

  if (variant === 'left-border') {
    return {
      style: {
        backgroundColor: isDark ? 'rgba(39, 39, 46, 0.72)' : 'rgba(255, 255, 255, 0.94)',
        borderColor: hexToRgba(hex, isDark ? 0.42 : 0.38),
      },
      accentHex: hex,
      isNeutral: false,
    };
  }

  if (variant === 'glass') {
    return {
      style: {
        backgroundImage: `linear-gradient(120deg, ${hexToRgba(
          hex,
          isDark ? 0.24 : 0.16,
        )}, ${hexToRgba(hex, isDark ? 0.08 : 0.05)})`,
        borderColor: hexToRgba(hex, isDark ? 0.45 : 0.38),
        backdropFilter: 'blur(10px)',
      },
      accentHex: hex,
      isNeutral: false,
    };
  }

  // Default 'tinted': vibrant, crisp Llama-Life inspired tint
  return {
    style: {
      backgroundColor: hexToRgba(hex, isDark ? 0.2 : 0.14),
      borderColor: hexToRgba(hex, isDark ? 0.48 : 0.4),
    },
    accentHex: hex,
    isNeutral: false,
  };
}

export interface SurfaceThemeConfig {
  id: SurfaceTheme;
  name: string;
  nameTr: string;
  previewGradient: string;
  darkBg: string;
  lightBg: string;
  darkPanel: string;
  lightPanel: string;
  glowColors: [string, string];
}

export const SURFACE_THEMES: Record<SurfaceTheme, SurfaceThemeConfig> = {
  'llama-slate': {
    id: 'llama-slate',
    name: 'Llama Slate',
    nameTr: 'Llama Slate (Klasik)',
    previewGradient: 'linear-gradient(135deg, #272b36 0%, #9364b8 100%)',
    darkBg: '#1e212a',
    lightBg: '#f4f6fb',
    darkPanel: 'rgba(38, 42, 53, 0.85)',
    lightPanel: 'rgba(255, 255, 255, 0.9)',
    glowColors: ['#9364b8', '#3aa0b5'],
  },
  'aurora-night': {
    id: 'aurora-night',
    name: 'Aurora Glow',
    nameTr: 'Aurora Işıltısı',
    previewGradient: 'linear-gradient(135deg, #1b1834 0%, #0fa988 55%, #d56aa6 100%)',
    darkBg: '#151424',
    lightBg: '#f4f3ff',
    darkPanel: 'rgba(30, 28, 52, 0.82)',
    lightPanel: 'rgba(255, 255, 255, 0.88)',
    glowColors: ['#0fa988', '#d56aa6'],
  },
  'midnight-ocean': {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    nameTr: 'Gece Okyanusu',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #0284c7 60%, #2dd4bf 100%)',
    darkBg: '#0f1726',
    lightBg: '#eff8ff',
    darkPanel: 'rgba(22, 33, 54, 0.84)',
    lightPanel: 'rgba(255, 255, 255, 0.9)',
    glowColors: ['#1388ba', '#0fa988'],
  },
  'sunset-glow': {
    id: 'sunset-glow',
    name: 'Sunset Ember',
    nameTr: 'Gün Batımı',
    previewGradient: 'linear-gradient(135deg, #271722 0%, #e05a5a 55%, #d89b48 100%)',
    darkBg: '#1f1620',
    lightBg: '#fff7f3',
    darkPanel: 'rgba(43, 28, 42, 0.84)',
    lightPanel: 'rgba(255, 255, 255, 0.9)',
    glowColors: ['#e05a5a', '#d89b48'],
  },
  'forest-mist': {
    id: 'forest-mist',
    name: 'Forest Mist',
    nameTr: 'Orman Sisi',
    previewGradient: 'linear-gradient(135deg, #12211c 0%, #4caf6a 60%, #3aa0b5 100%)',
    darkBg: '#131d19',
    lightBg: '#f1faf5',
    darkPanel: 'rgba(25, 39, 33, 0.84)',
    lightPanel: 'rgba(255, 255, 255, 0.9)',
    glowColors: ['#4caf6a', '#3aa0b5'],
  },
  'pure-minimal': {
    id: 'pure-minimal',
    name: 'Pure Minimal',
    nameTr: 'Saf Minimal',
    previewGradient: 'linear-gradient(135deg, #18181b 0%, #52525b 100%)',
    darkBg: '#18181b',
    lightBg: '#f4f4f5',
    darkPanel: 'rgba(39, 39, 42, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.94)',
    glowColors: ['#71717a', '#a1a1aa'],
  },
};

export const SURFACE_THEME_LIST: SurfaceThemeConfig[] = Object.values(SURFACE_THEMES);
