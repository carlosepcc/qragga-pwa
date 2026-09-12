/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js';
import { motion, AnimatePresence } from 'motion/react';
import { toPng, toJpeg } from 'html-to-image';
import { BARCODE_DEFINITIONS } from '../data/barcodes';
import { BarcodeType, HistoryItem } from '../types';
import { 
  Download, 
  Clipboard, 
  Layers, 
  Sliders, 
  Palette, 
  FileSpreadsheet, 
  X, 
  Grid, 
  List,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Settings,
  QrCode,
  Move,
  Share2,
  Sparkles
} from 'lucide-react';

interface BarcodeThumbnailProps {
  format: string;
  placeholder: string;
}

const BarcodeThumbnail: React.FC<BarcodeThumbnailProps> = ({ format, placeholder }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      // Determine the optimal text based on constraints
      let text = 'https://qragga.hivepen.com';
      if (!['qrcode', 'azteccode', 'datamatrix', 'pdf417', 'code128'].includes(format)) {
        if (format === 'code39') {
          text = 'QRAGGA-HIVEPEN';
        } else {
          text = placeholder;
        }
      }

      const is2DSquare = ['qrcode', 'azteccode', 'datamatrix'].includes(format);
      const bcid = format === 'itf' ? 'interleaved2of5' : format;

      const opts: any = {
        bcid: bcid,
        text: text,
        scale: 2,
        includetext: false,
        padding: 4,
        barcolor: '1D1B20',
        backgroundcolor: 'FFFFFF'
      };

      if (!is2DSquare) {
        opts.height = 10; // Shorter height for 1D/PDF417 barcodes to fit perfectly
      }

      // Render the real code with bwip-js
      bwipjs.toCanvas(canvasRef.current, opts);
    } catch (err) {
      console.warn(`Failed to render thumbnail for ${format}:`, err);
    }
  }, [format, placeholder]);

  return (
    <div className="w-full h-12 flex items-center justify-center select-none mx-auto overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="max-w-full max-h-full object-contain block select-none pointer-events-none" 
      />
    </div>
  );
};

interface UrlData {
  isValid: boolean;
  domain?: string;
  title?: string;
  subtitle?: string;
  footer?: string;
  logoUrl?: string;
}

const getUrlData = (text: string): UrlData => {
  const cleanText = text.trim();
  if (!cleanText) return { isValid: false };

  // Check if it matches web URL shape (with or without http/https)
  const urlRegex = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?:\/.*)?$/;
  const match = cleanText.match(urlRegex);

  if (!match) return { isValid: false };

  const domain = match[1].toLowerCase();

  let hostname = domain;
  let parseableUrl = cleanText;
  if (!/^https?:\/\//i.test(parseableUrl)) {
    parseableUrl = 'https://' + parseableUrl;
  }

  try {
    const urlObj = new URL(parseableUrl);
    hostname = urlObj.hostname.replace('www.', '');
  } catch (e) {
    // Fallback to domain
  }

  const parts = hostname.split('.');
  const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);

  let title = `${name} Portal`;
  let subtitle = `Scan code to open direct link to ${hostname}`;
  let footer = `Verified Link • ${name} Platform`;

  if (hostname === 'github.com') {
    title = 'GitHub Repository';
    subtitle = 'Open-source code, developer profiles, and secure repositories';
    footer = 'Verified Open-Source • GitHub';
  } else if (hostname === 'youtube.com' || hostname === 'youtu.be') {
    title = 'YouTube Video';
    subtitle = 'Stream high-definition videos, tutorials, and channels';
    footer = 'Official Media Broadcast • YouTube';
  } else if (hostname === 'google.com') {
    title = 'Google Search';
    subtitle = 'Discover resources, news, and world-class search tools';
    footer = 'Secure Web Gateway • Google';
  } else if (hostname === 'linkedin.com') {
    title = 'LinkedIn Profile';
    subtitle = 'Professional networking, resumes, and career contacts';
    footer = 'Verified Professional • LinkedIn';
  } else if (hostname === 'spotify.com') {
    title = 'Spotify Playlist';
    subtitle = 'Listen to high-fidelity songs, playlists, or podcast episodes';
    footer = 'Official Audio Link • Spotify';
  } else if (hostname === 'hivepen.com' || hostname === 'qragga.hivepen.com') {
    title = 'QRagga Portal';
    subtitle = 'Interactive offline barcode and advanced QR generator tool';
    footer = 'Verified PWA Utility • QRagga';
  } else if (hostname === 'wikipedia.org') {
    title = 'Wikipedia Article';
    subtitle = 'Explore crowdsourced historical, scientific, and cultural information';
    footer = 'Verified Encyclopedia Entry • Wikipedia';
  } else if (hostname === 'twitter.com' || hostname === 'x.com') {
    title = 'X Feed Channel';
    subtitle = 'Read official social broadcasts, live micro-blogs, and feeds';
    footer = 'Verified Account Card • X Platform';
  }

  const logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;

  return {
    isValid: true,
    domain: hostname,
    title,
    subtitle,
    footer,
    logoUrl,
  };
};

interface CardTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  footer: string;
  bgType: 'solid' | 'gradient' | 'minimal';
  cardBgColor: string;
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
  cardBorder: 'none' | 'thin' | 'dashed';
  cardRounding: 'none' | 'medium' | 'large' | 'extra-large';
  showShadow: boolean;
  showLogo: boolean;
  showValue: boolean;
  timestamp: number;
}

