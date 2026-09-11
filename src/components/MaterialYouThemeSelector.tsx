/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BASELINE_COLORS } from '../utils/theme';
import { Palette, Moon, Sun, Check } from 'lucide-react';

interface ThemeSelectorProps {
  sourceColor: string;
  isDark: boolean;
  onColorChange: (color: string) => void;
  onDarkToggle: () => void;
}

export const MaterialYouThemeSelector: React.FC<ThemeSelectorProps> = ({
  sourceColor,
  isDark,
  onColorChange,
  onDarkToggle,
}) => {
  return (
    <div 
      id="theme-selector-panel"
      className="p-5 rounded-3xl border flex flex-col gap-4 w-full"
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
        borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-[var(--md-sys-color-primary)]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
            Material You Theme Engine
          </h3>
        </div>

        {/* Light/Dark Toggle */}
        <button
          onClick={onDarkToggle}
          className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-primary)] transition active:scale-90"
          title="Toggle Day/Night mode"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Dynamic Color seed pickers */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
          Primary Seed Palette
        </label>
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Custom Color Picker */}
          <div className="relative w-8 h-8 rounded-full border-2 overflow-hidden flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
            style={{ borderColor: 'var(--md-sys-color-outline, #79747E)' }}
            title="Custom seed color picker"
          >
            <input
              type="color"
              value={sourceColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
            />
          </div>

          {/* Preset Buttons */}
          {BASELINE_COLORS.map((item) => {
            const isSelected = item.hex.toLowerCase() === sourceColor.toLowerCase();
            return (
              <button
                key={item.hex}
                onClick={() => onColorChange(item.hex)}
                className="w-8 h-8 rounded-full border flex items-center justify-center relative shadow-sm hover:scale-105 active:scale-95 transition-all"
                style={{
                  backgroundColor: item.hex,
                  borderColor: isSelected ? 'var(--md-sys-color-primary, #6750A4)' : '#CAC4D0',
                  borderWidth: isSelected ? '3px' : '1px',
                }}
                title={item.name}
              >
                {isSelected && (
                  <Check size={14} className="text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
