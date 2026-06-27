import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Widget } from '../../types';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { 
  Lock, 
  Unlock, 
  Maximize2, 
  Minimize2, 
  Settings, 
  Copy, 
  Clipboard,
  Trash2, 
  Layers, 
  EyeOff,
  Move,
  RulerIcon,
  Minus,
  FileText,
  Calendar,
  Table,
  Activity,
  BarChart2,
  CheckSquare,
  GitBranch,
  FolderOpen,
  Image,
  Video,
  MoreVertical,
  Sliders
} from 'lucide-react';
import { useClipboardStore } from '../../stores/useClipboardStore';

// Lazy loaded module components
const NotesWidget = React.lazy(() => import('../../modules/notes/NotesWidget').then(m => ({ default: m.NotesWidget })));
const FilesWidget = React.lazy(() => import('../../modules/files/FilesWidget').then(m => ({ default: m.FilesWidget })));
const ImagesWidget = React.lazy(() => import('../../modules/images/ImagesWidget').then(m => ({ default: m.ImagesWidget })));
const VideosWidget = React.lazy(() => import('../../modules/videos/VideosWidget').then(m => ({ default: m.VideosWidget })));
const TablesWidget = React.lazy(() => import('../../modules/tables/TablesWidget').then(m => ({ default: m.TablesWidget })));
const CalendarWidget = React.lazy(() => import('../../modules/calendar/CalendarWidget').then(m => ({ default: m.CalendarWidget })));
const StatisticsWidget = React.lazy(() => import('../../modules/statistics/StatisticsWidget').then(m => ({ default: m.StatisticsWidget })));
const ChartsWidget = React.lazy(() => import('../../modules/charts/ChartsWidget').then(m => ({ default: m.ChartsWidget })));
const KanbanWidget = React.lazy(() => import('../../modules/kanban/KanbanWidget').then(m => ({ default: m.KanbanWidget })));
const MindMapWidget = React.lazy(() => import('../../modules/mindmap/MindMapWidget').then(m => ({ default: m.MindMapWidget })));
const HabitsWidget = React.lazy(() => import('../../modules/habits/HabitsWidget').then(m => ({ default: m.HabitsWidget })));

interface WidgetContainerProps {
  widget: Widget;
  isFullscreenMode?: boolean;
  onDrag?: (id: string, x: number, y: number, w: number, h: number) => { x: number; y: number };
  onDragEnd?: () => void;
}

