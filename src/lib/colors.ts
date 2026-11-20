import type React from 'react';
import type {
  CardVariant,
  ColorPaletteTheme,
  FocusSettings,
  SurfaceTheme,
  TaskColor,
  ThemeMode,
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
    previewGradient: 'linear-gradient(135deg, #272b36 0%, #3b4052 100%)',
    darkBg: '#1e212a',
    lightBg: '#f4f6fb',
    darkPanel: 'rgba(38, 42, 53, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#9364b8', '#3aa0b5'],
  },
  'aurora-night': {
    id: 'aurora-night',
    name: 'Soft Lavender',
    nameTr: 'Yumuşak Lavanta',
    previewGradient: 'linear-gradient(135deg, #1b1a2a 0%, #2a2742 100%)',
    darkBg: '#191826',
    lightBg: '#f5f4fb',
    darkPanel: 'rgba(32, 30, 50, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#0fa988', '#d56aa6'],
  },
  'midnight-ocean': {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    nameTr: 'Gece Okyanusu',
    previewGradient: 'linear-gradient(135deg, #131c28 0%, #1d2d40 100%)',
    darkBg: '#131c28',
    lightBg: '#f1f7fc',
    darkPanel: 'rgba(24, 35, 52, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#1388ba', '#0fa988'],
  },
  'sunset-glow': {
    id: 'sunset-glow',
    name: 'Warm Plum',
    nameTr: 'Sıcak Erik',
    previewGradient: 'linear-gradient(135deg, #21191e 0%, #33242b 100%)',
    darkBg: '#21191e',
    lightBg: '#fcf6f4',
    darkPanel: 'rgba(43, 30, 38, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#e05a5a', '#d89b48'],
  },
  'forest-mist': {
    id: 'forest-mist',
    name: 'Forest Mist',
    nameTr: 'Orman Sisi',
    previewGradient: 'linear-gradient(135deg, #151f1b 0%, #20312b 100%)',
    darkBg: '#151f1b',
    lightBg: '#f2f9f5',
    darkPanel: 'rgba(26, 39, 34, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#4caf6a', '#3aa0b5'],
  },
  'pure-minimal': {
    id: 'pure-minimal',
    name: 'Pure Minimal',
    nameTr: 'Saf Minimal',
    previewGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
    darkBg: '#18181b',
    lightBg: '#f4f4f5',
    darkPanel: 'rgba(39, 39, 42, 0.9)',
    lightPanel: 'rgba(255, 255, 255, 0.94)',
    glowColors: ['#71717a', '#a1a1aa'],
  },
  'espresso-warm': {
    id: 'espresso-warm',
    name: 'Espresso Cozy',
    nameTr: 'Sıcak Espresso',
    previewGradient: 'linear-gradient(135deg, #211b17 0%, #362c24 100%)',
    darkBg: '#1f1915',
    lightBg: '#f9f5f0',
    darkPanel: 'rgba(42, 34, 29, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#d89b48', '#df7a57'],
  },
  'nordic-fjord': {
    id: 'nordic-fjord',
    name: 'Nordic Fjord',
    nameTr: 'Kuzey Fiyordu',
    previewGradient: 'linear-gradient(135deg, #122026 0%, #1c323b 100%)',
    darkBg: '#122026',
    lightBg: '#eff7f9',
    darkPanel: 'rgba(24, 41, 49, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#3aa0b5', '#0fa988'],
  },
  'matcha-zen': {
    id: 'matcha-zen',
    name: 'Matcha Tea',
    nameTr: 'Matcha Çayı',
    previewGradient: 'linear-gradient(135deg, #182118 0%, #273627 100%)',
    darkBg: '#172017',
    lightBg: '#f3f8f1',
    darkPanel: 'rgba(30, 41, 30, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#4caf6a', '#c5b338'],
  },
  'rose-clay': {
    id: 'rose-clay',
    name: 'Dusty Rose',
    nameTr: 'Pastel Gül',
    previewGradient: 'linear-gradient(135deg, #24191e 0%, #3a2630 100%)',
    darkBg: '#23181d',
    lightBg: '#fcf3f6',
    darkPanel: 'rgba(46, 31, 38, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#d56aa6', '#e05a5a'],
  },
  'deep-cosmos': {
    id: 'deep-cosmos',
    name: 'Deep Indigo',
    nameTr: 'Derin Çivit',
    previewGradient: 'linear-gradient(135deg, #141628 0%, #222645 100%)',
    darkBg: '#131626',
    lightBg: '#f2f4fc',
    darkPanel: 'rgba(25, 29, 51, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#6c529e', '#455fa8'],
  },
  'sand-dune': {
    id: 'sand-dune',
    name: 'Warm Sand',
    nameTr: 'Ilık Kum',
    previewGradient: 'linear-gradient(135deg, #232018 0%, #363125 100%)',
    darkBg: '#211e16',
    lightBg: '#fbf8f1',
    darkPanel: 'rgba(43, 39, 29, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#d89b48', '#aba49e'],
  },
  'storm-harbor': {
    id: 'storm-harbor',
    name: 'Storm Harbor',
    nameTr: 'Fırtına Limanı',
    previewGradient: 'linear-gradient(135deg, #1a2029 0%, #2a3342 100%)',
    darkBg: '#181e27',
    lightBg: '#f2f5f9',
    darkPanel: 'rgba(32, 39, 50, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#1388ba', '#918f8d'],
  },
  'terracotta-earth': {
    id: 'terracotta-earth',
    name: 'Terracotta',
    nameTr: 'Kızıl Toprak',
    previewGradient: 'linear-gradient(135deg, #261b18 0%, #3d2a25 100%)',
    darkBg: '#241916',
    lightBg: '#fcf4f1',
    darkPanel: 'rgba(47, 33, 29, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.92)',
    glowColors: ['#df7a57', '#d89b48'],
  },
  'obsidian-oled': {
    id: 'obsidian-oled',
    name: 'Obsidian Quiet',
    nameTr: 'Sessiz Obsidyen',
    previewGradient: 'linear-gradient(135deg, #0d0e12 0%, #1c1e26 100%)',
    darkBg: '#101115',
    lightBg: '#f6f6f8',
    darkPanel: 'rgba(22, 24, 31, 0.92)',
    lightPanel: 'rgba(255, 255, 255, 0.95)',
    glowColors: ['#9364b8', '#71717a'],
  },
  'oat-milk': {
    id: 'oat-milk',
    name: 'Soft Stone',
    nameTr: 'Yumuşak Taş',
    previewGradient: 'linear-gradient(135deg, #222120 0%, #353330 100%)',
    darkBg: '#1f1e1d',
    lightBg: '#f7f5f2',
    darkPanel: 'rgba(41, 39, 37, 0.88)',
    lightPanel: 'rgba(255, 255, 255, 0.94)',
    glowColors: ['#aba49e', '#d89b48'],
  },
};

