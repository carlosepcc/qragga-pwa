/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialPalette } from '../types';

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Strip #
  let cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(x => x + x).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

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
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

export function generateMaterialPalette(sourceHex: string, isDark: boolean): MaterialPalette {
  const { h, s, l } = hexToHsl(sourceHex);

  // Restrict saturation to a premium, nearly monochrome gray (3% to 6%)
  const monoS = Math.min(s, 5); 

  if (!isDark) {
    // Light Mode (Sophisticated Warm/Cool Off-Whites)
    const bg = hslToHex(h, monoS, 98); // #FAF9F8 style off-white
    const surface = '#FFFFFF';
    const primary = hslToHex(h, monoS, 10); // Very dark almost black
    const onPrimary = '#FFFFFF';
    const primaryContainer = hslToHex(h, monoS, 92); // Clean light gray
    const onPrimaryContainer = primary;
    const secondary = hslToHex(h, monoS, 25); // Mid-dark gray
    const onSecondary = '#FFFFFF';
    const secondaryContainer = hslToHex(h, monoS, 94);
    const onSecondaryContainer = secondary;
    
    return {
      primary,
      onPrimary,
      primaryContainer,
      onPrimaryContainer,
      secondary,
      onSecondary,
      secondaryContainer,
      onSecondaryContainer,
      tertiary: secondary,
      onTertiary: '#FFFFFF',
      tertiaryContainer: secondaryContainer,
      onTertiaryContainer: secondary,
      surface,
      onSurface: primary,
      surfaceVariant: hslToHex(h, monoS, 90),
      onSurfaceVariant: hslToHex(h, monoS, 30),
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: hslToHex(h, monoS, 96),
      surfaceContainer: hslToHex(h, monoS, 94),
      surfaceContainerHigh: hslToHex(h, monoS, 91),
      surfaceContainerHighest: hslToHex(h, monoS, 88),
      background: bg,
      onBackground: primary,
      outline: hslToHex(h, monoS, 20), // High contrast sharp borders
      outlineVariant: hslToHex(h, monoS, 85),
      error: '#BA1A1A',
      onError: '#FFFFFF',
      errorContainer: '#FFDAD6',
      onErrorContainer: '#410002',
    };
  } else {
    // Dark Mode (Sophisticated Carbon/Onyx)
    const bg = hslToHex(h, monoS, 8); // Deep charcoal
    const surface = hslToHex(h, monoS, 12); // Slightly lighter charcoal
    const primary = hslToHex(h, monoS, 92); // Off-white
    const onPrimary = hslToHex(h, monoS, 8);
    const primaryContainer = hslToHex(h, monoS, 22);
    const onPrimaryContainer = primary;
    const secondary = hslToHex(h, monoS, 75);
    const onSecondary = hslToHex(h, monoS, 8);
    const secondaryContainer = hslToHex(h, monoS, 18);
    const onSecondaryContainer = secondary;

    return {
      primary,
      onPrimary,
      primaryContainer,
      onPrimaryContainer,
      secondary,
      onSecondary,
      secondaryContainer,
      onSecondaryContainer,
      tertiary: secondary,
      onTertiary: onSecondary,
      tertiaryContainer: secondaryContainer,
      onTertiaryContainer: secondary,
      surface,
      onSurface: primary,
      surfaceVariant: hslToHex(h, monoS, 24),
      onSurfaceVariant: hslToHex(h, monoS, 80),
      surfaceContainerLowest: hslToHex(h, monoS, 4),
      surfaceContainerLow: hslToHex(h, monoS, 10),
      surfaceContainer: hslToHex(h, monoS, 14),
      surfaceContainerHigh: hslToHex(h, monoS, 18),
      surfaceContainerHighest: hslToHex(h, monoS, 24),
      background: bg,
      onBackground: primary,
      outline: hslToHex(h, monoS, 80),
      outlineVariant: hslToHex(h, monoS, 28),
      error: '#FFB4AB',
      onError: '#690005',
      errorContainer: '#93000A',
      onErrorContainer: '#FFDAD6',
    };
  }
}

export const BASELINE_COLORS = [
  { name: 'Warm Charcoal', hex: '#1C1917' },
  { name: 'Cool Slate', hex: '#1E293B' },
  { name: 'Onyx Black', hex: '#121212' },
  { name: 'Neutral Zinc', hex: '#18181B' },
  { name: 'Pure Carbon', hex: '#000000' }
];