// Map widget.animation.entrance to Framer Motion initial/animate variants
function getEntranceVariants(entrance: string) {
  switch (entrance) {
    case 'slide-up':
      return {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      };
    case 'slide-right':
      return {
        initial: { opacity: 0, x: -30 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
      };
    case 'zoom':
    case 'scale':
      return {
        initial: { opacity: 0, scale: 0.85 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
      };
    case 'fade':
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  isFullscreenMode = false,
  onDrag,
  onDragEnd
}) => {
  const { updateWidgetLocal, commitWidgetUpdate, duplicateWidget, deleteWidget, bringToFront, sendToBack } = useWidgetStore();
  const { isEditMode, zoom } = useLayoutStore();
  const { selectedWidgetId, setSelectedWidgetId, setFullscreenWidgetId } = useSelectionStore();
  const { copyWidget } = useClipboardStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  
  // Dragging states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, wX: 0, wY: 0 });

  // Resizing states
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, wW: 0, wH: 0 });

  // Show Settings Panel Modal (connected to global selection store)
  const { widgetSettingsOpenId, setWidgetSettingsOpenId } = useSelectionStore();
  const showSettings = widgetSettingsOpenId === widget.id;
  const setShowSettings = (open: boolean) => {
    if (open) {
      setWidgetSettingsOpenId(widget.id);
    } else {
      setWidgetSettingsOpenId(null);
    }
  };

  // Widget settings form inputs
  const [title, setTitle] = useState(widget.title);
  const [borderRadius, setBorderRadius] = useState(widget.styles.borderRadius || '20px');
  const [backgroundType, setBackgroundType] = useState(widget.styles.backgroundType || 'glass');
  const [backgroundValue, setBackgroundValue] = useState(widget.styles.backgroundValue || '');
  const [opacity, setOpacity] = useState(widget.opacity);
  const [rotation, setRotation] = useState(widget.rotation);
  const [widthInput, setWidthInput] = useState(Math.round(widget.size.w));
  const [heightInput, setHeightInput] = useState(Math.round(widget.size.h));

  const [isEditingTitleInline, setIsEditingTitleInline] = useState(false);
  const [inlineTitleValue, setInlineTitleValue] = useState(widget.title);
  
  const [showDropdown, setShowDropdown] = useState(false);

  const openDropdown = useCallback(() => {
    if (dropdownBtnRef.current) {
      const rect = dropdownBtnRef.current.getBoundingClientRect();
      const dropdownWidth = 192; // w-48 = 12rem = 192px
      const dropdownHeight = 330; // approx menu height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Default: align right edge with button right, drop below
      let top = rect.bottom + 4;
      let right = viewportWidth - rect.right;

      // Flip up if not enough space below
      if (top + dropdownHeight > viewportHeight - 8) {
        top = rect.top - dropdownHeight - 4;
      }
      // Ensure right edge doesn't go off-screen left
      if (viewportWidth - right + dropdownWidth > viewportWidth) {
        right = viewportWidth - rect.left - dropdownWidth;
      }

      setDropdownPos({ top, right });
    }
    setShowDropdown(true);
  }, []);
  const [showWidgetControls, setShowWidgetControls] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showDropdown) {
        const clickedInsideBtn = dropdownBtnRef.current?.contains(e.target as Node);
        const clickedInsidePanel = dropdownPanelRef.current?.contains(e.target as Node);
        if (!clickedInsideBtn && !clickedInsidePanel) {
          setShowDropdown(false);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  useEffect(() => {
    setTitle(widget.title);
    setInlineTitleValue(widget.title);
    setOpacity(widget.opacity);
    setRotation(widget.rotation);
    setWidthInput(Math.round(widget.minimized ? (widget.preMinimizeSize?.w || 400) : widget.size.w));
    setHeightInput(Math.round(widget.minimized ? (widget.preMinimizeSize?.h || 300) : widget.size.h));
  }, [widget]);

  const getModuleIcon = (type: Widget['moduleType']) => {
    switch (type) {
      case 'notes': return <FileText className="w-3.5 h-3.5 text-blue-accent" />;
      case 'calendar': return <Calendar className="w-3.5 h-3.5 text-purple-accent" />;
      case 'tables': return <Table className="w-3.5 h-3.5 text-green-accent" />;
      case 'statistics': return <Activity className="w-3.5 h-3.5 text-cyan-accent" />;
      case 'charts': return <BarChart2 className="w-3.5 h-3.5 text-blue-accent" />;
      case 'kanban': return <CheckSquare className="w-3.5 h-3.5 text-purple-accent" />;
      case 'mindmap': return <GitBranch className="w-3.5 h-3.5 text-cyan-accent" />;
      case 'files': return <FolderOpen className="w-3.5 h-3.5 text-green-accent" />;
      case 'images': return <Image className="w-3.5 h-3.5 text-blue-accent" />;
      case 'videos': return <Video className="w-3.5 h-3.5 text-purple-accent" />;
      default: return <FileText className="w-3.5 h-3.5 text-muted-text" />;
    }
  };

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await commitWidgetUpdate(widget.id, {
      minimized: true,
      preMinimizeSize: { w: widget.size.w, h: widget.size.h },
      size: { w: 180, h: 44 }
    });
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const restoreSize = widget.preMinimizeSize || { w: 400, h: 300 };
    await commitWidgetUpdate(widget.id, {
      minimized: false,
      size: restoreSize
    });
  };

  const handleInlineTitleSave = async () => {
    setIsEditingTitleInline(false);
    if (inlineTitleValue.trim() && inlineTitleValue.trim() !== widget.title) {
      await commitWidgetUpdate(widget.id, { title: inlineTitleValue.trim() });
    }
  };

  const isSelected = selectedWidgetId === widget.id && isEditMode && !isFullscreenMode;
  const isLocked = widget.locked;

  // Pointer drag start
  const handleDragStart = (e: React.PointerEvent) => {
    if (!isEditMode || isLocked || isFullscreenMode) return;
    
    const target = e.target as HTMLElement;
    const isHeader = target.closest('.widget-header-drag') !== null || (widget.minimized && !target.closest('button') && !target.closest('input'));
    if (!isHeader) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      wX: widget.position.x,
      wY: widget.position.y
    });

    setSelectedWidgetId(widget.id);
    containerRef.current?.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const scaleFactor = zoom;
    const deltaX = (e.clientX - dragStart.x) / scaleFactor;
    const deltaY = (e.clientY - dragStart.y) / scaleFactor;

    let targetX = dragStart.wX + deltaX;
    let targetY = dragStart.wY + deltaY;

    if (onDrag) {
      const snapped = onDrag(widget.id, targetX, targetY, widget.size.w, widget.size.h);
      targetX = snapped.x;
      targetY = snapped.y;
    }

    updateWidgetLocal(widget.id, {
      position: { x: targetX, y: targetY }
    });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
    
    commitWidgetUpdate(widget.id, {
      position: { x: widget.position.x, y: widget.position.y }
    });

    if (onDragEnd) onDragEnd();
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    if (!isEditMode || isLocked || isFullscreenMode) return;
    
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      wW: widget.size.w,
      wH: widget.size.h
    });
    
    setSelectedWidgetId(widget.id);
    containerRef.current?.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return;

    const scaleFactor = zoom;
    const deltaW = (e.clientX - resizeStart.x) / scaleFactor;
    const deltaH = (e.clientY - resizeStart.y) / scaleFactor;

    const targetW = Math.max(150, resizeStart.wW + deltaW);
    const targetH = Math.max(100, resizeStart.wH + deltaH);

    updateWidgetLocal(widget.id, {
      size: { w: targetW, h: targetH }
    });
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);
    containerRef.current?.releasePointerCapture(e.pointerId);

    commitWidgetUpdate(widget.id, {
      size: { w: widget.size.w, h: widget.size.h }
    });
  };

  const getWidgetStyle = (): React.CSSProperties => {
    if (isFullscreenMode) return {};

    return {
      position: 'absolute',
      left: `${widget.position.x}px`,
      top: `${widget.position.y}px`,
      width: `${widget.size.w}px`,
      height: `${widget.size.h}px`,
      zIndex: widget.zIndex,
      opacity: widget.opacity / 100,
      transform: `rotate(${widget.rotation}deg)`,
      transformOrigin: 'center center',
    };
  };

  const getBackgroundStyle = () => {
    const type = widget.styles.backgroundType || 'glass';
    const val = widget.styles.backgroundValue || '';
    
    if (type === 'solid' && val) return { backgroundColor: val };
    if (type === 'gradient' && val) return { backgroundImage: val };
    if (type === 'image' && val) return { backgroundImage: `url(${val})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return {};
  };

  const renderModuleContent = () => {
    const props = { 
      widgetId: widget.id, 
      dataRef: widget.dataRef, 
      isEditMode: isEditMode && !isFullscreenMode,
      showControls: showWidgetControls
    };
    return (
      <Suspense fallback={
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-xs text-muted-text font-mono tracking-widest uppercase animate-pulse">
          <div className="scan-line opacity-20" />
          <span>Mounting Module...</span>
        </div>
      }>
        {(() => {
          switch (widget.moduleType) {
            case 'notes': return <NotesWidget {...props} />;
            case 'files': return <FilesWidget {...props} />;
            case 'images': return <ImagesWidget {...props} />;
            case 'videos': return <VideosWidget {...props} />;
            case 'tables': return <TablesWidget {...props} />;
            case 'calendar': return <CalendarWidget {...props} />;
            case 'statistics': return <StatisticsWidget {...props} />;
            case 'charts': return <ChartsWidget {...props} />;
            case 'kanban': return <KanbanWidget {...props} />;
            case 'mindmap': return <MindMapWidget {...props} />;
            case 'habits': return <HabitsWidget {...props} />;
            default: return <div className="p-4 text-xs text-muted-text">Unknown OS module type</div>;
          }
        })()}
      </Suspense>
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const clampedW = Math.max(150, widthInput);
    const clampedH = Math.max(100, heightInput);
    const updates: Partial<Widget> = {
      title,
      opacity,
      rotation,
      styles: {
        ...widget.styles,
        backgroundType,
        backgroundValue,
        borderRadius,
      }
    };
    if (widget.minimized) {
      updates.preMinimizeSize = { w: clampedW, h: clampedH };
    } else {
      updates.size = { w: clampedW, h: clampedH };
    }
    await commitWidgetUpdate(widget.id, updates);
    setShowSettings(false);
  };

  const entranceVariants = getEntranceVariants(widget.animation?.entrance || 'fade');

  // For free/snap/canvas mode, use motion.div with entrance animation
  // For grid mode, the DashboardCanvas handles the wrapper animation
  const wrapperContent = (
    <div
      ref={containerRef}
      onPointerDown={handleDragStart}
      onPointerMove={isResizing ? handleResizeMove : handleDragMove}
      onPointerUp={isResizing ? handleResizeEnd : handleDragEnd}
      style={getWidgetStyle()}
      className={`flex flex-col select-none group/container ${
        isFullscreenMode ? 'w-full h-full relative' : 'absolute'
      } ${
        isSelected 
          ? 'ring-2 ring-cyan-accent shadow-[0_0_20px_rgba(6,182,212,0.35)]' 
          : 'hover:shadow-lg'
      } ${isDragging ? 'cursor-grabbing z-[999]' : ''}`}
    >
      {widget.minimized ? (
        /* Minimized Pill */
        <div
          style={{
            ...getBackgroundStyle(),
            borderRadius: '9999px',
          }}
          onClick={(e) => {
            if (!isEditMode) {
              handleRestore(e);
            }
          }}
          className={`w-full h-full flex items-center justify-between pl-4 pr-3 border transition-all duration-200 ${
            isSelected 
              ? 'border-cyan-accent/50 bg-cyan-accent/5 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
              : 'border-color-border-color hover:border-white/10'
          } ${backgroundType === 'glass' ? 'glass-panel' : ''}`}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1 select-none pr-1">
            {getModuleIcon(widget.moduleType)}
            {isEditingTitleInline ? (
              <input
                type="text"
                value={inlineTitleValue}
                onChange={(e) => setInlineTitleValue(e.target.value)}
                onBlur={handleInlineTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineTitleSave();
                  if (e.key === 'Escape') {
                    setInlineTitleValue(widget.title);
                    setIsEditingTitleInline(false);
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-cyan-accent outline-none text-xs text-primary-text font-semibold w-full px-0.5 py-0"
              />
            ) : (
              <span 
                onDoubleClick={(e) => {
                  if (isEditMode) {
                    e.stopPropagation();
                    setIsEditingTitleInline(true);
                  }
                }}
                className="text-xs font-semibold text-primary-text truncate cursor-pointer select-none"
                title={isEditMode ? "Double click to rename" : "Click to restore"}
              >
                {widget.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isEditMode && !isLocked && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitleInline(true);
                }}
                className="p-1 rounded-full hover:bg-glass-bg text-secondary-text hover:text-cyan-accent cursor-pointer transition-colors"
                title="Rename widget"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>
            )}
            <button
              onClick={handleRestore}
              className="p-1 rounded-full hover:bg-glass-bg text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
              title="Restore widget"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5h16.5V3.75H3.75zm12.75 6.75L12 15l-4.5-4.5" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* Widget Core Box */
        <div
          style={{
            ...getBackgroundStyle(),
            borderRadius: isFullscreenMode ? '0px' : borderRadius,
          }}
          className={`w-full h-full flex flex-col overflow-hidden relative border transition-all duration-200 ${
            isSelected 
              ? 'border-cyan-accent/40' 
              : 'border-color-border-color hover:border-white/10'
          } ${backgroundType === 'glass' ? 'glass-panel' : ''}`}
        >
          {/* Widget Header Area */}
          <div 
            className={`h-11 flex items-center justify-between px-4 border-b border-color-border-color select-none ${
              isEditMode && !isLocked && !isFullscreenMode ? 'widget-header-drag cursor-move bg-glass-bg/30' : ''
            }`}
          >
            <div className="flex items-center gap-2 max-w-[60%]">
              {isEditMode && !isLocked && !isFullscreenMode && (
                <Move className="w-3.5 h-3.5 text-muted-text" />
              )}
              {isLocked && <Lock className="w-3 h-3 text-muted-text" />}
              
              {isEditingTitleInline ? (
                <input
                  type="text"
                  value={inlineTitleValue}
                  onChange={(e) => setInlineTitleValue(e.target.value)}
                  onBlur={handleInlineTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineTitleSave();
                    if (e.key === 'Escape') {
                      setInlineTitleValue(widget.title);
                      setIsEditingTitleInline(false);
                    }
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-transparent border-b border-cyan-accent outline-none text-xs text-primary-text font-semibold w-full px-0.5 py-0"
                />
              ) : (
                <span 
                  onDoubleClick={(e) => {
                    if (isEditMode && !isLocked) {
                      e.stopPropagation();
                      setIsEditingTitleInline(true);
                    }
                  }}
                  className="text-xs font-semibold tracking-wide text-primary-text truncate"
                  title={isEditMode && !isLocked ? "Double click to rename" : undefined}
                >
                  {widget.title}
                </span>
              )}

              {isSelected && !isFullscreenMode && (
                <span className="text-[9px] font-mono text-muted-text ml-1 border border-color-border-color px-1.5 py-0.5 rounded bg-glass-bg/50">
                  {Math.round(widget.size.w)}×{Math.round(widget.size.h)}
                </span>
              )}
            </div>

            {/* Minimize button — always visible outside 3-dot menu */}
            {!isFullscreenMode && (
              <button
                onClick={handleMinimize}
                className="p-1 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-primary-text cursor-pointer transition-colors shrink-0"
                title="Minimize widget"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 3-Dot Actions Menu */}
            <div className="relative flex items-center shrink-0">
              <button
                ref={dropdownBtnRef}
                onClick={(e) => {
                  e.stopPropagation();
                  if (showDropdown) {
                    setShowDropdown(false);
                  } else {
                    openDropdown();
                  }
                }}
                className="p-1 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
                title="Widget options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showDropdown && dropdownPos && createPortal(
                <div
                  ref={dropdownPanelRef}
                  style={{
                    position: 'fixed',
                    top: dropdownPos.top,
                    right: dropdownPos.right,
                    zIndex: 9999,
                  }}
                  className="w-48 glass-panel rounded-xl p-1.5 shadow-2xl border border-color-border-color flex flex-col gap-0.5 text-xs text-secondary-text select-none"
                >
                  {/* Toggle controls inside the widget */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowWidgetControls(!showWidgetControls);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer ${
                      showWidgetControls ? 'text-cyan-accent font-semibold bg-cyan-accent/5' : ''
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{showWidgetControls ? 'Hide Controls' : 'Show Controls'}</span>
                  </button>

                  <div className="h-[1px] bg-color-border-color my-0.5" />

                  {/* Lock/Unlock */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      commitWidgetUpdate(widget.id, { locked: !isLocked });
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer"
                  >
                    {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{isLocked ? 'Unlock Widget' : 'Lock Widget'}</span>
                  </button>

                  {/* Fullscreen */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullscreenWidgetId(isFullscreenMode ? null : widget.id);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer"
                  >
                    {isFullscreenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{isFullscreenMode ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                  </button>

                  {/* Styling Settings Modal trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(true);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Styling Settings</span>
                  </button>

                  <div className="h-[1px] bg-color-border-color my-0.5" />

                  {/* Bring to Front */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      bringToFront(widget.id);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bring to Front</span>
                  </button>

                  {/* Send to Back */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendToBack(widget.id);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Send to Back</span>
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateWidget(widget.id);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>

                  {/* Copy */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyWidget(widget);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Copy to Clipboard</span>
                  </button>

                  <div className="h-[1px] bg-color-border-color my-0.5" />

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWidget(widget.id);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-red-500 transition-colors cursor-pointer text-red-500/80 hover:text-red-500 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Widget</span>
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Widget Body Content */}
          <div className="flex-1 w-full overflow-hidden relative">
            {renderModuleContent()}
          </div>

          {/* Resize Handle overlay */}
          {isEditMode && !isLocked && !isFullscreenMode && (
            <div
              onPointerDown={handleResizeStart}
              className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-10 text-muted-text hover:text-cyan-accent transition-colors"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" className="fill-current">
                <path d="M6 0h2v8h-8v-2h6z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Selected Action Toolbar overlay removed to keep main screen clean */}

      {/* Widget Settings Modal */}
      <AnimatePresence>
        {showSettings && (
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
              exit={{ scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="flex items-center justify-between border-b border-color-border-color pb-3">
                <h2 className="text-base font-bold tracking-tight">Widget Diagnostics &amp; Customization</h2>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-muted-text hover:text-primary-text cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
              
              <form onSubmit={handleSaveSettings} className="flex flex-col gap-3 text-sm">
                
                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">Widget Display Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent"
                  />
                </div>

                {/* Size W/H Inputs */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-text font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <RulerIcon className="w-3 h-3" />
                    Exact Size (pixels)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-text">Width (px)</span>
                      <input
                        type="number"
                        min={150}
                        max={3000}
                        value={widthInput}
                        onChange={(e) => setWidthInput(parseInt(e.target.value) || 150)}
                        className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent font-mono text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-text">Height (px)</span>
                      <input
                        type="number"
                        min={100}
                        max={3000}
                        value={heightInput}
                        onChange={(e) => setHeightInput(parseInt(e.target.value) || 100)}
                        className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent font-mono text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-text mt-0.5">Current: {Math.round(widget.size.w)} × {Math.round(widget.size.h)} px · Min: 150 × 100</p>
                </div>

                {/* Opacity */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-muted-text">
                    <span>Widget Opacity</span>
                    <span>{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-glass-bg rounded-lg appearance-none cursor-pointer accent-cyan-accent"
                  />
                </div>

                {/* Rotation */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-muted-text">
                    <span>Widget Rotation</span>
                    <span>{rotation} deg</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-glass-bg rounded-lg appearance-none cursor-pointer accent-cyan-accent"
                  />
                </div>

                {/* Background Types */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">Container Treatment</label>
                  <select
                    value={backgroundType}
                    onChange={(e) => setBackgroundType(e.target.value as any)}
                    className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent bg-secondary-bg text-primary-text"
                  >
                    <option value="glass">Glassmorphism Blur</option>
                    <option value="solid">Solid Hex Color</option>
                    <option value="gradient">Custom Gradient</option>
                    <option value="image">Image URL backdrop</option>
                  </select>
                </div>

                {backgroundType !== 'glass' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">
                      {backgroundType === 'solid' ? 'Hex Color Code' : backgroundType === 'gradient' ? 'CSS Gradient definition' : 'Image URL link'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        backgroundType === 'solid' 
                          ? '#1a1a24' 
                          : backgroundType === 'gradient' 
                          ? 'linear-gradient(to right, #111827, #312e81)' 
                          : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'
                      }
                      value={backgroundValue}
                      onChange={(e) => setBackgroundValue(e.target.value)}
                      className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent text-xs font-mono"
                    />
                  </div>
                )}

                {/* Border Radius */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">Border Rounded Corners</label>
                  <select
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(e.target.value)}
                    className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent bg-secondary-bg text-primary-text"
                  >
                    <option value="0px">Sharp (0px)</option>
                    <option value="8px">Soft (8px)</option>
                    <option value="16px">OS Rounded (16px)</option>
                    <option value="24px">Super Smooth (24px)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-color-border-color">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-xs rounded-xl hover:bg-glass-bg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-accent text-black hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Apply Styles
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // For non-grid layouts, wrap with motion for entrance animation
  if (!isFullscreenMode && (widget.position.x !== 0 || widget.position.y !== 0)) {
    return (
      <motion.div
        key={widget.id}
        className="absolute"
        style={{ zIndex: widget.zIndex }}
        {...entranceVariants}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {wrapperContent}
      </motion.div>
    );
  }

  return wrapperContent;
};
