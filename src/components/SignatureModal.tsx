import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Pen, Type } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState<'cursive' | 'serif' | 'sans-serif'>('cursive');
  const [penColor, setPenColor] = useState('#0f172a');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    if (isOpen && tab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          hasDrawnRef.current = false;
        }
      }
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    hasDrawnRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  };

  const handleApply = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawnRef.current) return;
      onSave(canvas.toDataURL('image/png'));
    } else {
      if (!typedName.trim()) return;
      // Render typed signature to transparent canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = 600;
      offscreen.height = 200;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 600, 200);
      ctx.fillStyle = penColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      let fontStyle = 'italic 52px cursive';
      if (selectedFont === 'serif') fontStyle = 'italic 48px Georgia, serif';
      if (selectedFont === 'sans-serif') fontStyle = '44px "Plus Jakarta Sans", sans-serif';

      ctx.font = fontStyle;
      ctx.fillText(typedName, 300, 100);

      onSave(offscreen.toDataURL('image/png'));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 text-base">Create Signature</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 px-6 pt-4">
          <button
            onClick={() => setTab('draw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'draw'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Draw Signature</span>
          </button>
          <button
            onClick={() => setTab('type')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === 'type'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Signature</span>
          </button>

          {/* Color picker */}
          <div className="ml-auto flex items-center gap-1.5">
            {['#0f172a', '#1e40af', '#b91c1c'].map((color) => (
              <button
                key={color}
                onClick={() => setPenColor(color)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  penColor === color ? 'scale-110 border-slate-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                title={`Color: ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {tab === 'draw' ? (
            <div className="space-y-3">
              <div className="relative border-2 border-dashed border-slate-200 rounded-lg bg-white overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none"
                />
                <div className="absolute bottom-3 left-4 text-[11px] text-slate-400 pointer-events-none select-none">
                  Sign above using your mouse or finger
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Draw on canvas</span>
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-slate-600 hover:text-red-600 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Pad</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              {typedName && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600">Choose Style</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'cursive', name: 'Script Flow', fontStyle: 'italic font-serif text-2xl' },
                      { id: 'serif', name: 'Classic Serif', fontStyle: 'italic font-serif text-xl' },
                      { id: 'sans-serif', name: 'Clean Modern', fontStyle: 'font-sans text-lg' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedFont(style.id as any)}
                        className={`p-3 text-left border rounded-lg transition-all ${
                          selectedFont === style.id
                            ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-[11px] text-slate-400 mb-1">{style.name}</div>
                        <div className={style.fontStyle} style={{ color: penColor }}>
                          {typedName}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Insert Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
};
