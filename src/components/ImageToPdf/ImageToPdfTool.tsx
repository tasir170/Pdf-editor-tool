import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Crop,
  Trash2,
  ArrowLeft,
  ArrowRight,
  FileCheck,
  Download,
  Sparkles,
  Layers,
  Type,
  Move,
  RotateCw,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlignCenter,
  Grid,
  FileText,
  GripVertical,
  IdCard,
  CreditCard,
  Sliders,
  Check,
  ShieldCheck,
  PenTool,
} from 'lucide-react';
import type { UploadedImage, PaperImageElement, PaperTextElement } from '../../types/pdf';
import { ImageCropModal } from './ImageCropModal';
import {
  convertImagesToPdf,
  convertPaperSheetToPdf,
  downloadFile,
} from '../../utils/pdfLibOperations';
import {
  createSampleImageDataUrl,
  createSampleCnicImages,
} from '../../utils/sampleDocuments';

interface ImageToPdfToolProps {
  autoLoadSample?: boolean;
}

type CanvasMode = 'sheet' | 'single-page';

// Standard paper dimensions in points (72 points = 1 inch)
const PAGE_DIMENSIONS = {
  A4: { width: 595.28, height: 841.89, label: 'A4 (210 × 297 mm)' },
  Letter: { width: 612, height: 792, label: 'US Letter (8.5 × 11 in)' },
  Legal: { width: 612, height: 1008, label: 'US Legal (8.5 × 14 in)' },
};

