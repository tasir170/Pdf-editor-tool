import React from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface PageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageNumber: number;
  thumbnailUrl: string;
  sourceDocName?: string;
  rotation?: number;
  onRotate?: () => void;
}

export const PageZoomModal: React.FC<PageZoomModalProps> = ({
  isOpen,
  onClose,
  pageNumber,
  thumbnailUrl,
  sourceDocName,
  rotation = 0,
  onRotate,
}) => {
  const [zoom, setZoom] = React.useState(1.0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900 text-sm">
              Page {pageNumber} Preview
            </span>
            {sourceDocName && (
              <span className="text-xs text-slate-500 font-normal">
                from {sourceDocName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onRotate && (
              <button
                onClick={onRotate}
                title="Rotate 90° Clockwise"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              title="Zoom Out"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono tabular-nums text-slate-600 min-w-[45px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              title="Zoom In"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image viewport */}
        <div className="flex-1 overflow-auto bg-slate-100 p-8 flex items-center justify-center">
          <div
            className="transition-transform duration-200 ease-out origin-center bg-white shadow-xl rounded-sm"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={thumbnailUrl}
              alt={`Page ${pageNumber}`}
              className="max-h-[70vh] object-contain select-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
