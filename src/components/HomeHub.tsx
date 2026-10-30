import React from 'react';
import {
  Image as ImageIcon,
  Layers,
  Scissors,
  Type,
  Maximize2,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import type { ToolTab } from '../types/pdf';

interface HomeHubProps {
  onSelectTool: (tab: ToolTab) => void;
  onOpenSample: (tab: ToolTab) => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({ onSelectTool, onOpenSample }) => {
  const tools = [
    {
      id: 'image-to-pdf' as ToolTab,
      title: 'Image to PDF',
      badge: 'CNIC / 1-Sheet & Batch',
      description:
        'Convert images to PDF with draggable 1-sheet layout (adjust CNIC front & back, passport bio pages, or multiple photos on 1 page with text labels) or batch convert 1-per-page.',
      icon: ImageIcon,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      btnColor: 'bg-blue-600 hover:bg-blue-700',
      sampleType: 'image-to-pdf' as ToolTab,
    },
    {
      id: 'merge' as ToolTab,
      title: 'Merge PDF',
      badge: 'Visual Page Display',
      description:
        'Combine multiple PDFs while viewing all individual pages in an interactive grid. Drag and reorder pages across documents, rotate, duplicate, or delete.',
      icon: Layers,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700',
      sampleType: 'merge' as ToolTab,
    },
    {
      id: 'split' as ToolTab,
      title: 'Split PDF',
      badge: 'Extract & ZIP',
      description:
        'Split documents using visual page selection, export every page to individual files in a ZIP archive, or divide by custom page ranges (e.g. 1-3, 4-6).',
      icon: Scissors,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
      sampleType: 'split' as ToolTab,
    },
    {
      id: 'edit' as ToolTab,
      title: 'Edit PDF',
      badge: 'Full Suite',
      description:
        'Comprehensive PDF editor: add text, draw freehand, highlight lines, apply whiteout/blackout redactions, insert shapes, checkmarks, stamps, and signatures.',
      icon: Type,
      color: 'bg-sky-50 text-sky-600 border-sky-200',
      btnColor: 'bg-sky-600 hover:bg-sky-700',
      sampleType: 'edit' as ToolTab,
    },
    {
      id: 'resize' as ToolTab,
      title: 'Resize PDF',
      badge: 'Page Dimensions',
      description:
        'Resize page dimensions to standard A4, US Letter, US Legal, A3, A5, or custom mm. Adjust margins, fit content proportionally, and preview live.',
      icon: Maximize2,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      btnColor: 'bg-purple-600 hover:bg-purple-700',
      sampleType: 'resize' as ToolTab,
    },
  ];

  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900" style={{ textWrap: 'balance' }}>
          We help with your PDF tasks
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          An intuitive online PDF workspace inspired by Sejda. Fast, clean, and private — all document rendering and processing happens directly in your browser.
        </p>

        {/* Quiet unboxed trust markers */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Files stay 100% private in browser</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Zero upload latency</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Lossless vector quality</span>
          </span>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${tool.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-500">
                    {tool.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  {tool.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenSample(tool.sampleType)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Try Sample</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs ${tool.btnColor}`}
                >
                  <span>Open Tool</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* 6th Card: All-in-One Capabilities Summary */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 text-blue-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Browser-Native Engine</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Unlike cloud services that require uploading confidential files to unknown servers, Sajeda PDF runs with full client-side privacy.
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Instant multi-page merging & reordering
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Interactive whiteout & signature stamping
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> High-res crop & aspect ratio lock
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={() => onSelectTool('edit')}
              className="w-full py-2.5 text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-center"
            >
              Launch Full PDF Editor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
