/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BarcodeType =
  | 'qrcode'
  | 'azteccode'
  | 'datamatrix'
  | 'pdf417'
  | 'code128'
  | 'code39'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'codabar'
  | 'itf';

export interface BarcodeDefinition {
  id: BarcodeType;
  name: string;
  category: '1D' | '2D';
  description: string;
  placeholder: string;
  validationRegex?: RegExp;
}

export interface PersonalizationOptions {
  fgColor: string; // Hex color for barcode lines/dots
  bgColor: string; // Hex color for barcode background
  scale: number; // Render scaling factor (1 to 10)
  includeText: boolean; // For 1D barcodes, show the text underneath
  textPosition: 'bottom' | 'top'; // Text placement
  customLabel?: string; // Replace barcode text with custom label in 1D
  quietZone: boolean; // Add clean margins around barcode
  barHeight?: number; // 1D barcode height in mm/pixels
}

export interface ShareableCardOptions {
  title: string;
  body: string;
  footer: string;
  bgType: 'solid' | 'gradient' | 'minimal';
  bgColor: string; // Solid background hex
  gradientStart: string; // Gradient start hex
  gradientEnd: string; // Gradient end hex
  textColor: string; // Text hex (#000000 or #FFFFFF)
  cardColor: string; // Outer container surface color
  borderRadius: 'none' | 'medium' | 'large' | 'extra-large'; // M3 radii
  borderStyle: 'none' | 'thin' | 'dashed';
  showShadow: boolean;
}

export interface HistoryItem {
  id: string;
  type: 'scanned' | 'created';
  format: BarcodeType;
  value: string;
  timestamp: number;
  label?: string; // Custom title for this item
  categoryTag?: string; // Tag / folder
  isFavorite: boolean;
  personalization?: PersonalizationOptions;
  cardOptions?: ShareableCardOptions;
}

export interface TonalPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface MaterialPalette {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  background: string;
  onBackground: string;
  outline: string;
  outlineVariant: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
}

export interface ThemeConfig {
  sourceColor: string;
  isDark: boolean;
  palette: MaterialPalette;
}

