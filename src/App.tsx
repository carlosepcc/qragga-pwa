/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ScanLine, 
  PlusCircle, 
  History as HistoryIcon, 
  Settings as SettingsIcon, 
  QrCode, 
  Info, 
  X, 
  ArrowUpRight,
  Shield,
  Smartphone,
  RotateCw,
  Sparkles
} from 'lucide-react';

import { HistoryItem, MaterialPalette } from './types';
import { generateMaterialPalette } from './utils/theme';

// Tabs
import { ScannerTab } from './components/ScannerTab';
import { CreatorTab } from './components/CreatorTab';
import { HistoryTab } from './components/HistoryTab';

// App Components
import { MaterialYouThemeSelector } from './components/MaterialYouThemeSelector';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function App() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check immediately on load
        r.update();
        // Check every 30 minutes
        const checkInterval = setInterval(() => {
          r.update().catch(err => console.debug('Failed to check for PWA update:', err));
        }, 30 * 60 * 1000);
        return () => clearInterval(checkInterval);
      }
    },
    onRegisterError(error) {
      console.error('PWA service worker registration failed:', error);
    },
  });

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Check on visibility change (re-focusing tab, unlocking screen)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(r => {
          r.update().catch(err => console.debug('Failed to update SW on visibility change:', err));
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Mobile Viewport Detection for Native Spring Sheet Layout
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Universal Navigation Router
  const [activeTab, setActiveTab] = useState<'scan' | 'create' | 'history'>(() => {
    if (typeof window === 'undefined') return 'create';
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const queryTab = searchParams.get('tab') || searchParams.get('view');

    if (pathname.endsWith('/scan') || hash === '#/scan' || hash === '#scan' || queryTab === 'scan') {
      return 'scan';
    }
    if (pathname.endsWith('/history') || hash === '#/history' || hash === '#history' || queryTab === 'history') {
      return 'history';
    }
    return 'create';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const queryTab = searchParams.get('tab') || searchParams.get('view');

    return (
      pathname.endsWith('/preferences') || 
      pathname.endsWith('/settings') || 
      hash === '#/preferences' || 
      hash === '#preferences' || 
      queryTab === 'preferences' || 
      queryTab === 'settings'
    );
  });
  
  // Theme State
  const [sourceColor, setSourceColor] = useState<string>(() => {
    return localStorage.getItem('zebra_qr_theme_color') || '#6750A4';
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('zebra_qr_is_dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Dynamic system preference theme synchronization
  useEffect(() => {
    const saved = localStorage.getItem('zebra_qr_is_dark');
    if (saved !== null) return; // respect manual toggles

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // URL State Sync on Popstate and Navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const queryTab = searchParams.get('tab') || searchParams.get('view');

      let view: 'scan' | 'create' | 'history' = 'scan';
      let showPrefs = false;

      if (
        pathname.endsWith('/create') || 
        hash === '#/create' || 
        hash === '#create' || 
        queryTab === 'create'
      ) {
        view = 'create';
        showPrefs = false;
      } else if (
        pathname.endsWith('/history') || 
        hash === '#/history' || 
        hash === '#history' || 
        queryTab === 'history'
      ) {
        view = 'history';
        showPrefs = false;
      } else if (
        pathname.endsWith('/preferences') || 
        pathname.endsWith('/settings') || 
        hash === '#/preferences' || 
        hash === '#preferences' || 
        queryTab === 'preferences' || 
        queryTab === 'settings'
      ) {
        showPrefs = true;
      } else {
        view = 'scan';
        showPrefs = false;
      }

      if (!showPrefs) {
        setActiveTab(view);
      }
      setIsSettingsOpen(showPrefs);
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const navigateTo = (tab: 'scan' | 'create' | 'history' | 'preferences') => {
    let targetPath = '/';
    if (tab === 'scan') {
      targetPath = '/scan';
      setActiveTab('scan');
      setIsSettingsOpen(false);
    } else if (tab === 'create') {
      targetPath = '/create';
      setActiveTab('create');
      setIsSettingsOpen(false);
    } else if (tab === 'history') {
      targetPath = '/history';
      setActiveTab('history');
      setIsSettingsOpen(false);
    } else if (tab === 'preferences') {
      targetPath = '/preferences';
      setIsSettingsOpen(true);
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
  };

  const closePreferences = () => {
    setIsSettingsOpen(false);
    const targetPath = '/' + activeTab;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: activeTab }, '', targetPath);
    }
  };

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('zebra_qr_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Creator Redirect parameters
  const [initialCreatorValue, setInitialCreatorValue] = useState<string>('');
  const [initialCreatorFormat, setInitialCreatorFormat] = useState<string>('qrcode');
  const [autoOpenScanner, setAutoOpenScanner] = useState<boolean>(false);

  // Load / Sync Theme CSS custom properties
  useEffect(() => {
    const palette = generateMaterialPalette(sourceColor, isDark);
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Dynamic injections
    Object.entries(palette).forEach(([key, value]) => {
      const kebabCaseKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--md-sys-color-${kebabCaseKey}`, value);
    });

    localStorage.setItem('zebra_qr_theme_color', sourceColor);
    localStorage.setItem('zebra_qr_is_dark', String(isDark));
  }, [sourceColor, isDark]);

  // Save history updates
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('zebra_qr_history', JSON.stringify(newHistory));
  };

  // Add Item to History list
  const handleSaveToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    // Exclude duplicates of the exact same content within 5 seconds to prevent spam
    const hasSpamDuplicate = history.some(h => 
      h.value === item.value && 
      h.format === item.format && 
      h.type === item.type &&
      Date.now() - h.timestamp < 5000
    );
    if (!hasSpamDuplicate) {
      saveHistory([newItem, ...history]);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updated = history.map(item => {
      if (item.id === id) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    saveHistory(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    saveHistory(updated);
  };

  const handleClearHistory = () => {
    saveHistory([]);
  };

  const handleImportBackup = (imported: HistoryItem[]) => {
    // Merge imported items with unique IDs
    const merged = [...imported, ...history];
    // Deduplicate by ID
    const unique = merged.filter((value, index, self) => 
      self.findIndex(t => t.id === value.id) === index
    );
    saveHistory(unique);
  };

  // Triggered when user wants to recreate or wraps a scanned barcode in a custom card
  const handleNavigateToCreator = (val: string, fmt: string) => {
    setInitialCreatorValue(val);
    setInitialCreatorFormat(fmt);
    navigateTo('create');
  };

  return (
    <div 
      className="min-h-screen flex flex-col md:flex-row transition-all duration-300"
      style={{
        backgroundColor: 'var(--md-sys-color-background, #FEF7FF)',
        color: 'var(--md-sys-color-on-background, #1D1B20)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      
      {/* 1. DESKTOP NAVIGATION RAIL (Left side, md: visible) */}
      <nav 
        id="desktop-navigation-rail"
        className="hidden md:flex flex-col items-center justify-between py-8 px-4 w-24 border-r flex-shrink-0 h-screen sticky top-0"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
          borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
        }}
      >
        {/* App Logo */}
        <div className="flex flex-col items-center gap-1">
          <div 
            className="w-12 h-12 rounded-none flex items-center justify-center border"
            style={{
              backgroundColor: 'var(--md-sys-color-primary-container, #EADDFF)',
              color: 'var(--md-sys-color-on-primary-container, #21005D)',
              borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)'
            }}
          >
            <QrCode size={24} className="stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1">QRagga</span>
        </div>

        {/* Action icons stack */}
        <div className="flex flex-col gap-6 items-center">
          <button
            onClick={() => {
              setInitialCreatorValue('');
              setInitialCreatorFormat('qrcode');
              navigateTo('create');
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-none transition-all duration-300 relative group active:scale-95"
          >
            <div className="w-14 h-8 rounded-none flex items-center justify-center relative overflow-hidden transition-colors duration-300">
              {activeTab === 'create' && (
                <motion.div
                  layoutId="desktopActivePill"
                  className="absolute inset-0 rounded-none"
                  style={{ backgroundColor: 'var(--md-sys-color-secondary-container, #E8DEF8)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <PlusCircle 
                size={20} 
                className="relative z-10 transition-colors duration-300" 
                style={{
                  color: activeTab === 'create' 
                    ? 'var(--md-sys-color-on-secondary-container, #1D192B)' 
                    : 'var(--md-sys-color-on-surface-variant, #49454F)',
                }}
              />
            </div>
            <span className="text-[11px] font-medium tracking-tight font-mono">Create</span>
          </button>

          <button
            onClick={() => navigateTo('scan')}
            className="flex flex-col items-center gap-1.5 p-2 rounded-none transition-all duration-300 relative group active:scale-95"
          >
            <div className="w-14 h-8 rounded-none flex items-center justify-center relative overflow-hidden transition-colors duration-300">
              {activeTab === 'scan' && (
                <motion.div
                  layoutId="desktopActivePill"
                  className="absolute inset-0 rounded-none"
                  style={{ backgroundColor: 'var(--md-sys-color-secondary-container, #E8DEF8)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <ScanLine 
                size={20} 
                className="relative z-10 transition-colors duration-300" 
                style={{
                  color: activeTab === 'scan' 
                    ? 'var(--md-sys-color-on-secondary-container, #1D192B)' 
                    : 'var(--md-sys-color-on-surface-variant, #49454F)',
                }}
              />
            </div>
            <span className="text-[11px] font-medium tracking-tight font-mono">Scanned</span>
          </button>

          <button
            onClick={() => navigateTo('history')}
            className="flex flex-col items-center gap-1.5 p-2 rounded-none transition-all duration-300 relative group active:scale-95"
          >
            <div className="w-14 h-8 rounded-none flex items-center justify-center relative overflow-hidden transition-colors duration-300">
              {activeTab === 'history' && (
                <motion.div
                  layoutId="desktopActivePill"
                  className="absolute inset-0 rounded-none"
                  style={{ backgroundColor: 'var(--md-sys-color-secondary-container, #E8DEF8)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <HistoryIcon 
                size={20} 
                className="relative z-10 transition-colors duration-300" 
                style={{
                  color: activeTab === 'history' 
                    ? 'var(--md-sys-color-on-secondary-container, #1D192B)' 
                    : 'var(--md-sys-color-on-surface-variant, #49454F)',
                }}
              />
            </div>
            <span className="text-[11px] font-medium tracking-tight font-mono">History</span>
          </button>
        </div>

        {/* Settings wheel at bottom */}
        <button
          onClick={() => navigateTo('preferences')}
          className="p-3 rounded-none hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-on-surface-variant)] transition active:scale-95"
          title="Theme & settings"
        >
          <SettingsIcon size={22} className="animate-[spin_10s_linear_infinite]" />
        </button>
      </nav>

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Responsive Top Header */}
        <header 
          id="app-top-header"
          className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-30 backdrop-blur-md"
          style={{
            backgroundColor: 'var(--md-sys-color-background, #FEF7FF)cc',
            borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Logo on mobile header */}
            <div 
              className="md:hidden w-10 h-10 rounded-none flex items-center justify-center border"
              style={{
                backgroundColor: 'var(--md-sys-color-primary-container, #EADDFF)',
                color: 'var(--md-sys-color-on-primary-container, #21005D)',
                borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)'
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">QRagga</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Install trigger */}
            <PWAInstallButton variant="inline" />

            {/* PWA Update trigger */}
            {needRefresh && (
              <button
                onClick={() => setIsUpdateModalOpen(true)}
                className="relative p-2 rounded-none border border-zinc-200 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-primary)] transition active:scale-95 group"
                title="Update available offline"
              >
                <motion.div
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-none bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                />
                <RotateCw size={18} className="text-emerald-600 dark:text-emerald-400" />
              </button>
            )}

            {/* Quick Scan overlay trigger */}
            <button
              onClick={() => {
                navigateTo('scan');
                setAutoOpenScanner(true);
              }}
              className="p-2 rounded-none border border-zinc-200 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-primary)] transition active:scale-95"
              title="Quick Scan"
            >
              <ScanLine size={18} />
            </button>

            <button
              onClick={() => navigateTo('preferences')}
              className="p-2 rounded-none border border-zinc-200 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-primary)] transition active:scale-95"
              title="Preferences"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>

        {/* Active view component render wrapped in page fade transitions */}
        <main className="flex-grow pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-full w-full"
            >
              {activeTab === 'scan' && (
                <ScannerTab
                  history={history}
                  autoOpenScanner={autoOpenScanner}
                  onScannerOpened={() => setAutoOpenScanner(false)}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteItem={handleDeleteItem}
                  onBarcodeDetected={(v, f) => {
                    // Cache values so if user hits "Personalize" in scanner card, it pre-fills the generator
                    setInitialCreatorValue(v);
                    setInitialCreatorFormat(f);
                  }}
                  onSaveToHistory={handleSaveToHistory}
                  onNavigateToCreator={handleNavigateToCreator}
                />
              )}

              {activeTab === 'create' && (
                <CreatorTab
                  initialValue={initialCreatorValue}
                  initialFormat={initialCreatorFormat}
                  onSaveToHistory={handleSaveToHistory}
                />
              )}

              {activeTab === 'history' && (
                <HistoryTab
                  history={history}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteItem={handleDeleteItem}
                  onClearHistory={handleClearHistory}
                  onSelectRecall={handleNavigateToCreator}
                  onImportBackup={handleImportBackup}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION (Visible on mobile screens) */}
      <nav 
         id="mobile-bottom-navigation"
         className="md:hidden fixed bottom-0 left-0 right-0 h-20 border-t z-40 flex justify-around items-center px-4"
         style={{
           backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
           borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
         }}
       >
         <button
           onClick={() => {
             setInitialCreatorValue('');
             setInitialCreatorFormat('qrcode');
             navigateTo('create');
           }}
           className="flex flex-col items-center gap-1 py-1 px-3 min-w-16 text-center active:scale-95"
         >
           <div className="px-5 py-1.5 rounded-none flex items-center justify-center relative overflow-hidden transition-all duration-300">
             {activeTab === 'create' && (
               <motion.div
                 layoutId="mobileActivePill"
                 className="absolute inset-0 rounded-none"
                 style={{ backgroundColor: 'var(--md-sys-color-secondary-container, #E8DEF8)' }}
                 transition={{ type: 'spring', stiffness: 380, damping: 30 }}
               />
             )}
             <PlusCircle 
               size={18} 
               className="relative z-10 transition-colors duration-300" 
               style={{
                 color: activeTab === 'create' 
                   ? 'var(--md-sys-color-on-secondary-container, #1D192B)' 
                   : 'var(--md-sys-color-on-surface-variant, #49454F)',
               }}
             />
           </div>
           <span className="text-[10px] font-semibold tracking-tight mt-0.5">Create</span>
         </button>

         <button
           onClick={() => navigateTo('scan')}
           className="flex flex-col items-center gap-1 py-1 px-3 min-w-16 text-center active:scale-95"
         >
           <div className="px-5 py-1.5 rounded-none flex items-center justify-center relative overflow-hidden transition-all duration-300">
             {activeTab === 'scan' && (
               <motion.div
                 layoutId="mobileActivePill"
                 className="absolute inset-0 rounded-none"
                 style={{ backgroundColor: 'var(--md-sys-color-secondary-container, #E8DEF8)' }}
                 transition={{ type: 'spring', stiffness: 380, damping: 30 }}
               />
             )}
             <ScanLine 
               size={18} 
               className="relative z-10 transition-colors duration-300" 
               style={{
                 color: activeTab === 'scan' 
                   ? 'var(--md-sys-color-on-secondary-container, #1D192B)' 
                   : 'var(--md-sys-color-on-surface-variant, #49454F)',
               }}
             />
           </div>
           <span className="text-[10px] font-semibold tracking-tight mt-0.5">Scanned</span>
         </button>

         <button
           onClick={() => navigateTo('history')}
           className="flex flex-col items-center gap-1 py-1 px-3 min-w-16 text-center active:scale-95"
         >
           <div className="px-5 py-1.5 rounded-none flex items-center justify-center relative overflow-hidden transition-all duration-300">
             {activeTab === 'history' && (
               <motion.div
                 layoutId="mobileActivePill"
                 className="absolute inset-0 rounded-none"
                 style={{ backgroundColor: 'var(--md-sys-color-secondary-container, #E8DEF8)' }}
                 transition={{ type: 'spring', stiffness: 380, damping: 30 }}
               />
             )}
             <HistoryIcon 
               size={18} 
               className="relative z-10 transition-colors duration-300" 
               style={{
                 color: activeTab === 'history' 
                   ? 'var(--md-sys-color-on-secondary-container, #1D192B)' 
                   : 'var(--md-sys-color-on-surface-variant, #49454F)',
               }}
             />
           </div>
           <span className="text-[10px] font-semibold tracking-tight mt-0.5">History</span>
         </button>
       </nav>

       {/* 4. SETTINGS & PREFERENCES FLY-IN DRAWER / BOTTOM SHEET OVERLAY */}
       <AnimatePresence>
         {isSettingsOpen && (
           <div 
             className="fixed inset-0 z-50 flex items-end md:items-stretch justify-center md:justify-end bg-black/60 backdrop-blur-sm"
             onClick={closePreferences}
           >
             {/* Drawer sheet / Bottom Sheet */}
             <motion.div
               initial={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
               animate={isMobile ? { y: 0, x: 0 } : { x: 0, y: 0 }}
               exit={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
               transition={{ type: 'spring', damping: 30, stiffness: 300 }}
               className={`w-full flex flex-col p-6 shadow-2xl relative select-none ${
                 isMobile 
                   ? 'h-[85vh] rounded-none bottom-0 left-0 right-0 fixed' 
                   : 'max-w-sm h-full border-l'
               }`}
               style={{
                 backgroundColor: 'var(--md-sys-color-surface, #FEF7FF)',
                 color: 'var(--md-sys-color-on-surface, #1D1B20)',
                 borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
               }}
               onClick={(e) => e.stopPropagation()}
             >
               {/* Native Android Drag Handle for Mobile Sheet */}
               {isMobile && (
                 <div className="w-full flex justify-center pb-3">
                   <div className="w-12 h-1.5 rounded-none bg-zinc-300 dark:bg-zinc-700 opacity-60" />
                 </div>
               )}

              {/* Header */}
              <div 
                className="flex justify-between items-center pb-4 border-b"
                style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
              >
                <div className="flex items-center gap-2">
                  <SettingsIcon size={18} className="text-[var(--md-sys-color-primary)]" />
                  <h3 className="text-lg font-bold tracking-tight">Preferences</h3>
                </div>
                <button
                  onClick={closePreferences}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer content */}
              <div className="flex-grow overflow-y-auto py-6 space-y-6">
                
                {/* Theme Selector Section */}
                <MaterialYouThemeSelector
                  sourceColor={sourceColor}
                  isDark={isDark}
                  onColorChange={setSourceColor}
                  onDarkToggle={() => setIsDark(!isDark)}
                />

                {/* Local Cache Info / Compliance */}
                <div className="p-5 rounded-none border flex flex-col gap-3 text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
                    borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                    color: 'var(--md-sys-color-on-surface-variant, #49454F)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={16} className="text-[var(--md-sys-color-primary)]" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      Offline Privacy Promise
                    </span>
                  </div>
                  <p>
                    QRagga executes entirely on your device. Camera streams, decoded texts, and custom barcode cards are processed inside your browser and stored in your offline IndexedDB/LocalStorage.
                  </p>
                  <p className="font-bold flex items-center gap-1 text-[var(--md-sys-color-primary)]">
                    <Smartphone size={13} /> Fully Offline PWA compliant
                  </p>
                </div>

                {/* About developers */}
                <div className="flex flex-col gap-2 px-1 text-center text-xs opacity-60">
                  <p className="font-bold">QRagga — Barcode Utility Pro</p>
                  <p>© 2026 Carlos Cardenas. All rights reserved.</p>
                  <p className="flex items-center justify-center gap-1">
                    <span>Baseline M3 Guide Specs</span>
                    <ArrowUpRight size={10} />
                  </p>
                </div>

              </div>

              {/* Close footer button */}
              <button
                onClick={closePreferences}
                className="w-full py-3.5 rounded-none text-sm font-semibold tracking-wide hover:opacity-95 shadow transition mt-auto"
                style={{
                  backgroundColor: 'var(--md-sys-color-primary, #6750A4)',
                  color: 'var(--md-sys-color-on-primary, #FFFFFF)',
                }}
              >
                Close Preferences
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Connection & Toast Status overlays */}
      <OfflineIndicator />

      {/* PWA Update Confirmation Dialog */}
      <AnimatePresence>
        {isUpdateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpdateModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-sm rounded-none p-6 shadow-2xl border overflow-hidden z-10"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container-high, #F3EDF7)',
                color: 'var(--md-sys-color-on-surface, #1D1B20)',
                borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
              }}
            >
              <div className="flex gap-4 items-start">
                <div 
                  className="p-3 rounded-none border border-zinc-200 dark:border-zinc-800 flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--md-sys-color-primary-container, #EADDFF)',
                    color: 'var(--md-sys-color-on-primary-container, #21005D)',
                  }}
                >
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Update Ready!</h3>
                  <p className="text-xs opacity-80 mt-1 leading-relaxed">
                    A fresh version of QRagga has been downloaded silently in the background and is ready to load offline.
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
                    ✓ All files downloaded successfully
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <button
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-none text-xs font-semibold tracking-wide hover:bg-black/5 transition border border-zinc-200 dark:border-zinc-800"
                  style={{ color: 'var(--md-sys-color-primary, #6750A4)' }}
                >
                  Keep Using Offline
                </button>
                <button
                  onClick={() => {
                    updateServiceWorker(true);
                  }}
                  className="px-4 py-2 rounded-none text-xs font-semibold tracking-wide shadow-sm hover:opacity-90 transition flex items-center gap-1.5"
                  style={{
                    backgroundColor: 'var(--md-sys-color-primary, #6750A4)',
                    color: 'var(--md-sys-color-on-primary, #FFFFFF)',
                  }}
                >
                  <RotateCw size={12} />
                  Relaunch & Apply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
