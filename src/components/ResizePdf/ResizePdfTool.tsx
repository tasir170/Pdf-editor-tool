import React, { useState } from 'react';
import {
  Upload,
  Maximize2,
  FileCheck,
  Download,
  Sparkles,
  Layers,
  Settings2,
  Check,
  Scale,
} from 'lucide-react';
import type { ResizeOptions } from '../../types/pdf';
import { resizePdfDocument, downloadFile, PAGE_SIZES } from '../../utils/pdfLibOperations';
import { renderPdfPages, RenderedPage } from '../../utils/pdfRenderer';
import { createSamplePdf } from '../../utils/sampleDocuments';
import { PDFDocument } from 'pdf-lib';

interface ResizePdfToolProps {
  autoLoadSample?: boolean;
}

export const ResizePdfTool: React.FC<ResizePdfToolProps> = ({ autoLoadSample }) => {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [firstPageThumbnail, setFirstPageThumbnail] = useState<string | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ widthPt: number; heightPt: number } | null>(null);

  React.useEffect(() => {
    if (autoLoadSample && !pdfData) {
      handleLoadSample();
    }
  }, [autoLoadSample]);

  // Resize Options
  const [targetSize, setTargetSize] = useState<'A4' | 'Letter' | 'Legal' | 'A3' | 'A5' | 'Custom'>('A4');
  const [customWidthMm, setCustomWidthMm] = useState<number>(210);
  const [customHeightMm, setCustomHeightMm] = useState<number>(297);
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [marginPt, setMarginPt] = useState<number>(25);
  const [scaleMode, setScaleMode] = useState<'fit' | 'fill' | 'none'>('fit');
  const [pageRange, setPageRange] = useState<string>('all');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load PDF
  const loadPdf = async (name: string, data: Uint8Array) => {
    setIsLoading(true);
    try {
      const doc = await PDFDocument.load(data);
      const count = doc.getPageCount();
      const firstPage = doc.getPage(0);
      const size = firstPage.getSize();

      const { pages } = await renderPdfPages(data, 0.5, 1);

      setPdfData(data);
      setFileName(name);
      setTotalPages(count);
      setOrigDimensions({ widthPt: Math.round(size.width), heightPt: Math.round(size.height) });
      if (pages.length > 0) {
        setFirstPageThumbnail(pages[0].dataUrl);
      }
    } catch (err: any) {
      alert(`Error loading PDF: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInput = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const buffer = await file.arrayBuffer();
    await loadPdf(file.name, new Uint8Array(buffer));
  };

  const handleLoadSample = async () => {
    const sample = await createSamplePdf('report');
    await loadPdf(sample.name, sample.data);
  };

  // Target size in points
  const getTargetPoints = () => {
    if (targetSize === 'Custom') {
      return [customWidthMm * 2.83465, customHeightMm * 2.83465];
    }
    return PAGE_SIZES[targetSize] || PAGE_SIZES.A4;
  };

  const [targetW, targetH] = getTargetPoints();

  // Execute Resize
  const handleResize = async () => {
    if (!pdfData) return;
    setIsProcessing(true);

    try {
      const options: ResizeOptions = {
        pageSize: targetSize,
        customWidthMm: targetSize === 'Custom' ? customWidthMm : undefined,
        customHeightMm: targetSize === 'Custom' ? customHeightMm : undefined,
        orientation,
        marginPt,
        scaleMode,
        pageRange,
      };

      const resizedBytes = await resizePdfDocument(pdfData, options);
      downloadFile(resizedBytes, `resized_${targetSize}_${fileName || 'document.pdf'}`);
      setSuccessMsg(`Document successfully resized to ${targetSize}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Resize error: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Resize PDF Pages</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Change PDF page dimensions to A4, US Letter, Legal, or custom sizes. Add margins, adjust padding, and scale content seamlessly.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample PDF</span>
          </button>
        </div>
      </div>

      {!pdfData ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileInput(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-2xl p-12 text-center bg-white transition-colors cursor-pointer group"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,application/pdf';
            input.onchange = (e: any) => handleFileInput(e.target.files);
            input.click();
          }}
        >
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
            <Maximize2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {isLoading ? 'Analyzing PDF Dimensions...' : 'Select PDF File to Resize'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Upload any document to resize its pages to standard formats like A4, Letter, Legal, or custom dimensions.
          </p>
          <button
            type="button"
            disabled={isLoading}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-xs"
          >
            {isLoading ? 'Processing...' : 'Choose PDF File'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Target Size Presets */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Target Page Size
                  </label>
                  <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {Math.round(targetW)} × {Math.round(targetH)} pt
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'A4', name: 'A4', desc: '210 × 297 mm' },
                    { id: 'Letter', name: 'US Letter', desc: '8.5 × 11 in' },
                    { id: 'Legal', name: 'US Legal', desc: '8.5 × 14 in' },
                    { id: 'A3', name: 'A3', desc: '297 × 420 mm' },
                    { id: 'A5', name: 'A5', desc: '148 × 210 mm' },
                    { id: 'Custom', name: 'Custom Size', desc: 'Specify mm' },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setTargetSize(size.id as any)}
                      className={`p-3 text-left border rounded-xl transition-all ${
                        targetSize === size.id
                          ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900">{size.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{size.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Dimensions if selected */}
                {targetSize === 'Custom' && (
                  <div className="pt-2 grid grid-cols-2 gap-4 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Width (mm)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="1000"
                        value={customWidthMm}
                        onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Height (mm)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="1000"
                        value={customHeightMm}
                        onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Layout & Margin Settings */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider block">
                  Page Layout & Scaling
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Orientation */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Orientation
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as any)}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <option value="auto">Auto (Preserve Original)</option>
                      <option value="portrait">Force Portrait</option>
                      <option value="landscape">Force Landscape</option>
                    </select>
                  </div>

                  {/* Scaling Mode */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Scaling Mode
                    </label>
                    <select
                      value={scaleMode}
                      onChange={(e) => setScaleMode(e.target.value as any)}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <option value="fit">Fit Content & Add Margins (Recommended)</option>
                      <option value="fill">Fill Entire Page</option>
                      <option value="none">Center Content Without Scaling</option>
                    </select>
                  </div>
                </div>

                {/* Margins */}
                <div>
                  <div className="flex justify-between items-center text-xs text-slate-700 mb-1">
                    <span className="font-medium">Added Page Margins / Padding</span>
                    <span className="font-mono tabular-nums">{marginPt} pt (~{(marginPt / 2.83).toFixed(1)} mm)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={marginPt}
                    onChange={(e) => setMarginPt(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Edge to Edge (0 pt)</span>
                    <span>Small (15 pt)</span>
                    <span>Standard (30 pt)</span>
                    <span>Large (60 pt)</span>
                  </div>
                </div>

                {/* Page Range */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Apply to Pages
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder='e.g. "all" or "1-3, 5"'
                      className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                    />
                    <span className="text-[11px] text-slate-400">
                      Total: {totalPages} pages
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Live Visual Comparison Preview */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col">
              <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-4">
                Visual Comparison Preview
              </label>

              <div className="flex-1 bg-slate-100 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Visual Target Container */}
                <div
                  className="bg-white border-2 border-dashed border-purple-500 rounded-sm shadow-md flex items-center justify-center relative transition-all duration-300"
                  style={{
                    width: '180px',
                    height: `${Math.min(260, Math.max(120, (targetH / targetW) * 180))}px`,
                    padding: `${Math.min(30, (marginPt / 72) * 20)}px`,
                  }}
                >
                  {/* Inside content card representation */}
                  {firstPageThumbnail ? (
                    <img
                      src={firstPageThumbnail}
                      alt="Thumbnail"
                      className="max-h-full max-w-full object-contain shadow-xs border border-slate-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                      Page Content
                    </div>
                  )}

                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-mono text-purple-700 font-semibold">
                    Target: {targetSize}
                  </div>
                </div>
              </div>

              {/* Comparison stats */}
              {origDimensions && (
                <div className="mt-6 pt-4 border-t border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Original Size:</span>
                    <span className="font-mono tabular-nums text-slate-800">
                      {origDimensions.widthPt} × {origDimensions.heightPt} pt
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>New Target Size:</span>
                    <span className="font-mono tabular-nums text-purple-700 font-bold">
                      {Math.round(targetW)} × {Math.round(targetH)} pt
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Pages:</span>
                    <span className="font-mono tabular-nums text-slate-800">{totalPages} pages</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Ready to resize document to {targetSize}
                </p>
                <p className="text-[11px] text-slate-500">
                  Vector pages are embedded losslessly without DPI degradation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setPdfData(null);
                  setFirstPageThumbnail(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Change Document
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleResize}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Resizing Pages...' : 'Resize & Download PDF'}</span>
              </button>
            </div>
          </div>

          {/* Success toast */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