interface CreatorTabProps {
  initialValue?: string;
  initialFormat?: string;
  onSaveToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

export const CreatorTab: React.FC<CreatorTabProps> = ({
  initialValue = '',
  initialFormat = 'qrcode',
  onSaveToHistory,
}) => {
  // Creator Main Input State
  const [barcodeText, setBarcodeText] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_text');
    return saved !== null ? saved : (initialValue || 'https://qragga.hivepen.com');
  });
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeType>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_format');
    return saved !== null ? (saved as BarcodeType) : (initialFormat as BarcodeType);
  });
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Selector View Modes: 'grid' (default) or 'dropdown'
  const [selectionMode, setSelectionMode] = useState<'grid' | 'dropdown'>('grid');

  // Advanced settings & Barcode standard collapsible container (collapsed by default)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // More standard formats grid expander (collapsed by default)
  const [isMoreCodesOpen, setIsMoreCodesOpen] = useState<boolean>(false);

  // Error Correction levels & embedded logo in center options
  const [qrEcLevel, setQrEcLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H'); // Default to 'H' so logo in center works perfectly by default!
  const [aztecEcLevel, setAztecEcLevel] = useState<number>(23);
  const [pdfSecurityLevel, setPdfSecurityLevel] = useState<number>(3);
  
  // Persisted avatar source selection & inputs
  const [showLogoInQrCenter, setShowLogoInQrCenter] = useState<boolean>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_showLogoInQrCenter');
    return saved !== null ? saved === 'true' : true;
  });
  const [avatarSource, setAvatarSource] = useState<'extracted' | 'url' | 'upload'>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_avatarSource');
    return saved !== null ? (saved as any) : 'extracted';
  });
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_customAvatarUrl');
    return saved !== null ? saved : '';
  });
  const [uploadedAvatarData, setUploadedAvatarData] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_uploadedAvatarData');
    return saved !== null ? saved : '';
  });

  // Helper to retrieve the active custom logo / avatar URL
  const getActiveLogoUrl = (): string | null => {
    if (avatarSource === 'extracted') {
      return (urlData?.isValid && urlData?.logoUrl) ? urlData.logoUrl : null;
    }
    if (avatarSource === 'url') {
      return customAvatarUrl || null;
    }
    if (avatarSource === 'upload') {
      return uploadedAvatarData || null;
    }
    return null;
  };

  // Bottom Sheet Visibility
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Personalization Options
  const [fgColor, setFgColor] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_fgColor');
    return saved !== null ? saved : '#000000';
  });
  const [bgColor, setBgColor] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_bgColor');
    return saved !== null ? saved : '#FFFFFF';
  });
  const [scale, setScale] = useState<number>(3);
  const [includeText, setIncludeText] = useState<boolean>(true);
  const [customLabel, setCustomLabel] = useState<string>('');
  const [quietZone, setQuietZone] = useState<boolean>(true);
  const [barHeight, setBarHeight] = useState<number>(12); // mm

  // Card Wrap / Personalization Options
  const [cardTitle, setCardTitle] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_cardTitle');
    return saved !== null ? saved : 'QRagga Certificate';
  });
  const [cardBody, setCardBody] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_cardBody');
    return saved !== null ? saved : 'Scan this code to verify information';
  });
  const [cardFooter, setCardFooter] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_cardFooter');
    return saved !== null ? saved : '';
  });
  const [bgType, setBgType] = useState<'solid' | 'gradient' | 'minimal'>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_bgType');
    return saved !== null ? (saved as any) : 'solid';
  });
  const [cardBgColor, setCardBgColor] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_cardBgColor');
    return saved !== null ? saved : '#FFFFFF';
  });
  const [gradientStart, setGradientStart] = useState<string>('#6750A4');
  const [gradientEnd, setGradientEnd] = useState<string>('#E8DEF8');
  const [textColor, setTextColor] = useState<string>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_textColor');
    return saved !== null ? saved : '#000000';
  });
  const [cardBorder, setCardBorder] = useState<'none' | 'thin' | 'dashed'>('none');
  const [cardRounding, setCardRounding] = useState<'none' | 'medium' | 'large' | 'extra-large'>('large');
  const [showShadow, setShowShadow] = useState<boolean>(true);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');

  // Export styles and backgrounds
  const [exportStyle, setExportStyle] = useState<'card-only' | 'social-mockup'>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_exportStyle');
    return saved !== null ? (saved as any) : 'card-only';
  });
  const [mockupBg, setMockupBg] = useState<'indigo' | 'sunset' | 'nordic' | 'onyx'>(() => {
    const saved = localStorage.getItem('zebra_qr_draft_mockupBg');
    return saved !== null ? (saved as any) : 'indigo';
  });

  const getMockupBgStyle = () => {
    if (mockupBg === 'indigo') {
      return 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)';
    }
    if (mockupBg === 'sunset') {
      return 'linear-gradient(135deg, #F43F5E 0%, #FB923C 100%)';
    }
    if (mockupBg === 'nordic') {
      return 'linear-gradient(135deg, #F3F4F6 0%, #D1D5DB 100%)';
    }
    if (mockupBg === 'onyx') {
      return 'linear-gradient(135deg, #111827 0%, #374151 100%)';
    }
    return 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)';
  };

  // Auto-persist draft entries to localStorage
  useEffect(() => {
    localStorage.setItem('zebra_qr_draft_text', barcodeText);
    localStorage.setItem('zebra_qr_draft_format', barcodeFormat);
    localStorage.setItem('zebra_qr_draft_fgColor', fgColor);
    localStorage.setItem('zebra_qr_draft_bgColor', bgColor);
    localStorage.setItem('zebra_qr_draft_cardTitle', cardTitle);
    localStorage.setItem('zebra_qr_draft_cardBody', cardBody);
    localStorage.setItem('zebra_qr_draft_cardFooter', cardFooter);
    localStorage.setItem('zebra_qr_draft_bgType', bgType);
    localStorage.setItem('zebra_qr_draft_cardBgColor', cardBgColor);
    localStorage.setItem('zebra_qr_draft_textColor', textColor);
    // Custom avatar persistence properties
    localStorage.setItem('zebra_qr_draft_avatarSource', avatarSource);
    localStorage.setItem('zebra_qr_draft_customAvatarUrl', customAvatarUrl);
    localStorage.setItem('zebra_qr_draft_uploadedAvatarData', uploadedAvatarData);
    localStorage.setItem('zebra_qr_draft_showLogoInQrCenter', showLogoInQrCenter ? 'true' : 'false');
    localStorage.setItem('zebra_qr_draft_exportStyle', exportStyle);
    localStorage.setItem('zebra_qr_draft_mockupBg', mockupBg);
  }, [
    barcodeText, barcodeFormat, fgColor, bgColor, cardTitle, cardBody, cardFooter, bgType, cardBgColor, textColor,
    avatarSource, customAvatarUrl, uploadedAvatarData, showLogoInQrCenter, exportStyle, mockupBg
  ]);

  // Export formats and Share status states
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [shareStatus, setShareStatus] = useState<string>('');
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

  // Smart Autofill & Custom Settings Templates
  const [urlData, setUrlData] = useState<UrlData>({ isValid: false });
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [showValue, setShowValue] = useState<boolean>(false); // Omit value by default
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState<string>('');

  const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardPreviewRef = useRef<HTMLDivElement | null>(null);

  // Load Saved Card Builder Templates on Mount (and load latest automatically)
  useEffect(() => {
    const saved = localStorage.getItem('zebra_qr_card_templates');
    if (saved) {
      try {
        const parsed: CardTemplate[] = JSON.parse(saved);
        setTemplates(parsed);
        if (parsed.length > 0) {
          // Sort by timestamp descending to find latest
          const sorted = [...parsed].sort((a, b) => b.timestamp - a.timestamp);
          const latest = sorted[0];
          applyTemplate(latest);
        }
      } catch (err) {
        console.warn('Failed to load card templates:', err);
      }
    }
  }, []);

  // Smart URL Metadata Watcher
  useEffect(() => {
    const data = getUrlData(barcodeText);
    setUrlData(data);

    if (data.isValid) {
      // Check if current fields are equal to factory defaults
      const isTitleDefault = cardTitle === 'QRagga Certificate' || cardTitle === 'Zebra QR Certificate' || cardTitle === '';
      const isBodyDefault = cardBody === 'Scan this code to verify information' || cardBody === '';
      const isFooterDefault = cardFooter === 'Verified Offline • QRagga PWA' || cardFooter === 'Verified Offline • Zebra QR PWA' || cardFooter === '';

      if (isTitleDefault && isBodyDefault && isFooterDefault) {
        // Automatically overwrite since fields are pure factory defaults
        if (data.title) setCardTitle(data.title);
        if (data.subtitle) setCardBody(data.subtitle);
        if (data.footer) setCardFooter(data.footer);
      }
    }
  }, [barcodeText]);

  const applyTemplate = (t: CardTemplate) => {
    setCardTitle(t.title);
    setCardBody(t.body);
    setCardFooter(t.footer);
    setBgType(t.bgType);
    setCardBgColor(t.cardBgColor);
    setGradientStart(t.gradientStart);
    setGradientEnd(t.gradientEnd);
    setTextColor(t.textColor);
    setCardBorder(t.cardBorder);
    setCardRounding(t.cardRounding);
    setShowShadow(t.showShadow);
    setShowLogo(t.showLogo !== undefined ? t.showLogo : true);
    setShowValue(t.showValue !== undefined ? t.showValue : false);
  };

  const handleSaveTemplate = () => {
    const name = newTemplateName.trim() || `Template ${templates.length + 1}`;
    const newT: CardTemplate = {
      id: Date.now().toString(),
      name,
      title: cardTitle,
      body: cardBody,
      footer: cardFooter,
      bgType,
      cardBgColor,
      gradientStart,
      gradientEnd,
      textColor,
      cardBorder,
      cardRounding,
      showShadow,
      showLogo,
      showValue,
      timestamp: Date.now(),
    };

    const updated = [newT, ...templates];
    setTemplates(updated);
    localStorage.setItem('zebra_qr_card_templates', JSON.stringify(updated));
    setNewTemplateName('');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('zebra_qr_card_templates', JSON.stringify(updated));
  };

  // Sync state with parent redirects (from scan result etc)
  useEffect(() => {
    if (initialValue) {
      setBarcodeText(initialValue);
    }
    if (initialFormat) {
      setBarcodeFormat(initialFormat as BarcodeType);
    }
  }, [initialValue, initialFormat]);

  // Dynamic Barcode generation trigger
  useEffect(() => {
    generateBarcode();
  }, [
    barcodeText,
    barcodeFormat,
    fgColor,
    bgColor,
    scale,
    includeText,
    customLabel,
    quietZone,
    barHeight,
    qrEcLevel,
    aztecEcLevel,
    pdfSecurityLevel,
    showLogoInQrCenter,
    urlData.logoUrl,
    avatarSource,
    customAvatarUrl,
    uploadedAvatarData,
  ]);

  const generateBarcode = () => {
    if (!barcodeCanvasRef.current) return;
    setErrorMsg('');

    if (!barcodeText.trim()) {
      setErrorMsg('Input data cannot be empty');
      return;
    }

    // Validation checks for specific barcodes
    const currentDef = BARCODE_DEFINITIONS.find(d => d.id === barcodeFormat);
    if (currentDef?.validationRegex && !currentDef.validationRegex.test(barcodeText)) {
      setErrorMsg(`Format mismatch: ${currentDef.name} requires a specific input syntax (e.g. ${currentDef.placeholder}).`);
      return;
    }

    try {
      const cleanFg = fgColor.replace('#', '');
      const cleanBg = bgColor.replace('#', '');
      const bcid = barcodeFormat === 'itf' ? 'interleaved2of5' : barcodeFormat;

      const opts: any = {
        bcid: bcid,
        text: barcodeText,
        scale: scale,
        includetext: includeText && currentDef?.category === '1D',
        textxalign: 'center',
        barcolor: cleanFg,
        backgroundcolor: cleanBg,
        padding: quietZone ? 10 : 0,
      };

      if (barcodeFormat === 'qrcode') {
        opts.eclevel = qrEcLevel;
      } else if (barcodeFormat === 'azteccode') {
        opts.eclevel = aztecEcLevel.toString();
      } else if (barcodeFormat === 'pdf417') {
        opts.security = pdfSecurityLevel;
      }

      // Add custom label text if provided for 1D codes
      if (currentDef?.category === '1D') {
        opts.height = barHeight;
        if (customLabel.trim()) {
          opts.alttext = customLabel;
        }
      }

      // Render barcode using bwipjs toCanvas
      bwipjs.toCanvas(barcodeCanvasRef.current, opts);

      // Render Logo in the center of QR code if enabled & active logo is loaded
      const activeLogo = getActiveLogoUrl();
      if (barcodeFormat === 'qrcode' && showLogoInQrCenter && activeLogo) {
        const canvas = barcodeCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Re-verify we are still on QR Code
            if (barcodeFormat !== 'qrcode') return;
            const size = Math.min(canvas.width, canvas.height);
            const logoSize = Math.floor(size * 0.18); // 18% of QR size
            const x = (canvas.width - logoSize) / 2;
            const y = (canvas.height - logoSize) / 2;

            // Draw a white circle backdrop for the logo
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 4, 0, Math.PI * 2);
            ctx.fill();

            // Subtle bounding ring
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#E2E8F0';
            ctx.stroke();

            // Draw circle-cropped logo
            ctx.save();
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, x, y, logoSize, logoSize);
            ctx.restore();

            try {
              setBarcodeDataUrl(canvas.toDataURL());
            } catch (canvasErr) {
              console.warn('Could not read canvas data URL due to security restrictions:', canvasErr);
            }
          };
          img.onerror = () => {
            try {
              if (barcodeCanvasRef.current) {
                setBarcodeDataUrl(barcodeCanvasRef.current.toDataURL());
              }
            } catch (canvasErr) {
              console.warn('Could not read canvas data URL after load error:', canvasErr);
            }
          };
          img.src = activeLogo;
        } else {
          setBarcodeDataUrl(barcodeCanvasRef.current.toDataURL());
        }
      } else {
        setBarcodeDataUrl(barcodeCanvasRef.current.toDataURL());
      }

    } catch (err: any) {
      console.error('BwipJS rendering error:', err);
      setErrorMsg('Failed to render barcode. Check input content constraints for this format.');
    }
  };

  // Compose entire card onto single high-res canvas and download
  const handleExportCard = async () => {
    if (!cardPreviewRef.current) return;

    try {
      setIsExporting(true);
      // Let React apply the snapshot layout state
      await new Promise((resolve) => setTimeout(resolve, 200));

      let dataUrl = '';
      if (exportFormat === 'png') {
        dataUrl = await toPng(cardPreviewRef.current, {
          quality: 0.98,
          pixelRatio: 3, // Premium, high-DPI printed clarity (3x resolution)
          cacheBust: true,
          skipFonts: true,
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          style: {
            transform: 'scale(1)',
          },
        });
      } else {
        dataUrl = await toJpeg(cardPreviewRef.current, {
          quality: 0.98,
          pixelRatio: 3,
          cacheBust: true,
          skipFonts: true,
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          style: {
            transform: 'scale(1)',
          },
        });
      }

      setIsExporting(false);

      if (!dataUrl) {
        console.error('Failed to generate high-quality card data URL');
        return;
      }

      // Save item to Offline History list
      onSaveToHistory({
        type: 'created',
        format: barcodeFormat,
        value: barcodeText,
        isFavorite: false,
        label: cardTitle || `Created ${barcodeFormat}`,
        personalization: { fgColor, bgColor, scale, includeText, customLabel, quietZone, barHeight },
        cardOptions: { title: cardTitle, body: cardBody, footer: cardFooter, bgType, bgColor: cardBgColor, gradientStart, gradientEnd, textColor, cardColor: '#FFF', borderRadius: cardRounding, borderStyle: cardBorder, showShadow }
      });

      // Trigger download
      const link = document.createElement('a');
      link.download = `qragga-card-${Date.now()}.${exportFormat}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setIsExporting(false);
      console.error('Failed to render and export high-quality card using html-to-image:', err);
    }
  };

  // Direct Social / Native sharing via Web Share API or Clipboard Item fallback
  const handleDirectShare = async () => {
    if (!cardPreviewRef.current) return;
    setShareStatus('Generating share card...');

    try {
      setIsExporting(true);
      // Let React apply the layout state
      await new Promise((resolve) => setTimeout(resolve, 200));

      let dataUrl = '';
      if (exportFormat === 'png') {
        dataUrl = await toPng(cardPreviewRef.current, {
          quality: 0.95,
          pixelRatio: 2.5, // highly optimized and supported for messaging shares
          cacheBust: true,
          skipFonts: true,
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          style: {
            transform: 'scale(1)',
          },
        });
      } else {
        dataUrl = await toJpeg(cardPreviewRef.current, {
          quality: 0.95,
          pixelRatio: 2.5,
          cacheBust: true,
          skipFonts: true,
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          style: {
            transform: 'scale(1)',
          },
        });
      }

      setIsExporting(false);

      if (!dataUrl) {
        setShareStatus('Failed to generate sharing image');
        setTimeout(() => setShareStatus(''), 3000);
        return;
      }

      // Automatically store in fallback state so if everything fails, they can view/press/hold it
      setShareImageUrl(dataUrl);

      // Attempt to convert to blob and perform Web Share or Clipboard Copy
      try {
        // Pure synchronous JS converter to prevent CSP blocks on fetch("data:...")
        const parts = dataUrl.split(',');
        const byteCharacters = atob(parts[1]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        const blob = new Blob(byteArrays, { type: exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png' });

        const fileExtension = exportFormat === 'jpeg' ? 'jpg' : 'png';
        const filename = `qragga-card-${Date.now()}.${fileExtension}`;
        const file = new File([blob], filename, { type: exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          setShareStatus('Launching native share...');
          await navigator.share({
            files: [file],
            title: cardTitle || 'QRagga Card',
            text: cardBody || 'Check out my barcode card from QRagga!',
          });
          setShareStatus('');
          // If native share succeeds, we can clear the manual popup
          setShareImageUrl(null);
        } else {
          // Attempt clipboard fallback
          setShareStatus('Copying HD card image to clipboard...');
          await navigator.clipboard.write([
            new ClipboardItem({
              [exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png']: blob,
            }),
          ]);
          setShareStatus('HD Card Image copied to Clipboard!');
          setTimeout(() => setShareStatus(''), 4000);
        }
      } catch (innerErr) {
        console.warn('Native share/clipboard failed inside direct share:', innerErr);
        setShareStatus('Native share blocked. Opening manual share menu...');
        setTimeout(() => setShareStatus(''), 3500);
      }
    } catch (err) {
      setIsExporting(false);
      console.error('Error sharing card using html-to-image:', err);
      setShareStatus('Sharing failed. Opening manual fallback...');
      setTimeout(() => setShareStatus(''), 3000);
    }
  };

  // Direct Social / Native sharing of raw barcode with NO card whatsoever
  const handleShareRawBarcode = async () => {
    if (!barcodeCanvasRef.current) return;
    setShareStatus('Generating barcode image...');

    try {
      const dataUrl = barcodeCanvasRef.current.toDataURL('image/png');

      if (!dataUrl) {
        setShareStatus('Failed to generate barcode image');
        setTimeout(() => setShareStatus(''), 3000);
        return;
      }

      // Automatically store in fallback state so if everything fails, they can view/press/hold it
      setShareImageUrl(dataUrl);

      // Attempt to convert to blob and perform Web Share or Clipboard Copy
      try {
        const parts = dataUrl.split(',');
        const byteCharacters = atob(parts[1]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        const blob = new Blob(byteArrays, { type: 'image/png' });
        const file = new File([blob], `barcode-${Date.now()}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          setShareStatus('Launching native share...');
          await navigator.share({
            files: [file],
            title: `Barcode (${barcodeFormat})`,
            text: `Barcode for: ${barcodeText}`,
          });
          setShareStatus('');
          setShareImageUrl(null);
        } else {
          // Attempt clipboard fallback
          setShareStatus('Copying barcode image to clipboard...');
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
            }),
          ]);
          setShareStatus('Barcode image copied to Clipboard!');
          setTimeout(() => setShareStatus(''), 4000);
        }
      } catch (innerErr) {
        console.warn('Native share/clipboard failed inside direct share:', innerErr);
        setShareStatus('Native share blocked. Opening manual share menu...');
        setTimeout(() => setShareStatus(''), 3500);
      }
    } catch (err) {
      console.error('Error sharing raw barcode:', err);
      setShareStatus('Sharing failed. Opening manual fallback...');
      setTimeout(() => setShareStatus(''), 3000);
    }
  };

  // Export raw Barcode SVG to user
  const handleExportSvg = () => {
    if (!barcodeText.trim() || errorMsg) return;
    try {
      const cleanFg = fgColor.replace('#', '');
      const cleanBg = bgColor.replace('#', '');
      const bcid = barcodeFormat === 'itf' ? 'interleaved2of5' : barcodeFormat;
      
      const opts: any = {
        bcid: bcid,
        text: barcodeText,
        scale: scale,
        includetext: includeText,
        textxalign: 'center',
        barcolor: cleanFg,
        backgroundcolor: cleanBg,
        padding: quietZone ? 10 : 0,
      };

      if (customLabel.trim()) {
        opts.alttext = customLabel;
      }

      // Retrieve pure SVG string using bwipjs.toSVG
      const svgString = bwipjs.toSVG(opts);

      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = `qragga-barcode-${barcodeFormat}-${Date.now()}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);

    } catch (err) {
      console.error(err);
      setErrorMsg('Could not export SVG.');
    }
  };

  const getRoundingClass = () => {
    if (cardRounding === 'none') return 'rounded-none';
    if (cardRounding === 'medium') return 'rounded-2xl';
    if (cardRounding === 'large') return 'rounded-[24px]';
    return 'rounded-[40px]';
  };

  const getBorderClass = () => {
    if (cardBorder === 'none') return 'border-none';
    if (cardBorder === 'thin') return 'border-2 border-solid';
    return 'border-3 border-dashed';
  };



  // Auto-expand "More Codes" if loaded format is one of them
  useEffect(() => {
    const isMainCode = ['qrcode', 'azteccode', 'datamatrix', 'pdf417', 'code128'].includes(barcodeFormat);
    if (!isMainCode) {
      setIsMoreCodesOpen(true);
    }
  }, [barcodeFormat]);

  const renderCardContent = (isExportMode: boolean) => {
    return (
      <>
        {/* Logo/Favicon Header if enabled */}
        {showLogo && (
          <div className="mb-2 mt-4 flex items-center justify-center select-none">
            {getActiveLogoUrl() ? (
              <div className="bg-white p-1 rounded-full border shadow-sm flex items-center justify-center w-14 h-14">
                <img 
                  src={getActiveLogoUrl()!} 
                  alt="site logo" 
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 object-contain rounded-full" 
                />
              </div>
            ) : null}
          </div>
        )}

        {/* Header Title - Auto-wrapping & responsive sizing */}
        <h4 className="text-xl md:text-2xl font-extrabold text-center tracking-tight break-words w-full mt-2 select-none px-2 leading-tight">
          {cardTitle || 'Card Title'}
        </h4>

        {/* Subtitle/Body - Auto-wrapping & line clamp */}
        <p className="text-xs md:text-sm opacity-90 text-center mt-2 select-none max-w-xs leading-relaxed break-words line-clamp-3 px-3 w-full">
          {cardBody || 'Card Body details'}
        </p>

        {/* Centered Barcode wrapper */}
        <div className="flex-grow flex items-center justify-center my-6 w-full">
          <div className="bg-white p-4 rounded-3xl shadow-md border"
            style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
          >
            {barcodeDataUrl ? (
              <img 
                src={barcodeDataUrl} 
                alt="Barcode" 
                className="max-w-full max-h-[180px] object-contain block select-none pointer-events-none" 
              />
            ) : (
              <div className="w-[180px] h-[80px] flex items-center justify-center text-xs opacity-50 font-sans">
                Generating barcode...
              </div>
            )}
          </div>
        </div>

        {/* Displaying barcode value underneath conditionally */}
        {showValue && (
          <div className="text-center select-none w-full max-w-xs truncate mb-4 font-mono text-xs bg-black/10 dark:bg-white/10 px-3 py-1.5 rounded-lg opacity-85">
            Value: {barcodeText}
          </div>
        )}

        {/* Footer Note - rendered only when present */}
        {cardFooter && (
          <p className="text-xs md:text-sm opacity-80 text-center italic truncate w-full mb-3 select-none px-4">
            {cardFooter}
          </p>
        )}
      </>
    );
  };

  return (
    <div id="creator-container" className="w-full max-w-4xl mx-auto p-4 md:p-6 flex flex-col gap-6">

      {/* STICKY ROW: LIVE BARCODE PREVIEW & QUICK ACTIONS */}
      <div className="sticky top-0 z-30 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md py-0 border-b border-zinc-200 dark:border-zinc-800 -mx-4 px-4 sm:-mx-6 sm:px-6 flex items-center justify-between transition-all duration-200">
        {/* Code Preview (the barcode canvas itself) - Square, No Padding, Maximum vertical space */}
        <div className="flex items-center min-w-0">
          <div className="bg-white p-0 rounded-none border-r border-zinc-200 dark:border-zinc-800 h-28 sm:h-32 w-32 sm:w-36 flex items-center justify-center overflow-hidden select-none flex-shrink-0">
            <canvas ref={barcodeCanvasRef} className="max-w-full max-h-full object-contain block pointer-events-none" />
          </div>
        </div>

        {/* Action buttons on the right side - Stacked in a column */}
        <div className="flex flex-col gap-1.5 py-2 flex-shrink-0 items-end">
          {shareStatus && (
            <span className="text-[10px] font-semibold text-[var(--md-sys-color-primary)] bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900/40">
              {shareStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleShareRawBarcode}
            disabled={!barcodeText.trim() || !!errorMsg}
            className="flex items-center justify-center gap-1.5 w-28 sm:w-32 py-1.5 rounded text-xs font-bold bg-[var(--md-sys-color-primary)] text-white hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 shadow-sm cursor-pointer select-none"
          >
            <Share2 size={12} />
            <span>Share Code</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBottomSheetOpen(true)}
            disabled={!barcodeText.trim() || !!errorMsg}
            className="flex items-center justify-center gap-1.5 w-28 sm:w-32 py-1.5 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 active:scale-95 disabled:opacity-45 disabled:pointer-events-none transition-all duration-200 border border-zinc-200 dark:border-zinc-700 cursor-pointer select-none font-bold"
          >
            <Sliders size={12} className="text-zinc-500 dark:text-zinc-400" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* ONE COLUMN COMPACT FORM */}
      <div className="flex flex-col gap-6">
        
        {/* Encoded Value / Text Content - Visually borderless and simplified */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-[var(--md-sys-color-primary)] opacity-80" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                Content for the {BARCODE_DEFINITIONS.find(d => d.id === barcodeFormat)?.name || 'Barcode'}
              </span>
            </div>
            {errorMsg ? (
              <span className="text-red-600 dark:text-red-400 font-semibold text-xs flex items-center gap-1 select-none">⚠️ Format Mismatch</span>
            ) : (
              <span className="text-green-600 dark:text-green-400 font-semibold text-xs flex items-center gap-1 select-none">✓ Ready to Scan</span>
            )}
          </div>
          <textarea
            value={barcodeText}
            onChange={(e) => setBarcodeText(e.target.value)}
            rows={4}
            placeholder={BARCODE_DEFINITIONS.find(d => d.id === barcodeFormat)?.placeholder}
            className="w-full px-4 py-3.5 rounded-none border text-sm font-mono bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[var(--md-sys-color-primary)] outline-none resize-none transition-all duration-200"
            style={{
              color: 'var(--md-sys-color-on-surface, #1D1B20)',
              borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
            }}
          />

          {errorMsg && (
            <div className="p-3 text-xs text-red-700 bg-red-100 rounded-none border border-red-200">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Collapsible Advanced Settings (collapsed by default) */}
        <div className="w-full">
          {/* Collapsible Header toggle as a basic details-like trigger */}
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full py-2.5 px-1 flex items-center justify-between text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors duration-200 outline-none font-medium text-sm cursor-pointer select-none"
          >
            <span>Advanced</span>
            {isAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Expandable Advanced Content Area */}
          <AnimatePresence initial={false}>
            {isAdvancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="border-t"
                style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
              >
                <div className="p-5 md:p-6 flex flex-col gap-6"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
                  }}
                >
                  
                  {/* Sub-section 1: SELECT BARCODE STANDARD */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-[var(--md-sys-color-primary)]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                          Select Barcode Standard
                        </span>
                      </div>

                      {/* Mode selection toggle */}
                      <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-none border border-zinc-200 dark:border-zinc-800">
                        <button
                          onClick={() => setSelectionMode('grid')}
                          className={`p-1.5 rounded-none transition ${selectionMode === 'grid' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[var(--md-sys-color-primary)]' : 'opacity-60 text-[var(--md-sys-color-on-background)]'}`}
                          title="Grid view"
                        >
                          <Grid size={14} />
                        </button>
                        <button
                          onClick={() => setSelectionMode('dropdown')}
                          className={`p-1.5 rounded-none transition ${selectionMode === 'dropdown' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[var(--md-sys-color-primary)]' : 'opacity-60 text-[var(--md-sys-color-on-background)]'}`}
                          title="Dropdown view"
                        >
                          <List size={14} />
                        </button>
                      </div>
                    </div>

                    {selectionMode === 'grid' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                        {BARCODE_DEFINITIONS.map((def) => {
                          const isMainCode = ['qrcode', 'azteccode', 'datamatrix', 'pdf417', 'code128'].includes(def.id);
                          const isSelected = barcodeFormat === def.id;

                          if (!isMainCode && !isMoreCodesOpen && !isSelected) {
                            return null;
                          }

                          return (
                            <button
                              key={def.id}
                              onClick={() => setBarcodeFormat(def.id as BarcodeType)}
                              className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all duration-300 relative overflow-hidden active:scale-95 ${
                                isSelected 
                                  ? 'ring-2 ring-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container, #EADDFF)]' 
                                  : 'bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                              }`}
                              style={{
                                borderColor: isSelected 
                                  ? 'var(--md-sys-color-primary, #6750A4)' 
                                  : 'var(--md-sys-color-outline-variant, #CAC4D0)'
                              }}
                            >
                              <div className="w-full flex items-center justify-center h-12">
                                <BarcodeThumbnail format={def.id} placeholder={def.placeholder} />
                              </div>

                              <div className="mt-auto">
                                <p className={`text-[11px] font-bold tracking-tight truncate w-full ${isSelected ? 'text-[var(--md-sys-color-on-primary-container, #21005D)]' : 'text-[var(--md-sys-color-on-surface, #1D1B20)]'}`}>
                                  {def.name}
                                </p>
                              </div>
                            </button>
                          );
                        })}

                        {/* More Codes click-to-reveal card */}
                        {!isMoreCodesOpen && (
                          <button
                            onClick={() => setIsMoreCodesOpen(true)}
                            className="p-3 rounded-2xl border border-dashed text-left flex flex-col justify-center items-center h-28 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition duration-300 active:scale-95 text-zinc-500 dark:text-zinc-400"
                            style={{
                              borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)'
                            }}
                          >
                            <ChevronRight size={24} className="mb-1 text-[var(--md-sys-color-primary)]" />
                            <span className="text-[11px] font-bold tracking-tight text-zinc-700 dark:text-zinc-300">More Codes</span>
                            <span className="text-[9px] opacity-75">ITF, Codabar, EAN...</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <select
                          value={barcodeFormat}
                          onChange={(e) => setBarcodeFormat(e.target.value as BarcodeType)}
                          className="w-full px-4 py-3 rounded-2xl border text-sm font-medium bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[var(--md-sys-color-primary)] outline-none"
                          style={{
                            color: 'var(--md-sys-color-on-surface, #1D1B20)',
                            borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)',
                          }}
                        >
                          <optgroup label="2D Codes (Multi-purpose & Niche)" className="dark:bg-zinc-800">
                            {BARCODE_DEFINITIONS.filter(d => d.category === '2D').map(def => (
                              <option key={def.id} value={def.id}>{def.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="1D Barcodes (Retail & Supply Chain)" className="dark:bg-zinc-800">
                            {BARCODE_DEFINITIONS.filter(d => d.category === '1D').map(def => (
                              <option key={def.id} value={def.id}>{def.name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    )}
                    <span className="text-[10px] opacity-75 leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
                      {BARCODE_DEFINITIONS.find(d => d.id === barcodeFormat)?.description}
                    </span>
                  </div>

                  {/* Sub-section 2: Custom Error Correction Level and logo center option */}
                  {['qrcode', 'azteccode', 'pdf417'].includes(barcodeFormat) && (
                    <div className="p-4 rounded-2xl border bg-white dark:bg-zinc-950 flex flex-col gap-3"
                      style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                    >
                      <div className="flex items-center gap-2 border-b border-dashed pb-2 mb-1" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                        <Sliders size={14} className="text-[var(--md-sys-color-primary)]" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                          Error Correction Level & Centering Options
                        </span>
                      </div>

                      {barcodeFormat === 'qrcode' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-[var(--md-sys-color-on-surface-variant)]">
                              QR Error Correction
                            </span>
                            <select
                              value={qrEcLevel}
                              onChange={(e) => setQrEcLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                              className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-zinc-900 outline-none focus:ring-1 focus:ring-[var(--md-sys-color-primary)]"
                              style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                            >
                              <option value="L">L (7% Recovery) • Compact Size</option>
                              <option value="M">M (15% Recovery) • Standard</option>
                              <option value="Q">Q (25% Recovery) • High Redundancy</option>
                              <option value="H">H (30% Recovery) • Best for Center Logo</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
                                Embed Favicon in Center
                              </span>
                              <span className="text-[9px] opacity-70">Requires H or Q level</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={showLogoInQrCenter}
                              onChange={(e) => setShowLogoInQrCenter(e.target.checked)}
                              className="w-5 h-5 accent-[var(--md-sys-color-primary)] cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {barcodeFormat === 'azteccode' && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                            <span>Aztec Error Correction Ratio</span>
                            <span>{aztecEcLevel}%</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={95}
                            value={aztecEcLevel}
                            onChange={(e) => setAztecEcLevel(Number(e.target.value))}
                            className="w-full accent-[var(--md-sys-color-primary)] cursor-pointer"
                          />
                          <span className="text-[10px] opacity-70">Defines redundant Aztec symbols. Recommended is 23%.</span>
                        </div>
                      )}

                      {barcodeFormat === 'pdf417' && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                            <span>PDF417 Security level (Error correction columns)</span>
                            <span>Level {pdfSecurityLevel}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={8}
                            value={pdfSecurityLevel}
                            onChange={(e) => setPdfSecurityLevel(Number(e.target.value))}
                            className="w-full accent-[var(--md-sys-color-primary)] cursor-pointer"
                          />
                          <span className="text-[10px] opacity-70">Ranges from level 0 up to 8. Higher levels survive prints damage better.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-section 3: BARCODE PERSONALIZATION */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-dashed pb-2 mb-1" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                      <Palette size={14} className="text-[var(--md-sys-color-primary)]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
                        Barcode Customizations & Colors
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Foreground Color */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                          Barcode Code Color
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={fgColor}
                            onChange={(e) => setFgColor(e.target.value)}
                            className="w-10 h-10 rounded-xl border cursor-pointer flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={fgColor}
                            onChange={(e) => setFgColor(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl border text-xs font-mono uppercase bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none"
                            style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                          />
                        </div>
                      </div>

                      {/* Background Color */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                          Code Background Color
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="w-10 h-10 rounded-xl border cursor-pointer flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl border text-xs font-mono uppercase bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none"
                            style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Presets for Barcode */}
                    <div className="flex flex-wrap gap-2 items-center mt-1">
                      <span className="text-[10px] font-bold opacity-60 mr-1 uppercase">Presets:</span>
                      <button 
                        onClick={() => { setFgColor('#000000'); setBgColor('#FFFFFF'); }}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-zinc-200 text-black border hover:opacity-85 cursor-pointer"
                      >
                        Classic Monochromatic
                      </button>
                      <button 
                        onClick={() => { setFgColor('#6750A4'); setBgColor('#FFFFFF'); }}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-purple-100 text-purple-700 border hover:opacity-85 cursor-pointer"
                      >
                        Brand Purple
                      </button>
                      <button 
                        onClick={() => { setFgColor('#FFFFFF'); setBgColor('#000000'); }}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-zinc-800 text-white border hover:opacity-85 cursor-pointer"
                      >
                        Inverted High Contrast
                      </button>
                    </div>

                    {/* Slider Scale & Options */}
                    <div className="flex flex-col gap-3 pt-2 border-t border-dashed" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                          Quiet Zone (Margins)
                        </label>
                        <input
                          type="checkbox"
                          checked={quietZone}
                          onChange={(e) => setQuietZone(e.target.checked)}
                          className="w-5 h-5 accent-[var(--md-sys-color-primary)] cursor-pointer"
                        />
                      </div>

                      {BARCODE_DEFINITIONS.find(d => d.id === barcodeFormat)?.category === '1D' && (
                        <>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                              Show human-readable text
                            </label>
                            <input
                              type="checkbox"
                              checked={includeText}
                              onChange={(e) => setIncludeText(e.target.checked)}
                              className="w-5 h-5 accent-[var(--md-sys-color-primary)] cursor-pointer"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                              Override display label (Optional)
                            </label>
                            <input
                              type="text"
                              value={customLabel}
                              onChange={(e) => setCustomLabel(e.target.value)}
                              placeholder="e.g. SERIAL-998"
                              className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none"
                              style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                              <span>Bar height (1D only)</span>
                              <span>{barHeight} mm</span>
                            </div>
                            <input
                              type="range"
                              min={6}
                              max={40}
                              value={barHeight}
                              onChange={(e) => setBarHeight(Number(e.target.value))}
                              className="w-full accent-[var(--md-sys-color-primary)] cursor-pointer"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* 5. INTERACTIVE BOTTOM SHEET FOR CARD BUILDING & EXPORTS */}
      <AnimatePresence>
        {isBottomSheetOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBottomSheetOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />

            {/* Bottom Sheet Slider */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 180 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[36px] p-6 md:p-8 overflow-y-auto max-h-[85vh] flex flex-col gap-6"
              style={{
                backgroundColor: 'var(--md-sys-color-surface, #FEF7FF)',
                color: 'var(--md-sys-color-on-surface, #1D1B20)',
                borderTop: '1px solid var(--md-sys-color-outline-variant, #CAC4D0)',
              }}
            >
              {/* Drag Handle & Header */}
              <div className="flex flex-col gap-2">
                <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto" />
                
                <div className="flex items-center justify-between pb-3 border-b"
                  style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                >
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">Optional Shareable Card Builder</h3>
                    <p className="text-xs opacity-75">Personalize layout variables, background themes, and wrap your barcode in a beautiful certificate.</p>
                  </div>
                  <button
                    onClick={() => setIsBottomSheetOpen(false)}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Card Customizations Column (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-5 max-h-[50vh] overflow-y-auto pr-2">
                  
                  {/* Custom Theme Templates Manager */}
                  <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border flex flex-col gap-3"
                    style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide opacity-85">
                        🎨 Design Theme Templates
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Template Name (e.g. Neon Purple)"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="flex-grow px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-zinc-950 focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none"
                        style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                      />
                      <button
                        onClick={handleSaveTemplate}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 active:scale-95 transition cursor-pointer"
                        style={{ backgroundColor: 'var(--md-sys-color-primary, #6750A4)' }}
                      >
                        Save Preset
                      </button>
                    </div>

                    {templates.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1 max-h-24 overflow-y-auto">
                        {templates.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                          >
                            <span className="truncate max-w-[120px]">{t.name}</span>
                            <button
                              onClick={(e) => handleDeleteTemplate(t.id, e)}
                              className="text-red-500 hover:text-red-700 p-0.5 rounded-full"
                              title="Delete template"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] opacity-60 italic">No saved presets yet. Type a name above to save your current styling layout!</span>
                    )}
                  </div>

                  {/* Title & Body */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                        Card Main Title
                      </label>
                      <input
                        type="text"
                        value={cardTitle}
                        onChange={(e) => setCardTitle(e.target.value)}
                        placeholder="Card Title"
                        className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none"
                        style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                      />
                      {urlData.isValid && urlData.title && cardTitle !== urlData.title && (
                        <div className="mt-1.5 flex items-center justify-between text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg border border-purple-150 dark:border-purple-900/50">
                          <span className="truncate mr-2">Suggested: <strong>{urlData.title}</strong></span>
                          <button 
                            type="button" 
                            onClick={() => setCardTitle(urlData.title!)}
                            className="font-bold underline cursor-pointer hover:opacity-85 flex-shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                        Card Subtitle/Body
                      </label>
                      <input
                        type="text"
                        value={cardBody}
                        onChange={(e) => setCardBody(e.target.value)}
                        placeholder="Card body text"
                        className="px-3 py-2 rounded-xl border text-xs bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none"
                        style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                      />
                      {urlData.isValid && urlData.subtitle && cardBody !== urlData.subtitle && (
                        <div className="mt-1.5 flex items-center justify-between text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg border border-purple-150 dark:border-purple-900/50">
                          <span className="truncate mr-2">Suggested: <strong>{urlData.subtitle}</strong></span>
                          <button 
                            type="button" 
                            onClick={() => setCardBody(urlData.subtitle!)}
                            className="font-bold underline cursor-pointer hover:opacity-85 flex-shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                      Card Footer Note
                    </label>
                    <input
                      type="text"
                      value={cardFooter}
                      onChange={(e) => setCardFooter(e.target.value)}
                      placeholder="Card footer text"
                      className="w-full px-3 py-2 rounded-none border text-xs bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-[var(--md-sys-color-primary)] outline-none"
                      style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                    />
                    {urlData.isValid && urlData.footer && cardFooter !== urlData.footer && (
                      <div className="mt-1.5 flex items-center justify-between text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-none border border-purple-150 dark:border-purple-900/50">
                        <span className="truncate mr-1.5">Suggested: <strong>{urlData.footer}</strong></span>
                        <button 
                          type="button" 
                          onClick={() => setCardFooter(urlData.footer!)}
                          className="font-bold underline cursor-pointer hover:opacity-85 flex-shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card backgrounds and borders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-dashed" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                        Card Background Theme
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setBgType('gradient'); setTextColor('#FFFFFF'); }}
                          className={`flex-grow py-1.5 rounded-none text-xs font-semibold border ${bgType === 'gradient' ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-white dark:bg-zinc-900'}`}
                        >
                          Gradient
                        </button>
                        <button
                          onClick={() => { setBgType('solid'); setTextColor('#1D1B20'); }}
                          className={`flex-grow py-1.5 rounded-none text-xs font-semibold border ${bgType === 'solid' ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-white dark:bg-zinc-900'}`}
                        >
                          Solid Color
                        </button>
                        <button
                          onClick={() => { setBgType('minimal'); setTextColor('#1D1B20'); }}
                          className={`flex-grow py-1.5 rounded-none text-xs font-semibold border ${bgType === 'minimal' ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary-container)]' : 'bg-white dark:bg-zinc-900'}`}
                        >
                          Minimal
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                        Text Ink Color
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTextColor('#FFFFFF')}
                          className={`flex-grow py-1.5 rounded-none text-xs font-semibold border bg-zinc-800 text-white ${textColor === '#FFFFFF' ? 'ring-2 ring-[var(--md-sys-color-primary)]' : ''}`}
                        >
                          White
                        </button>
                        <button
                          onClick={() => setTextColor('#1D1B20')}
                          className={`flex-grow py-1.5 rounded-none text-xs font-semibold border bg-white text-zinc-900 ${textColor === '#1D1B20' ? 'ring-2 ring-[var(--md-sys-color-primary)]' : ''}`}
                        >
                          Ink Black
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Custom Color picking for background */}
                  {bgType === 'solid' && (
                    <div className="flex flex-col gap-1 pt-1">
                      <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                        Select Solid Background
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={cardBgColor}
                          onChange={(e) => setCardBgColor(e.target.value)}
                          className="w-10 h-10 rounded-none cursor-pointer border border-zinc-300"
                        />
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {['#F7F2FA', '#EADDFF', '#ECE6F0', '#FFE2E2', '#E2F0D9', '#D9E1F2', '#FFF2CC'].map(c => (
                            <button
                              key={c}
                              onClick={() => setCardBgColor(c)}
                              className="w-6 h-6 rounded-none border shadow-sm flex-shrink-0"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {bgType === 'gradient' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                          Gradient Start Color
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={gradientStart}
                            onChange={(e) => setGradientStart(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            value={gradientStart}
                            onChange={(e) => setGradientStart(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border text-xs font-mono uppercase bg-white dark:bg-zinc-900"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                          Gradient End Color
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={gradientEnd}
                            onChange={(e) => setGradientEnd(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            value={gradientEnd}
                            onChange={(e) => setGradientEnd(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border text-xs font-mono uppercase bg-white dark:bg-zinc-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Card border and rounding */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-dashed" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                        Card Border Style
                      </label>
                      <select
                        value={cardBorder}
                        onChange={(e) => setCardBorder(e.target.value as any)}
                        className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-zinc-900"
                        style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                      >
                        <option value="none">No Border</option>
                        <option value="thin">Thin Solid Border</option>
                        <option value="dashed">Dashed Border</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                        Card Corner Radius
                      </label>
                      <select
                        value={cardRounding}
                        onChange={(e) => setCardRounding(e.target.value as any)}
                        className="px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-zinc-900"
                        style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                      >
                        <option value="none">Square (0px)</option>
                        <option value="medium">Medium (12px)</option>
                        <option value="large">Large (24px)</option>
                        <option value="extra-large">Extra Round (40px)</option>
                      </select>
                    </div>

                  </div>

                  <div className="flex flex-col gap-3.5 pt-3 border-t border-dashed" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
                          Show Website Logo
                        </span>
                        <span className="text-[10px] opacity-70">Renders domain favicon if URL is parsed</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="w-5 h-5 accent-[var(--md-sys-color-primary)] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
                          Show Barcode Text Value
                        </span>
                        <span className="text-[10px] opacity-70">Display raw value below the barcode</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showValue}
                        onChange={(e) => setShowValue(e.target.checked)}
                        className="w-5 h-5 accent-[var(--md-sys-color-primary)] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
                          Render Elevated Card Shadow
                        </span>
                        <span className="text-[10px] opacity-70">Adds elegant modern ambient shadow</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showShadow}
                        onChange={(e) => setShowShadow(e.target.checked)}
                        className="w-5 h-5 accent-[var(--md-sys-color-primary)] cursor-pointer"
                      />
                    </div>

                    {barcodeFormat === 'qrcode' && (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
                            Center Logo inside QR Code
                          </span>
                          <span className="text-[10px] opacity-70">Overlays logo in the center of QR code</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={showLogoInQrCenter}
                          onChange={(e) => setShowLogoInQrCenter(e.target.checked)}
                          className="w-5 h-5 accent-[var(--md-sys-color-primary)] cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-3.5 pt-3 border-t border-dashed" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
                          Export Canvas Layout
                        </span>
                        <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setExportStyle('card-only')}
                            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${exportStyle === 'card-only' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[var(--md-sys-color-primary)]' : 'opacity-70 text-zinc-600 dark:text-zinc-300'}`}
                          >
                            Card Only
                          </button>
                          <button
                            type="button"
                            onClick={() => setExportStyle('social-mockup')}
                            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${exportStyle === 'social-mockup' ? 'bg-white dark:bg-zinc-800 shadow-sm text-[var(--md-sys-color-primary)]' : 'opacity-70 text-zinc-600 dark:text-zinc-300'}`}
                          >
                            Social Mockup (1:1)
                          </button>
                        </div>
                      </div>

                      {exportStyle === 'social-mockup' && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-[var(--md-sys-color-on-surface-variant)]">
                            Mockup Frame Theme
                          </span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['indigo', 'sunset', 'nordic', 'onyx'] as const).map((bg) => (
                              <button
                                key={bg}
                                type="button"
                                onClick={() => setMockupBg(bg)}
                                className={`py-1.5 rounded-lg text-[10px] font-bold border capitalize transition-all cursor-pointer ${mockupBg === bg ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]' : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                              >
                                {bg}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Logo/Avatar Settings Configuration Panel */}
                  {(showLogo || (showLogoInQrCenter && barcodeFormat === 'qrcode')) && (
                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-dashed mt-3" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                      <span className="text-xs font-bold text-[var(--md-sys-color-on-surface)] uppercase tracking-wider">
                        Avatar / Logo Customize
                      </span>
                      
                      {/* Source Selection Buttons */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold opacity-70">
                          Logo Image Source
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-white dark:bg-zinc-950 p-1 rounded-xl border" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                          <button
                            type="button"
                            onClick={() => setAvatarSource('extracted')}
                            className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${avatarSource === 'extracted' ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
                          >
                            Favicon
                          </button>
                          <button
                            type="button"
                            onClick={() => setAvatarSource('url')}
                            className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${avatarSource === 'url' ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
                          >
                            Paste URL
                          </button>
                          <button
                            type="button"
                            onClick={() => setAvatarSource('upload')}
                            className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${avatarSource === 'upload' ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
                          >
                            Upload Local
                          </button>
                        </div>
                      </div>

                      {/* Source Specific Input fields */}
                      {avatarSource === 'extracted' && (
                        <div className="bg-white dark:bg-zinc-950/40 p-2.5 rounded-xl border text-[11px] leading-relaxed" style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}>
                          {urlData.isValid ? (
                            <div className="flex items-center gap-2.5">
                              {urlData.logoUrl && (
                                <img 
                                  src={urlData.logoUrl} 
                                  alt="Favicon preview" 
                                  className="w-8 h-8 rounded-full border bg-white object-contain p-0.5" 
                                />
                              )}
                              <div>
                                <p className="font-semibold text-[var(--md-sys-color-on-surface)]">Extracted Web Favicon</p>
                                <p className="opacity-70 text-[10px] truncate max-w-[180px]">{urlData.domain}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="opacity-60 text-center italic text-[10px]">
                              Input is not a valid URL. Enter a website URL above to extract its logo.
                            </p>
                          )}
                        </div>
                      )}

                      {avatarSource === 'url' && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-semibold opacity-70">
                            Custom Image URL
                          </label>
                          <input
                            type="text"
                            value={customAvatarUrl}
                            onChange={(e) => setCustomAvatarUrl(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="w-full px-3 py-1.5 rounded-xl border text-xs bg-white dark:bg-zinc-950 font-mono"
                            style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                          />
                        </div>
                      )}

                      {avatarSource === 'upload' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-semibold opacity-70">
                            Upload Avatar / Image
                          </label>
                          <div 
                            className="border border-dashed rounded-xl p-3 text-center bg-white dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                            style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                            onClick={() => document.getElementById('avatar-file-upload')?.click()}
                          >
                            <input
                              id="avatar-file-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    if (typeof reader.result === 'string') {
                                      setUploadedAvatarData(reader.result);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {uploadedAvatarData ? (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={uploadedAvatarData} 
                                  alt="uploaded avatar" 
                                  className="w-10 h-10 rounded-full border object-cover" 
                                />
                                <div className="text-left text-[10px]">
                                  <p className="font-bold text-[var(--md-sys-color-primary)]">Image Selected</p>
                                  <p className="opacity-60">Click to change avatar</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-[10px] font-semibold text-[var(--md-sys-color-primary)]">Select or Drag Image</span>
                                <span className="text-[9px] opacity-60">Supports PNG, JPG, SVG, WEBP</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Interactive Card Preview & Download Column (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  
                  {/* Composite Card Box */}
                  <div 
                    ref={cardPreviewRef}
                    id="shareable-card-preview"
                    className={isExporting 
                      ? (exportStyle === 'social-mockup'
                        ? `w-[640px] h-[640px] flex items-center justify-center p-12 relative overflow-hidden`
                        : `w-[480px] flex flex-col items-center p-8 relative overflow-visible ${getRoundingClass()} ${getBorderClass()} shadow-none`)
                      : `w-full h-auto min-h-[480px] md:aspect-[4/5] flex flex-col items-center p-6 relative transition-all overflow-hidden ${getRoundingClass()} ${getBorderClass()} ${showShadow ? 'shadow-xl' : 'shadow-none'}`}
                    style={isExporting && exportStyle === 'social-mockup' ? {
                      background: getMockupBgStyle(),
                    } : {
                      background: bgType === 'solid' 
                        ? cardBgColor 
                        : bgType === 'gradient'
                          ? `linear-gradient(180deg, ${gradientStart} 0%, ${gradientEnd} 100%)`
                          : 'var(--md-sys-color-surface-container-low, #F7F2FA)',
                      borderColor: isExporting || cardBorder === 'none'
                        ? 'transparent'
                        : bgType === 'minimal' 
                          ? 'var(--md-sys-color-outline-variant, #CAC4D0)' 
                          : cardBorder === 'dashed' 
                            ? textColor + '60' 
                            : textColor + '40',
                      borderWidth: isExporting || cardBorder === 'none' ? '0px' : undefined,
                      color: bgType === 'minimal' ? 'var(--md-sys-color-on-surface, #1D1B20)' : textColor,
                    }}
                  >
                    {isExporting && exportStyle === 'social-mockup' ? (
                      <div className={`w-[440px] flex flex-col items-center p-6 relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.35)] ${getRoundingClass()} ${getBorderClass()}`}
                        style={{
                          background: bgType === 'solid' 
                            ? cardBgColor 
                            : bgType === 'gradient'
                              ? `linear-gradient(180deg, ${gradientStart} 0%, ${gradientEnd} 100%)`
                              : '#FFFFFF',
                          borderColor: cardBorder === 'none'
                            ? 'transparent'
                            : bgType === 'minimal' 
                              ? 'rgba(0,0,0,0.1)' 
                              : cardBorder === 'dashed' 
                                ? textColor + '40' 
                                : textColor + '20',
                          color: bgType === 'minimal' ? '#1D1B20' : textColor,
                        }}
                      >
                        {renderCardContent(true)}
                      </div>
                    ) : (
                      renderCardContent(false)
                    )}
                  </div>

                  {/* Actions Bar & Settings */}
                  <div className="flex flex-col gap-4">
                    
                    {/* Format & Share Panel */}
                    <div className="flex flex-col gap-3.5 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-none border"
                      style={{ borderColor: 'var(--md-sys-color-outline-variant, #CAC4D0)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-1">
                          📦 Output Settings
                        </span>
                        {/* Format toggle tabs */}
                        <div className="flex bg-zinc-200/60 dark:bg-zinc-800 rounded-none p-0.5 text-[10px] font-bold border border-zinc-300 dark:border-zinc-700">
                          <button
                            onClick={() => setExportFormat('png')}
                            className={`px-3 py-1 rounded-none transition cursor-pointer ${exportFormat === 'png' ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white' : 'opacity-60 text-zinc-700 dark:text-zinc-400'}`}
                          >
                            PNG
                          </button>
                          <button
                            onClick={() => setExportFormat('jpeg')}
                            className={`px-3 py-1 rounded-none transition cursor-pointer ${exportFormat === 'jpeg' ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white' : 'opacity-60 text-zinc-700 dark:text-zinc-400'}`}
                          >
                            JPEG
                          </button>
                        </div>
                      </div>

                      {/* Status/Feedback message if sharing or copy is active */}
                      {shareStatus && (
                        <motion.div 
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs font-semibold text-center py-1 px-3 bg-purple-50 dark:bg-purple-950/40 text-[var(--md-sys-color-primary)] rounded-none border border-purple-100 dark:border-purple-900/50"
                        >
                          {shareStatus}
                        </motion.div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {/* Download Card button */}
                        <button
                          onClick={handleExportCard}
                          disabled={!barcodeText.trim() || !!errorMsg}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-none text-xs font-semibold text-white bg-[var(--md-sys-color-primary)] hover:opacity-90 active:scale-95 transition shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                        >
                          <Download size={15} />
                          <span>Download Card</span>
                        </button>

                        {/* Share direct button */}
                        <button
                          onClick={handleDirectShare}
                          disabled={!barcodeText.trim() || !!errorMsg}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-none text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                          style={{
                            color: 'var(--md-sys-color-primary, #6750A4)',
                            borderColor: 'var(--md-sys-color-primary, #6750A4)',
                          }}
                        >
                          <Share2 size={15} />
                          <span>Direct Share</span>
                        </button>
                      </div>
                    </div>

                    {/* Secondary SVG/Text Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleExportSvg}
                        disabled={!barcodeText.trim() || !!errorMsg}
                        className="flex-grow flex items-center justify-center gap-2 py-2.5 rounded-none text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition active:scale-95 disabled:opacity-45 cursor-pointer"
                        style={{
                          color: 'var(--md-sys-color-primary, #6750A4)',
                          borderColor: 'var(--md-sys-color-primary, #6750A4)',
                        }}
                      >
                        <FileSpreadsheet size={14} />
                        <span>Save Barcode SVG</span>
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(barcodeText);
                        }}
                        disabled={!barcodeText.trim()}
                        className="flex-grow flex items-center justify-center gap-2 py-2.5 rounded-none text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/5 transition active:scale-95 disabled:opacity-45 cursor-pointer"
                        style={{
                          color: 'var(--md-sys-color-secondary, #625B71)',
                          borderColor: 'var(--md-sys-color-secondary, #625B71)',
                        }}
                      >
                        <Clipboard size={14} />
                        <span>Copy Raw Text</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. FAILSAFE MANUAL SHARING DIALOG / OVERLAY */}
      <AnimatePresence>
        {shareImageUrl && (
          <div 
            className="fixed inset-0 z-50 flex items-center md:items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none"
            onClick={() => setShareImageUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="w-full max-w-sm flex flex-col p-6 rounded-none shadow-2xl relative"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container-high, #F3EDF7)',
                color: 'var(--md-sys-color-on-surface, #1D1B20)',
                border: '1px solid var(--md-sys-color-outline-variant, #CAC4D0)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Info */}
              <div className="flex flex-col items-center text-center gap-1.5 pb-4 border-b border-black/10 dark:border-white/10">
                <div className="w-10 h-10 rounded-none border border-zinc-300 dark:border-zinc-700 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
                  <Share2 size={20} />
                </div>
                <h3 className="text-base font-bold tracking-tight mt-1">Manual Share Menu</h3>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-normal px-2">
                  Privacy guards or frame sandbox blocked direct sharing. 
                  <span className="block font-semibold mt-1 text-[var(--md-sys-color-primary)]">
                    {typeof window !== 'undefined' && 'ontouchstart' in window 
                      ? '📱 Tap & hold the card image below to share or save!' 
                      : '💻 Right-click the card image below to copy or save!'}
                  </span>
                </p>
              </div>

              {/* High-res Image display for touch/right-click actions */}
              <div className="flex justify-center py-5 bg-black/5 dark:bg-white/5 rounded-none my-4 overflow-hidden max-h-[360px]">
                <img 
                  src={shareImageUrl} 
                  alt="QRagga Share Card" 
                  className="max-h-[320px] object-contain rounded-none shadow-md hover:scale-105 transition duration-300 pointer-events-auto"
                  referrerPolicy="no-referrer"
                  style={{ userSelect: 'auto', WebkitUserSelect: 'auto' }}
                />
              </div>

              {/* Close Footer Button */}
              <button
                onClick={() => setShareImageUrl(null)}
                className="w-full py-3 rounded-none text-xs font-bold tracking-wide hover:opacity-90 transition active:scale-95"
                style={{
                  backgroundColor: 'var(--md-sys-color-primary, #6750A4)',
                  color: 'var(--md-sys-color-on-primary, #FFFFFF)',
                }}
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
