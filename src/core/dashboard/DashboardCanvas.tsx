import React, { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Undo2, Redo2, Grid, Plus, Minus } from "lucide-react";
import { useDashboardStore } from "../../stores/useDashboardStore";
import { useWidgetStore } from "../../stores/useWidgetStore";
import { useLayoutStore } from "../../stores/useLayoutStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { WidgetContainer } from "../widgets/WidgetContainer";
import { WorkspaceBackground } from "./WorkspaceBackground";
import { percentToPixels } from "../layout/positionUtils";

export const DashboardCanvas: React.FC = () => {
  const { dashboards, activeDashboardId } = useDashboardStore();
  const { widgets, loadWidgets } = useWidgetStore();
  const { theme } = useThemeStore();
  const { fullscreenWidgetId, setFullscreenWidgetId, clearSelection } =
    useSelectionStore();
  const { zoom, panOffset, setZoom, setPanOffset, snapTolerance } =
    useLayoutStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // State for panning canvas (Infinite Canvas mode)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // State for snapping guide lines
  const [snapGuides, setSnapGuides] = useState<{
    x: number | null;
    y: number | null;
  }>({ x: null, y: null });
  // State for tracking active visual positioning / dragging / resizing
  const [isPositioningActive, setIsPositioningActive] = useState(false);
  const [showGridOverlay, setShowGridOverlay] = useState(false);

  const { undo, redo, undoStack, redoStack } = useHistoryStore();

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId);
  const isCanvas = activeDashboard?.layoutType === "canvas";
  const isSnap = activeDashboard?.layoutType === "snap";

  // Responsive screen observer: automatically adapt widget pixel dimensions when viewport changes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const viewport = { width, height };
          const { widgets, updateWidgetLocal } = useWidgetStore.getState();
          widgets.forEach((w) => {
            if (w.percentPosition && !w.minimized) {
              const px = percentToPixels(w.percentPosition, viewport);
              if (
                Math.abs(px.x - w.position.x) > 2 ||
                Math.abs(px.y - w.position.y) > 2 ||
                Math.abs(px.w - w.size.w) > 2 ||
                Math.abs(px.h - w.size.h) > 2
              ) {
                updateWidgetLocal(w.id, {
                  position: { x: px.x, y: px.y },
                  size: { w: px.w, h: px.h },
                });
              }
            }
          });
        }
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Load widgets whenever dashboard switches
  useEffect(() => {
    loadWidgets(activeDashboardId);
    clearSelection();
  }, [activeDashboardId, loadWidgets, clearSelection]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreenWidgetId) {
        e.preventDefault();
        setFullscreenWidgetId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenWidgetId, setFullscreenWidgetId]);

  // Handle zooming via mouse wheel in Infinite Canvas mode
  const handleWheel = (e: React.WheelEvent) => {
    if (!isCanvas) return;
    e.preventDefault();
    const zoomFactor = 0.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    setZoom((z) => z + direction * zoomFactor * z);
  };

  // Handle panning start (middle click or Space + drag)
  const handlePointerDown = (e: React.PointerEvent) => {
    const isMiddleClick = e.button === 1;
    const isSpacePressed = e.shiftKey;
    const isCanvasTarget =
      e.target === containerRef.current || e.target === canvasRef.current;

    if (
      isCanvas &&
      (isMiddleClick || isSpacePressed || (isCanvasTarget && e.button === 0))
    ) {
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
        y: e.clientY - panStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      containerRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  // Snapping and boundary calculations during widget dragging
  const handleWidgetDrag = (
    draggedId: string,
    currentX: number,
    currentY: number,
    widgetW: number,
    widgetH: number,
  ) => {
    let snapX = currentX;
    let snapY = currentY;

    // Viewport boundaries
    let minX = -Infinity;
    let maxX = Infinity;
    let minY = -Infinity;
    let maxY = Infinity;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;

      if (isCanvas) {
        // Infinite Canvas bounds: keep at least 40px of the widget visible on screen,
        // and ensure the header (top of the widget) never goes above the top of the viewport.
        const padding = 40;
        minX = -panOffset.x / zoom - widgetW + padding;
        maxX = (-panOffset.x + containerW) / zoom - padding;
        minY = -panOffset.y / zoom; // Header must remain visible at the top
        maxY = (-panOffset.y + containerH) / zoom - padding;
      } else {
        // Free / Snap layout bounds: keep strictly within container borders
        minX = 0;
        maxX = Math.max(0, containerW - widgetW);
        minY = 0;
        maxY = Math.max(0, containerH - widgetH);
      }
    }

    // Clamp coordinates to space boundaries
    snapX = Math.max(minX, Math.min(maxX, snapX));
    snapY = Math.max(minY, Math.min(maxY, snapY));

    if (!isSnap) return { x: snapX, y: snapY };

    let guideX: number | null = null;
    let guideY: number | null = null;

    const dragL = snapX;
    const dragR = snapX + widgetW;
    const dragT = snapY;
    const dragB = snapY + widgetH;
    const dragCX = snapX + widgetW / 2;
    const dragCY = snapY + widgetH / 2;

    for (const w of widgets) {
      if (w.id === draggedId || !w.visible) continue;

      const wL = w.position.x;
      const wR = w.position.x + w.size.w;
      const wT = w.position.y;
      const wB = w.position.y + w.size.h;
      const wCX = w.position.x + w.size.w / 2;
      const wCY = w.position.y + w.size.h / 2;

      if (Math.abs(dragL - wL) < snapTolerance) {
        snapX = wL;
        guideX = wL;
      } else if (Math.abs(dragR - wR) < snapTolerance) {
        snapX = wR - widgetW;
        guideX = wR;
      } else if (Math.abs(dragL - wR) < snapTolerance) {
        snapX = wR;
        guideX = wR;
      } else if (Math.abs(dragR - wL) < snapTolerance) {
        snapX = wL - widgetW;
        guideX = wL;
      } else if (Math.abs(dragCX - wCX) < snapTolerance) {
        snapX = wCX - widgetW / 2;
        guideX = wCX;
      }

      if (Math.abs(dragT - wT) < snapTolerance) {
        snapY = wT;
        guideY = wT;
      } else if (Math.abs(dragB - wB) < snapTolerance) {
        snapY = wB - widgetH;
        guideY = wB;
      } else if (Math.abs(dragT - wB) < snapTolerance) {
        snapY = wB;
        guideY = wB;
      } else if (Math.abs(dragB - wT) < snapTolerance) {
        snapY = wT - widgetH;
        guideY = wT;
      } else if (Math.abs(dragCY - wCY) < snapTolerance) {
        snapY = wCY - widgetH / 2;
        guideY = wCY;
      }
    }

    // Re-clamp snapped coordinates to preserve layout borders
    snapX = Math.max(minX, Math.min(maxX, snapX));
    snapY = Math.max(minY, Math.min(maxY, snapY));

    setSnapGuides({ x: guideX, y: guideY });
    return { x: snapX, y: snapY };
  };

  const clearSnapGuides = () => {
    setSnapGuides({ x: null, y: null });
  };

  const getCanvasBgClass = () => {
    if (theme === "dark") return "mesh-gradient-dark";
    return "mesh-gradient-light";
  };

  const fullscreenWidget = widgets.find((w) => w.id === fullscreenWidgetId);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative flex-1 w-full h-full overflow-hidden select-none outline-none ${getCanvasBgClass()} ${
        isPanning
          ? "cursor-grabbing"
          : isCanvas
            ? "cursor-grab"
            : "cursor-default"
      }`}
      style={{ touchAction: "none" }}
    >
      {/* Mesh grid background */}
      <div className="absolute inset-0 canvas-grid-pattern opacity-60 pointer-events-none" />

      {/* Custom Image/Video Background (only for Free/Snap layouts) */}
      <WorkspaceBackground dashboard={activeDashboard} />

      {/* Snap Guides Visual Overlay */}
      <AnimatePresence>
        {isSnap && snapGuides.x !== null && (
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
        {isSnap && snapGuides.y !== null && (
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

      {/* 12-column × 12-row Visual Grid Overlay (active during widget dragging / resizing or via toggle) */}
      <AnimatePresence>
        {(isPositioningActive || showGridOverlay) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 pointer-events-none z-10 grid grid-cols-12 grid-rows-12 border border-cyan-500/20"
          >
            {Array.from({ length: 144 }).map((_, i) => {
              const col = (i % 12) + 1;
              const row = Math.floor(i / 12) + 1;
              return (
                <div
                  key={i}
                  className="border border-cyan-500/[0.08] flex items-start justify-start p-1"
                >
                  <span className="text-[8px] font-mono text-cyan-400/25 select-none">
                    {col},{row}
                  </span>
                </div>
              );
            })}
          </motion.div>
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
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div
            ref={canvasRef}
            className="absolute inset-0 origin-center"
            style={
              isCanvas
                ? {
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  }
                : undefined
            }
          >
            <AnimatePresence>
              {widgets
                .filter((w) => w.visible)
                .map((w) => (
                  <WidgetContainer
                    key={w.id}
                    widget={w}
                    onDrag={handleWidgetDrag}
                    onDragEnd={clearSnapGuides}
                    onPositioningChange={setIsPositioningActive}
                  />
                ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Floating Canvas Quick Dock */}
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 p-1 rounded-2xl bg-black/75 backdrop-blur-xl border border-color-border-color shadow-[0_0_25px_rgba(0,0,0,0.6)] select-none">
        {/* Undo Button */}
        <button
          onClick={() => activeDashboardId && undo(activeDashboardId)}
          disabled={undoStack.length === 0}
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
            undoStack.length > 0
              ? "text-primary-text hover:text-cyan-accent hover:bg-cyan-accent/10 cursor-pointer active:scale-90"
              : "text-muted-text/30 cursor-not-allowed opacity-40"
          }`}
          title={`Undo (Ctrl+Z)${undoStack.length > 0 ? ` • ${undoStack.length} action${undoStack.length > 1 ? "s" : ""}` : ""}`}
          aria-label="Undo action"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo Button */}
        <button
          onClick={() => activeDashboardId && redo(activeDashboardId)}
          disabled={redoStack.length === 0}
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
            redoStack.length > 0
              ? "text-primary-text hover:text-cyan-accent hover:bg-cyan-accent/10 cursor-pointer active:scale-90"
              : "text-muted-text/30 cursor-not-allowed opacity-40"
          }`}
          title={`Redo (Ctrl+Y)${redoStack.length > 0 ? ` • ${redoStack.length} action${redoStack.length > 1 ? "s" : ""}` : ""}`}
          aria-label="Redo action"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-color-border-color mx-0.5" />

        {/* 12x12 Grid Toggle */}
        <button
          onClick={() => setShowGridOverlay(!showGridOverlay)}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            showGridOverlay || isPositioningActive
              ? "bg-cyan-accent/20 text-cyan-accent border border-cyan-accent/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              : "text-secondary-text hover:text-primary-text hover:bg-white/5"
          }`}
          title="Toggle 12×12 Positioning Grid Guidelines"
          aria-label="Toggle grid"
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Canvas Zoom Controls (for Canvas Mode) */}
        {isCanvas && (
          <>
            <div className="w-[1px] h-4 bg-color-border-color mx-0.5" />
            <button
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
              className="p-2 rounded-xl text-secondary-text hover:text-primary-text hover:bg-white/5 cursor-pointer transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-cyan-accent px-1 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="p-2 rounded-xl text-secondary-text hover:text-primary-text hover:bg-white/5 cursor-pointer transition-colors"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Fullscreen Overlay Render */}
      <AnimatePresence>
        {fullscreenWidget && (
          <motion.div
            className="fixed inset-0 z-50 bg-primary-bg/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setFullscreenWidgetId(null)}
          >
            <motion.div
              className="w-full h-full max-w-7xl glass-panel rounded-2xl overflow-hidden flex flex-col border border-color-border-color shadow-[0_0_50px_rgba(0,0,0,0.8)] relative"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fullscreen Header with Back Button */}
              <div className="h-13 border-b border-color-border-color px-4 sm:px-6 flex items-center justify-between bg-glass-bg/80 backdrop-blur-md shrink-0 z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFullscreenWidgetId(null)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-accent/10 border border-cyan-accent/30 hover:bg-cyan-accent/20 hover:border-cyan-accent text-cyan-accent text-xs sm:text-sm font-semibold transition-all cursor-pointer group shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    title="Go Back to Dashboard (Esc)"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                    <span className="hidden sm:inline-block text-[10px] text-cyan-300/70 font-mono ml-1 px-1.5 py-0.5 rounded bg-black/40 border border-cyan-500/20">
                      ESC
                    </span>
                  </button>

                  <div className="h-4 w-[1px] bg-color-border-color hidden sm:block" />

                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs uppercase tracking-wider text-muted-text font-mono hidden md:inline">
                      Fullscreen
                    </span>
                    <span className="text-muted-text hidden md:inline">/</span>
                    <span className="text-sm font-bold text-primary-text truncate">
                      {fullscreenWidget.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fullscreen Widget Content */}
              <div className="flex-1 w-full overflow-hidden relative">
                <WidgetContainer
                  widget={fullscreenWidget}
                  isFullscreenMode={true}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
