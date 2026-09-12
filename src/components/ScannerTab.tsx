/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  CameraOff, 
  Clipboard, 
  ExternalLink, 
  Image as ImageIcon, 
  Sparkles, 
  Upload, 
  Volume2, 
  VolumeX, 
  X, 
  Zap, 
  ZapOff,
  ChevronRight,
  Trash2,
  Star,
  Calendar,
  Bookmark,
  Check,
  History,
  Clock
} from 'lucide-react';
import { BARCODE_DEFINITIONS } from '../data/barcodes';
import { HistoryItem } from '../types';

// Pure synthesized beep using AudioContext (Offline-friendly!)
function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = 1200; // High-pitched success beep
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (err) {
    console.error('Audio beep failed:', err);
  }
}

interface ScannerTabProps {
  history: HistoryItem[];
  autoOpenScanner?: boolean;
  onScannerOpened?: () => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onBarcodeDetected: (value: string, format: string) => void;
  onSaveToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  onNavigateToCreator: (value: string, format: string) => void;
}

export const ScannerTab: React.FC<ScannerTabProps> = ({
  history = [],
  autoOpenScanner = false,
  onScannerOpened,
  onToggleFavorite,
  onDeleteItem,
  onBarcodeDetected,
  onSaveToHistory,
  onNavigateToCreator,
}) => {
  const [isFullscreenScannerOpen, setIsFullscreenScannerOpen] = useState<boolean>(false);

  // Sync state with header trigger
  useEffect(() => {
    if (autoOpenScanner) {
      setIsFullscreenScannerOpen(true);
      if (onScannerOpened) {
        onScannerOpened();
      }
    }
  }, [autoOpenScanner, onScannerOpened]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasFlash, setHasFlash] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Floating Card Result inside Scanner View
  const [activeScanResult, setActiveScanResult] = useState<{ value: string; format: string } | null>(null);
  const [hasSavedActiveResult, setHasSavedActiveResult] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);

  // Initialize ZXing Reader
  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    codeReaderRef.current = reader;

    // Get camera devices
    reader.listVideoInputDevices()
      .then((devices) => {
        setVideoDevices(devices);
        if (devices.length > 0) {
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedDeviceId(backCam ? backCam.deviceId : devices[0].deviceId);
        }
      })
      .catch((err) => {
        console.error('Error listing cameras on mount:', err);
      });

    return () => {
      stopCamera();
    };
  }, []);

  // Safe camera lifecycle based on fullscreen trigger
  useEffect(() => {
    if (isFullscreenScannerOpen) {
      startScanning(selectedDeviceId);
    } else {
      stopCamera();
      setActiveScanResult(null);
      setHasSavedActiveResult(false);
    }
    return () => {
      stopCamera();
    };
  }, [isFullscreenScannerOpen, selectedDeviceId]);

  // Stop camera stream safely
  const stopCamera = () => {
    scanningRef.current = false;
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
    setHasFlash(false);
  };

  // Start scanning
  const startScanning = async (deviceId: string) => {
    if (!codeReaderRef.current) return;
    if (!videoRef.current) {
      // Retry in the next animation frame if videoRef isn't bound yet and scanner is still open
      if (isFullscreenScannerOpen) {
        requestAnimationFrame(() => startScanning(deviceId));
      }
      return;
    }
    
    stopCamera();
    setErrorMsg('');

    // Verify browser support for media devices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Camera access is not supported by your browser or in this window. Try opening the app in a new tab.');
      return;
    }

    try {
      setIsScanning(true);
      scanningRef.current = true;

      // Request stream explicitly
      let tempStream: MediaStream | null = null;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ 
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' } 
        });
        tempStream.getTracks().forEach(track => track.stop());
      } catch (permErr: any) {
        console.warn('Explicit getUserMedia permission check failed:', permErr);
        throw permErr;
      }
      
      // Decode from device
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId || undefined,
        videoRef.current,
        (result: Result | null, err: any) => {
          if (result && scanningRef.current) {
            handleScanSuccess(result);
          }
        }
      );

      // Try to acquire the stream to detect torch/flash capability
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities?.() as any;
          if (capabilities && 'torch' in capabilities) {
            setHasFlash(true);
          }
        }
      }

    } catch (err: any) {
      console.error('Failed to start camera scan:', err);
      setIsScanning(false);
      scanningRef.current = false;

      let errMsg = 'Could not open camera stream. Make sure permissions are granted and the camera is not in use.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission denied. To enable: tap site permissions in your browser address bar and choose "Allow".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is already in use by another application or tab.';
      }
      setErrorMsg(errMsg);
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch } as any]
        });
        setTorchOn(nextTorch);
      } catch (err) {
        console.error('Failed to toggle torch:', err);
      }
    }
  };

  // Success Handler
  const handleScanSuccess = (result: Result) => {
    const text = result.getText();
    const formatCode = result.getBarcodeFormat().toString().toLowerCase();
    
    // Throttle to avoid repeated beep storms
    const now = Date.now();
    if (activeScanResult?.value === text && now - lastScanTimeRef.current < 2000) {
      return;
    }
    lastScanTimeRef.current = now;

    // Map ZXing format strings to QRagga BarcodeTypes
    let mappedFormat = 'qrcode';
    if (formatCode.includes('qr')) mappedFormat = 'qrcode';
    else if (formatCode.includes('aztec')) mappedFormat = 'azteccode';
    else if (formatCode.includes('data_matrix') || formatCode.includes('datamatrix')) mappedFormat = 'datamatrix';
    else if (formatCode.includes('pdf_417') || formatCode.includes('pdf417')) mappedFormat = 'pdf417';
    else if (formatCode.includes('code_128') || formatCode.includes('code128')) mappedFormat = 'code128';
    else if (formatCode.includes('code_39') || formatCode.includes('code39')) mappedFormat = 'code39';
    else if (formatCode.includes('ean_13') || formatCode.includes('ean13')) mappedFormat = 'ean13';
    else if (formatCode.includes('ean_8') || formatCode.includes('ean8')) mappedFormat = 'ean8';
    else if (formatCode.includes('upc_a') || formatCode.includes('upca')) mappedFormat = 'upca';
    else if (formatCode.includes('codabar')) mappedFormat = 'codabar';
    else if (formatCode.includes('itf')) mappedFormat = 'itf';

    // Play feedback
    if (soundEnabled) playBeep();
    if (navigator.vibrate) navigator.vibrate(100);

    // Set active result. Note we DO NOT save to history yet!
    setActiveScanResult({ value: text, format: mappedFormat });
    setHasSavedActiveResult(false);
  };

  // Explicit Save Trigger (Interaction)
  const handleSaveActiveResult = () => {
    if (!activeScanResult || hasSavedActiveResult) return;
    
    onSaveToHistory({
      type: 'scanned',
      format: activeScanResult.format as any,
      value: activeScanResult.value,
      isFavorite: false,
      label: `Scanned ${getFormatDisplayName(activeScanResult.format)}`
    });

    onBarcodeDetected(activeScanResult.value, activeScanResult.format);
    setHasSavedActiveResult(true);
  };

  const handleCopyActiveResult = () => {
    if (!activeScanResult) return;
    navigator.clipboard.writeText(activeScanResult.value);
    handleSaveActiveResult();
  };

  const handleOpenLinkActiveResult = () => {
    if (!activeScanResult) return;
    window.open(activeScanResult.value, '_blank');
    handleSaveActiveResult();
  };

  const handleCustomizeActiveResult = () => {
    if (!activeScanResult) return;
    handleSaveActiveResult();
    onNavigateToCreator(activeScanResult.value, activeScanResult.format);
    setIsFullscreenScannerOpen(false); // Go directly to creator
  };

  const handleDismissActiveResult = () => {
    setActiveScanResult(null);
    setHasSavedActiveResult(false);
  };

  // Decode from file upload
  const handleFileUpload = async (file: File) => {
    if (!codeReaderRef.current) return;
    setErrorMsg('');
    setActiveScanResult(null);
    setHasSavedActiveResult(false);

    try {
      const imageUrl = URL.createObjectURL(file);
      const result = await codeReaderRef.current.decodeFromImageUrl(imageUrl);
      
      URL.revokeObjectURL(imageUrl);
      
      if (result) {
        handleScanSuccess(result);
      } else {
        setErrorMsg('No barcode or QR code detected in the image.');
      }
    } catch (err) {
      console.error('File scan error:', err);
      setErrorMsg('Failed to read code from this image. Make sure it is clear and well-lit.');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const getFormatDisplayName = (fmt: string) => {
    const def = BARCODE_DEFINITIONS.find(d => d.id === fmt);
    return def ? def.name : fmt.toUpperCase();
  };

  const isUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Filter history to ONLY show scanned codes
  const scannedHistory = (history || []).filter(item => item.type === 'scanned');
  const sortedScanned = [...scannedHistory].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <>
      {/* ==================== SCREEN 1: "SCANNED" HISTORY & LAUNCHER ==================== */}
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 select-none">
        
        {/* Launcher Item */}
        <button
          id="btn-launch-fullscreen-scanner"
          onClick={() => setIsFullscreenScannerOpen(true)}
          className="w-full flex items-center justify-between p-6 rounded-[24px] border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[var(--md-sys-color-primary)] dark:hover:border-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)]/10 dark:hover:bg-[var(--md-sys-color-primary-container)]/5 transition-all duration-300 active:scale-[0.98] mb-8 text-left"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-high, #ECE6F0)',
            color: 'var(--md-sys-color-on-surface, #1D1B20)',
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner"
              style={{
                backgroundColor: 'var(--md-sys-color-primary-container, #EADDFF)',
                color: 'var(--md-sys-color-on-primary-container, #21005D)',
              }}
            >
              <Camera size={26} className="stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Scan Another Code</h3>
              <p className="text-xs opacity-70 mt-0.5">Launches the fullscreen camera reader</p>
            </div>
          </div>
          <ChevronRight size={20} className="opacity-60" />
        </button>

        {/* History Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--md-sys-color-primary)]" />
            <h2 className="font-bold text-base tracking-tight text-[var(--md-sys-color-on-surface)]">
              Scanned Codes History
            </h2>
          </div>
          <span 
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--md-sys-color-secondary-container, #E8DEF8)',
              color: 'var(--md-sys-color-on-secondary-container, #1D192B)',
            }}
          >
            {sortedScanned.length} items
          </span>
        </div>

        {/* History List */}
        <div className="space-y-3.5">
          {sortedScanned.length > 0 ? (
            sortedScanned.map((item) => (
              <div
                key={item.id}
                id={`scanned-item-${item.id}`}
                className="p-4 rounded-2xl border flex items-center justify-between gap-4 transition hover:shadow-sm"
                style={{
                  backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
                  borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-1.5 h-11 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'var(--md-sys-color-tertiary, #7D5260)' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--md-sys-color-primary)]">
                        {getFormatDisplayName(item.format)}
                      </span>
                      {item.label && (
                        <span className="text-[10px] opacity-75 truncate max-w-[120px]">
                          • {item.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono truncate max-w-xs md:max-w-md text-[var(--md-sys-color-on-surface)] mt-0.5">
                      {item.value}
                    </p>
                    <span className="text-[9px] opacity-60 flex items-center gap-1 mt-0.5">
                      <Calendar size={8} />
                      {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Scanned Row Actions (Preferred no text iconbuttons) */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isUrl(item.value) && (
                    <a
                      href={item.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-primary)] transition"
                      title="Open link"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.value);
                    }}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-outline)] transition"
                    title="Copy value"
                  >
                    <Clipboard size={16} />
                  </button>

                  <button
                    onClick={() => onNavigateToCreator(item.value, item.format)}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-outline)] transition"
                    title="Recreate / Customize"
                  >
                    <Sparkles size={16} />
                  </button>

                  <button
                    onClick={() => onToggleFavorite(item.id)}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
                    style={{
                      color: item.isFavorite ? '#E0A800' : 'var(--md-sys-color-outline, #79747E)'
                    }}
                    title={item.isFavorite ? 'Unfavorite' : 'Favorite'}
                  >
                    <Star size={16} fill={item.isFavorite ? '#E0A800' : 'none'} />
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 transition"
                    title="Delete item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800">
              <History size={36} className="text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm opacity-60 text-[var(--md-sys-color-on-background)]">
                No scanned barcodes found in your offline history.
              </p>
              <button
                onClick={() => setIsFullscreenScannerOpen(true)}
                className="mt-3 text-xs font-bold text-[var(--md-sys-color-primary)] hover:underline"
              >
                Scan your first code
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== SCREEN 2: FULLSCREEN LIVE VIEW CAMERA OVERLAY ==================== */}
      <AnimatePresence>
        {isFullscreenScannerOpen && (
          <motion.div
            id="fullscreen-scanner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {/* Live Camera Feed Viewport */}
            <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-zinc-950">
              <div className="w-full h-full relative">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover animate-fade-in ${isScanning ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}
                  playsInline
                  muted
                />

                {isScanning && (
                  /* Central HUD Targeting Frame - white corners, no square borders */
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-64 h-64 md:w-80 md:h-80 relative flex items-center justify-center bg-transparent">
                      {/* White bracket corners */}
                      <div className="absolute top-0 left-0 w-9 h-9 border-t-4 border-l-4 border-white rounded-tl-[20px]"></div>
                      <div className="absolute top-0 right-0 w-9 h-9 border-t-4 border-r-4 border-white rounded-tr-[20px]"></div>
                      <div className="absolute bottom-0 left-0 w-9 h-9 border-b-4 border-l-4 border-white rounded-bl-[20px]"></div>
                      <div className="absolute bottom-0 right-0 w-9 h-9 border-b-4 border-r-4 border-white rounded-br-[20px]"></div>
                    </div>
                    
                    <span className="mt-8 px-4.5 py-2 rounded-full bg-white/10 border border-black/30 text-white text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                      Point camera at QR or Barcode
                    </span>
                  </div>
                )}
              </div>

              {!isScanning && (
                /* Connecting camera spinner */
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 bg-zinc-950 z-10">
                  <div className="w-12 h-12 rounded-full border-4 border-zinc-700 border-t-white animate-spin mb-4" />
                  <p className="text-xs font-medium tracking-wide">Initializing secure viewfinder...</p>
                </div>
              )}
            </div>

            {/* Floating Top HUD Bar - whiteAlpha style with blackAlpha stroke */}
            <div className="absolute top-5 left-5 right-5 z-20 flex justify-between items-center pointer-events-none">
              
              {/* Left Side: Camera Selection Dropdown */}
              <div className="pointer-events-auto">
                {videoDevices.length > 1 ? (
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-lg px-3.5 py-2 rounded-full border border-black/30 text-white">
                    <Camera size={14} className="opacity-90" />
                    <select
                      value={selectedDeviceId || ''}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="bg-transparent text-white text-xs font-bold outline-none border-none pr-1.5 cursor-pointer"
                    >
                      {videoDevices.map((device, idx) => (
                        <option key={device.deviceId} value={device.deviceId} className="bg-zinc-950 text-white text-xs">
                          {device.label ? device.label.replace(/\([^)]+\)/, '') : `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="bg-white/15 backdrop-blur-lg px-3.5 py-2 rounded-full border border-black/30 text-[10px] font-extrabold tracking-wider text-white/90 uppercase">
                    Live Lens
                  </span>
                )}
              </div>

              {/* Right Side HUD Controls: Pure Icon Buttons with NO text */}
              <div className="pointer-events-auto flex gap-2.5 items-center">
                
                {/* Sound feedback switch */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-3.5 rounded-full bg-white/15 border border-black/30 text-white hover:bg-white/25 transition active:scale-90 cursor-pointer backdrop-blur-lg"
                  title={soundEnabled ? 'Mute beep feedback' : 'Unmute beep feedback'}
                >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>

                {/* Flashlight switch */}
                {hasFlash && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className="p-3.5 rounded-full bg-white/15 border border-black/30 text-white hover:bg-white/25 transition active:scale-90 cursor-pointer backdrop-blur-lg"
                    title="Toggle device flash"
                  >
                    {torchOn ? <ZapOff size={18} /> : <Zap size={18} />}
                  </button>
                )}

                {/* Import Image from File */}
                <label 
                  className="p-3.5 rounded-full bg-white/15 border border-black/30 text-white hover:bg-white/25 transition active:scale-90 cursor-pointer backdrop-blur-lg flex items-center justify-center"
                  title="Scan from image file"
                >
                  <Upload size={18} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                  />
                </label>

                {/* Close Fullscreen Overlay */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenScannerOpen(false)}
                  className="p-3.5 rounded-full bg-white/15 border border-black/30 text-white hover:bg-white/25 transition active:scale-90 cursor-pointer backdrop-blur-lg"
                  title="Close scanner"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drag Over Shield */}
            {dragActive && (
              <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
                <div className="p-5 rounded-full bg-white text-zinc-950 mb-4 shadow-2xl animate-bounce">
                  <Upload size={36} />
                </div>
                <h2 className="text-xl font-extrabold tracking-tight text-white mb-1.5">
                  Release to Parse Image
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Drop your code picture anywhere to decode instantly offline.
                </p>
              </div>
            )}

            {/* Floating Card Scan Result: Wide but Low-Height Overlay */}
            {/* Supports Drag-to-Dismiss Swiping downwards! */}
            <AnimatePresence>
              {activeScanResult && (
                <motion.div
                  id="wide-scan-result-card"
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 200 }}
                  dragElastic={0.4}
                  onDragEnd={(event, info) => {
                    // Swipe down threshold
                    if (info.offset.y > 80) {
                      handleDismissActiveResult();
                    }
                  }}
                  className="fixed bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:w-[500px] md:-translate-x-1/2 z-40 rounded-3xl p-4.5 border shadow-[0_10px_40px_rgba(0,0,0,0.7)] flex flex-col backdrop-blur-2xl cursor-grab active:cursor-grabbing select-none"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.92)', // Gorgeous whiteAlpha overlay
                    borderColor: 'rgba(0, 0, 0, 0.25)', // blackAlpha border stroke
                    color: '#111827' // Clean dark-zinc text for WCAG contrast AA check
                  }}
                >
                  {/* Swipe Grab Indicator */}
                  <div className="w-10 h-1 bg-zinc-400/55 rounded-full mx-auto mb-2.5 flex-shrink-0" />

                  <div className="flex items-center justify-between gap-4">
                    {/* Left Column: Icon & Scan Info */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase bg-zinc-950 text-white">
                          {getFormatDisplayName(activeScanResult.format)}
                        </span>
                        {hasSavedActiveResult && (
                          <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <Check size={9} strokeWidth={3} /> SAVED
                          </span>
                        )}
                      </div>
                      
                      {/* Scanned Decoded Value (wide and truncated to keep height very low) */}
                      <p className="text-xs font-mono break-all line-clamp-2 leading-relaxed text-zinc-800 pr-2">
                        {activeScanResult.value}
                      </p>
                    </div>

                    {/* Right Column: Interaction Action Buttons (No text, pure icon buttons) */}
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Copy Action */}
                      <button
                        onClick={handleCopyActiveResult}
                        className={`p-2.5 rounded-full border transition active:scale-95 ${
                          hasSavedActiveResult 
                            ? 'bg-zinc-100 text-zinc-500 border-zinc-200' 
                            : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300 shadow-sm'
                        }`}
                        title="Copy text & save"
                      >
                        <Clipboard size={16} />
                      </button>

                      {/* Open Link Action (if URL) */}
                      {isUrl(activeScanResult.value) && (
                        <button
                          onClick={handleOpenLinkActiveResult}
                          className="p-2.5 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white transition active:scale-95 shadow-sm border border-zinc-800"
                          title="Open link in new tab"
                        >
                          <ExternalLink size={16} />
                        </button>
                      )}

                      {/* Recreate & Design Action */}
                      <button
                        onClick={handleCustomizeActiveResult}
                        className="p-2.5 rounded-full bg-[var(--md-sys-color-primary,#6750A4)] text-white hover:opacity-90 transition active:scale-95 shadow-sm border border-black/10"
                        title="Personalize / Redesign this code"
                      >
                        <Sparkles size={16} />
                      </button>

                      {/* Save Explicit Action */}
                      {!hasSavedActiveResult && (
                        <button
                          onClick={handleSaveActiveResult}
                          className="p-2.5 rounded-full bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 shadow-sm transition active:scale-95"
                          title="Save to history list"
                        >
                          <Bookmark size={16} />
                        </button>
                      )}

                      {/* Dismiss Result Button */}
                      <button
                        onClick={handleDismissActiveResult}
                        className="p-2.5 rounded-full hover:bg-zinc-200/80 text-zinc-600 transition active:scale-95 border border-transparent"
                        title="Dismiss"
                      >
                        <X size={16} />
                      </button>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Center Sheet overlay (within fullscreen reader) */}
            {errorMsg && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-zinc-950/85 backdrop-blur-lg z-40 text-center">
                <div className="max-w-md w-full rounded-[32px] p-6 bg-white border border-zinc-200 shadow-2xl flex flex-col items-center animate-in scale-in duration-300 text-zinc-950">
                  <div className="p-4 rounded-3xl mb-4 text-red-600 bg-red-50">
                    <CameraOff size={36} />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight mb-2">
                    Camera Access Needed
                  </h3>
                  <p className="text-xs opacity-75 mb-6 leading-relaxed">
                    {errorMsg}
                  </p>
                  
                  <div className="flex gap-3 items-center w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        startScanning(selectedDeviceId);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-bold tracking-wide shadow-md bg-[var(--md-sys-color-primary,#6750A4)] hover:opacity-95 text-white active:scale-95 transition"
                    >
                      <Camera size={14} />
                      <span>Retry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFullscreenScannerOpen(false)}
                      className="flex-1 px-6 py-3 rounded-full text-xs font-bold tracking-wide border border-zinc-300 hover:bg-zinc-50 text-zinc-800 active:scale-95 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
