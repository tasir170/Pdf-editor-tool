import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  RotateCw,
  Check,
  Sun,
  Contrast,
  Sliders,
  Scissors,
  Type,
  Trash2,
  Move,
  GripVertical,
  Plus,
  ShieldCheck,
  FileCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { UploadedImage, ImageTextOverlay } from '../../types/pdf';

interface ImageCropModalProps {
  image: UploadedImage | null;
  isOpen: boolean;
  initialTab?: 'crop' | 'write';
  onClose: () => void;
  onSave: (updated: {
    processedDataUrl: string;
    rotation: number;
    brightness: number;
    contrast: number;
    grayscale: boolean;
    crop?: { x: number; y: number; width: number; height: number };
  }) => void;
}

type AspectRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:2' | 'A4';
type ModalTab = 'crop' | 'write';

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  image,
  isOpen,
  initialTab = 'crop',
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [grayscale, setGrayscale] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');

  // Normalized crop coordinates (0 to 1) relative to displayed image
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  });

  // Text overlays to write directly on the image
  const [textOverlays, setTextOverlays] = useState<ImageTextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startCropBox = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  });

  const activeTextDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  // Initialize values when image opens
  useEffect(() => {
    if (image && isOpen) {
      setActiveTab(initialTab);
      setRotation(image.rotation || 0);
      setBrightness(image.brightness || 100);
      setContrast(image.contrast || 100);
      setGrayscale(image.grayscale || false);
      if (image.crop) {
        setCropBox(image.crop);
      } else {
        setCropBox({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      }
      setTextOverlays([]);
      setSelectedTextId(null);
    }
  }, [image, isOpen, initialTab]);

  // Adjust crop aspect ratio when changed
  const applyAspectRatio = useCallback((ratioKey: AspectRatio) => {
    setAspectRatio(ratioKey);
    if (ratioKey === 'free') return;

    let targetRatio = 1.0;
    if (ratioKey === '1:1') targetRatio = 1.0;
    else if (ratioKey === '4:3') targetRatio = 4 / 3;
    else if (ratioKey === '16:9') targetRatio = 16 / 9;
    else if (ratioKey === '3:2') targetRatio = 3 / 2;
    else if (ratioKey === 'A4') targetRatio = 1 / 1.414; // portrait A4

    setCropBox((prev) => {
      let newW = prev.width;
      let newH = newW / targetRatio;
      if (prev.y + newH > 1) {
        newH = 1 - prev.y;
        newW = newH * targetRatio;
      }
      return {
        ...prev,
        width: Math.min(1, Math.max(0.1, newW)),
        height: Math.min(1, Math.max(0.1, newH)),
      };
    });
  }, []);

  // Handle Dragging crop box
  const handleCropPointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag(handle);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    startCropBox.current = { ...cropBox };
  };

  // Handle Dragging text overlay on the image
  const handleTextPointerDown = (item: ImageTextOverlay, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTextId(item.id);
    activeTextDragRef.current = {
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      startXPct: item.xPercent,
      startYPct: item.yPercent,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // 1. Text drag on image
    if (activeTextDragRef.current && imgElementRef.current) {
      const rect = imgElementRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const deltaX = (e.clientX - activeTextDragRef.current.startX) / rect.width;
        const deltaY = (e.clientY - activeTextDragRef.current.startY) / rect.height;

        const newXPct = Math.max(0, Math.min(0.9, activeTextDragRef.current.startXPct + deltaX));
        const newYPct = Math.max(0, Math.min(0.9, activeTextDragRef.current.startYPct + deltaY));

        setTextOverlays((prev) =>
          prev.map((t) =>
            t.id === activeTextDragRef.current?.id
              ? { ...t, xPercent: newXPct, yPercent: newYPct }
              : t
          )
        );
      }
      return;
    }

    // 2. Crop drag
    if (!activeDrag || !imgElementRef.current) return;

    const rect = imgElementRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - dragStartPos.current.x) / rect.width;
    const deltaY = (e.clientY - dragStartPos.current.y) / rect.height;

    setCropBox(() => {
      const start = startCropBox.current;
      let { x, y, width, height } = start;

      if (activeDrag === 'move') {
        x = Math.max(0, Math.min(1 - width, start.x + deltaX));
        y = Math.max(0, Math.min(1 - height, start.y + deltaY));
      } else {
        if (activeDrag.includes('e')) {
          width = Math.max(0.1, Math.min(1 - start.x, start.width + deltaX));
        }
        if (activeDrag.includes('s')) {
          height = Math.max(0.1, Math.min(1 - start.y, start.height + deltaY));
        }
        if (activeDrag.includes('w')) {
          const maxLeft = start.x + start.width - 0.1;
          const newX = Math.max(0, Math.min(maxLeft, start.x + deltaX));
          width = start.width + (start.x - newX);
          x = newX;
        }
        if (activeDrag.includes('n')) {
          const maxTop = start.y + start.height - 0.1;
          const newY = Math.max(0, Math.min(maxTop, start.y + deltaY));
          height = start.height + (start.y - newY);
          y = newY;
        }
      }

      return { x, y, width, height };
    });
  };

  const handlePointerUp = () => {
    setActiveDrag(null);
    activeTextDragRef.current = null;
  };

  // Add custom text overlay
  const handleAddTextOverlay = (customText?: string, presetStyle?: Partial<ImageTextOverlay>) => {
    const newOverlay: ImageTextOverlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: customText || 'Type text here',
      xPercent: 0.15 + (textOverlays.length % 3) * 0.1,
      yPercent: 0.35 + (textOverlays.length % 4) * 0.12,
      fontSize: 22,
      color: presetStyle?.color || '#dc2626',
      isBold: true,
      backgroundColor: presetStyle?.backgroundColor || 'stamp',
      ...presetStyle,
    };
    setTextOverlays((prev) => [...prev, newOverlay]);
    setSelectedTextId(newOverlay.id);
    setActiveTab('write');
  };

  // Quick watermark preset handlers
  const handleAddWatermarkPreset = (presetName: string) => {
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    switch (presetName) {
      case 'ATTESTED':
        handleAddTextOverlay('ATTESTED & VERIFIED', {
          color: '#dc2626',
          backgroundColor: 'stamp',
          fontSize: 24,
          isBold: true,
        });
        break;
      case 'VERIFIED':
        handleAddTextOverlay('VERIFIED COPY - FOR OFFICIAL USE', {
          color: '#15803d',
          backgroundColor: 'stamp',
          fontSize: 20,
          isBold: true,
        });
        break;
      case 'FOR_NADRA':
        handleAddTextOverlay('FOR NADRA / EMBASSY SUBMISSION ONLY', {
          color: '#0369a1',
          backgroundColor: 'white',
          fontSize: 18,
          isBold: true,
        });
        break;
      case 'SPECIMEN':
        handleAddTextOverlay('SPECIMEN COPY', {
          color: '#991b1b',
          backgroundColor: 'stamp',
          fontSize: 32,
          isBold: true,
        });
        break;
      case 'DATE':
        handleAddTextOverlay(`DATE: ${today}`, {
          color: '#0f172a',
          backgroundColor: 'white',
          fontSize: 16,
          isBold: true,
        });
        break;
      default:
        handleAddTextOverlay(presetName);
    }
  };

  // Delete text overlay
  const handleDeleteText = (id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  // Render & Bake everything to Canvas on Apply
  const handleApply = () => {
    if (!image) return;

    const rawImg = new Image();
    rawImg.crossOrigin = 'anonymous';
    rawImg.onload = () => {
      const origW = rawImg.naturalWidth;
      const origH = rawImg.naturalHeight;

      // Calculate actual pixel crop on the original image
      const cropPxX = Math.floor(cropBox.x * origW);
      const cropPxY = Math.floor(cropBox.y * origH);
      const cropPxW = Math.max(10, Math.floor(cropBox.width * origW));
      const cropPxH = Math.max(10, Math.floor(cropBox.height * origH));

      // 1. Create crop canvas
      const cropCanvas = document.createElement('canvas');
      const isRotated90or270 = rotation % 180 !== 0;

      if (isRotated90or270) {
        cropCanvas.width = cropPxH;
        cropCanvas.height = cropPxW;
      } else {
        cropCanvas.width = cropPxW;
        cropCanvas.height = cropPxH;
      }

      const ctx = cropCanvas.getContext('2d');
      if (!ctx) return;

      // Apply filter string
      let filterStr = `brightness(${brightness}%) contrast(${contrast}%)`;
      if (grayscale) {
        filterStr += ' grayscale(100%)';
      }
      ctx.filter = filterStr;

      // Rotate around center
      ctx.save();
      ctx.translate(cropCanvas.width / 2, cropCanvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw the cropped portion
      ctx.drawImage(
        rawImg,
        cropPxX,
        cropPxY,
        cropPxW,
        cropPxH,
        -cropPxW / 2,
        -cropPxH / 2,
        cropPxW,
        cropPxH
      );
      ctx.restore();

      // Reset filter for text drawing
      ctx.filter = 'none';

      // 2. Draw all text overlays directly onto the canvas
      textOverlays.forEach((t) => {
        if (!t.text.trim()) return;

        // Coordinates in canvas pixels
        const pxX = Math.round(t.xPercent * cropCanvas.width);
        const pxY = Math.round(t.yPercent * cropCanvas.height);

        // Scale font size proportionally to image resolution
        const scaleFactor = Math.max(1, cropCanvas.width / 600);
        const effectiveFontSize = Math.round(t.fontSize * scaleFactor);

        ctx.font = `${t.isBold ? 'bold ' : ''}${effectiveFontSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
        const metrics = ctx.measureText(t.text);
        const textW = metrics.width;
        const textH = effectiveFontSize * 1.2;

        const padX = effectiveFontSize * 0.4;
        const padY = effectiveFontSize * 0.25;

        // Background box / stamp styling
        if (t.backgroundColor === 'white') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
          ctx.fillRect(pxX - padX, pxY - textH + padY, textW + padX * 2, textH + padY * 2);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = Math.max(1, scaleFactor);
          ctx.strokeRect(pxX - padX, pxY - textH + padY, textW + padX * 2, textH + padY * 2);
        } else if (t.backgroundColor === 'dark') {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(pxX - padX, pxY - textH + padY, textW + padX * 2, textH + padY * 2);
        } else if (t.backgroundColor === 'yellow') {
          ctx.fillStyle = 'rgba(254, 240, 138, 0.92)';
          ctx.fillRect(pxX - padX, pxY - textH + padY, textW + padX * 2, textH + padY * 2);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = Math.max(1, scaleFactor);
          ctx.strokeRect(pxX - padX, pxY - textH + padY, textW + padX * 2, textH + padY * 2);
        } else if (t.backgroundColor === 'stamp') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(pxX - padX, pxY - textH + padY, textW + padX * 2, textH + padY * 2);
          ctx.strokeStyle = t.color;
          ctx.lineWidth = Math.max(2, scaleFactor * 2);
          ctx.strokeRect(pxX - padX, pxY - textH + padY, textW + padX * 2, textH + padY * 2);
        }

        // Draw the text string
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, pxX, pxY);
      });

      const processedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.93);

      onSave({
        processedDataUrl,
        rotation,
        brightness,
        contrast,
        grayscale,
        crop: cropBox,
      });
      onClose();
    };
    rawImg.src = image.originalDataUrl;
  };

  if (!isOpen || !image) return null;

  const selectedOverlay = textOverlays.find((t) => t.id === selectedTextId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header & Tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-white">
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'crop'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Crop & Filter</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'write'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Write on Image (Text & Stamps)</span>
                {textOverlays.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                    {textOverlays.length}
                  </span>
                )}
              </button>
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline truncate max-w-[200px]">
              {image.name}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content split: preview on left, editing controls on right */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Main Visual Viewport */}
          <div className="lg:col-span-2 p-6 bg-slate-900/95 flex flex-col items-center justify-center relative overflow-hidden">
            <div
              ref={imageContainerRef}
              className="relative max-h-[56vh] max-w-full flex items-center justify-center select-none"
            >
              <img
                ref={imgElementRef}
                src={image.originalDataUrl}
                alt="Original"
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%) ${
                    grayscale ? 'grayscale(100%)' : ''
                  }`,
                  transform: `rotate(${rotation}deg)`,
                  transition: 'filter 150ms ease',
                }}
                className="max-h-[56vh] max-w-full object-contain pointer-events-none block rounded-xs shadow-md"
              />

              {/* Mode A: Draggable Crop Box Overlay */}
              {activeTab === 'crop' && (
                <div
                  className="absolute border-2 border-blue-400 bg-blue-500/10 cursor-move"
                  style={{
                    left: `${cropBox.x * 100}%`,
                    top: `${cropBox.y * 100}%`,
                    width: `${cropBox.width * 100}%`,
                    height: `${cropBox.height * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                  }}
                  onPointerDown={(e) => handleCropPointerDown('move', e)}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* Corner Handles */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown('nw', e)}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 border border-white rounded-xs cursor-nwse-resize"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown('ne', e)}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border border-white rounded-xs cursor-nesw-resize"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown('se', e)}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border border-white rounded-xs cursor-nwse-resize"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown('sw', e)}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 border border-white rounded-xs cursor-nesw-resize"
                  />
                </div>
              )}

              {/* Mode B: Text & Stamp Overlays written on top of image */}
              {textOverlays.map((t) => {
                const isSelected = selectedTextId === t.id;

                let badgeClass = 'text-white drop-shadow-md';
                if (t.backgroundColor === 'white') {
                  badgeClass = 'bg-white/95 text-slate-900 border border-slate-300 shadow-sm';
                } else if (t.backgroundColor === 'dark') {
                  badgeClass = 'bg-slate-900/90 text-white shadow-sm';
                } else if (t.backgroundColor === 'yellow') {
                  badgeClass = 'bg-yellow-200/95 text-slate-900 border border-yellow-400 shadow-sm';
                } else if (t.backgroundColor === 'stamp') {
                  badgeClass = 'bg-white/90 border-2 font-black tracking-wider shadow-sm uppercase';
                }

                return (
                  <div
                    key={t.id}
                    onPointerDown={(e) => handleTextPointerDown(t, e)}
                    style={{
                      position: 'absolute',
                      left: `${t.xPercent * 100}%`,
                      top: `${t.yPercent * 100}%`,
                      fontSize: `${Math.max(12, Math.round(t.fontSize * 0.7))}px`,
                      color: t.color,
                      borderColor: t.backgroundColor === 'stamp' ? t.color : undefined,
                      cursor: 'move',
                    }}
                    className={`px-2.5 py-1 rounded-sm select-none transition-shadow ${badgeClass} ${
                      isSelected
                        ? 'ring-2 ring-blue-500 z-30 shadow-lg scale-105'
                        : 'hover:ring-1 hover:ring-blue-400 z-20'
                    }`}
                  >
                    <span className={t.isBold ? 'font-bold' : 'font-normal'}>{t.text}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-slate-400 text-center">
              {activeTab === 'crop'
                ? 'Drag handles to adjust crop · Drag box to reposition'
                : 'Click and drag any text directly on the image to position it'}
            </div>
          </div>

          {/* Right Controls Panel */}
          <div className="p-6 overflow-y-auto space-y-6 bg-white">
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: WRITE ON IMAGE CONTROLS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'write' ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-blue-600" />
                      <span>Write on Image</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddTextOverlay()}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Text</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Add custom text, official stamps, "ATTESTED", dates, or watermarks directly on the image.
                  </p>
                </div>

                {/* Quick Presets Buttons */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Official Stamp Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddWatermarkPreset('ATTESTED')}
                      className="px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg text-left transition-colors flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="truncate">ATTESTED STAMP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddWatermarkPreset('VERIFIED')}
                      className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-left transition-colors flex items-center gap-1.5"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">VERIFIED COPY</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddWatermarkPreset('FOR_NADRA')}
                      className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg text-left transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">FOR SUBMISSION</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddWatermarkPreset('DATE')}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg text-left transition-colors flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="truncate">TODAY'S DATE</span>
                    </button>
                  </div>
                </div>

                {/* Edit Selected Text Overlay */}
                {selectedOverlay ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Edit Selected Text</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteText(selectedOverlay.id)}
                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>

                    {/* Text input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Text Content
                      </label>
                      <input
                        type="text"
                        value={selectedOverlay.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTextOverlays((prev) =>
                            prev.map((t) => (t.id === selectedOverlay.id ? { ...t, text: val } : t))
                          );
                        }}
                        className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        placeholder="Type text to write on image..."
                      />
                    </div>

                    {/* Font Size & Bold */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Font Size
                        </label>
                        <select
                          value={selectedOverlay.fontSize}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTextOverlays((prev) =>
                              prev.map((t) => (t.id === selectedOverlay.id ? { ...t, fontSize: val } : t))
                            );
                          }}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800"
                        >
                          <option value={14}>14 px (Small)</option>
                          <option value={18}>18 px (Medium)</option>
                          <option value={24}>24 px (Standard)</option>
                          <option value={32}>32 px (Large)</option>
                          <option value={44}>44 px (Extra Large)</option>
                          <option value={56}>56 px (Huge Stamp)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Weight
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setTextOverlays((prev) =>
                              prev.map((t) =>
                                t.id === selectedOverlay.id ? { ...t, isBold: !t.isBold } : t
                              )
                            );
                          }}
                          className={`w-full py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            selectedOverlay.isBold
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          Bold (B)
                        </button>
                      </div>
                    </div>

                    {/* Color Presets */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                        Color
                      </label>
                      <div className="flex items-center gap-2">
                        {[
                          { hex: '#dc2626', label: 'Red' },
                          { hex: '#0369a1', label: 'Blue' },
                          { hex: '#15803d', label: 'Green' },
                          { hex: '#0f172a', label: 'Black' },
                          { hex: '#ffffff', label: 'White' },
                          { hex: '#d97706', label: 'Amber' },
                        ].map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => {
                              setTextOverlays((prev) =>
                                prev.map((t) =>
                                  t.id === selectedOverlay.id ? { ...t, color: c.hex } : t
                                )
                              );
                            }}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${
                              selectedOverlay.color === c.hex
                                ? 'scale-115 border-blue-600 shadow-xs'
                                : 'border-slate-300 hover:scale-105'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Background / Stamp Box Style */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                        Background & Stamp Box
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: 'stamp', label: 'Official Stamp Border' },
                          { key: 'white', label: 'White Box' },
                          { key: 'yellow', label: 'Yellow Highlight' },
                          { key: 'none', label: 'Transparent' },
                        ].map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => {
                              setTextOverlays((prev) =>
                                prev.map((t) =>
                                  t.id === selectedOverlay.id
                                    ? { ...t, backgroundColor: s.key as any }
                                    : t
                                )
                              );
                            }}
                            className={`px-2 py-1.5 text-[11px] font-medium rounded-md border text-left transition-colors ${
                              selectedOverlay.backgroundColor === s.key
                                ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                    <p>Click on any text on the image or click "+ Add Text" to customize wording, font size, and stamp color.</p>
                  </div>
                )}
              </div>
            ) : (
              /* ------------------------------------------------------------- */
              /* TAB 2: CROP & ADJUST CONTROLS */
              /* ------------------------------------------------------------- */
              <div className="space-y-6">
                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                    Crop Ratio
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['free', '1:1', '4:3', '16:9', '3:2', 'A4'] as AspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => applyAspectRatio(ratio)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          aspectRatio === ratio
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {ratio === 'free' ? 'Freeform' : ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                    Orientation
                  </label>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate 90° ({rotation}°)</span>
                  </button>
                </div>

                {/* Adjustments: Brightness, Contrast, Grayscale */}
                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Image Adjustments
                  </label>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5" /> Brightness
                      </span>
                      <span className="font-mono tabular-nums">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="160"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="flex items-center gap-1">
                        <Contrast className="w-3.5 h-3.5" /> Contrast
                      </span>
                      <span className="font-mono tabular-nums">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="160"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Grayscale Document Filter */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-medium text-slate-700">
                        B&W Scan Filter (Grayscale)
                      </span>
                      <input
                        type="checkbox"
                        checked={grayscale}
                        onChange={(e) => setGrayscale(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enhances clarity for photographed paper documents
                    </p>
                  </div>

                  {/* Reset button */}
                  <button
                    type="button"
                    onClick={() => {
                      setBrightness(100);
                      setContrast(100);
                      setGrayscale(false);
                      setRotation(0);
                      setCropBox({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
                  >
                    Reset adjustments
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {textOverlays.length > 0 && (
              <span>
                <strong>{textOverlays.length}</strong> text overlay/stamp will be baked onto this image.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply &amp; Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
