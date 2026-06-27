import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchStore } from '../stores/useSearchStore';
import { useDashboardStore } from '../stores/useDashboardStore';
import { 
  Search, 
  X, 
  FileText, 
  FolderOpen, 
  Calendar, 
  Layout, 
  Activity,
  CornerDownLeft,
  Terminal
} from 'lucide-react';

export const UniversalSearch: React.FC = () => {
  const { isOpen, query, results, setOpen, setQuery } = useSearchStore();
  const { setActiveDashboardId } = useDashboardStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const resultListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  // Ctrl + K Hotkey Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  useEffect(() => {
    if (resultListRef.current && results.length > 0) {
      const selectedEl = resultListRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, results]);


  const handleSelectResult = (res: typeof results[0]) => {
    // Navigate user based on result type
    if (res.action) {
      res.action();
    } else if (res.targetDashboardId) {
      setActiveDashboardId(res.targetDashboardId);
    } else if (res.type === 'dashboard') {
      setActiveDashboardId(res.id);
    } else if (res.type === 'note') {
      setActiveDashboardId('projects');
    } else if (res.type === 'file') {
      setActiveDashboardId('home');
    } else if (res.type === 'event') {
      setActiveDashboardId('home');
    }

    setOpen(false);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'dashboard': return <Layout className="w-4 h-4 text-cyan-accent" />;
      case 'note': return <FileText className="w-4 h-4 text-blue-accent" />;
      case 'file': return <FolderOpen className="w-4 h-4 text-green-accent" />;
      case 'event': return <Calendar className="w-4 h-4 text-purple-accent" />;
      case 'command': return <Terminal className="w-4 h-4 text-orange-accent" />;
      default: return <Activity className="w-4 h-4 text-secondary-text" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-[15vh] p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Search box container */}
      <motion.div
        className="w-full max-w-xl glass-panel rounded-2xl flex flex-col overflow-hidden border border-color-border-color shadow-2xl"
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        
        {/* Input Bar */}
        <div className="h-14 flex items-center px-4 gap-3 border-b border-color-border-color">
          <Search className="w-5 h-5 text-muted-text" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type note content, file tag, event name, or widget type..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none text-primary-text py-2"
          />
          <button 
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-glass-bg text-muted-text hover:text-primary-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results pane */}
        <div ref={resultListRef} className="max-h-[350px] overflow-y-auto p-2 space-y-1.5 no-scrollbar">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-muted-text text-[11px] flex flex-col gap-1">
              <span className="font-bold uppercase tracking-wider">Universal OS Search Index</span>
              <span>Search notes, schedules, layouts, uploaded files, commands, and widgets instantly.</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-muted-text italic">
              No index entries found matching "{query}"
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelectResult(res)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-glass-bg border-cyan-accent/50' 
                      : 'border-color-border-color bg-glass-bg/30 hover:bg-glass-bg hover:border-cyan-accent/30'
                  }`}
                >
                  <div className="flex items-center gap-3.5 max-w-[85%]">
                    <div className="p-2 rounded-lg bg-secondary-bg border border-color-border-color">
                      {getResultIcon(res.type)}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-semibold text-primary-text text-[13px]">{res.title}</span>
                      <span className="text-[10px] text-muted-text mt-0.5 capitalize truncate">
                        <span className="font-mono text-[9px] mr-1.5 uppercase text-cyan-accent/80 border border-cyan-accent/20 px-1 rounded bg-cyan-accent/5">
                          {res.type}
                        </span>
                        {res.subtitle}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1.5 ${isSelected ? 'opacity-100 text-cyan-accent' : 'opacity-0'} text-muted-text transition-opacity`}>
                    <span className="text-[9px] font-mono">Open</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="h-9 px-4 border-t border-color-border-color flex items-center justify-between text-[9px] text-muted-text bg-secondary-bg/20">
          <div className="flex gap-3">
            <span><kbd className="px-1 py-0.5 rounded border border-color-border-color bg-primary-bg">ESC</kbd> Close</span>
            <span><kbd className="px-1 py-0.5 rounded border border-color-border-color bg-primary-bg">&uarr;&darr;</kbd> Navigate</span>
          </div>
          <span>Indexing 5 tables &bull; Offline-first</span>
        </div>

      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
