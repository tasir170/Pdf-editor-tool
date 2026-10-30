import React from 'react';
import { FileText, Sparkles } from 'lucide-react';
import type { ToolTab } from '../types/pdf';

interface NavbarProps {
  activeTab: ToolTab;
  onSelectTab: (tab: ToolTab) => void;
  onQuickDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onQuickDemo,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div
        onClick={() => onSelectTab('home')}
        className="flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
          S
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900 font-sans">
          Sajeda PDF
        </span>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'home' ? 'text-blue-600' : ''
          }`}
        >
          All Tools
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('image-to-pdf')}
          className={`hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'image-to-pdf' ? 'text-blue-600' : ''
          }`}
        >
          Image to PDF
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('merge')}
          className={`hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'merge' ? 'text-blue-600' : ''
          }`}
        >
          Merge PDF
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('split')}
          className={`hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'split' ? 'text-blue-600' : ''
          }`}
        >
          Split PDF
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('edit')}
          className={`hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'edit' ? 'text-blue-600' : ''
          }`}
        >
          Edit PDF
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('resize')}
          className={`hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'resize' ? 'text-blue-600' : ''
          }`}
        >
          Resize PDF
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onQuickDemo}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Try Demo File</span>
        </button>
      </div>
    </header>
  );
};
