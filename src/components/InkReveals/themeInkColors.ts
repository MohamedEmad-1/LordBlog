import { useEffect, useState } from 'react';

type ThemeName = 'light' | 'dark';

export type ThemeInkColors = {
  inkHex: string;
  startHex: string;
  inkVec3: [number, number, number];
  startVec3: [number, number, number];
};

// Keep these in sync with src/styles/global.css theme background tokens.
const THEME_BG: Record<ThemeName, string> = {
  light: '#fdfdfd',
  dark: '#212737',
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function hexToVec3(hex: string): [number, number, number] {
  const raw = hex.trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return [1, 1, 1];
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return [r / 255, g / 255, b / 255];
}

function cssColorToVec3(color: string): [number, number, number] {
  const c = color.trim();
  if (!c) return [1, 1, 1];

  if (c.startsWith('#')) {
    return hexToVec3(c);
  }

  const rgbMatch = c.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(v => parseFloat(v.trim()));
    if (parts.length >= 3) {
      return [clamp01(parts[0] / 255), clamp01(parts[1] / 255), clamp01(parts[2] / 255)];
    }
  }

  return [1, 1, 1];
}

function vec3ToHex(vec: [number, number, number]): string {
  const toHex = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
  return `#${toHex(vec[0])}${toHex(vec[1])}${toHex(vec[2])}`;
}

function getThemeName(): ThemeName {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark' ? 'dark' : 'light';
}

function getActiveBackgroundVec3(theme: ThemeName): [number, number, number] {
  if (typeof window === 'undefined') return hexToVec3(THEME_BG[theme]);
  const cssValue = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  if (!cssValue) return hexToVec3(THEME_BG[theme]);
  return cssColorToVec3(cssValue);
}

function computeThemeInkColors(): ThemeInkColors {
  const theme = getThemeName();
  const opposite: ThemeName = theme === 'dark' ? 'light' : 'dark';

  const inkVec3 = getActiveBackgroundVec3(theme);
  const startVec3 = hexToVec3(THEME_BG[opposite]);

  return {
    inkHex: vec3ToHex(inkVec3),
    startHex: THEME_BG[opposite],
    inkVec3,
    startVec3,
  };
}

export function useThemeInkColors(): ThemeInkColors {
  const [colors, setColors] = useState<ThemeInkColors>(() => computeThemeInkColors());

  useEffect(() => {
    const update = () => setColors(computeThemeInkColors());
    update();

    const observer = new MutationObserver(() => update());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
