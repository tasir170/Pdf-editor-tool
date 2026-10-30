import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Type,
  Pen,
  Highlighter,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Eraser,
  Stamp,
  CheckSquare,
  FileSignature,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Sparkles,
  FileCheck,
  X,
  MousePointer,
  GripVertical,
} from 'lucide-react';
import type { Annotation, AnnotationType, TextAnnotation } from '../../types/pdf';
import { renderSinglePageHiRes, renderPdfPages, RenderedPage, ExtractedPdfTextItem } from '../../utils/pdfRenderer';
import { applyAnnotationsToPdf, downloadFile } from '../../utils/pdfLibOperations';
import { SignatureModal } from '../SignatureModal';
import { createSamplePdf } from '../../utils/sampleDocuments';

interface EditPdfToolProps {
  autoLoadSample?: boolean;
}

export const EditPdfTool: React.FC<EditPdfToolProps> = ({ autoLoadSample }) => {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0); // 0-based
  const [zoomScale, setZoomScale] = useState<number>(1.2);
  const [pageThumbnails, setPageThumbnails] = useState<RenderedPage[]>([]);

  // Page background hi-res render
  const [pageRender, setPageRender] = useState<{
    dataUrl: string;
    width: number;
    height: number;
    unscaledWidth: number;
    unscaledHeight: number;
    extractedTextItems: ExtractedPdfTextItem[];
  } | null>(null);

  const [convertedTextIds, setConvertedTextIds] = useState<Set<string>>(new Set());

  // Active Tool
  const [activeTool, setActiveTool] = useState<AnnotationType | 'select'>('text');

  // Tool settings
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [textSize, setTextSize] = useState<number>(14);
  const [textFontFamily, setTextFontFamily] = useState<'Helvetica' | 'Times' | 'Courier'>('Helvetica');
  const [textIsBold, setTextIsBold] = useState<boolean>(false);
  const [penColor, setPenColor] = useState<string>('#2563eb');
  const [penWidth, setPenWidth] = useState<number>(3);
  const [highlighterColor, setHighlighterColor] = useState<string>('#fde047');
  const [shapeColor, setShapeColor] = useState<string>('#dc2626');
  const [shapeWidth, setShapeWidth] = useState<number>(2);
  const [whiteoutColor, setWhiteoutColor] = useState<string>('#ffffff');

  // Annotations & History
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

  // Page rotations & deletions
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [deletedPages, setDeletedPages] = useState<number[]>([]);

  // Modals & States
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drawing tracking
  const isDrawingRef = useRef(false);
  const currentDrawPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number }[]>([]);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [shapeDragBox, setShapeDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Annotation dragging
  const [draggingAnn, setDraggingAnn] = useState<{
    id: string;
    startAnnX: number;
    startAnnY: number;
    startPointerX: number;
    startPointerY: number;
  } | null>(null);

  const handleAnnPointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedAnnId(id);
    const targetAnn = annotations.find((a) => a.id === id);
    if (!targetAnn) return;
    setDraggingAnn({
      id,
      startAnnX: targetAnn.x,
      startAnnY: targetAnn.y,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
    });
  };

  // Overlay container ref
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Save history snapshot
  const pushHistory = useCallback((newAnns: Annotation[]) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyStep + 1);
      return [...upToCurrent, newAnns];
    });
    setHistoryStep((s) => s + 1);
    setAnnotations(newAnns);
  }, [historyStep]);

  // Load and render PDF
  const loadPdf = async (name: string, data: Uint8Array) => {
    setIsLoading(true);
    try {
      const { pages: thumbs, numPages } = await renderPdfPages(data, 0.25);
      setPdfData(data);
      setFileName(name);
      setTotalPages(numPages);
      setPageThumbnails(thumbs);
      setCurrentPageIndex(0);
      setAnnotations([]);
      setHistory([]);
      setHistoryStep(-1);
      setPageRotations({});
      setDeletedPages([]);
    } catch (err: any) {
      alert(`Error loading PDF: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoadSample && !pdfData) {
      createSamplePdf('multipage').then((s) => loadPdf(s.name, s.data));
    }
  }, [autoLoadSample]);

  // Render current page when page index or zoom changes
  useEffect(() => {
    if (!pdfData) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const render = await renderSinglePageHiRes(pdfData, currentPageIndex + 1, zoomScale * 1.5);
        if (!isCancelled) {
          setPageRender(render);
        }
      } catch (err) {
        console.error('Failed to render page:', err);
      }
    };

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [pdfData, currentPageIndex, zoomScale]);

  // Convert existing static PDF text into an active editable & draggable writing box
  const handleEditExistingText = (item: ExtractedPdfTextItem) => {
    // 1. Cover original static text with matching whiteout box
    const whiteoutAnn: Annotation = {
      id: `whiteout-orig-${Date.now()}-${item.id}`,
      pageIndex: currentPageIndex,
      type: 'whiteout',
      x: Math.max(0, item.x - 2),
      y: Math.max(0, item.y - 1),
      width: item.width + 6,
      height: item.height + 4,
      strokeColor: 'transparent',
      fillColor: '#ffffff',
      strokeWidth: 0,
      opacity: 1,
    };

    // 2. Spawn editable writing box at exact location with original text
    const textAnn: TextAnnotation = {
      id: `text-orig-${Date.now()}-${item.id}`,
      pageIndex: currentPageIndex,
      type: 'text',
      x: item.x,
      y: item.y,
      text: item.str,
      fontSize: item.fontSize,
      color: '#0f172a',
      fontFamily: 'Helvetica',
      isBold: false,
    };

    setConvertedTextIds((prev) => new Set(prev).add(item.id));
    pushHistory([...annotations, whiteoutAnn, textAnn]);
    setSelectedAnnId(textAnn.id);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setAnnotations(history[prevStep]);
    } else if (historyStep === 0) {
      setHistoryStep(-1);
      setAnnotations([]);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setAnnotations(history[nextStep]);
    }
  };

  // Convert client click coordinate to PDF unscaled coordinate
  const getPdfCoords = (e: React.MouseEvent | React.PointerEvent) => {
    if (!canvasContainerRef.current || !pageRender) return { x: 0, y: 0 };
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Scale from displayed DOM width/height to unscaledWidth/unscaledHeight
    const scaleX = pageRender.unscaledWidth / rect.width;
    const scaleY = pageRender.unscaledHeight / rect.height;

    return {
      x: clickX * scaleX,
      y: clickY * scaleY,
    };
  };

  // Canvas Mouse Down / Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!pageRender) return;
    const coords = getPdfCoords(e);

    if (activeTool === 'text') {
      const newText: TextAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: currentPageIndex,
        type: 'text',
        x: coords.x,
        y: coords.y,
        text: '',
        fontSize: textSize,
        color: textColor,
        fontFamily: textFontFamily,
        isBold: textIsBold,
      };
      pushHistory([...annotations, newText]);
      setSelectedAnnId(newText.id);
      // Keep activeTool as text so user can keep adding or typing
    } else if (activeTool === 'draw' || activeTool === 'highlighter') {
      isDrawingRef.current = true;
      currentDrawPointsRef.current = [coords];
      setDrawPreview([coords]);
    } else if (
      activeTool === 'rectangle' ||
      activeTool === 'circle' ||
      activeTool === 'line' ||
      activeTool === 'arrow' ||
      activeTool === 'whiteout'
    ) {
      shapeStartRef.current = coords;
      setShapeDragBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pageRender) return;

    if (draggingAnn && canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const scaleX = pageRender.unscaledWidth / rect.width;
      const scaleY = pageRender.unscaledHeight / rect.height;
      const deltaX = (e.clientX - draggingAnn.startPointerX) * scaleX;
      const deltaY = (e.clientY - draggingAnn.startPointerY) * scaleY;
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === draggingAnn.id
            ? { ...a, x: Math.max(0, draggingAnn.startAnnX + deltaX), y: Math.max(0, draggingAnn.startAnnY + deltaY) }
            : a
        )
      );
      return;
    }

    const coords = getPdfCoords(e);

    if (isDrawingRef.current) {
      currentDrawPointsRef.current.push(coords);
      setDrawPreview([...currentDrawPointsRef.current]);
    } else if (shapeStartRef.current) {
      const start = shapeStartRef.current;
      const x = Math.min(start.x, coords.x);
      const y = Math.min(start.y, coords.y);
      const w = Math.abs(coords.x - start.x);
      const h = Math.abs(coords.y - start.y);
      setShapeDragBox({ x, y, w, h });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingAnn) {
      setDraggingAnn(null);
      pushHistory(annotations);
      return;
    }

    if (!pageRender) return;
    const coords = getPdfCoords(e);

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const pts = currentDrawPointsRef.current;
      if (pts.length > 1) {
        const isHighlighter = activeTool === 'highlighter';
        const newDrawAnn: Annotation = {
          id: `ann-${Date.now()}`,
          pageIndex: currentPageIndex,
          type: activeTool as any,
          points: pts,
          color: isHighlighter ? highlighterColor : penColor,
          strokeWidth: isHighlighter ? 18 : penWidth,
          opacity: isHighlighter ? 0.45 : 1.0,
          x: pts[0].x,
          y: pts[0].y,
        };
        pushHistory([...annotations, newDrawAnn]);
      }
      currentDrawPointsRef.current = [];
      setDrawPreview([]);
    } else if (shapeStartRef.current) {
      const start = shapeStartRef.current;
      shapeStartRef.current = null;
      setShapeDragBox(null);

      const w = Math.abs(coords.x - start.x);
      const h = Math.abs(coords.y - start.y);

      if (activeTool === 'line' || activeTool === 'arrow') {
        if (Math.hypot(coords.x - start.x, coords.y - start.y) > 5) {
          const newLineAnn: Annotation = {
            id: `ann-${Date.now()}`,
            pageIndex: currentPageIndex,
            type: activeTool,
            x: start.x,
            y: start.y,
            endX: coords.x,
            endY: coords.y,
            color: shapeColor,
            strokeWidth: shapeWidth,
          };
          pushHistory([...annotations, newLineAnn]);
        }
      } else if (w > 5 && h > 5) {
        const x = Math.min(start.x, coords.x);
        const y = Math.min(start.y, coords.y);

        if (activeTool === 'whiteout') {
          const newWhiteout: Annotation = {
            id: `ann-${Date.now()}`,
            pageIndex: currentPageIndex,
            type: 'whiteout',
            x,
            y,
            width: w,
            height: h,
            strokeColor: 'transparent',
            fillColor: whiteoutColor,
            strokeWidth: 0,
            opacity: 1,
          };
          pushHistory([...annotations, newWhiteout]);
        } else if (activeTool === 'rectangle' || activeTool === 'circle') {
          const newShape: Annotation = {
            id: `ann-${Date.now()}`,
            pageIndex: currentPageIndex,
            type: activeTool,
            x,
            y,
            width: w,
            height: h,
            strokeColor: shapeColor,
            fillColor: '',
            strokeWidth: shapeWidth,
            opacity: 1,
          };
          pushHistory([...annotations, newShape]);
        }
      }
    }
  };

  // Add Stamp or Mark
  const addStamp = (text: string, color = '#16a34a') => {
    if (!pageRender) return;
    const newStamp: Annotation = {
      id: `ann-${Date.now()}`,
      pageIndex: currentPageIndex,
      type: 'stamp',
      text,
      color,
      size: 28,
      x: pageRender.unscaledWidth / 2 - 80,
      y: pageRender.unscaledHeight / 3,
    };
    pushHistory([...annotations, newStamp]);
    setSelectedAnnId(newStamp.id);
  };

  // Add Checkmark or Cross Mark
  const addFormMark = (type: 'checkmark' | 'cross') => {
    if (!pageRender) return;
    const newMark: Annotation = {
      id: `ann-${Date.now()}`,
      pageIndex: currentPageIndex,
      type,
      text: type === 'checkmark' ? '✓' : '✗',
      color: type === 'checkmark' ? '#16a34a' : '#dc2626',
      size: 22,
      x: pageRender.unscaledWidth / 2 - 15,
      y: pageRender.unscaledHeight / 2 - 15,
    };
    pushHistory([...annotations, newMark]);
    setSelectedAnnId(newMark.id);
  };

  // Insert Signature
  const handleInsertSignature = (dataUrl: string) => {
    if (!pageRender) return;
    const newSig: Annotation = {
      id: `ann-${Date.now()}`,
      pageIndex: currentPageIndex,
      type: 'image',
      dataUrl,
      width: 180,
      height: 70,
      x: pageRender.unscaledWidth / 2 - 90,
      y: pageRender.unscaledHeight - 140,
    };
    pushHistory([...annotations, newSig]);
    setSelectedAnnId(newSig.id);
  };

  // Insert Custom Image
  const handleInsertImage = (files: FileList | null) => {
    if (!files || files.length === 0 || !pageRender) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        const targetW = 160;
        const targetH = targetW / aspect;
        const newImgAnn: Annotation = {
          id: `ann-${Date.now()}`,
          pageIndex: currentPageIndex,
          type: 'image',
          dataUrl,
          width: targetW,
          height: targetH,
          x: pageRender.unscaledWidth / 2 - targetW / 2,
          y: pageRender.unscaledHeight / 2 - targetH / 2,
        };
        pushHistory([...annotations, newImgAnn]);
        setSelectedAnnId(newImgAnn.id);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Update specific annotation
  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    const updated = annotations.map((ann) => (ann.id === id ? ({ ...ann, ...updates } as any) : ann));
    pushHistory(updated);
  };

  // Delete annotation
  const deleteAnnotation = (id: string) => {
    const remaining = annotations.filter((ann) => ann.id !== id);
    pushHistory(remaining);
    setSelectedAnnId(null);
  };

  // Rotate current page
  const rotateCurrentPage = () => {
    setPageRotations((prev) => ({
      ...prev,
      [currentPageIndex]: ((prev[currentPageIndex] || 0) + 90) % 360,
    }));
  };

  // Delete current page
  const deleteCurrentPage = () => {
    if (totalPages <= 1) {
      alert('Cannot delete the only page in the document.');
      return;
    }
    if (confirm(`Are you sure you want to delete Page ${currentPageIndex + 1}?`)) {
      setDeletedPages((prev) => [...prev, currentPageIndex]);
      if (currentPageIndex > 0) {
        setCurrentPageIndex((p) => p - 1);
      }
    }
  };

  // Save & Download Edited PDF
  const handleSave = async () => {
    if (!pdfData) return;
    setIsProcessing(true);

    try {
      const editedBytes = await applyAnnotationsToPdf(
        pdfData,
        annotations,
        pageRotations,
        deletedPages
      );
      downloadFile(editedBytes, `edited_${fileName || 'document.pdf'}`);
      setSuccessMsg('Successfully applied all edits and downloaded PDF!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Save error: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Annotations belonging to current page
  const currentPageAnnotations = annotations.filter((a) => a.pageIndex === currentPageIndex);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">PDF Editor</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Add text, signatures, freehand drawings, whiteout redactions, shapes, and stamps directly to your PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={async () => {
              const sample = await createSamplePdf('multipage');
              await loadPdf(sample.name, sample.data);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Contract</span>
          </button>
        </div>
      </div>

      {!pdfData ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.length) {
              const file = e.dataTransfer.files[0];
              file.arrayBuffer().then((buf) => loadPdf(file.name, new Uint8Array(buf)));
            }
          }}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-12 text-center bg-white transition-colors cursor-pointer group"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,application/pdf';
            input.onchange = (e: any) => {
              if (e.target.files?.length) {
                const file = e.target.files[0];
                file.arrayBuffer().then((buf: ArrayBuffer) => loadPdf(file.name, new Uint8Array(buf)));
              }
            };
            input.click();
          }}
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
            <Type className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {isLoading ? 'Rendering PDF for Editing...' : 'Upload PDF Document to Edit'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Click to upload your PDF, or drag and drop. All changes are rendered locally with complete privacy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              disabled={isLoading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              {isLoading ? 'Loading...' : 'Choose PDF File'}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                createSamplePdf('multipage').then((s) => loadPdf(s.name, s.data));
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Load Sample Contract (1-Click Demo)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Editing Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 sticky top-2 z-30">
            {/* Primary Editing Tools */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'select', label: 'Select / Move', icon: MousePointer },
                { id: 'text', label: 'Text', icon: Type },
                { id: 'draw', label: 'Pen', icon: Pen },
                { id: 'highlighter', label: 'Highlight', icon: Highlighter },
                { id: 'whiteout', label: 'Whiteout', icon: Eraser },
                { id: 'rectangle', label: 'Rectangle', icon: Square },
                { id: 'circle', label: 'Circle', icon: Circle },
                { id: 'line', label: 'Line', icon: Minus },
                { id: 'arrow', label: 'Arrow', icon: MoveUpRight },
              ].map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setActiveTool(tool.id as any)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Special Inserts */}
              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Create and place signature"
              >
                <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sign</span>
              </button>

              {/* Stamps Menu */}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Stamp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stamps</span>
                </button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:flex flex-col bg-white border border-slate-200 shadow-xl rounded-lg p-1.5 z-40 w-40">
                  {['APPROVED', 'CONFIDENTIAL', 'PAID', 'VOID', 'DRAFT'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addStamp(s, s === 'APPROVED' ? '#16a34a' : s === 'PAID' ? '#2563eb' : '#dc2626')}
                      className="text-left px-2.5 py-1.5 text-xs font-bold rounded-md hover:bg-slate-100 text-slate-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Checkmark & Cross */}
              <button
                type="button"
                onClick={() => addFormMark('checkmark')}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Insert Checkmark (✓)"
              >
                <span className="font-bold text-sm leading-none">✓</span>
              </button>
              <button
                type="button"
                onClick={() => addFormMark('cross')}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Insert Cross (✗)"
              >
                <span className="font-bold text-sm leading-none">✗</span>
              </button>

              {/* Insert Image */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => handleInsertImage(e.target.files);
                  input.click();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Insert logo or picture"
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Image</span>
              </button>
            </div>

            {/* Undo / Redo & Save Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={historyStep <= -1}
                onClick={handleUndo}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 rounded-md transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={historyStep >= history.length - 1}
                onClick={handleRedo}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 rounded-md transition-colors"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Saving...' : 'Apply & Download'}</span>
              </button>
            </div>
          </div>

          {/* Secondary Sub-toolbar for the active tool settings */}
          <div className="bg-slate-100/90 border border-slate-200 rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            {activeTool === 'select' && (
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-semibold text-blue-700">Select & Move Mode:</span>
                <span>Click any existing text or writing to edit it, or drag it to another place.</span>
              </div>
            )}

            {activeTool === 'text' && (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">Text Options:</span>
                <select
                  value={textFontFamily}
                  onChange={(e) => setTextFontFamily(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                >
                  <option value="Helvetica">Helvetica (Sans)</option>
                  <option value="Times">Times New Roman (Serif)</option>
                  <option value="Courier">Courier (Mono)</option>
                </select>

                <select
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                >
                  {[10, 12, 14, 16, 18, 20, 24, 28, 36].map((s) => (
                    <option key={s} value={s}>
                      {s} pt
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setTextIsBold(!textIsBold)}
                  className={`px-2 py-0.5 rounded font-bold border ${
                    textIsBold ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  B
                </button>

                <div className="flex items-center gap-1">
                  {['#0f172a', '#2563eb', '#dc2626', '#16a34a'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTextColor(c)}
                      className={`w-5 h-5 rounded-full border ${
                        textColor === c ? 'ring-2 ring-blue-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-slate-500">· Click existing text to edit · Drag grip to move writing</span>
              </div>
            )}

            {(activeTool === 'draw' || activeTool === 'highlighter') && (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">
                  {activeTool === 'highlighter' ? 'Highlighter' : 'Pen'} Color:
                </span>
                <div className="flex items-center gap-1">
                  {(activeTool === 'highlighter'
                    ? ['#fde047', '#86efac', '#f472b6', '#7dd3fc']
                    : ['#0f172a', '#2563eb', '#dc2626', '#16a34a']
                  ).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        activeTool === 'highlighter' ? setHighlighterColor(c) : setPenColor(c)
                      }
                      className="w-5 h-5 rounded-full border border-slate-300"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-slate-400">· Click and drag on page to draw</span>
              </div>
            )}

            {activeTool === 'whiteout' && (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">Whiteout / Redaction Fill:</span>
                <button
                  type="button"
                  onClick={() => setWhiteoutColor('#ffffff')}
                  className={`px-2.5 py-1 text-xs rounded border ${
                    whiteoutColor === '#ffffff'
                      ? 'bg-white font-bold border-slate-400 shadow-xs'
                      : 'bg-slate-200 border-transparent text-slate-700'
                  }`}
                >
                  Whiteout (White)
                </button>
                <button
                  type="button"
                  onClick={() => setWhiteoutColor('#000000')}
                  className={`px-2.5 py-1 text-xs rounded border ${
                    whiteoutColor === '#000000'
                      ? 'bg-black text-white font-bold border-black shadow-xs'
                      : 'bg-slate-200 border-transparent text-slate-700'
                  }`}
                >
                  Blackout (Redact)
                </button>
                <span className="text-slate-400">· Drag box over sensitive content</span>
              </div>
            )}

            {['rectangle', 'circle', 'line', 'arrow'].includes(activeTool) && (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">Shape Color:</span>
                <div className="flex items-center gap-1">
                  {['#dc2626', '#2563eb', '#0f172a', '#16a34a', '#ca8a04'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setShapeColor(c)}
                      className={`w-5 h-5 rounded-full border ${
                        shapeColor === c ? 'ring-2 ring-blue-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-slate-400">· Drag across page to draw shape</span>
              </div>
            )}

            {/* Navigation & Zoom controls */}
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={rotateCurrentPage}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
                title="Rotate page 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate</span>
              </button>

              <button
                type="button"
                onClick={deleteCurrentPage}
                className="flex items-center gap-1 text-slate-500 hover:text-red-600"
                title="Delete current page"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Page</span>
              </button>

              <div className="h-3 w-px bg-slate-300" />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPageIndex <= 0}
                  onClick={() => setCurrentPageIndex((p) => p - 1)}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-25"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono tabular-nums text-slate-700">
                  {currentPageIndex + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPageIndex >= totalPages - 1}
                  onClick={() => setCurrentPageIndex((p) => p + 1)}
                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-25"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="h-3 w-px bg-slate-300" />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.2))}
                  className="p-1 text-slate-600 hover:text-slate-900"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono tabular-nums text-slate-700 min-w-[36px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.2))}
                  className="p-1 text-slate-600 hover:text-slate-900"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Document Workspace */}
          <div className="bg-slate-200/80 rounded-xl p-6 min-h-[600px] flex items-center justify-center overflow-auto">
            {pageRender ? (
              <div
                ref={canvasContainerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative bg-white shadow-2xl rounded-xs select-none touch-none overflow-hidden"
                style={{
                  width: `${pageRender.unscaledWidth * zoomScale}px`,
                  height: `${pageRender.unscaledHeight * zoomScale}px`,
                  transform: `rotate(${pageRotations[currentPageIndex] || 0}deg)`,
                  transition: 'transform 150ms ease',
                  cursor:
                    activeTool === 'text'
                      ? 'text'
                      : activeTool === 'draw' || activeTool === 'highlighter'
                      ? 'crosshair'
                      : ['rectangle', 'circle', 'line', 'arrow', 'whiteout'].includes(activeTool)
                      ? 'crosshair'
                      : 'default',
                }}
              >
                {/* PDF Page High-Res Base Image */}
                <img
                  src={pageRender.dataUrl}
                  alt={`Page ${currentPageIndex + 1}`}
                  className="absolute inset-0 w-full h-full pointer-events-none object-contain"
                />

                {/* SVG Overlay for Vector Strokes and Shapes */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${pageRender.unscaledWidth} ${pageRender.unscaledHeight}`}
                >
                  {/* Rendered Annotations for this page */}
                  {currentPageAnnotations.map((ann) => {
                    if (ann.type === 'draw' || ann.type === 'highlighter') {
                      if (!ann.points || ann.points.length < 2) return null;
                      const pathData = ann.points.reduce(
                        (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
                        ''
                      );
                      return (
                        <path
                          key={ann.id}
                          d={pathData}
                          stroke={ann.color}
                          strokeWidth={ann.strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          opacity={ann.opacity}
                        />
                      );
                    } else if (ann.type === 'rectangle') {
                      return (
                        <rect
                          key={ann.id}
                          x={ann.x}
                          y={ann.y}
                          width={ann.width}
                          height={ann.height}
                          stroke={ann.strokeColor}
                          strokeWidth={ann.strokeWidth}
                          fill={ann.fillColor || 'transparent'}
                          opacity={ann.opacity}
                        />
                      );
                    } else if (ann.type === 'circle') {
                      return (
                        <ellipse
                          key={ann.id}
                          cx={ann.x + ann.width / 2}
                          cy={ann.y + ann.height / 2}
                          rx={ann.width / 2}
                          ry={ann.height / 2}
                          stroke={ann.strokeColor}
                          strokeWidth={ann.strokeWidth}
                          fill={ann.fillColor || 'transparent'}
                          opacity={ann.opacity}
                        />
                      );
                    } else if (ann.type === 'line' || ann.type === 'arrow') {
                      return (
                        <g key={ann.id}>
                          <line
                            x1={ann.x}
                            y1={ann.y}
                            x2={ann.endX}
                            y2={ann.endY}
                            stroke={ann.color}
                            strokeWidth={ann.strokeWidth}
                          />
                          {ann.type === 'arrow' && (
                            <circle cx={ann.endX} cy={ann.endY} r={ann.strokeWidth * 1.5} fill={ann.color} />
                          )}
                        </g>
                      );
                    } else if (ann.type === 'whiteout') {
                      return (
                        <rect
                          key={ann.id}
                          x={ann.x}
                          y={ann.y}
                          width={ann.width}
                          height={ann.height}
                          fill={ann.fillColor}
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Active Draw In-Progress */}
                  {drawPreview.length > 1 && (
                    <path
                      d={drawPreview.reduce(
                        (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
                        ''
                      )}
                      stroke={activeTool === 'highlighter' ? highlighterColor : penColor}
                      strokeWidth={activeTool === 'highlighter' ? 18 : penWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={activeTool === 'highlighter' ? 0.45 : 1}
                    />
                  )}

                  {/* Active Shape Drag Box */}
                  {shapeDragBox && (
                    <rect
                      x={shapeDragBox.x}
                      y={shapeDragBox.y}
                      width={shapeDragBox.w}
                      height={shapeDragBox.h}
                      stroke={activeTool === 'whiteout' ? '#94a3b8' : shapeColor}
                      strokeWidth={2}
                      strokeDasharray="4"
                      fill={activeTool === 'whiteout' ? whiteoutColor : 'transparent'}
                      opacity={0.8}
                    />
                  )}
                </svg>

                {/* Existing PDF Text Items: Click to Edit and Drag */}
                {pageRender?.extractedTextItems?.map((item) => {
                  if (convertedTextIds.has(item.id)) return null;
                  const scale = zoomScale;
                  return (
                    <div
                      key={item.id}
                      style={{
                        position: 'absolute',
                        left: `${item.x * scale}px`,
                        top: `${item.y * scale}px`,
                        width: `${item.width * scale}px`,
                        height: `${item.height * scale}px`,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handleEditExistingText(item);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditExistingText(item);
                      }}
                      className="absolute cursor-pointer border border-transparent hover:border-blue-500 hover:bg-blue-100/35 rounded-xs transition-colors group z-10"
                      title="Click on this writing to edit or drag it"
                    >
                      <div className="hidden group-hover:flex items-center gap-1 absolute -top-5 left-0 whitespace-nowrap bg-blue-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-xs z-30 pointer-events-none">
                        <span>Click to Edit Writing</span>
                      </div>
                    </div>
                  );
                })}

                {/* HTML Interactive Elements: Text, Stamps, Images */}
                {currentPageAnnotations.map((ann) => {
                  const scale = zoomScale;
                  const isSelected = selectedAnnId === ann.id;

                  if (ann.type === 'text') {
                    return (
                      <div
                        key={ann.id}
                        style={{
                          position: 'absolute',
                          left: `${ann.x * scale}px`,
                          top: `${ann.y * scale}px`,
                        }}
                        onPointerDown={(e) => {
                          // Allow dragging from the container border or drag handle
                          if ((e.target as HTMLElement).tagName !== 'INPUT') {
                            handleAnnPointerDown(ann.id, e);
                          }
                        }}
                        className={`group transition-shadow flex items-center bg-white/90 hover:bg-white border rounded px-1.5 py-0.5 shadow-xs z-20 ${
                          isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-white' : 'border-slate-300 hover:border-blue-400'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnId(ann.id);
                        }}
                      >
                        {/* Drag Handle */}
                        <div
                          onPointerDown={(e) => handleAnnPointerDown(ann.id, e)}
                          className="cursor-move hover:text-blue-600 pr-1 select-none flex items-center text-slate-400 hover:text-slate-700"
                          title="Click and drag writing to another place"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        {/* Editable Writing Input */}
                        <input
                          type="text"
                          value={ann.text}
                          autoFocus={isSelected}
                          placeholder="Type text..."
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAnnId(ann.id);
                          }}
                          onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                          style={{
                            fontSize: `${ann.fontSize * scale}px`,
                            color: ann.color,
                            fontWeight: ann.isBold ? 'bold' : 'normal',
                            fontFamily:
                              ann.fontFamily === 'Times'
                                ? 'Times New Roman, serif'
                                : ann.fontFamily === 'Courier'
                                ? 'Courier, monospace'
                                : 'Helvetica, Arial, sans-serif',
                            width: `${Math.max(60, (ann.text.length + 1) * ann.fontSize * scale * 0.65)}px`,
                          }}
                          className="bg-transparent focus:outline-hidden px-0.5 cursor-text text-slate-900 select-text"
                        />

                        {/* Delete button */}
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="w-4 h-4 text-slate-400 hover:text-red-600 transition-colors ml-1"
                          title="Delete writing"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  if (ann.type === 'stamp' || ann.type === 'checkmark' || ann.type === 'cross') {
                    return (
                      <div
                        key={ann.id}
                        onPointerDown={(e) => handleAnnPointerDown(ann.id, e)}
                        style={{
                          position: 'absolute',
                          left: `${ann.x * scale}px`,
                          top: `${ann.y * scale}px`,
                        }}
                        className="group cursor-grab flex items-center select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnId(ann.id);
                        }}
                        title="Click and drag to reposition"
                      >
                        <div
                          style={{
                            fontSize: `${ann.size * scale}px`,
                            color: ann.color,
                          }}
                          className={`font-bold select-none px-2 py-0.5 rounded ${
                            ann.type === 'stamp'
                              ? 'border-2 border-current uppercase tracking-wider bg-white/80 shadow-xs'
                              : ''
                          }`}
                        >
                          {ann.text}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  }

                  if (ann.type === 'image') {
                    return (
                      <div
                        key={ann.id}
                        onPointerDown={(e) => handleAnnPointerDown(ann.id, e)}
                        style={{
                          position: 'absolute',
                          left: `${ann.x * scale}px`,
                          top: `${ann.y * scale}px`,
                          width: `${ann.width * scale}px`,
                          height: `${ann.height * scale}px`,
                        }}
                        className="group cursor-grab border border-transparent hover:border-blue-400 relative select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnId(ann.id);
                        }}
                        title="Click and drag to reposition"
                      >
                        <img
                          src={ann.dataUrl}
                          alt="Annotation"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Rendering PDF page in high resolution...</span>
              </div>
            )}
          </div>

          {/* Success Toast */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleInsertSignature}
      />
    </div>
  );
};
