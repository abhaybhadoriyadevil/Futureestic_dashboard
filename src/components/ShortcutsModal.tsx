import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../stores/useUIStore';
import { X, Keyboard } from 'lucide-react';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setShortcutsOpen } = useUIStore();

  const shortcuts = [
    { keys: ['Ctrl / Cmd', 'K'], desc: 'Universal Search / Command Palette' },
    { keys: ['Ctrl / Cmd', 'Z'], desc: 'Undo Layout Change' },
    { keys: ['Ctrl / Cmd', 'Y'], desc: 'Redo Layout Change' },
    { keys: ['Ctrl / Cmd', 'C'], desc: 'Copy Selected Widget' },
    { keys: ['Ctrl / Cmd', 'V'], desc: 'Paste Widget (any workspace)' },
    { keys: ['Delete'], desc: 'Delete Selected Widget' },
    { keys: ['Ctrl / Cmd', 'Shift', 'L'], desc: 'Toggle Theme' },
    { keys: ['Alt', 'N'], desc: 'Quick Note' },
    { keys: ['?'], desc: 'Show Shortcuts' },
  ];

  return (
    <AnimatePresence>
      {isShortcutsOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md glass-panel rounded-2xl border border-color-border-color shadow-2xl p-6 relative"
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
          >
            <button
              onClick={() => setShortcutsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-muted-text hover:text-primary-text hover:bg-secondary-bg rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-cyan-accent/10 border border-cyan-accent/20">
                <Keyboard className="w-5 h-5 text-cyan-accent" />
              </div>
              <h2 className="text-xl font-bold text-primary-text">Keyboard Shortcuts</h2>
            </div>

            <div className="space-y-3">
              {shortcuts.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-color-border-color/50 last:border-0">
                  <span className="text-sm text-secondary-text">{shortcut.desc}</span>
                  <div className="flex gap-1.5">
                    {shortcut.keys.map((k, j) => (
                      <kbd key={j} className="px-2 py-1 text-xs font-mono bg-secondary-bg border border-color-border-color rounded-md text-primary-text">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
