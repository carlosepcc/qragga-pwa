/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { Camera, Clipboard, ExternalLink, Image as ImageIcon, Sparkles, Volume2, VolumeX, Zap, ZapOff } from 'lucide-react';
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
  onBarcodeDetected: (value: string, format: string) => void;
  onSaveToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  onNavigateToCreator: (value: string, format: string) => void;
}

export const ScannerTab: React.FC<ScannerTabProps> = ({
  onBarcodeDetected,
  onSaveToHistory,
  onNavigateToCreator,
}) => {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasFlash, setHasFlash] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scanResult, setScanResult] = useState<{ value: string; format: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);

  // Initialize ZXing Reader
  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    codeReaderRef.current = reader;

    // Get camera devices
    reader.listVideoInputDevices()
      .then((devices) => {
        setVideoDevices(devices);
        if (devices.length > 0) {
          // Default to back camera if available, otherwise first camera
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedDeviceId(backCam ? backCam.deviceId : devices[0].deviceId);
        }
      })
      .catch((err) => {
        console.error('Error listing cameras on mount:', err);
        // Do not block the user with a fatal error message immediately, as permissions may be prompted when launching.
      });

    return () => {
      stopCamera();
    };
  }, []);

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
    if (!codeReaderRef.current || !videoRef.current) return;
    
    stopCamera();
    setErrorMsg('');
    setScanResult(null);

    // Verify browser support for media devices (required for Chrome/Android secure contexts)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Camera access is not supported by your browser or in this window. If you are inside an app container, please tap the top-right menu to open this app directly in a new browser tab.');
      return;
    }

    try {
      setIsScanning(true);
      scanningRef.current = true;

      // Force prompt the browser for camera permissions explicitly before ZXing initialization.
      // This ensures Chrome for Android displays the native prompt and registers permission under site settings.
      let tempStream: MediaStream | null = null;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ 
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' } 
        });
        // Stop the temp stream immediately; we only wanted to ensure permissions are granted and active
        tempStream.getTracks().forEach(track => track.stop());
      } catch (permErr: any) {
        console.warn('Explicit getUserMedia permission check failed or denied:', permErr);
        // Throw to the catch block so the proper permission denied instructions are shown to the user
        throw permErr;
      }
      
      // We start decoding from video device. Use deviceId or undefined (default constraint)
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId || undefined,
        videoRef.current,
        (result: Result | null, err: any) => {
          if (result && scanningRef.current) {
            handleScanSuccess(result);
          }
        }
      );

      // Refresh devices list after stream starts successfully (as permissions are now guaranteed)
      try {
        const devices = await codeReaderRef.current.listVideoInputDevices();
        setVideoDevices(devices);
        if (devices.length > 0) {
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          if (!selectedDeviceId) {
            setSelectedDeviceId(backCam ? backCam.deviceId : devices[0].deviceId);
          }
        }
      } catch (deviceErr) {
        console.error('Error listing cameras after permission:', deviceErr);
      }

      // Try to acquire the stream to detect torch/flash capability
      // ZXing manages the video element stream, we can inspect its tracks
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

      let errMsg = 'Could not open camera stream. Make sure permissions are granted and the camera is not in use by another app.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission denied. To enable on Chrome for Android: tap the connection settings/sliders icon to the left of the URL bar, select "Site settings", find "Camera", and set it to "Allow".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is already in use by another application or tab. Please close other apps and try again.';
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
    if (soundEnabled) {
      playBeep();
    }
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    setScanResult({ value: text, format: mappedFormat });
    onBarcodeDetected(text, mappedFormat);

    // Auto-save Scanned item to Offline History
    onSaveToHistory({
      type: 'scanned',
      format: mappedFormat as any,
      value: text,
      isFavorite: false,
      label: `Scanned ${getFormatDisplayName(mappedFormat)}`
    });

    // Pause camera stream after scan to conserve power
    stopCamera();
  };

  // Decode from file upload
  const handleFileUpload = async (file: File) => {
    if (!codeReaderRef.current) return;
    setErrorMsg('');
    setScanResult(null);

    try {
      const imageUrl = URL.createObjectURL(file);
      const result = await codeReaderRef.current.decodeFromImageUrl(imageUrl);
      
      // Cleanup object URL
      URL.revokeObjectURL(imageUrl);
      
      if (result) {
        handleScanSuccess(result);
      } else {
        setErrorMsg('No barcode or QR code detected in the image.');
      }
    } catch (err) {
      console.error('File scan error:', err);
      setErrorMsg('Failed to read code from this image. Ensure the barcode is clear, well-lit, and fits in frame.');
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

  const copyToClipboard = () => {
    if (scanResult) {
      navigator.clipboard.writeText(scanResult.value);
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

  return (
    <div id="scanner-container" className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4 md:p-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-background)]">
            Scan Codes
          </h2>
          <p className="text-sm opacity-80 text-[var(--md-sys-color-on-background)]">
            Scan any 1D barcode or niche 2D code offline using your camera or an image file.
          </p>
        </div>
        
        {/* Connection/Vibe controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[var(--md-sys-color-primary)] transition"
            title={soundEnabled ? 'Mute beep' : 'Enable beep'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Stream / Upload */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Main scanning box */}
          <div 
            id="scanner-viewport"
            className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-inner border"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-highest, #E7E0EC)',
              borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
            }}
          >
            {/* Camera Viewport */}
            <div className={`w-full h-full relative ${isScanning ? 'block' : 'hidden'}`}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-3xl"
                playsInline
                muted
              />
              
              {/* Laser animation overlays */}
              <div className="absolute inset-0 border-[32px] border-black/40 pointer-events-none flex items-center justify-center">
                <div className="w-full h-full border-2 border-dashed border-[var(--md-sys-color-primary)] relative rounded-xl opacity-90">
                  {/* Pulsing Target corners */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[var(--md-sys-color-primary)] -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[var(--md-sys-color-primary)] -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[var(--md-sys-color-primary)] -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[var(--md-sys-color-primary)] -mb-1 -mr-1"></div>
                  
                  {/* Laser scanning line */}
                  <div className="absolute w-full h-[3px] bg-red-500 top-0 left-0 animate-[scan_2s_infinite_linear] shadow-[0_0_10px_#ef4444]"></div>
                </div>
              </div>

              {/* Over-camera Floating indicators */}
              <div className="absolute top-4 right-4 flex gap-2">
                {hasFlash && (
                  <button
                    onClick={toggleTorch}
                    className="p-3 rounded-full shadow bg-black/60 text-white hover:bg-black/80 transition active:scale-90"
                    title="Toggle flashlight"
                  >
                    {torchOn ? <ZapOff size={18} /> : <Zap size={18} />}
                  </button>
                )}
                
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-full text-xs font-semibold shadow bg-red-600 text-white hover:bg-red-700 transition active:scale-90"
                >
                  Stop Camera
                </button>
              </div>
            </div>

            {/* Launch Camera / Drag & Drop Placeholder Viewport */}
            <div 
              className={`w-full h-full flex-col items-center justify-center p-6 text-center transition-all ${isScanning ? 'hidden' : 'flex'} ${dragActive ? 'scale-[0.98]' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              style={{
                border: dragActive ? '3px dashed var(--md-sys-color-primary)' : '1px solid transparent',
                backgroundColor: dragActive ? 'var(--md-sys-color-primary-container, #EADDFF)' : 'transparent',
              }}
            >
              <div 
                className="p-4 rounded-3xl mb-4"
                style={{
                  backgroundColor: 'var(--md-sys-color-primary-container, #EADDFF)',
                  color: 'var(--md-sys-color-on-primary-container, #21005D)',
                }}
              >
                <Camera size={40} className="opacity-90" />
              </div>
              
              <h3 className="text-lg font-bold tracking-tight mb-1 text-[var(--md-sys-color-on-surface)]">
                Start Camera Scan
              </h3>
              <p className="text-xs max-w-xs opacity-75 mb-6 text-[var(--md-sys-color-on-surface)] leading-relaxed">
                Grant camera permissions to scan instantly, or drag and drop a barcode picture here.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <button
                  onClick={() => startScanning(selectedDeviceId)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold tracking-wide shadow-md hover:shadow-lg hover:opacity-95 transition-all duration-300 active:scale-95"
                  style={{
                    backgroundColor: 'var(--md-sys-color-primary, #6750A4)',
                    color: 'var(--md-sys-color-on-primary, #FFFFFF)',
                  }}
                >
                  <Camera size={16} />
                  <span>Launch Camera</span>
                </button>

                <label className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold tracking-wide border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition active:scale-95"
                  style={{
                    color: 'var(--md-sys-color-primary, #6750A4)',
                    borderColor: 'var(--md-sys-color-outline, #79747E)',
                  }}
                >
                  <ImageIcon size={16} />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Camera Selector */}
          {videoDevices.length > 1 && !isScanning && (
            <div className="flex flex-col gap-1.5 p-4 rounded-2xl border"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
                borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
              }}
            >
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                Select Active Camera
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-transparent text-sm py-1 font-medium border-b focus:outline-none"
                style={{
                  color: 'var(--md-sys-color-on-surface, #1D1B20)',
                  borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                }}
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId} className="dark:bg-zinc-800">
                    {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl border text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-200"
              style={{
                borderColor: 'var(--md-sys-color-error, #BA1A1A)',
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* Right column: Scanned result details */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div 
            id="scanned-result-card"
            className="rounded-3xl p-6 border shadow-sm h-full flex flex-col"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
              borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
            }}
          >
            <h3 className="text-lg font-bold tracking-tight text-[var(--md-sys-color-on-surface)] mb-4">
              Latest Scan Result
            </h3>

            {scanResult ? (
              <div className="flex flex-col gap-5 flex-grow">
                {/* Result metadata badge */}
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase"
                    style={{
                      backgroundColor: 'var(--md-sys-color-primary-container, #EADDFF)',
                      color: 'var(--md-sys-color-on-primary-container, #21005D)',
                    }}
                  >
                    {getFormatDisplayName(scanResult.format)}
                  </span>
                </div>

                {/* Value textbox */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                    Decoded Value
                  </span>
                  <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 border break-all text-sm font-mono max-h-48 overflow-y-auto"
                    style={{
                      borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                      color: 'var(--md-sys-color-on-surface, #1D1B20)',
                    }}
                  >
                    {scanResult.value}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-auto pt-4 border-t"
                  style={{
                    borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                  }}
                >
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold tracking-wide border hover:bg-black/5 dark:hover:bg-white/5 transition"
                    style={{
                      color: 'var(--md-sys-color-primary, #6750A4)',
                      borderColor: 'var(--md-sys-color-primary, #6750A4)',
                    }}
                  >
                    <Clipboard size={16} />
                    <span>Copy to Clipboard</span>
                  </button>

                  {isUrl(scanResult.value) && (
                    <a
                      href={scanResult.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold tracking-wide text-white hover:opacity-90 transition shadow-sm text-center"
                      style={{
                        backgroundColor: 'var(--md-sys-color-secondary, #625B71)',
                      }}
                    >
                      <ExternalLink size={16} />
                      <span>Open Link</span>
                    </a>
                  )}

                  <button
                    onClick={() => onNavigateToCreator(scanResult.value, scanResult.format)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold tracking-wide text-white hover:opacity-90 transition shadow-md"
                    style={{
                      backgroundColor: 'var(--md-sys-color-primary, #6750A4)',
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Design Card & Recreate</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 flex-grow">
                <p className="text-sm opacity-60 text-[var(--md-sys-color-on-surface)]">
                  No scan recorded in this session. Start the camera or upload an image above to decode.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
};
