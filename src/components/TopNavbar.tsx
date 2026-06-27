import React, { useState, useRef } from 'react';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useWidgetStore } from '../stores/useWidgetStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useSearchStore } from '../stores/useSearchStore';
import { useClipboardStore } from '../stores/useClipboardStore';
import { db } from '../core/storage/db';
import { 
  Search, 
  Sun, 
  Moon, 
  Lock, 
  Unlock, 
  Plus, 
  Download, 
  Upload, 
  RefreshCw,
  FolderOpen,
  Image,
  FileText,
  Calendar,
  Table,
  BarChart2,
  Activity,
  CheckSquare,
  GitBranch,
  X,
  ClipboardPaste,
  Target,
  Film,
  Music
} from 'lucide-react';

export const TopNavbar: React.FC = () => {
  const { dashboards, activeDashboardId } = useDashboardStore();
  const { addWidget, widgets } = useWidgetStore();
  const { theme, toggleTheme } = useThemeStore();
  const { isEditMode, setEditMode, zoom, resetCanvas } = useLayoutStore();
  const { setOpen: setSearchOpen } = useSearchStore();
  const { copiedWidget, pasteWidget } = useClipboardStore();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);

  // Default dimensions mapped by layout type
  const getWidgetDefaultConfig = (moduleType: string) => {
    
    // Default pixel coordinates (w x h)
    const sizes: Record<string, { w: number, h: number }> = {
      notes: { w: 400, h: 300 },
      files: { w: 450, h: 320 },
      images: { w: 400, h: 300 },
      videos: { w: 480, h: 360 },
      audio: { w: 380, h: 360 },
      tables: { w: 600, h: 400 },
      calendar: { w: 600, h: 400 },
      charts: { w: 600, h: 320 },
      statistics: { w: 280, h: 180 },
      kanban: { w: 600, h: 450 },
      mindmap: { w: 800, h: 500 },
      habits: { w: 500, h: 320 },
    };

    const size = sizes[moduleType] || { w: 400, h: 300 };
    
    // Position: Place centered relative to viewport
    const position = { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 };

    return { size, position };
  };

  const handleAddWidget = async (moduleType: any, title: string) => {
    if (!activeDashboard) return;
    const { size, position } = getWidgetDefaultConfig(moduleType);

    const zIndexes = widgets.map(w => w.zIndex);
    const maxZ = zIndexes.length > 0 ? Math.max(...zIndexes) : 0;

    // Create custom configuration inside dataRef if appropriate
    let dataRef = undefined;
    if (moduleType === 'kanban') {
      dataRef = JSON.stringify({ todo: [], progress: [], done: [] });
    } else if (moduleType === 'mindmap') {
      dataRef = JSON.stringify({ nodes: [{ id: 'n-1', label: 'Idea', x: 200, y: 150, color: '#3b82f6' }], connections: [] });
    }

    await addWidget({
      dashboardId: activeDashboardId,
      moduleType,
      title,
      position,
      size,
      rotation: 0,
      zIndex: maxZ + 1,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'fade', hover: 'glow' },
      dataRef,
      locked: false,
      visible: true
    });

    setShowAddMenu(false);
  };

  // Full Workspace JSON Backup
  const handleExportBackup = async () => {
    try {
      const dbData = {
        dashboards: await db.dashboards.toArray(),
        widgets: await db.widgets.toArray(),
        notes: await db.notes.toArray(),
        events: await db.events.toArray(),
        tables: await db.customTables.toArray(),
        // Exclude files due to potential size, or parse smaller ones. 
        // For a full backup, we convert files into base64 or arraybuffer objects.
        files: await Promise.all((await db.files.toArray()).map(async f => ({
          ...f,
          blobBase64: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(f.blob);
          })
        })))
      };

      const json = JSON.stringify(dbData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `personal_os_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setShowBackupMenu(false);
    } catch (e) {
      console.error('Backup failed', e);
      alert('Failed to generate local backup file.');
    }
  };

  // Restore Backup
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const dbData = JSON.parse(text);

      if (!dbData.dashboards || !dbData.widgets) {
        throw new Error('Invalid backup file schema.');
      }

      if (confirm('Restoring will clear all current settings, widgets, notes, and files. Proceed?')) {
        await db.transaction('rw', [db.dashboards, db.widgets, db.notes, db.events, db.customTables, db.files], async () => {
          await db.dashboards.clear();
          await db.widgets.clear();
          await db.notes.clear();
          await db.events.clear();
          await db.customTables.clear();
          await db.files.clear();

          await db.dashboards.bulkAdd(dbData.dashboards);
          await db.widgets.bulkAdd(dbData.widgets);
          if (dbData.notes) await db.notes.bulkAdd(dbData.notes);
          if (dbData.events) await db.events.bulkAdd(dbData.events);
          if (dbData.tables) await db.customTables.bulkAdd(dbData.tables);
          
          if (dbData.files) {
            const reconstructedFiles = dbData.files.map((f: any) => {
              // Convert Base64 back to Blob
              const byteString = atob(f.blobBase64.split(',')[1]);
              const mimeString = f.blobBase64.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const blob = new Blob([ab], { type: mimeString });
              
              const { blobBase64, ...rest } = f;
              return { ...rest, blob };
            });
            await db.files.bulkAdd(reconstructedFiles);
          }
        });

        alert('Backup restored successfully. Reloading OS...');
        window.location.reload();
      }
    } catch (err) {
      console.error('Import failed', err);
      alert('Failed to restore backup. Please ensure the file is a valid Personal OS backup JSON.');
    }
  };

  const widgetTypes = [
    { type: 'notes', label: 'Rich Text & MD', icon: <FileText className="w-4 h-4 text-blue-accent" /> },
    { type: 'calendar', label: 'Calendar OS', icon: <Calendar className="w-4 h-4 text-purple-accent" /> },
    { type: 'tables', label: 'Spreadsheets', icon: <Table className="w-4 h-4 text-green-accent" /> },
    { type: 'statistics', label: 'KPI Statistics', icon: <Activity className="w-4 h-4 text-cyan-accent" /> },
    { type: 'charts', label: 'Data Analytics', icon: <BarChart2 className="w-4 h-4 text-blue-accent" /> },
    { type: 'kanban', label: 'Kanban Board', icon: <CheckSquare className="w-4 h-4 text-purple-accent" /> },
    { type: 'mindmap', label: 'Mind Map Node', icon: <GitBranch className="w-4 h-4 text-cyan-accent" /> },
    { type: 'files', label: 'Local Files', icon: <FolderOpen className="w-4 h-4 text-green-accent" /> },
    { type: 'images', label: 'Image Gallery', icon: <Image className="w-4 h-4 text-blue-accent" /> },
    { type: 'videos', label: 'Video Player', icon: <Film className="w-4 h-4 text-purple-accent" /> },
    { type: 'audio', label: 'Audio / Music', icon: <Music className="w-4 h-4 text-pink-500" /> },
    { type: 'habits', label: 'Habit Tracker', icon: <Target className="w-4 h-4 text-orange-500" /> },
  ];

  return (
    <div className="h-16 flex items-center justify-between px-6 border-b border-color-border-color glass-panel z-20">
      
      {/* Search trigger & Dashboard Title */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-primary-text flex items-center gap-2">
            {activeDashboard?.name || 'Workspace'}
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-color-border-color bg-glass-bg capitalize font-normal text-secondary-text">
              {activeDashboard?.layoutType} layout
            </span>
          </h1>
          <p className="text-xs text-muted-text max-w-sm truncate">{activeDashboard?.description}</p>
        </div>

        {/* Global Search Button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-color-border-color bg-glass-bg hover:bg-glass-bg/85 cursor-pointer text-muted-text hover:text-secondary-text text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Fuzzy Index search...</span>
          <kbd className="px-1.5 py-0.5 rounded border border-color-border-color text-[9px] font-mono bg-primary-bg">Ctrl+K</kbd>
        </button>
      </div>

      {/* Toolbar actions */}
      <div className="flex items-center gap-3">
        {/* Infinite Canvas Reset button */}
        {activeDashboard?.layoutType === 'canvas' && (
          <button 
            onClick={resetCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-color-border-color bg-glass-bg text-xs hover:border-cyan-accent text-secondary-text hover:text-primary-text transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recenter ({Math.round(zoom * 100)}%)</span>
          </button>
        )}

        {/* Paste Widget button — shows when clipboard has content */}
        {copiedWidget && (
          <button
            onClick={() => pasteWidget()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all bg-green-accent/10 border border-green-accent/30 text-green-accent hover:bg-green-accent/20 animate-pulse"
            title={`Paste "${copiedWidget.title}" onto this workspace`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Paste</span>
          </button>
        )}

        {/* Add Widget Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAddMenu(!showAddMenu);
              setShowBackupMenu(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              showAddMenu 
                ? 'bg-cyan-accent text-black' 
                : 'bg-glass-bg border border-color-border-color text-primary-text hover:border-cyan-accent'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Widget</span>
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-lg border border-color-border-color z-40 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center justify-between px-3 py-1 border-b border-color-border-color mb-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-text tracking-wider">Widget Library</span>
                <button onClick={() => setShowAddMenu(false)} className="text-muted-text hover:text-primary-text cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-0.5 no-scrollbar">
                {widgetTypes.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleAddWidget(item.type, item.label)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs text-secondary-text hover:text-primary-text hover:bg-glass-bg transition-colors cursor-pointer"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customize Canvas/Lock Toggle */}
        <button
          onClick={() => setEditMode(!isEditMode)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            isEditMode
              ? 'bg-purple-accent/15 text-purple-accent border border-purple-accent/30 shadow-[0_0_12px_rgba(139,92,246,0.1)] animate-pulse'
              : 'bg-glass-bg border border-color-border-color text-secondary-text hover:text-primary-text hover:border-purple-accent'
          }`}
          title={isEditMode ? "Lock widgets down" : "Drag, resize & edit widgets"}
        >
          {isEditMode ? (
            <>
              <Unlock className="w-4 h-4" />
              <span>Unlock layout</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Lock layout</span>
            </>
          )}
        </button>

        {/* System Settings & Backups */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBackupMenu(!showBackupMenu);
              setShowAddMenu(false);
            }}
            className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-secondary-text hover:text-primary-text hover:border-cyan-accent cursor-pointer transition-colors"
            title="System Diagnostics & Backups"
          >
            <Download className="w-4 h-4" />
          </button>

          {showBackupMenu && (
            <div className="absolute right-0 mt-2 w-48 glass-panel rounded-2xl p-2 shadow-lg border border-color-border-color z-40 animate-[fadeIn_0.15s_ease-out]">
              <div className="px-3 py-1.5 border-b border-color-border-color mb-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-text tracking-wider">System State</span>
              </div>
              <button
                onClick={handleExportBackup}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-secondary-text hover:text-primary-text hover:bg-glass-bg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-accent" />
                <span>Export OS Snapshot</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-secondary-text hover:text-primary-text hover:bg-glass-bg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-purple-accent" />
                <span>Restore Backup</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-secondary-text hover:text-primary-text hover:border-cyan-accent cursor-pointer transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-cyan-accent" /> : <Moon className="w-4 h-4 text-purple-accent" />}
        </button>

      </div>
    </div>
  );
};
