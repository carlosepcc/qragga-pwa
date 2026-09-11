/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [prevStatus, setPrevStatus] = useState(true);

  useEffect(() => {
    if (isOnline !== prevStatus) {
      setShowNotification(true);
      setPrevStatus(isOnline);
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, prevStatus]);

  return (
    <>
      {/* Floating small connection status indicator */}
      {!isOnline && (
        <div 
          id="offline-indicator-badge"
          className="fixed bottom-24 right-6 md:bottom-6 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg border backdrop-blur"
          style={{
            backgroundColor: 'var(--md-sys-color-error-container, #FFDAD6)',
            color: 'var(--md-sys-color-on-error-container, #410002)',
            borderColor: 'var(--md-sys-color-error, #BA1A1A)',
          }}
        >
          <WifiOff size={14} className="animate-pulse" />
          <span>Offline Mode</span>
        </div>
      )}

      {/* Dynamic Slide-in Alert on connection change */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            id="offline-notification-toast"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 md:bottom-6 z-50 flex items-center gap-3 rounded-2xl p-4 shadow-xl border w-72 max-w-[calc(100vw-3rem)]"
            style={{
              backgroundColor: isOnline 
                ? 'var(--md-sys-color-primary-container, #EADDFF)' 
                : 'var(--md-sys-color-error-container, #FFDAD6)',
              color: isOnline 
                ? 'var(--md-sys-color-on-primary-container, #21005D)' 
                : 'var(--md-sys-color-on-error-container, #410002)',
              borderColor: isOnline 
                ? 'var(--md-sys-color-primary, #6750A4)' 
                : 'var(--md-sys-color-error, #BA1A1A)',
            }}
          >
            <div className="flex-shrink-0">
              {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
            </div>
            <div>
              <p className="font-bold text-sm">
                {isOnline ? 'Back Online!' : 'Connection Lost'}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {isOnline 
                  ? 'Your app has reconnected to the network.' 
                  : 'QRagga is fully offline functional! Keep scanning.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
