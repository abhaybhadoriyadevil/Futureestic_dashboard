import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../stores/useUIStore';
import { db } from '../core/storage/db';
import { X, Save, FileText } from 'lucide-react';

export const QuickNoteModal: React.FC = () => {
  const { isQuickNoteOpen, setQuickNoteOpen, addToast } = useUIStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isQuickNoteOpen) {
      setTimeout(() => titleRef.current?.focus(), 100);
    } else {
      // Reset when closed
      setTitle('');
      setContent('');
    }
  }, [isQuickNoteOpen]);

  // Handle Cmd+Enter to save and Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isQuickNoteOpen) return;
      if (e.key === 'Escape') setQuickNoteOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickNoteOpen, title, content]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      addToast('Cannot save an empty note', 'warning');
      return;
    }

    const noteTitle = title.trim() || 'Untitled Quick Note';
    const noteContent = content.trim();

    try {
      await db.notes.add({
        id: `note-${Date.now()}`,
        title: noteTitle,
        content: noteContent,
        tags: ['quick-note'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      addToast('Quick note saved successfully', 'success');
      setQuickNoteOpen(false);
    } catch (e) {
      console.error('Failed to save quick note', e);
      addToast('Failed to save quick note', 'warning');
    }
  };

  return (
    <AnimatePresence>
      {isQuickNoteOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg glass-panel rounded-2xl border border-color-border-color shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-color-border-color bg-glass-bg/50">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-blue-accent/10 border border-blue-accent/20">
                  <FileText className="w-5 h-5 text-blue-accent" />
                </div>
                <span className="font-semibold text-primary-text">Quick Note</span>
              </div>
              <button
                onClick={() => setQuickNoteOpen(false)}
                className="p-1.5 text-muted-text hover:text-primary-text hover:bg-secondary-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-4">
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title..."
                className="w-full bg-transparent border-b border-color-border-color/50 px-2 py-2 text-lg font-medium text-primary-text placeholder-muted-text focus:outline-none focus:border-cyan-accent transition-colors"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write something... (Markdown supported)"
                className="w-full h-48 bg-transparent px-2 py-2 text-sm text-primary-text placeholder-muted-text focus:outline-none resize-none no-scrollbar"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-color-border-color bg-glass-bg/50">
              <span className="text-xs text-muted-text">Press <kbd className="px-1.5 py-0.5 rounded bg-secondary-bg border border-color-border-color mx-1">Cmd/Ctrl + Enter</kbd> to save</span>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-accent text-white rounded-lg hover:bg-cyan-accent/90 transition-colors text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                Save Note
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
