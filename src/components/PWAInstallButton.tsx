/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AnimatePresence, motion } from 'motion/react';

export const PWAInstallButton: React.FC<{ variant?: 'fab' | 'inline' }> = ({ variant = 'inline' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const isShowBtn = isInstallable || isIOS;

  if (!isShowBtn) {
    return null;
  }

  if (variant === 'fab') {
    return (
      <>
        <button
          id="pwa-install-fab"
          onClick={handleInstallClick}
          className="fixed bottom-24 right-6 md:bottom-20 md:right-8 z-40 flex items-center gap-2 rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95"
          style={{
            backgroundColor: 'var(--md-sys-color-tertiary-container, #FFD8E4)',
            color: 'var(--md-sys-color-on-tertiary-container, #31111D)',
          }}
          title="Install QRagga App"
        >
          <Download size={20} />
          <span className="hidden sm:inline text-sm font-semibold pr-1">Install App</span>
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <IOSInstallGuide onClose={() => setShowIOSGuide(false)} />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <button
        id="pwa-install-inline-btn"
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold shadow hover:opacity-90 active:scale-95 transition-all"
        style={{
          backgroundColor: 'var(--md-sys-color-primary, #6750A4)',
          color: 'var(--md-sys-color-on-primary, #FFFFFF)',
        }}
      >
        <Download size={14} />
        <span>Install App</span>
      </button>

      <AnimatePresence>
        {showIOSGuide && (
          <IOSInstallGuide onClose={() => setShowIOSGuide(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

const IOSInstallGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative"
        style={{
          backgroundColor: 'var(--md-sys-color-surface, #FEF7FF)',
          color: 'var(--md-sys-color-on-surface, #1D1B20)',
          border: '1px solid var(--md-sys-color-outline-variant, #CAC4D0)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div 
            className="p-4 rounded-3xl mb-4"
            style={{
              backgroundColor: 'var(--md-sys-color-primary-container, #EADDFF)',
              color: 'var(--md-sys-color-on-primary-container, #21005D)',
            }}
          >
            <Share2 size={32} className="animate-bounce" />
          </div>

          <h3 className="text-xl font-bold tracking-tight mb-2">
            Install on iOS Device
          </h3>
          <p className="text-sm opacity-85 leading-relaxed mb-6 px-2">
            Add <strong>QRagga</strong> to your iPhone or iPad home screen for a fast, fully standalone, and full-screen offline experience.
          </p>

          <div 
            className="w-full text-left rounded-2xl p-4 space-y-4 mb-4"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-variant, #E7E0EC)',
              color: 'var(--md-sys-color-on-surface-variant, #49454F)',
            }}
          >
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-bold shadow dark:bg-gray-800">
                1
              </span>
              <p className="text-xs pt-0.5 leading-normal">
                Tap the <strong>Share</strong> button in the Safari toolbar at the bottom of your screen.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-bold shadow dark:bg-gray-800">
                2
              </span>
              <p className="text-xs pt-0.5 leading-normal">
                Scroll down the list of options and select <strong>Add to Home Screen</strong>.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-bold shadow dark:bg-gray-800">
                3
              </span>
              <p className="text-xs pt-0.5 leading-normal">
                Give it a name and tap <strong>Add</strong> in the top right corner. QRagga will appear as a native app!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-full text-sm font-semibold tracking-wide hover:opacity-95 shadow transition"
            style={{
              backgroundColor: 'var(--md-sys-color-primary, #6750A4)',
              color: 'var(--md-sys-color-on-primary, #FFFFFF)',
            }}
          >
            Got It
          </button>
        </div>
      </motion.div>
    </div>
  );
};
