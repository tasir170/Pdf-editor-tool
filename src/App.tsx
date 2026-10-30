import React, { useState } from 'react';
import type { ToolTab } from './types/pdf';
import { Navbar } from './components/Navbar';
import { HomeHub } from './components/HomeHub';
import { ImageToPdfTool } from './components/ImageToPdf/ImageToPdfTool';
import { MergePdfTool } from './components/MergePdf/MergePdfTool';
import { SplitPdfTool } from './components/SplitPdf/SplitPdfTool';
import { EditPdfTool } from './components/EditPdf/EditPdfTool';
import { ResizePdfTool } from './components/ResizePdf/ResizePdfTool';
import {
  FileText,
  Image as ImageIcon,
  Layers,
  Scissors,
  Type,
  Maximize2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ToolTab>('home');
  const [sampleTool, setSampleTool] = useState<ToolTab | null>(null);

  const handleOpenSample = (tool: ToolTab) => {
    setSampleTool(tool);
    setActiveTab(tool);
  };

  const handleSelectTab = (tool: ToolTab) => {
    setSampleTool(null);
    setActiveTab(tool);
  };

  const getToolTitle = (tab: ToolTab) => {
    switch (tab) {
      case 'image-to-pdf':
        return 'Image to PDF Converter';
      case 'merge':
        return 'Merge PDF Files';
      case 'split':
        return 'Split PDF Document';
      case 'edit':
        return 'PDF Editor & Form Filler';
      case 'resize':
        return 'Resize PDF Dimensions';
      default:
        return 'All Tools';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Bar strictly following 3-zone contract */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onQuickDemo={() => handleOpenSample('edit')}
      />

      {/* Breadcrumb strip when inside a tool */}
      {activeTab !== 'home' && (
        <div className="bg-white border-b border-slate-200 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => handleSelectTab('home')}
                className="hover:text-slate-900 transition-colors"
              >
                All Tools
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-900">{getToolTitle(activeTab)}</span>
            </div>

            {/* Quick tool switcher icons */}
            <div className="hidden sm:flex items-center gap-1">
              {[
                { id: 'image-to-pdf' as ToolTab, icon: ImageIcon, title: 'Image to PDF' },
                { id: 'merge' as ToolTab, icon: Layers, title: 'Merge PDF' },
                { id: 'split' as ToolTab, icon: Scissors, title: 'Split PDF' },
                { id: 'edit' as ToolTab, icon: Type, title: 'Edit PDF' },
                { id: 'resize' as ToolTab, icon: Maximize2, title: 'Resize PDF' },
              ].map((t) => {
                const Icon = t.icon;
                const isCur = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTab(t.id)}
                    title={t.title}
                    className={`p-1.5 rounded-md transition-colors ${
                      isCur
                        ? 'bg-slate-200 text-slate-900'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'home' && (
          <HomeHub
            onSelectTool={handleSelectTab}
            onOpenSample={handleOpenSample}
          />
        )}

        {activeTab === 'image-to-pdf' && <ImageToPdfTool autoLoadSample={sampleTool === 'image-to-pdf'} />}
        {activeTab === 'merge' && <MergePdfTool autoLoadSample={sampleTool === 'merge'} />}
        {activeTab === 'split' && <SplitPdfTool autoLoadSample={sampleTool === 'split'} />}
        {activeTab === 'edit' && <EditPdfTool autoLoadSample={sampleTool === 'edit'} />}
        {activeTab === 'resize' && <ResizePdfTool autoLoadSample={sampleTool === 'resize'} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Sajeda PDF Studio</span>
            <span aria-hidden="true">·</span>
            <span>Client-side PDF workstation</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Files never leave your browser</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Local WebAssembly & Canvas processing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
