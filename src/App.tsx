import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardCanvas } from './core/dashboard/DashboardCanvas';
import { UniversalSearch } from './components/UniversalSearch';
import { useDashboardStore } from './stores/useDashboardStore';
import { useThemeStore } from './stores/useThemeStore';
import { seedInitialData } from './core/storage/db';
import { QuickNoteModal } from './components/QuickNoteModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ToastContainer } from './components/ToastContainer';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Boot sequence lines
const BOOT_LINES = [
  'Initializing IndexedDB storage engine...',
  'Mounting widget registry...',
  'Loading workspace configurations...',
  'Hydrating Zustand state stores...',
  'Bootstrapping canvas engine...',
  'Personal OS ready.',
];

function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [currentLine, setCurrentLine] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (currentLine < BOOT_LINES.length - 1) {
      const t = setTimeout(() => setCurrentLine(l => l + 1), 220);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDone(true);
        setTimeout(onComplete, 400);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [currentLine, onComplete]);

  return (
    <motion.div
      className="h-screen w-screen flex flex-col items-center justify-center bg-[#050507] select-none relative overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: done ? 0 : 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Scan line decorative element */}
      <div className="scan-line" />

      {/* Grid backdrop */}
      <div
        className="absolute inset-0 canvas-grid-pattern pointer-events-none"
        style={{ animation: 'gridReveal 0.8s ease-out forwards', opacity: 0 }}
      />

      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full px-6">
        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="w-16 h-16 rounded-2xl border border-cyan-500/30 flex items-center justify-center bg-cyan-500/5 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="10" height="10" rx="2" fill="rgba(6,182,212,0.8)" />
              <rect x="18" y="4" width="10" height="10" rx="2" fill="rgba(139,92,246,0.6)" />
              <rect x="4" y="18" width="10" height="10" rx="2" fill="rgba(59,130,246,0.6)" />
              <rect x="18" y="18" width="10" height="10" rx="2" fill="rgba(6,182,212,0.4)" />
            </svg>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-xs font-bold tracking-[0.4em] text-cyan-400/80 uppercase mb-0.5">Personal OS</p>
            <p className="text-[10px] text-white/20 tracking-widest font-mono">v2.0.0 · local-first</p>
          </motion.div>
        </div>

        {/* Boot terminal log */}
        <motion.div
          className="w-full glass-panel rounded-xl p-4 font-mono text-[10px] text-left space-y-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {BOOT_LINES.slice(0, currentLine + 1).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex items-center gap-2 ${i === currentLine ? 'text-cyan-400' : 'text-white/25'}`}
            >
              <span className="text-white/15">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-cyan-500/40">›</span>
              <span>{line}</span>
              {i === currentLine && (
                <motion.span
                  className="inline-block w-1.5 h-3 bg-cyan-400 ml-0.5"
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, repeatType: 'reverse' }}
                />
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Progress bar */}
        <div className="w-full h-[1px] bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentLine + 1) / BOOT_LINES.length) * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function App() {
  const { loadDashboards, loading } = useDashboardStore();
  const { initTheme } = useThemeStore();
  const [dbReady, setDbReady] = useState(false);
  const [showBoot, setShowBoot] = useState(true);

  // Initialize global keyboard shortcuts
  useKeyboardShortcuts();

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await seedInitialData();
        setDbReady(true);
      } catch (err) {
        console.error('IndexedDB setup failed', err);
        setDbReady(true);
      }
    };
    setupDatabase();
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    if (dbReady) {
      loadDashboards();
    }
  }, [dbReady, loadDashboards]);

  const handleBootComplete = () => {
    setShowBoot(false);
  };

  return (
    <AnimatePresence mode="wait">
      {showBoot || !dbReady || loading ? (
        <BootScreen key="boot" onComplete={handleBootComplete} />
      ) : (
        <motion.div
          key="app"
          className="flex h-screen w-screen overflow-hidden bg-primary-bg text-primary-text font-sans antialiased select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Scan line effect (subtle, always visible in dark mode) */}
          <div className="scan-line opacity-30" />

          {/* Sidebar Workspace Swapper */}
          <Sidebar />

          {/* Main Core Area */}
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Navbar */}
            <TopNavbar />

            {/* Dashboard Grid / Canvas */}
            <DashboardCanvas />
          </div>

          {/* Ctrl + K Universal Index Search Overlay */}
          <UniversalSearch />
          
          {/* Global UI Overlays */}
          <QuickNoteModal />
          <ShortcutsModal />
          <CreateWorkspaceModal />
          <ToastContainer />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
