import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useUIStore } from '../stores/useUIStore';
import { Home, Briefcase, TrendingUp, GitBranch, Layout } from 'lucide-react';

export const CreateWorkspaceModal: React.FC = () => {
  const { showCreateWorkspaceModal, setCreateWorkspaceModal } = useUIStore();
  const { createDashboard, setActiveDashboardId } = useDashboardStore();

  const [newDashName, setNewDashName] = useState('');
  const [newDashLayout, setNewDashLayout] = useState<'free' | 'snap' | 'canvas'>('free');
  const [newDashIcon, setNewDashIcon] = useState('Layout');

  const handleCreateDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashName.trim()) return;
    const id = await createDashboard(newDashName, newDashIcon, newDashLayout, `${newDashLayout} workspace`);
    setActiveDashboardId(id);
    setNewDashName('');
    setCreateWorkspaceModal(false);
  };

  return (
    <AnimatePresence>
      {showCreateWorkspaceModal && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-md glass-panel p-6 rounded-2xl flex flex-col gap-4 text-primary-text"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -12 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
          <h2 className="text-xl font-bold tracking-tight">Create New Workspace</h2>
          
          <form onSubmit={handleCreateDashboard} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">Workspace Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Finance Hub"
                value={newDashName}
                onChange={(e) => setNewDashName(e.target.value)}
                className="px-4 py-2.5 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">Layout Paradigm</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'free', label: 'Free Canvas (Float)', desc: 'Overlay and rotate' },
                  { type: 'snap', label: 'Snap Alignment', desc: 'Auto-aligning boxes' },
                  { type: 'canvas', label: 'Infinite Map', desc: 'Pan and Zoom' },
                ].map((l) => (
                  <button
                    key={l.type}
                    type="button"
                    onClick={() => setNewDashLayout(l.type as any)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      newDashLayout === l.type
                        ? 'border-cyan-accent bg-cyan-accent/5'
                        : 'border-color-border-color hover:bg-glass-bg'
                    }`}
                  >
                    <div className="text-sm font-semibold text-primary-text">{l.label}</div>
                    <div className="text-[10px] text-muted-text mt-0.5">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">Workspace Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: 'Home', icon: <Home className="w-5 h-5" /> },
                  { name: 'Briefcase', icon: <Briefcase className="w-5 h-5" /> },
                  { name: 'TrendingUp', icon: <TrendingUp className="w-5 h-5" /> },
                  { name: 'GitBranch', icon: <GitBranch className="w-5 h-5" /> },
                  { name: 'Layout', icon: <Layout className="w-5 h-5" /> },
                ].map((ic) => (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setNewDashIcon(ic.name)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                      newDashIcon === ic.name
                        ? 'border-cyan-accent bg-cyan-accent/5 text-cyan-accent'
                        : 'border-color-border-color text-secondary-text hover:bg-glass-bg hover:text-primary-text'
                    }`}
                  >
                    {ic.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setCreateWorkspaceModal(false)}
                className="px-4 py-2 text-sm rounded-xl hover:bg-glass-bg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-accent to-cyan-accent text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
