import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { WidgetContainer } from '../widgets/WidgetContainer';

export const DashboardCanvas: React.FC = () => {
  const { dashboards, activeDashboardId } = useDashboardStore();
  const { widgets, loadWidgets } = useWidgetStore();
  const { theme } = useThemeStore();
  const { fullscreenWidgetId, clearSelection } = useSelectionStore();
  const { 
    zoom, 
    panOffset, 
    setZoom, 
    setPanOffset, 
    isEditMode, 
    snapTolerance
  } = useLayoutStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // State for panning canvas (Infinite Canvas mode)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // State for snapping guide lines
  const [snapGuides, setSnapGuides] = useState<{ x: number | null, y: number | null }>({ x: null, y: null });

  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
  const isCanvas = activeDashboard?.layoutType === 'canvas';
  const isSnap = activeDashboard?.layoutType === 'snap';

  // Load widgets whenever dashboard switches
  useEffect(() => {
    loadWidgets(activeDashboardId);
    clearSelection();
  }, [activeDashboardId, loadWidgets, clearSelection]);

  // Handle zooming via mouse wheel in Infinite Canvas mode
  const handleWheel = (e: React.WheelEvent) => {
    if (!isCanvas) return;
    e.preventDefault();
    const zoomFactor = 0.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    setZoom(z => z + direction * zoomFactor * z);
  };

  // Handle panning start (middle click or Space + drag)
  const handlePointerDown = (e: React.PointerEvent) => {
    const isMiddleClick = e.button === 1;
    const isSpacePressed = e.shiftKey;
    const isCanvasTarget = e.target === containerRef.current || e.target === canvasRef.current;
    
    if (isCanvas && (isMiddleClick || isSpacePressed || (isCanvasTarget && e.button === 0))) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      containerRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (isCanvasTarget) {
      clearSelection();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      containerRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  // Snapping calculations during widget dragging
  const handleWidgetDrag = (draggedId: string, currentX: number, currentY: number, widgetW: number, widgetH: number) => {
    if (!isSnap) return { x: currentX, y: currentY };

    let snapX = currentX;
    let snapY = currentY;
    let guideX: number | null = null;
    let guideY: number | null = null;

    const dragL = currentX;
    const dragR = currentX + widgetW;
    const dragT = currentY;
    const dragB = currentY + widgetH;
    const dragCX = currentX + widgetW / 2;
    const dragCY = currentY + widgetH / 2;

    for (const w of widgets) {
      if (w.id === draggedId || !w.visible) continue;

      const wL = w.position.x;
      const wR = w.position.x + w.size.w;
      const wT = w.position.y;
      const wB = w.position.y + w.size.h;
      const wCX = w.position.x + w.size.w / 2;
      const wCY = w.position.y + w.size.h / 2;

      if (Math.abs(dragL - wL) < snapTolerance) { snapX = wL; guideX = wL; }
      else if (Math.abs(dragR - wR) < snapTolerance) { snapX = wR - widgetW; guideX = wR; }
      else if (Math.abs(dragL - wR) < snapTolerance) { snapX = wR; guideX = wR; }
      else if (Math.abs(dragR - wL) < snapTolerance) { snapX = wL - widgetW; guideX = wL; }
      else if (Math.abs(dragCX - wCX) < snapTolerance) { snapX = wCX - widgetW / 2; guideX = wCX; }

      if (Math.abs(dragT - wT) < snapTolerance) { snapY = wT; guideY = wT; }
      else if (Math.abs(dragB - wB) < snapTolerance) { snapY = wB - widgetH; guideY = wB; }
      else if (Math.abs(dragT - wB) < snapTolerance) { snapY = wB; guideY = wB; }
      else if (Math.abs(dragB - wT) < snapTolerance) { snapY = wT - widgetH; guideY = wT; }
      else if (Math.abs(dragCY - wCY) < snapTolerance) { snapY = wCY - widgetH / 2; guideY = wCY; }
    }

    setSnapGuides({ x: guideX, y: guideY });
    return { x: snapX, y: snapY };
  };

  const clearSnapGuides = () => {
    setSnapGuides({ x: null, y: null });
  };

  const getCanvasBgClass = () => {
    if (theme === 'dark') return 'mesh-gradient-dark';
    return 'mesh-gradient-light';
  };

  const fullscreenWidget = widgets.find(w => w.id === fullscreenWidgetId);


  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative flex-1 w-full h-full overflow-hidden select-none outline-none ${getCanvasBgClass()} ${
        isPanning ? 'cursor-grabbing' : isCanvas ? 'cursor-grab' : 'cursor-default'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Mesh grid background */}
      <div className="absolute inset-0 canvas-grid-pattern opacity-60 pointer-events-none" />

      {/* Snap Guides Visual Overlay */}
      <AnimatePresence>
        {isSnap && isEditMode && snapGuides.x !== null && (
          <motion.div 
            key="snap-x"
            className="absolute top-0 bottom-0 w-[1px] bg-cyan-accent border-l border-dashed border-cyan-accent/60 shadow-[0_0_8px_rgba(6,182,212,0.6)] z-40 pointer-events-none"
            style={{ left: snapGuides.x }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
        {isSnap && isEditMode && snapGuides.y !== null && (
          <motion.div 
            key="snap-y"
            className="absolute left-0 right-0 h-[1px] bg-cyan-accent border-t border-dashed border-cyan-accent/60 shadow-[0_0_8px_rgba(6,182,212,0.6)] z-40 pointer-events-none"
            style={{ top: snapGuides.y }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>

      {/* Main canvas content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDashboardId}
          className="w-full h-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div
            ref={canvasRef}
            className="absolute inset-0 origin-center"
            style={
              isCanvas
                ? { transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})` }
                : undefined
            }
          >
            <AnimatePresence>
              {widgets
                .filter(w => w.visible)
                .map((w) => (
                  <WidgetContainer
                    key={w.id}
                    widget={w}
                    onDrag={handleWidgetDrag}
                    onDragEnd={clearSnapGuides}
                  />
                ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Fullscreen Overlay Render */}
      <AnimatePresence>
        {fullscreenWidget && (
          <motion.div
            className="fixed inset-0 z-50 bg-primary-bg/95 backdrop-blur-xl flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-full h-full max-w-7xl glass-panel rounded-2xl overflow-hidden flex flex-col"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <WidgetContainer widget={fullscreenWidget} isFullscreenMode={true} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Mode HUD Overlay indicator */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl glass-panel border border-purple-accent/30 text-xs font-semibold text-purple-accent shadow-[0_0_15px_rgba(139,92,246,0.15)] flex items-center gap-2 pointer-events-none edit-mode-badge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-accent animate-ping" />
            <span>OS Customization Mode — Drag &amp; Resize unlocked</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
