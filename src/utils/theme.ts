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

  // M3 Hue Shifts
  const hPrimary = h;
  const sPrimary = Math.max(s, 40); // Maintain decent saturation for brand colors
  
  const hSecondary = h;
  const sSecondary = Math.max(Math.round(s * 0.35), 8); // Muted palette
  
  const hTertiary = (h + 60) % 360; // Shift hue for interest
  const sTertiary = Math.max(Math.round(s * 0.5), 16);

  if (!isDark) {
    return {
      primary: hslToHex(hPrimary, sPrimary, 40),
      onPrimary: '#FFFFFF',
      primaryContainer: hslToHex(hPrimary, sPrimary, 90),
      onPrimaryContainer: hslToHex(hPrimary, sPrimary, 10),
      secondary: hslToHex(hSecondary, sSecondary, 40),
      onSecondary: '#FFFFFF',
      secondaryContainer: hslToHex(hSecondary, sSecondary, 90),
      onSecondaryContainer: hslToHex(hSecondary, sSecondary, 10),
      tertiary: hslToHex(hTertiary, sTertiary, 40),
      onTertiary: '#FFFFFF',
      tertiaryContainer: hslToHex(hTertiary, sTertiary, 90),
      onTertiaryContainer: hslToHex(hTertiary, sTertiary, 10),
      surface: hslToHex(hPrimary, 6, 98),
      onSurface: hslToHex(hPrimary, 12, 10),
      surfaceVariant: hslToHex(hPrimary, 8, 90),
      onSurfaceVariant: hslToHex(hPrimary, 12, 30),
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: hslToHex(hPrimary, 6, 96),
      surfaceContainer: hslToHex(hPrimary, 6, 94),
      surfaceContainerHigh: hslToHex(hPrimary, 6, 92),
      surfaceContainerHighest: hslToHex(hPrimary, 6, 90),
      background: hslToHex(hPrimary, 8, 99),
      onBackground: hslToHex(hPrimary, 8, 10),
      outline: hslToHex(hPrimary, 8, 50),
      outlineVariant: hslToHex(hPrimary, 8, 80),
      error: '#BA1A1A',
      onError: '#FFFFFF',
      errorContainer: '#FFDAD6',
      onErrorContainer: '#410002',
    };
  } else {
    return {
      primary: hslToHex(hPrimary, sPrimary, 80),
      onPrimary: hslToHex(hPrimary, sPrimary, 20),
      primaryContainer: hslToHex(hPrimary, sPrimary, 30),
      onPrimaryContainer: hslToHex(hPrimary, sPrimary, 90),
      secondary: hslToHex(hSecondary, sSecondary, 80),
      onSecondary: hslToHex(hSecondary, sSecondary, 20),
      secondaryContainer: hslToHex(hSecondary, sSecondary, 30),
      onSecondaryContainer: hslToHex(hSecondary, sSecondary, 90),
      tertiary: hslToHex(hTertiary, sTertiary, 80),
      onTertiary: hslToHex(hTertiary, sTertiary, 20),
      tertiaryContainer: hslToHex(hTertiary, sTertiary, 30),
      onTertiaryContainer: hslToHex(hTertiary, sTertiary, 90),
      surface: hslToHex(hPrimary, 6, 10),
      onSurface: hslToHex(hPrimary, 12, 90),
      surfaceVariant: hslToHex(hPrimary, 8, 25),
      onSurfaceVariant: hslToHex(hPrimary, 12, 80),
      surfaceContainerLowest: hslToHex(hPrimary, 6, 4),
      surfaceContainerLow: hslToHex(hPrimary, 6, 12),
      surfaceContainer: hslToHex(hPrimary, 6, 15),
      surfaceContainerHigh: hslToHex(hPrimary, 6, 18),
      surfaceContainerHighest: hslToHex(hPrimary, 6, 22),
      background: hslToHex(hPrimary, 8, 6),
      onBackground: hslToHex(hPrimary, 8, 90),
      outline: hslToHex(hPrimary, 8, 60),
      outlineVariant: hslToHex(hPrimary, 8, 35),
      error: '#FFB4AB',
      onError: '#690005',
      errorContainer: '#93000A',
      onErrorContainer: '#FFDAD6',
    };
  }
}

export const BASELINE_COLORS = [
  { name: 'Deep Violet (Default)', hex: '#6750A4' },
  { name: 'Jade Garden', hex: '#386A20' },
  { name: 'Terracotta Clay', hex: '#A63E2B' },
  { name: 'Cobalt Sea', hex: '#005FAF' },
  { name: 'Ochre Sand', hex: '#7D5A00' },
  { name: 'Charcoal Slate', hex: '#535F70' },
  { name: 'Neon Lime', hex: '#2B8A00' }
];
