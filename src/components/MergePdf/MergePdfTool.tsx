import React, { useState } from 'react';
import {
  Upload,
  Layers,
  RotateCw,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  FileCheck,
  Download,
  Sparkles,
  FileText,
  Plus,
} from 'lucide-react';
import type { MergePageItem, PdfFileItem } from '../../types/pdf';
import { renderPdfPages } from '../../utils/pdfRenderer';
import { mergePdfPages, downloadFile } from '../../utils/pdfLibOperations';
import { PageZoomModal } from '../PageZoomModal';
import { createSamplePdf, createSecondSamplePdf } from '../../utils/sampleDocuments';

interface MergePdfToolProps {
  autoLoadSample?: boolean;
}

export const MergePdfTool: React.FC<MergePdfToolProps> = ({ autoLoadSample }) => {
  const [sourceFiles, setSourceFiles] = useState<Map<string, Uint8Array>>(new Map());
  const [fileList, setFileList] = useState<PdfFileItem[]>([]);
  const [pages, setPages] = useState<MergePageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [zoomPage, setZoomPage] = useState<MergePageItem | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (autoLoadSample && pages.length === 0) {
      handleLoadSamples();
    }
  }, [autoLoadSample]);

  // Load PDF file and parse all its pages
  const addPdfFile = async (name: string, data: Uint8Array) => {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Render pages
    const { pages: renderedPages, numPages } = await renderPdfPages(data, 0.45);

    const newFileItem: PdfFileItem = {
      id: fileId,
      name,
      size: data.byteLength,
      data,
      numPages,
    };

    const newPageItems: MergePageItem[] = renderedPages.map((rp) => ({
      id: `page-${fileId}-${rp.pageNumber}-${Math.random().toString(36).substring(2, 5)}`,
      fileId,
      fileName: name,
      originalPageIndex: rp.pageNumber - 1,
      pageNumber: rp.pageNumber,
      thumbnailUrl: rp.dataUrl,
      rotation: 0,
      width: rp.width,
      height: rp.height,
    }));

    setSourceFiles((prev) => new Map(prev).set(fileId, data));
    setFileList((prev) => [...prev, newFileItem]);
    setPages((prev) => [...prev, ...newPageItems]);
  };

  // Upload handler
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
          continue;
        }
        const buffer = await file.arrayBuffer();
        await addPdfFile(file.name, new Uint8Array(buffer));
      }
    } catch (err: any) {
      alert(`Error loading PDF: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sample PDFs for instant demo
  const handleLoadSamples = async () => {
    setIsLoading(true);
    try {
      const doc1 = await createSamplePdf('multipage');
      await addPdfFile('01_Client_Agreement.pdf', doc1.data);

      const doc2 = await createSecondSamplePdf();
      await addPdfFile('02_Technical_Specs.pdf', doc2.data);
    } catch (err: any) {
      alert(`Error loading sample files: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Move page
  const movePage = (index: number, direction: 'left' | 'right') => {
    setPages((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Rotate single page
  const rotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  // Delete single page
  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  // Duplicate single page
  const duplicatePage = (index: number) => {
    setPages((prev) => {
      const target = prev[index];
      const copy: MergePageItem = {
        ...target,
        id: `page-copy-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  // Rotate all pages at once
  const rotateAllPages = () => {
    setPages((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 })));
  };

  // Clear all
  const clearAll = () => {
    setSourceFiles(new Map());
    setFileList([]);
    setPages([]);
  };

  // Perform Merge
  const handleMerge = async () => {
    if (pages.length === 0) return;
    setIsMerging(true);

    try {
      const mergedBytes = await mergePdfPages(pages, sourceFiles);
      downloadFile(mergedBytes, `merged_document_${pages.length}_pages.pdf`);
      setSuccessMsg(`Successfully merged ${pages.length} pages into a unified PDF!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Merge error: ${err?.message || err}`);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Merge PDF Files</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Display all pages visually across multiple documents. Drag and reorder pages, rotate or remove individual sheets, then combine into one file.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSamples}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample PDFs</span>
          </button>
        </div>
      </div>

      {/* Main Area */}
      {pages.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-12 text-center bg-white transition-colors cursor-pointer group"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.pdf,application/pdf';
            input.onchange = (e: any) => handleFiles(e.target.files);
            input.click();
          }}
        >
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            {isLoading ? 'Rendering PDF Pages...' : 'Select PDF Files to Merge'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Upload two or more PDF files. Every individual page will be displayed visually as interactive cards.
          </p>
          <button
            type="button"
            disabled={isLoading}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
          >
            {isLoading ? 'Processing...' : 'Choose PDF Files'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Bar for Page Manipulation */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Displaying All Pages:
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                {pages.length} Pages Total
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">
                From {fileList.length} source {fileList.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={rotateAllPages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Rotate every page 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate All</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,application/pdf';
                  input.onchange = (e: any) => handleFiles(e.target.files);
                  input.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More PDFs</span>
              </button>
            </div>
          </div>

          {/* Visual Page Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {pages.map((p, index) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs flex flex-col group hover:border-emerald-500 transition-all"
              >
                {/* Page Thumbnail with Rotation */}
                <div
                  className="relative aspect-3/4 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-2 cursor-pointer"
                  onClick={() => setZoomPage(p)}
                  title="Click to view full size"
                >
                  <img
                    src={p.thumbnailUrl}
                    alt={`Page ${index + 1}`}
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                    className="max-h-full max-w-full object-contain transition-transform duration-200 select-none shadow-xs"
                  />

                  {/* Page Sequence Badge */}
                  <div className="absolute top-1.5 left-1.5 bg-slate-900/85 text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    #{index + 1}
                  </div>

                  {/* Zoom Icon Overlay on hover */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-1.5 bg-white/90 text-slate-800 rounded-full shadow-md">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="px-0.5 mb-2">
                  <p className="text-[11px] font-medium text-slate-800 truncate" title={p.fileName}>
                    {p.fileName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Original p.{p.pageNumber} {p.rotation > 0 ? `· ${p.rotation}°` : ''}
                  </p>
                </div>

                {/* Page Actions Toolbar */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-500">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        movePage(index, 'left');
                      }}
                      className="p-1 hover:text-slate-900 disabled:opacity-25 rounded transition-colors"
                      title="Move left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === pages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        movePage(index, 'right');
                      }}
                      className="p-1 hover:text-slate-900 disabled:opacity-25 rounded transition-colors"
                      title="Move right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotatePage(p.id);
                      }}
                      className="p-1 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                      title="Rotate 90° clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicatePage(index);
                      }}
                      className="p-1 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      title="Duplicate this page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(p.id);
                      }}
                      className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete this page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Merge & Download Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Ready to merge {pages.length} pages
                </p>
                <p className="text-[11px] text-slate-500">
                  Pages will be unified in the exact visual order shown above
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={clearAll}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Clear All
              </button>
              <button
                type="button"
                disabled={isMerging}
                onClick={handleMerge}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{isMerging ? 'Merging PDF Pages...' : 'Merge & Download PDF'}</span>
              </button>
            </div>
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

      {/* Page Zoom Preview Modal */}
      {zoomPage && (
        <PageZoomModal
          isOpen={!!zoomPage}
          onClose={() => setZoomPage(null)}
          pageNumber={pages.findIndex((p) => p.id === zoomPage.id) + 1}
          thumbnailUrl={zoomPage.thumbnailUrl}
          sourceDocName={zoomPage.fileName}
          rotation={zoomPage.rotation}
          onRotate={() => rotatePage(zoomPage.id)}
        />
      )}
    </div>
  );
};