export const ImageToPdfTool: React.FC<ImageToPdfToolProps> = ({ autoLoadSample }) => {
  // Mode: 'sheet' allows placing & dragging multiple images + texts on 1 paper (e.g. CNIC front & back)
  // 'single-page' places 1 image per page (batch converter)
  const [mode, setMode] = useState<CanvasMode>('sheet');

  // Shared uploaded images
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [editingImage, setEditingImage] = useState<UploadedImage | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'crop' | 'write'>('crop');

  // Single-page mode settings
  const [pageSize, setPageSize] = useState<'fit' | 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5'>('A4');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [marginPt, setMarginPt] = useState<number>(30);

  // Sheet mode settings
  const [sheetPaper, setSheetPaper] = useState<'A4' | 'Letter' | 'Legal'>('A4');
  const [sheetOrientation, setSheetOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [sheetZoom, setSheetZoom] = useState<number>(0.85); // visual scale factor
  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);

  // Sheet elements: images & texts
  const [sheetImages, setSheetImages] = useState<PaperImageElement[]>([]);
  const [sheetTexts, setSheetTexts] = useState<PaperTextElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Interaction tracking for dragging elements
  const paperRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    activeId: string | null;
    type: 'move-img' | 'resize-img' | 'move-txt' | null;
    startX: number;
    startY: number;
    elemStartX: number;
    elemStartY: number;
    elemStartW: number;
    elemStartH: number;
    aspectRatio: number;
  }>({
    activeId: null,
    type: null,
    startX: 0,
    startY: 0,
    elemStartX: 0,
    elemStartY: 0,
    elemStartW: 0,
    elemStartH: 0,
    aspectRatio: 1,
  });

  // Calculate paper dimensions in points
  const baseDim = PAGE_DIMENSIONS[sheetPaper];
  const pageWidth = sheetOrientation === 'portrait' ? baseDim.width : baseDim.height;
  const pageHeight = sheetOrientation === 'portrait' ? baseDim.height : baseDim.width;

  // Auto load CNIC sample if requested
  useEffect(() => {
    if (autoLoadSample && sheetImages.length === 0 && images.length === 0) {
      handleLoadCnicSample();
    }
  }, [autoLoadSample]);

  // Window pointer event listeners for dragging
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.activeId || !drag.type) return;

      const deltaX = (e.clientX - drag.startX) / sheetZoom;
      const deltaY = (e.clientY - drag.startY) / sheetZoom;

      if (drag.type === 'move-img') {
        setSheetImages((prev) =>
          prev.map((item) => {
            if (item.id !== drag.activeId) return item;
            const newX = Math.max(0, Math.min(pageWidth - item.width, drag.elemStartX + deltaX));
            const newY = Math.max(0, Math.min(pageHeight - item.height, drag.elemStartY + deltaY));
            return { ...item, x: Math.round(newX), y: Math.round(newY) };
          })
        );
      } else if (drag.type === 'resize-img') {
        setSheetImages((prev) =>
          prev.map((item) => {
            if (item.id !== drag.activeId) return item;
            let newW = Math.max(60, drag.elemStartW + deltaX);
            let newH = newW / drag.aspectRatio;
            if (drag.elemStartX + newW > pageWidth) {
              newW = pageWidth - drag.elemStartX;
              newH = newW / drag.aspectRatio;
            }
            if (drag.elemStartY + newH > pageHeight) {
              newH = pageHeight - drag.elemStartY;
              newW = newH * drag.aspectRatio;
            }
            return {
              ...item,
              width: Math.round(newW),
              height: Math.round(newH),
            };
          })
        );
      } else if (drag.type === 'move-txt') {
        setSheetTexts((prev) =>
          prev.map((item) => {
            if (item.id !== drag.activeId) return item;
            const newX = Math.max(0, Math.min(pageWidth - 60, drag.elemStartX + deltaX));
            const newY = Math.max(0, Math.min(pageHeight - 20, drag.elemStartY + deltaY));
            return { ...item, x: Math.round(newX), y: Math.round(newY) };
          })
        );
      }
    };

    const handlePointerUp = () => {
      dragRef.current = {
        activeId: null,
        type: null,
        startX: 0,
        startY: 0,
        elemStartX: 0,
        elemStartY: 0,
        elemStartW: 0,
        elemStartH: 0,
        aspectRatio: 1,
      };
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [sheetZoom, pageWidth, pageHeight]);

  // Handle image upload
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const newImg: UploadedImage = {
            id,
            name: file.name,
            size: file.size,
            originalDataUrl: dataUrl,
            processedDataUrl: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            rotation: 0,
            brightness: 100,
            contrast: 100,
            grayscale: false,
          };

          setImages((prev) => [...prev, newImg]);

          // Automatically place into sheet canvas as well
          const cardW = Math.min(pageWidth - 80, 360);
          const cardH = (cardW / img.naturalWidth) * img.naturalHeight;
          const offsetY = 60 + ((sheetImages.length + index) % 4) * (cardH + 40);

          const newPaperElem: PaperImageElement = {
            id: `p-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            imageId: id,
            dataUrl,
            name: file.name,
            x: Math.max(30, Math.round((pageWidth - cardW) / 2)),
            y: Math.min(pageHeight - cardH - 30, Math.max(30, Math.round(offsetY))),
            width: Math.round(cardW),
            height: Math.round(cardH),
            rotation: 0,
          };

          setSheetImages((prev) => [...prev, newPaperElem]);
          setSelectedElementId(newPaperElem.id);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // 1-Click Load Pakistani CNIC / ID Sample (Front & Back)
  const handleLoadCnicSample = () => {
    const { front, back } = createSampleCnicImages();

    const cnicFrontImg: UploadedImage = {
      id: 'cnic-front-1',
      name: 'CNIC_Front_Side.jpg',
      size: 112000,
      originalDataUrl: front,
      processedDataUrl: front,
      width: 650,
      height: 410,
      rotation: 0,
      brightness: 100,
      contrast: 100,
      grayscale: false,
    };

    const cnicBackImg: UploadedImage = {
      id: 'cnic-back-1',
      name: 'CNIC_Back_Side.jpg',
      size: 118000,
      originalDataUrl: back,
      processedDataUrl: back,
      width: 650,
      height: 410,
      rotation: 0,
      brightness: 100,
      contrast: 100,
      grayscale: false,
    };

    setImages([cnicFrontImg, cnicBackImg]);

    // Position nicely on A4 Sheet (Standard 370pt width, ~233pt height centered)
    const cardW = 370;
    const cardH = 233;
    const centerX = Math.round((pageWidth - cardW) / 2);

    const paperFront: PaperImageElement = {
      id: 'paper-cnic-front',
      imageId: cnicFrontImg.id,
      dataUrl: front,
      name: 'CNIC (Front Side)',
      x: centerX,
      y: 95,
      width: cardW,
      height: cardH,
      rotation: 0,
    };

    const paperBack: PaperImageElement = {
      id: 'paper-cnic-back',
      imageId: cnicBackImg.id,
      dataUrl: back,
      name: 'CNIC (Back Side)',
      x: centerX,
      y: 440,
      width: cardW,
      height: cardH,
      rotation: 0,
    };

    const defaultTexts: PaperTextElement[] = [
      {
        id: 'txt-title',
        text: 'NATIONAL IDENTITY CARD (CNIC) / PASSPORT COPY',
        x: centerX,
        y: 45,
        fontSize: 14,
        color: '#0f172a',
        isBold: true,
        backgroundColor: 'none',
      },
      {
        id: 'txt-front-label',
        text: 'CNIC - FRONT SIDE (PHOTO & IDENTITY DETAILS)',
        x: centerX,
        y: 75,
        fontSize: 11,
        color: '#0369a1',
        isBold: true,
        backgroundColor: 'none',
      },
      {
        id: 'txt-back-label',
        text: 'CNIC - BACK SIDE (ADDRESS & VERIFICATION)',
        x: centerX,
        y: 420,
        fontSize: 11,
        color: '#15803d',
        isBold: true,
        backgroundColor: 'none',
      },
      {
        id: 'txt-stamp-demo',
        text: 'ATTESTED & VERIFIED',
        x: centerX + 180,
        y: 280,
        fontSize: 13,
        color: '#dc2626',
        isBold: true,
        backgroundColor: 'stamp',
      },
      {
        id: 'txt-footer-note',
        text: 'Attested document copy for official verification and record.',
        x: centerX,
        y: 700,
        fontSize: 10,
        color: '#64748b',
        isBold: false,
        backgroundColor: 'none',
      },
    ];

    setSheetImages([paperFront, paperBack]);
    setSheetTexts(defaultTexts);
    setMode('sheet');
    setSelectedElementId('paper-cnic-front');
    setSuccessMessage('Loaded Pakistani CNIC Front & Back sample card on 1 A4 page with stamp!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Presets
  const applyCnicPreset = () => {
    if (sheetImages.length === 0) {
      handleLoadCnicSample();
      return;
    }

    const cardW = 370;
    const cardH = 233;
    const centerX = Math.round((pageWidth - cardW) / 2);

    const updated = sheetImages.map((img, idx) => {
      if (idx === 0) {
        return { ...img, x: centerX, y: 95, width: cardW, height: cardH };
      }
      if (idx === 1) {
        return { ...img, x: centerX, y: 440, width: cardW, height: cardH };
      }
      return img;
    });

    setSheetImages(updated);

    // If no texts, add standard labels
    if (sheetTexts.length === 0) {
      setSheetTexts([
        {
          id: `txt-${Date.now()}-1`,
          text: 'CNIC / PASSPORT - FRONT SIDE',
          x: centerX,
          y: 75,
          fontSize: 11,
          color: '#0f172a',
          isBold: true,
          backgroundColor: 'none',
        },
        {
          id: `txt-${Date.now()}-2`,
          text: 'CNIC / PASSPORT - BACK SIDE',
          x: centerX,
          y: 420,
          fontSize: 11,
          color: '#0f172a',
          isBold: true,
          backgroundColor: 'none',
        },
      ]);
    }
  };

  const applySideBySidePreset = () => {
    if (sheetImages.length === 0) return;
    const margin = 35;
    const gap = 20;
    const colW = Math.round((pageWidth - margin * 2 - gap) / 2);

    const updated = sheetImages.map((img, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ratio = img.height / (img.width || 1);
      const itemH = Math.round(colW * ratio);
      const x = margin + col * (colW + gap);
      const y = 80 + row * (itemH + 40);
      return {
        ...img,
        x,
        y: Math.min(pageHeight - itemH - 20, y),
        width: colW,
        height: itemH,
      };
    });
    setSheetImages(updated);
  };

  const applyGridPreset = () => {
    if (sheetImages.length === 0) return;
    const margin = 30;
    const gap = 15;
    const colW = Math.round((pageWidth - margin * 2 - gap) / 2);
    const rowH = Math.round((pageHeight - margin * 2 - 80 - gap) / 2);

    const updated = sheetImages.map((img, idx) => {
      const col = idx % 2;
      const row = Math.floor((idx % 4) / 2);
      const x = margin + col * (colW + gap);
      const y = 60 + row * (rowH + gap);
      return {
        ...img,
        x,
        y,
        width: colW,
        height: rowH,
      };
    });
    setSheetImages(updated);
  };

  const centerSelectedImage = () => {
    if (!selectedElementId) return;
    setSheetImages((prev) =>
      prev.map((img) => {
        if (img.id !== selectedElementId) return img;
        return {
          ...img,
          x: Math.round((pageWidth - img.width) / 2),
        };
      })
    );
  };

  // Add text label
  const handleAddText = (customText?: string, preset?: Partial<PaperTextElement>) => {
    const newText: PaperTextElement = {
      id: `txt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: customText || 'Double click to edit label',
      x: Math.round(pageWidth / 2 - 100),
      y: 60,
      fontSize: 12,
      color: preset?.color || '#0f172a',
      isBold: true,
      backgroundColor: preset?.backgroundColor || 'none',
      ...preset,
    };
    setSheetTexts((prev) => [...prev, newText]);
    setSelectedElementId(newText.id);
  };

  // Add text label directly on top of selected image
  const handleAddTextOnCard = (img: PaperImageElement) => {
    const newText: PaperTextElement = {
      id: `txt-card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: 'ATTESTED COPY',
      x: Math.round(img.x + 20),
      y: Math.round(img.y + img.height - 45),
      fontSize: 12,
      color: '#dc2626',
      isBold: true,
      backgroundColor: 'stamp',
    };
    setSheetTexts((prev) => [...prev, newText]);
    setSelectedElementId(newText.id);
  };

  // Open Write on Image modal
  const handleOpenWriteOnImage = (imageOrId: UploadedImage | string) => {
    let targetImg: UploadedImage | undefined;
    if (typeof imageOrId === 'string') {
      targetImg = images.find((i) => i.id === imageOrId);
    } else {
      targetImg = imageOrId;
    }

    if (!targetImg && typeof imageOrId === 'string') {
      // Find from sheet image
      const sheetElem = sheetImages.find((s) => s.id === imageOrId || s.imageId === imageOrId);
      if (sheetElem) {
        targetImg = {
          id: sheetElem.imageId,
          name: sheetElem.name,
          size: 100000,
          originalDataUrl: sheetElem.dataUrl,
          processedDataUrl: sheetElem.dataUrl,
          width: sheetElem.width,
          height: sheetElem.height,
          rotation: sheetElem.rotation,
          brightness: 100,
          contrast: 100,
          grayscale: false,
        };
      }
    }

    if (targetImg) {
      setEditingImage(targetImg);
      setModalInitialTab('write');
    }
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    setSheetImages((prev) => prev.filter((img) => img.id !== id));
    setSheetTexts((prev) => prev.filter((txt) => txt.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Rotate image element
  const handleRotateImageElem = (id: string) => {
    setSheetImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        return {
          ...img,
          width: img.height,
          height: img.width,
          rotation: (img.rotation + 90) % 360,
        };
      })
    );
  };

  // Reorder layers on sheet
  const handleMoveLayer = (id: string, direction: 'front' | 'back') => {
    setSheetImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1) return prev;
      const item = prev[index];
      const next = prev.filter((img) => img.id !== id);
      if (direction === 'front') {
        return [...next, item];
      } else {
        return [item, ...next];
      }
    });
  };

  // Reorder images in single-page mode
  const moveImageSingleMode = (index: number, direction: 'left' | 'right') => {
    setImages((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Remove image from single-page list
  const removeImageSingleMode = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSheetImages((prev) => prev.filter((p) => p.imageId !== id));
  };

  // Crop saved
  const handleSaveCrop = (updated: {
    processedDataUrl: string;
    rotation: number;
    brightness: number;
    contrast: number;
    grayscale: boolean;
    crop?: { x: number; y: number; width: number; height: number };
  }) => {
    if (!editingImage) return;
    setImages((prev) =>
      prev.map((img) => (img.id === editingImage.id ? { ...img, ...updated } : img))
    );
    // Also update in sheet
    setSheetImages((prev) =>
      prev.map((p) =>
        p.imageId === editingImage.id ? { ...p, dataUrl: updated.processedDataUrl } : p
      )
    );
  };

  // Convert & Download PDF
  const handleConvert = async () => {
    try {
      setIsConverting(true);

      if (mode === 'sheet') {
        if (sheetImages.length === 0 && sheetTexts.length === 0) {
          alert('Please add at least one image or text label to the paper sheet.');
          return;
        }

        const pdfBytes = await convertPaperSheetToPdf(
          pageWidth,
          pageHeight,
          sheetImages,
          sheetTexts
        );
        downloadFile(pdfBytes, `paper_sheet_layout_${sheetPaper.toLowerCase()}.pdf`);
        setSuccessMessage('Successfully exported custom 1-sheet PDF with all adjusted images and text!');
      } else {
        if (images.length === 0) {
          alert('Please upload images to convert.');
          return;
        }

        const pdfBytes = await convertImagesToPdf(images, {
          pageSize,
          orientation,
          marginPt,
        });
        downloadFile(pdfBytes, `images_batch_${images.length}_pages.pdf`);
        setSuccessMessage(`Successfully converted ${images.length} images into multi-page PDF!`);
      }

      setTimeout(() => setSuccessMessage(null), 4500);
    } catch (err: any) {
      alert(`Error generating PDF: ${err?.message || err}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tool Header Card with Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Image to PDF Converter</h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md">
              Draggable Paper Layout &amp; Write on Image
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Place multiple images (e.g. Pakistani CNIC front &amp; back, passport bio page, ID cards) on a single paper sheet with draggable adjustment, or write text and stamps directly on any image.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadCnicSample}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-xs"
            title="Load realistic Pakistani CNIC Front and Back sample cards on 1 page"
          >
            <IdCard className="w-4 h-4 text-blue-600" />
            <span>Load CNIC / ID Card Sample (Front &amp; Back)</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white rounded-xl px-4 py-2 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('sheet')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'sheet'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Multi-Image on 1 Sheet (CNIC, ID, Passport Copy)</span>
            {sheetImages.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${mode === 'sheet' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {sheetImages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode('single-page')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'single-page'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1 Image Per Page (Multi-page PDF Batch)</span>
            {images.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${mode === 'single-page' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {images.length}
              </span>
            )}
          </button>
        </div>

        {/* Upload quick button in tab bar */}
        <div>
          <button
            type="button"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = 'image/*';
              input.onchange = (e: any) => handleFiles(e.target.files);
              input.click();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Add Images</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MULTI-IMAGE ON 1 SHEET (CNIC / ID / PASSPORT DRAGGABLE CANVAS) */}
      {/* ========================================================================= */}
      {mode === 'sheet' && (
        <div className="space-y-5">
          {/* Paper Canvas Settings & Presets Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Paper Size & Orientation */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Paper Format
                </label>
                <select
                  value={sheetPaper}
                  onChange={(e) => setSheetPaper(e.target.value as any)}
                  className="text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A4">A4 (Standard 210 × 297 mm)</option>
                  <option value="Letter">US Letter (8.5 × 11 in)</option>
                  <option value="Legal">US Legal (8.5 × 14 in)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Orientation
                </label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSheetOrientation('portrait')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      sheetOrientation === 'portrait'
                        ? 'bg-white text-blue-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheetOrientation('landscape')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      sheetOrientation === 'landscape'
                        ? 'bg-white text-blue-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Layout Presets */}
              <div className="h-8 w-px bg-slate-200 hidden md:block mx-1" />

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Layout Presets
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={applyCnicPreset}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    title="Arranges 2 cards centered vertically (CNIC Front on top, Back on bottom)"
                  >
                    <IdCard className="w-3.5 h-3.5 text-blue-600" />
                    <span>CNIC 2-in-1 Stacked</span>
                  </button>

                  <button
                    type="button"
                    onClick={applySideBySidePreset}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    title="Place 2 images side-by-side"
                  >
                    <Grid className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Side-by-Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={applyGridPreset}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    title="Place 4 images in a 2x2 grid"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>4-on-1 Grid</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Actions & Quick Stamps */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddText()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                title="Add a custom draggable text label"
              >
                <Type className="w-3.5 h-3.5" />
                <span>+ Add Text</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAddText('ATTESTED & VERIFIED', {
                    color: '#dc2626',
                    backgroundColor: 'stamp',
                    fontSize: 13,
                  })
                }
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                title="Quick stamp on page"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                <span>+ Stamp "ATTESTED"</span>
              </button>

              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSheetZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-2 text-slate-600">
                  {Math.round(sheetZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setSheetZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowGuidelines((g) => !g)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  showGuidelines
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle margin guidelines"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Drag & Drop Paper Sheet Area */}
          <div className="bg-slate-200/80 rounded-2xl p-6 overflow-auto flex flex-col items-center justify-center min-h-[550px] border border-slate-300">
            {/* Quick helper tip banner */}
            <div className="text-xs text-slate-600 mb-3 flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <Move className="w-3.5 h-3.5 text-blue-600" />
              <span>
                <strong>Drag &amp; Adjust:</strong> Click any card to move, rotate, resize, or click <strong>"✍️ Write on Image"</strong> in its top bar to stamp writing directly onto it!
              </span>
            </div>

            {/* Paper Sheet Representation */}
            <div
              ref={paperRef}
              style={{
                width: `${pageWidth}px`,
                height: `${pageHeight}px`,
                transform: `scale(${sheetZoom})`,
                transformOrigin: 'top center',
              }}
              onClick={() => setSelectedElementId(null)}
              className="relative bg-white shadow-2xl rounded-xs select-none border border-slate-300 transition-transform duration-75"
            >
              {/* Guidelines / Printable Margins (30pt) */}
              {showGuidelines && (
                <div
                  style={{
                    position: 'absolute',
                    top: 30,
                    left: 30,
                    right: 30,
                    bottom: 30,
                  }}
                  className="border border-dashed border-blue-200 pointer-events-none"
                >
                  <div className="absolute top-1 left-2 text-[9px] font-mono text-blue-400">
                    PRINTABLE AREA ({sheetPaper} {sheetOrientation})
                  </div>
                  <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-slate-200 pointer-events-none" />
                </div>
              )}

              {/* Render Images on the Paper */}
              {sheetImages.map((img) => {
                const isSelected = selectedElementId === img.id;
                return (
                  <div
                    key={img.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(img.id);
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(img.id);
                      dragRef.current = {
                        activeId: img.id,
                        type: 'move-img',
                        startX: e.clientX,
                        startY: e.clientY,
                        elemStartX: img.x,
                        elemStartY: img.y,
                        elemStartW: img.width,
                        elemStartH: img.height,
                        aspectRatio: img.width / (img.height || 1),
                      };
                    }}
                    style={{
                      position: 'absolute',
                      left: `${img.x}px`,
                      top: `${img.y}px`,
                      width: `${img.width}px`,
                      height: `${img.height}px`,
                      cursor: 'move',
                    }}
                    className={`group rounded-sm transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-blue-600 shadow-lg z-20'
                        : 'hover:ring-1 hover:ring-blue-400 z-10'
                    }`}
                  >
                    {/* The image bitmap */}
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      style={{
                        transform: `rotate(${img.rotation}deg)`,
                      }}
                      className="w-full h-full object-contain pointer-events-none bg-white/40"
                    />

                    {/* Active Element Top Toolbar */}
                    {isSelected && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute -top-11 left-0 flex items-center gap-1 bg-slate-900/95 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[11px] shadow-xl pointer-events-auto z-40"
                      >
                        <span className="font-semibold text-slate-200 max-w-[100px] truncate mr-1">
                          {img.name}
                        </span>

                        {/* Dedicated Write on this Image button */}
                        <button
                          type="button"
                          onClick={() => handleOpenWriteOnImage(img.imageId)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition-colors"
                          title="Open editor to write text or stamps directly on this image"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Write on Image</span>
                        </button>

                        {/* Add quick text label directly over this card */}
                        <button
                          type="button"
                          onClick={() => handleAddTextOnCard(img)}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded transition-colors"
                          title="Stamp text label on top of this card on the paper"
                        >
                          <Type className="w-3 h-3" />
                          <span>+ Card Text</span>
                        </button>

                        <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                        <button
                          type="button"
                          onClick={() => handleRotateImageElem(img.id)}
                          className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-200 hover:text-white"
                          title="Rotate 90 degrees"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={centerSelectedImage}
                          className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-200 hover:text-white"
                          title="Center horizontally"
                        >
                          <AlignCenter className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveLayer(img.id, 'front')}
                          className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-200 hover:text-white"
                          title="Bring to Front"
                        >
                          <ArrowRight className="w-3 h-3 rotate-[-90deg]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveLayer(img.id, 'back')}
                          className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-200 hover:text-white"
                          title="Send to Back"
                        >
                          <ArrowRight className="w-3 h-3 rotate-90" />
                        </button>

                        <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                        <button
                          type="button"
                          onClick={() => handleDeleteElement(img.id)}
                          className="p-1 hover:bg-red-700/80 rounded transition-colors text-red-300 hover:text-white"
                          title="Delete card"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Resize Handle (Bottom-Right Corner) */}
                    {isSelected && (
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          dragRef.current = {
                            activeId: img.id,
                            type: 'resize-img',
                            startX: e.clientX,
                            startY: e.clientY,
                            elemStartX: img.x,
                            elemStartY: img.y,
                            elemStartW: img.width,
                            elemStartH: img.height,
                            aspectRatio: img.width / (img.height || 1),
                          };
                        }}
                        className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-600 rounded-full border-2 border-white cursor-se-resize shadow-md flex items-center justify-center hover:scale-125 transition-transform z-30"
                        title="Drag to resize"
                      >
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Render Texts on the Paper (z-30 / z-40 so always above images!) */}
              {sheetTexts.map((txt) => {
                const isSelected = selectedElementId === txt.id;

                let bgClasses = 'bg-transparent';
                if (txt.backgroundColor === 'white') {
                  bgClasses = 'bg-white/95 border border-slate-300 shadow-xs rounded-sm';
                } else if (txt.backgroundColor === 'yellow') {
                  bgClasses = 'bg-amber-100 border border-amber-300 shadow-xs rounded-sm';
                } else if (txt.backgroundColor === 'stamp') {
                  bgClasses = 'bg-white/90 border-2 shadow-xs rounded-xs font-bold uppercase tracking-wider';
                }

                return (
                  <div
                    key={txt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(txt.id);
                    }}
                    style={{
                      position: 'absolute',
                      left: `${txt.x}px`,
                      top: `${txt.y}px`,
                      borderColor: txt.backgroundColor === 'stamp' ? txt.color : undefined,
                    }}
                    className={`group inline-flex items-center transition-all z-30 ${bgClasses} ${
                      isSelected
                        ? 'ring-2 ring-blue-500 shadow-md z-40'
                        : 'hover:ring-1 hover:ring-slate-300'
                    }`}
                  >
                    {/* Draggable Grip Handle */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(txt.id);
                        dragRef.current = {
                          activeId: txt.id,
                          type: 'move-txt',
                          startX: e.clientX,
                          startY: e.clientY,
                          elemStartX: txt.x,
                          elemStartY: txt.y,
                          elemStartW: 0,
                          elemStartH: 0,
                          aspectRatio: 1,
                        };
                      }}
                      className="cursor-move p-1 text-slate-400 hover:text-slate-800"
                      title="Drag text position anywhere on paper or over cards"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {/* Inline Text Input */}
                    <input
                      type="text"
                      value={txt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSheetTexts((prev) =>
                          prev.map((t) => (t.id === txt.id ? { ...t, text: val } : t))
                        );
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{
                        fontSize: `${txt.fontSize}px`,
                        color: txt.color,
                        fontWeight: txt.isBold ? 700 : 400,
                      }}
                      className="bg-transparent border-none outline-hidden px-1.5 py-0.5 min-w-[140px] font-sans"
                    />

                    {/* Text Formatting Toolbar when Selected */}
                    {isSelected && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute -top-10 left-0 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-xs text-white px-2 py-1 rounded-lg text-[11px] shadow-xl pointer-events-auto z-50 whitespace-nowrap"
                      >
                        {/* Font size */}
                        <select
                          value={txt.fontSize}
                          onChange={(e) => {
                            const size = Number(e.target.value);
                            setSheetTexts((prev) =>
                              prev.map((t) => (t.id === txt.id ? { ...t, fontSize: size } : t))
                            );
                          }}
                          className="bg-slate-800 text-white text-[10px] rounded px-1 py-0.5 border border-slate-700"
                        >
                          <option value={9}>9 pt</option>
                          <option value={11}>11 pt</option>
                          <option value={12}>12 pt</option>
                          <option value={14}>14 pt</option>
                          <option value={16}>16 pt</option>
                          <option value={20}>20 pt</option>
                          <option value={24}>24 pt</option>
                        </select>

                        {/* Bold */}
                        <button
                          type="button"
                          onClick={() =>
                            setSheetTexts((prev) =>
                              prev.map((t) => (t.id === txt.id ? { ...t, isBold: !t.isBold } : t))
                            )
                          }
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            txt.isBold ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          B
                        </button>

                        {/* Color presets */}
                        {['#0f172a', '#dc2626', '#0369a1', '#15803d', '#d97706'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() =>
                              setSheetTexts((prev) =>
                                prev.map((t) => (t.id === txt.id ? { ...t, color } : t))
                              )
                            }
                            style={{ backgroundColor: color }}
                            className={`w-3.5 h-3.5 rounded-full border ${
                              txt.color === color ? 'border-white scale-110' : 'border-transparent'
                            }`}
                          />
                        ))}

                        <div className="w-px h-3 bg-slate-700 mx-0.5" />

                        {/* Background Style: None, White box, Stamp box */}
                        <select
                          value={txt.backgroundColor || 'none'}
                          onChange={(e) => {
                            const bg = e.target.value as any;
                            setSheetTexts((prev) =>
                              prev.map((t) => (t.id === txt.id ? { ...t, backgroundColor: bg } : t))
                            );
                          }}
                          className="bg-slate-800 text-white text-[10px] rounded px-1 py-0.5 border border-slate-700"
                        >
                          <option value="none">No Background</option>
                          <option value="white">White Box</option>
                          <option value="yellow">Yellow Highlight</option>
                          <option value="stamp">Stamp Border</option>
                        </select>

                        <div className="w-px h-3 bg-slate-700 mx-0.5" />

                        {/* Delete text */}
                        <button
                          type="button"
                          onClick={() => handleDeleteElement(txt.id)}
                          className="p-0.5 text-red-300 hover:text-white hover:bg-red-700/80 rounded"
                          title="Delete text"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty state hint on paper if zero images and texts */}
              {sheetImages.length === 0 && sheetTexts.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">
                    Empty Paper Sheet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mb-3">
                    Click "Load CNIC / ID Card Sample" above or "+ Add Images" to place photos, CNIC cards, or passport scans on this page.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Export Actions Bar for Sheet Mode */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {sheetImages.length} {sheetImages.length === 1 ? 'image' : 'images'} &amp;{' '}
                  {sheetTexts.length} {sheetTexts.length === 1 ? 'text label' : 'text labels'} on 1 {sheetPaper} Sheet
                </p>
                <p className="text-[11px] text-slate-500">
                  {sheetPaper} ({pageWidth.toFixed(0)} × {pageHeight.toFixed(0)} pt) · {sheetOrientation}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setSheetImages([]);
                  setSheetTexts([]);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Clear Sheet
              </button>

              <button
                type="button"
                disabled={isConverting || (sheetImages.length === 0 && sheetTexts.length === 0)}
                onClick={handleConvert}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{isConverting ? 'Generating PDF...' : 'Download 1-Sheet PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: 1 IMAGE PER PAGE (STANDARD BATCH CONVERTER) */}
      {/* ========================================================================= */}
      {mode === 'single-page' && (
        <div className="space-y-6">
          {images.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-12 text-center bg-white transition-colors cursor-pointer group"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*';
                input.onchange = (e: any) => handleFiles(e.target.files);
                input.click();
              }}
            >
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Upload Image Files to Convert
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Drag and drop images here, or click to browse. Supports JPG, PNG, WEBP, and TIFF.
              </p>
              <button
                type="button"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              >
                Choose Image Files
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Settings Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Page Size */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Page Size
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as any)}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A4">A4 (Standard 210 × 297 mm)</option>
                    <option value="Letter">US Letter (8.5 × 11 in)</option>
                    <option value="fit">Fit to Image Size</option>
                    <option value="Legal">US Legal</option>
                    <option value="A3">A3 (Large)</option>
                    <option value="A5">A5 (Compact)</option>
                  </select>
                </div>

                {/* Orientation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Orientation
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Auto (Match Image)</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                {/* Margins */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Page Margin
                  </label>
                  <select
                    value={marginPt}
                    onChange={(e) => setMarginPt(Number(e.target.value))}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>No Margin (Edge-to-Edge)</option>
                    <option value={15}>Small (15 pt)</option>
                    <option value={30}>Standard (30 pt)</option>
                    <option value={50}>Large (50 pt)</option>
                  </select>
                </div>

                {/* Add More Images Button */}
                <div className="flex items-end justify-start md:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*';
                      input.onchange = (e: any) => handleFiles(e.target.files);
                      input.click();
                    }}
                    className="w-full md:w-auto px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Add More Images</span>
                  </button>
                </div>
              </div>

              {/* Images Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col group hover:border-blue-400 transition-colors"
                  >
                    {/* Image preview box */}
                    <div className="relative aspect-4/3 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-2.5">
                      <img
                        src={img.processedDataUrl}
                        alt={img.name}
                        className="max-h-full max-w-full object-contain"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[11px] font-mono px-2 py-0.5 rounded-md">
                        Page {index + 1}
                      </div>
                      {img.crop && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                          Cropped
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 mb-3">
                      <p className="text-xs font-semibold text-slate-900 truncate" title={img.name}>
                        {img.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {img.width} × {img.height} px · {(img.size / 1024).toFixed(0)} KB
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5">
                      {/* Top action row: Move order & Delete */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveImageSingleMode(index, 'left')}
                            className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 rounded-md hover:bg-slate-100 transition-colors"
                            title="Move earlier"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === images.length - 1}
                            onClick={() => moveImageSingleMode(index, 'right')}
                            className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 rounded-md hover:bg-slate-100 transition-colors"
                            title="Move later"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeImageSingleMode(img.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Main action buttons: Write on Image & Edit/Crop */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenWriteOnImage(img)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shadow-2xs"
                          title="Write text, watermarks, or stamps directly on this image"
                        >
                          <PenTool className="w-3 h-3 text-blue-600" />
                          <span>Write</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingImage(img);
                            setModalInitialTab('crop');
                          }}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Crop & adjust image filters"
                        >
                          <Crop className="w-3 h-3" />
                          <span>Crop</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Convert Actions Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Ready to assemble {images.length} {images.length === 1 ? 'image' : 'images'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {pageSize} format · {orientation} orientation · {marginPt}pt margins
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setImages([])}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={handleConvert}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isConverting ? 'Generating PDF...' : 'Convert & Download PDF'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2.5 shadow-xs">
          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Interactive Crop & Write on Image Modal */}
      <ImageCropModal
        image={editingImage}
        isOpen={!!editingImage}
        initialTab={modalInitialTab}
        onClose={() => setEditingImage(null)}
        onSave={handleSaveCrop}
      />
    </div>
  );
};