export const SURFACE_THEME_LIST: SurfaceThemeConfig[] = Object.values(SURFACE_THEMES);

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = normalizeHex(hex) ?? '#9364b8';
  const [rRaw, gRaw, bRaw] = hexToRgb(clean);
  const r = rRaw / 255;
  const g = gRaw / 255;
  const b = bRaw / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function resolveActiveBackground(
  settings: Pick<
    FocusSettings,
    'surfaceTheme' | 'customBgEnabled' | 'customDarkBg' | 'customLightBg'
  >,
  theme: ThemeMode,
): string {
  if (settings.customBgEnabled) {
    const customHex = normalizeHex(
      theme === 'dark' ? settings.customDarkBg : settings.customLightBg,
    );
    if (customHex) return customHex;
  }
  const surface = SURFACE_THEMES[settings.surfaceTheme] ?? SURFACE_THEMES['llama-slate'];
  return theme === 'dark' ? surface.darkBg : surface.lightBg;
}

export function getFriendlyColorLabel(
  color: TaskColor,
  lang: 'en' | 'tr' = 'en',
): { key: string; label: string; hex: string } {
  const hex = normalizeHex(color);
  if (!hex) {
    return {
      key: '__none__',
      label: lang === 'tr' ? 'Renksiz / Nötr' : 'Neutral / Unlabeled',
      hex: '#71717a',
    };
  }

  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta < 24) {
    return {
      key: hex,
      label: lang === 'tr' ? `Taş / Gri (${hex})` : `Stone (${hex})`,
      hex,
    };
  }

  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  let enName = 'Color';
  let trName = 'Renk';
  if (hue < 16 || hue >= 342) {
    enName = 'Crimson & Rose';
    trName = 'Mercan & Gül';
  } else if (hue < 38) {
    enName = 'Warm Amber';
    trName = 'Sıcak Turuncu';
  } else if (hue < 68) {
    enName = 'Golden Sun';
    trName = 'Altın Sarı';
  } else if (hue < 152) {
    enName = 'Forest & Emerald';
    trName = 'Zümrüt Yeşil';
  } else if (hue < 192) {
    enName = 'Ocean Teal';
    trName = 'Okyanus Turkuaz';
  } else if (hue < 248) {
    enName = 'Sky & Cobalt';
    trName = 'Gökyüzü Mavi';
  } else if (hue < 292) {
    enName = 'Violet & Plum';
    trName = 'Mor & Lavanta';
  } else {
    enName = 'Pink & Magenta';
    trName = 'Pembe & Fuşya';
  }

  return {
    key: hex,
    label: lang === 'tr' ? trName : enName,
    hex,
  };
}
