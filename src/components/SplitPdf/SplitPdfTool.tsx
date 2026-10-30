import React, { useState } from 'react';
import {
  Upload,
  Scissors,
  CheckCircle2,
  FileCheck,
  Download,
  Sparkles,
  Archive,
  Layers,
  FileText,
  ListFilter,
} from 'lucide-react';
import type { SplitMode } from '../../utils/pdfLibOperations';
import { splitPdfDocument, downloadFile } from '../../utils/pdfLibOperations';
import { renderPdfPages, RenderedPage } from '../../utils/pdfRenderer';
import { createSamplePdf } from '../../utils/sampleDocuments';
import { PageZoomModal } from '../PageZoomModal';

interface SplitPdfToolProps {
  autoLoadSample?: boolean;
}

export const SplitPdfTool: React.FC<SplitPdfToolProps> = ({ autoLoadSample }) => {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [splitMode, setSplitMode] = useState<SplitMode>('selected');
  const [rangesText, setRangesText] = useState<string>('1-2, 3');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [zoomPage, setZoomPage] = useState<RenderedPage | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (autoLoadSample && !pdfData) {
      handleLoadSample();
    }
  }, [autoLoadSample]);

  // Load and render PDF
  const loadPdf = async (name: string, data: Uint8Array) => {
    setIsLoading(true);
    try {
      const { pages: rendered } = await renderPdfPages(data, 0.45);
      setPdfData(data);
      setFileName(name);
      setPages(rendered);
      // Default: select first page
      setSelectedPages(new Set([1]));
      if (rendered.length > 2) {
        setRangesText(`1-2, 3-${rendered.length}`);
      } else {
        setRangesText('1, 2');
      }
    } catch (err: any) {
      alert(`Error reading PDF: ${err?.message || err}`);
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
    const sample = await createSamplePdf('multipage');
    await loadPdf(sample.name, sample.data);
  };

  // Toggle page selection in visual picker
  const togglePageSelection = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPages(new Set(pages.map((p) => p.pageNumber)));
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  // Execute Split
  const handleSplit = async () => {
    if (!pdfData) return;
    setIsProcessing(true);

    try {
      if (splitMode === 'selected') {
        const indices = Array.from(selectedPages)
          .sort((a, b) => a - b)
          .map((p) => p - 1);

        if (indices.length === 0) {
          alert('Please click on at least one page to extract.');
          setIsProcessing(false);
          return;
        }

        const res = await splitPdfDocument(pdfData, 'selected', { selectedIndices: indices });
        if (res.singlePdf) {
          downloadFile(res.singlePdf, `extracted_${indices.length}_pages_${fileName}`);
          setSuccessMsg(`Extracted ${indices.length} pages into a new PDF!`);
        }
      } else if (splitMode === 'all') {
        const res = await splitPdfDocument(pdfData, 'all', {});
        if (res.zipBlob) {
          downloadFile(res.zipBlob, `split_all_pages_${pages.length}.zip`, 'application/zip');
          setSuccessMsg(`Extracted all ${pages.length} pages into a ZIP archive!`);
        }
      } else if (splitMode === 'ranges') {
        const res = await splitPdfDocument(pdfData, 'ranges', { rangesText });
        if (res.singlePdf) {
          downloadFile(res.singlePdf, `range_split_${fileName}`);
          setSuccessMsg('Range extracted into new PDF!');
        } else if (res.zipBlob) {
          downloadFile(res.zipBlob, `ranges_split_${res.count}_files.zip`, 'application/zip');
          setSuccessMsg(`Split into ${res.count} PDFs inside a ZIP archive!`);
        }
      }

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Split error: ${err?.message || err}`);
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
            <h2 className="text-xl font-bold text-slate-900">Split PDF</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Extract selected pages, split individual pages into separate files, or define custom page ranges to divide your document.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample PDF</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      {!pdfData ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileInput(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-12 text-center bg-white transition-colors cursor-pointer group"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,application/pdf';
            input.onchange = (e: any) => handleFileInput(e.target.files);
            input.click();
          }}
        >
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
            <Scissors className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {isLoading ? 'Loading & Scanning PDF...' : 'Select PDF File to Split'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Choose a multi-page PDF document to visually pick pages or split into multiple files.
          </p>
          <button
            type="button"
            disabled={isLoading}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
          >
            {isLoading ? 'Processing...' : 'Choose PDF File'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Split Mode Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-full md:w-auto">
              <button
                type="button"
                onClick={() => setSplitMode('selected')}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  splitMode === 'selected'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Visual Selection ({selectedPages.size})</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('all')}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  splitMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Extract Every Page</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('ranges')}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  splitMode === 'ranges'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5 text-amber-600" />
                <span>Split by Range</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 w-full md:w-auto justify-end">
              <span>{fileName}</span>
              <span>·</span>
              <span className="font-mono tabular-nums">{pages.length} pages</span>
            </div>
          </div>

          {/* Mode-specific configuration */}
          {splitMode === 'selected' && (
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span>
                Click on the pages you want to extract into the new document:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-amber-700 hover:underline font-medium"
                >
                  Select All
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-slate-500 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {splitMode === 'ranges' && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs space-y-2">
              <label className="block font-semibold text-amber-900">
                Define Custom Page Ranges:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rangesText}
                  onChange={(e) => setRangesText(e.target.value)}
                  placeholder="e.g. 1-2, 3"
                  className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-amber-700 text-[11px]">
                Separate multiple files with commas. Example: <code className="font-mono bg-white px-1 py-0.5 rounded">1-2, 3</code> creates two files: one with pages 1–2, and one with page 3.
              </p>
            </div>
          )}

          {splitMode === 'all' && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 flex items-center gap-3">
              <Archive className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold">Extract all {pages.length} pages as standalone PDFs</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Each page will be saved as <code className="font-mono">page_1.pdf</code>, <code className="font-mono">page_2.pdf</code>, etc., packaged in a convenient .ZIP file.
                </p>
              </div>
            </div>
          )}

          {/* Visual Thumbnails Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {pages.map((p) => {
              const isSelected = selectedPages.has(p.pageNumber);
              return (
                <div
                  key={p.pageNumber}
                  onClick={() => {
                    if (splitMode === 'selected') {
                      togglePageSelection(p.pageNumber);
                    } else {
                      setZoomPage(p);
                    }
                  }}
                  className={`bg-white rounded-xl p-2.5 shadow-xs flex flex-col transition-all cursor-pointer border-2 relative group ${
                    splitMode === 'selected' && isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="relative aspect-3/4 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-2">
                    <img
                      src={p.dataUrl}
                      alt={`Page ${p.pageNumber}`}
                      className="max-h-full max-w-full object-contain select-none"
                    />

                    {/* Badge */}
                    <div className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                      Page {p.pageNumber}
                    </div>

                    {/* Selection Indicator Checkbox */}
                    {splitMode === 'selected' && (
                      <div
                        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-amber-600 text-white' : 'bg-black/30 text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <span className="text-[11px] font-medium text-slate-700">
                      Page {p.pageNumber}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {splitMode === 'selected' && `Extract ${selectedPages.size} selected pages`}
                  {splitMode === 'all' && `Extract all ${pages.length} individual pages`}
                  {splitMode === 'ranges' && `Split document using ranges: "${rangesText}"`}
                </p>
                <p className="text-[11px] text-slate-500">
                  Client-side generation · High-fidelity vector PDF preservation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setPdfData(null);
                  setPages([]);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Change Document
              </button>
              <button
                type="button"
                disabled={isProcessing || (splitMode === 'selected' && selectedPages.size === 0)}
                onClick={handleSplit}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Splitting Pages...' : 'Split & Download'}</span>
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

      {/* Zoom modal */}
      {zoomPage && (
        <PageZoomModal
          isOpen={!!zoomPage}
          onClose={() => setZoomPage(null)}
          pageNumber={zoomPage.pageNumber}
          thumbnailUrl={zoomPage.dataUrl}
          sourceDocName={fileName}
        />
      )}
    </div>
  );
};
