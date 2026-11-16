import React, {
  useRef,
  useState,
  useEffect,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Widget } from "../../types";
import { useWidgetStore } from "../../stores/useWidgetStore";
import { useLayoutStore } from "../../stores/useLayoutStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useDashboardStore } from "../../stores/useDashboardStore";
import {
  Maximize2,
  Minimize2,
  Settings,
  Copy,
  Clipboard,
  Trash2,
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
  Music,
  MoreVertical,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { useClipboardStore } from '../../stores/useClipboardStore';
import { useHistoryStore } from '../../stores/useHistoryStore';
import { 
  getWorkspaceViewport, 
  pixelsToPercent, 
  percentToPixels, 
  percentToGrid, 
  clampPercentBounds,
  findOverlappingWidgets,
} from "../layout/positionUtils";

// Lazy loaded module components
const NotesWidget = React.lazy(() =>
  import("../../modules/notes/NotesWidget").then((m) => ({
    default: m.NotesWidget,
  })),
);
const FilesWidget = React.lazy(() =>
  import("../../modules/files/FilesWidget").then((m) => ({
    default: m.FilesWidget,
  })),
);
const ImagesWidget = React.lazy(() =>
  import("../../modules/images/ImagesWidget").then((m) => ({
    default: m.ImagesWidget,
  })),
);
const VideosWidget = React.lazy(() =>
  import("../../modules/videos/VideosWidget").then((m) => ({
    default: m.VideosWidget,
  })),
);
const AudioWidget = React.lazy(() =>
  import("../../modules/audio/AudioWidget").then((m) => ({
    default: m.AudioWidget,
  })),
);
const TablesWidget = React.lazy(() =>
  import("../../modules/tables/TablesWidget").then((m) => ({
    default: m.TablesWidget,
  })),
);
const CalendarWidget = React.lazy(() =>
  import("../../modules/calendar/CalendarWidget").then((m) => ({
    default: m.CalendarWidget,
  })),
);
const StatisticsWidget = React.lazy(() =>
  import("../../modules/statistics/StatisticsWidget").then((m) => ({
    default: m.StatisticsWidget,
  })),
);
const ChartsWidget = React.lazy(() =>
  import("../../modules/charts/ChartsWidget").then((m) => ({
    default: m.ChartsWidget,
  })),
);
const KanbanWidget = React.lazy(() =>
  import("../../modules/kanban/KanbanWidget").then((m) => ({
    default: m.KanbanWidget,
  })),
);
const MindMapWidget = React.lazy(() =>
  import("../../modules/mindmap/MindMapWidget").then((m) => ({
    default: m.MindMapWidget,
  })),
);
const HabitsWidget = React.lazy(() =>
  import("../../modules/habits/HabitsWidget").then((m) => ({
    default: m.HabitsWidget,
  })),
);
const TextWidget = React.lazy(() =>
  import("../../modules/text/TextWidget").then((m) => ({
    default: m.TextWidget,
  })),
);

interface WidgetContainerProps {
  widget: Widget;
  isFullscreenMode?: boolean;
  onDrag?: (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => { x: number; y: number };
  onDragEnd?: () => void;
  onPositioningChange?: (active: boolean) => void;
}

// Map widget.animation.entrance to Framer Motion initial/animate variants
function getEntranceVariants(entrance: string) {
  switch (entrance) {
    case "slide-up":
      return {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      };
    case "slide-right":
      return {
        initial: { opacity: 0, x: -30 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
      };
    case "zoom":
    case "scale":
      return {
        initial: { opacity: 0, scale: 0.85 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
      };
    case "fade":
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
  onDragEnd,
  onPositioningChange,
}) => {
  const {
    widgets,
    updateWidgetLocal,
    commitWidgetUpdate,
    duplicateWidget,
    deleteWidget,
  } = useWidgetStore();
  const { isEditMode, zoom } = useLayoutStore();
  const { selectedWidgetId, setSelectedWidgetId, setFullscreenWidgetId } =
    useSelectionStore();
  const { copyWidget } = useClipboardStore();
  const { dashboards, activeDashboardId } = useDashboardStore();

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId);
  const isCanvas = activeDashboard?.layoutType === "canvas";

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right?: number;
    left?: number;
  } | null>(null);

  // Dragging states
  const [isDragging, setIsDragging] = useState(false);
  const [dragPending, setDragPending] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, wX: 0, wY: 0 });
  const dragTargetRef = useRef<HTMLElement | null>(null);
  const preDragWidgetsRef = useRef<Widget[] | null>(null);

  // Resizing states
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<"se" | "e" | "s">(
    "se",
  );
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, wW: 0, wH: 0 });
  const preResizeWidgetsRef = useRef<Widget[] | null>(null);

  // Notify parent of active visual positioning
  useEffect(() => {
    onPositioningChange?.(isDragging || isResizing);
  }, [isDragging, isResizing, onPositioningChange]);

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
  const [borderRadius, setBorderRadius] = useState(
    widget.styles.borderRadius || "20px",
  );
  const [backgroundType, setBackgroundType] = useState(
    widget.styles.backgroundType || "glass",
  );
  const [backgroundValue, setBackgroundValue] = useState(
    widget.styles.backgroundValue || "",
  );
  const [opacity, setOpacity] = useState(widget.opacity);
  const [rotation, setRotation] = useState(widget.rotation);
  const [widthInput, setWidthInput] = useState(Math.round(widget.size.w));
  const [heightInput, setHeightInput] = useState(Math.round(widget.size.h));

  // Percentage position inputs
  const initialPct =
    widget.percentPosition ||
    pixelsToPercent(
      {
        x: widget.position.x,
        y: widget.position.y,
        w: widget.size.w,
        h: widget.size.h,
      },
      getWorkspaceViewport(),
    );
  const [percentX, setPercentX] = useState(initialPct.x);
  const [percentY, setPercentY] = useState(initialPct.y);
  const [percentW, setPercentW] = useState(initialPct.w);
  const [percentH, setPercentH] = useState(initialPct.h);

  useEffect(() => {
    const p =
      widget.percentPosition ||
      pixelsToPercent(
        {
          x: widget.position.x,
          y: widget.position.y,
          w: widget.size.w,
          h: widget.size.h,
        },
        getWorkspaceViewport(),
      );
    setPercentX(p.x);
    setPercentY(p.y);
    setPercentW(p.w);
    setPercentH(p.h);
  }, [widget]);

  // Overlap detection with other active widgets
  const overlappingWidgets = useMemo(() => {
    if (isFullscreenMode || widget.minimized) return [];
    return findOverlappingWidgets(widget, widgets);
  }, [widget, widgets, isFullscreenMode]);
  const isOverlapping = overlappingWidgets.length > 0;

  const [showDropdown, setShowDropdown] = useState(false);

  const openDropdown = useCallback(() => {
    if (dropdownBtnRef.current) {
      const rect = dropdownBtnRef.current.getBoundingClientRect();
      const dropdownWidth = 192; // w-48 = 12rem = 192px
      // approximate height used ONLY for collision detection
      const estimatedHeight = 220;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Default: drop below
      let top: number | undefined = rect.bottom + 4;
      let bottom: number | undefined = undefined;

      let right: number | undefined = viewportWidth - rect.right;
      let left: number | undefined = undefined;

      // Flip up if not enough space below
      if (top + estimatedHeight > viewportHeight - 8) {
        top = undefined;
        // Anchor the bottom of the menu just above the button's top edge
        bottom = viewportHeight - rect.top + 4;
      } else {
        // Clamp so it never goes off-screen top if dropping down normally
        top = Math.max(8, top);
      }

      // Ensure right edge doesn't go off-screen left
      if (rect.right - dropdownWidth < 8) {
        right = undefined;
        left = Math.max(8, rect.left);
      }

      setDropdownPos({ top, bottom, right, left });
    }
    setShowDropdown(true);
  }, []);
  const [showWidgetControls, setShowWidgetControls] = useState(
    widget.uiState?.showControls ?? true,
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showDropdown) {
        const clickedInsideBtn = dropdownBtnRef.current?.contains(
          e.target as Node,
        );
        const clickedInsidePanel = dropdownPanelRef.current?.contains(
          e.target as Node,
        );
        if (!clickedInsideBtn && !clickedInsidePanel) {
          setShowDropdown(false);
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showDropdown]);

  useEffect(() => {
    setTitle(widget.title);
    setOpacity(widget.opacity);
    setRotation(widget.rotation);
    setWidthInput(
      Math.round(
        widget.minimized ? widget.preMinimizeSize?.w || 400 : widget.size.w,
      ),
    );
    setHeightInput(
      Math.round(
        widget.minimized ? widget.preMinimizeSize?.h || 300 : widget.size.h,
      ),
    );
  }, [widget]);

  const getModuleIcon = (type: Widget["moduleType"]) => {
    switch (type) {
      case "notes":
        return <FileText className="w-3.5 h-3.5 text-blue-accent" />;
      case "calendar":
        return <Calendar className="w-3.5 h-3.5 text-purple-accent" />;
      case "tables":
        return <Table className="w-3.5 h-3.5 text-green-accent" />;
      case "statistics":
        return <Activity className="w-3.5 h-3.5 text-cyan-accent" />;
      case "charts":
        return <BarChart2 className="w-3.5 h-3.5 text-blue-accent" />;
      case "kanban":
        return <CheckSquare className="w-3.5 h-3.5 text-purple-accent" />;
      case "mindmap":
        return <GitBranch className="w-3.5 h-3.5 text-cyan-accent" />;
      case "files":
        return <FolderOpen className="w-3.5 h-3.5 text-green-accent" />;
      case "images":
        return <Image className="w-3.5 h-3.5 text-blue-accent" />;
      case "videos":
        return <Video className="w-3.5 h-3.5 text-purple-accent" />;
      case "audio":
        return <Music className="w-3.5 h-3.5 text-cyan-accent" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-muted-text" />;
    }
  };

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await commitWidgetUpdate(widget.id, {
      minimized: true,
      preMinimizeSize: { w: widget.size.w, h: widget.size.h },
      size: { w: 180, h: 44 },
    });
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const restoreSize = widget.preMinimizeSize || { w: 400, h: 300 };

    let targetX = widget.position.x;
    let targetY = widget.position.y;

    const viewport = containerRef.current?.closest(".overflow-hidden");
    if (viewport && !isCanvas) {
      const rect = viewport.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;

      if (targetX + restoreSize.w > containerW) {
        targetX = Math.max(0, containerW - restoreSize.w);
      }
      if (targetY + restoreSize.h > containerH) {
        targetY = Math.max(0, containerH - restoreSize.h);
      }
    }

    await commitWidgetUpdate(widget.id, {
      minimized: false,
      size: restoreSize,
      position: { x: targetX, y: targetY },
    });
  };

  const isSelected = selectedWidgetId === widget.id && !isFullscreenMode;

  // Pointer drag start
  const DRAG_THRESHOLD = 5; // px

  const handleDragStart = (e: React.PointerEvent) => {
    if (isFullscreenMode) return;

    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();

    // Explicitly allow dragging if clicking on a designated drag handle
    const isDragHandle = target.closest(".drag-handle") !== null;
    const isMediaElement =
      tagName === "video" ||
      tagName === "audio" ||
      tagName === "canvas" ||
      tagName === "img" ||
      isDragHandle;

    if (!isMediaElement) {
      // Block drag on true interactive controls
      const isInteractive =
        target.closest("button") !== null ||
        target.closest("input") !== null ||
        target.closest("select") !== null ||
        target.closest("textarea") !== null ||
        target.closest("a") !== null ||
        target.closest("label") !== null ||
        target.closest('[role="button"]') !== null;
      if (isInteractive) return;
    }

    // Record pending drag start — actual drag only fires after threshold movement
    preDragWidgetsRef.current = JSON.parse(JSON.stringify(useWidgetStore.getState().widgets));
    setDragPending(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      wX: widget.position.x,
      wY: widget.position.y,
    });
    dragTargetRef.current = target;
    setSelectedWidgetId(widget.id);
    containerRef.current?.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragPending && !isDragging) return;

    const rawDx = e.clientX - dragStart.x;
    const rawDy = e.clientY - dragStart.y;

    // Activate drag only after threshold is crossed
    if (!isDragging) {
      if (Math.sqrt(rawDx * rawDx + rawDy * rawDy) < DRAG_THRESHOLD) return;
      setIsDragging(true);
      setDragPending(false);
    }

    const scaleFactor = zoom;
    const deltaX = rawDx / scaleFactor;
    const deltaY = rawDy / scaleFactor;

    let targetX = dragStart.wX + deltaX;
    let targetY = dragStart.wY + deltaY;

    if (onDrag) {
      const snapped = onDrag(
        widget.id,
        targetX,
        targetY,
        widget.size.w,
        widget.size.h,
      );
      targetX = snapped.x;
      targetY = snapped.y;
    }

    updateWidgetLocal(widget.id, {
      position: { x: targetX, y: targetY },
    });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!isDragging && !dragPending) return;

    containerRef.current?.releasePointerCapture(e.pointerId);

    // If it was just a click (no drag happened), synthesize a click event on the original target
    // This is necessary because pointer capture redirects the pointerup event to the container,
    // which prevents the browser from firing a native click event.
    if (!isDragging && dragPending && dragTargetRef.current) {
      dragTargetRef.current.click();
    }

    setIsDragging(false);
    setDragPending(false);
    dragTargetRef.current = null;

    if (isDragging) {
      if (preDragWidgetsRef.current) {
        useHistoryStore.getState().pushState(preDragWidgetsRef.current);
      }
      const viewport = getWorkspaceViewport();
      const percent = pixelsToPercent(
        {
          x: widget.position.x,
          y: widget.position.y,
          w: widget.size.w,
          h: widget.size.h,
        },
        viewport,
      );
      commitWidgetUpdate(widget.id, {
        position: { x: widget.position.x, y: widget.position.y },
        percentPosition: percent,
      }, true);
      if (onDragEnd) onDragEnd();
    }
    preDragWidgetsRef.current = null;
  };

  const handleResizeStart = (
    e: React.PointerEvent,
    dir: "se" | "e" | "s" = "se",
  ) => {
    if (isFullscreenMode) return;

    preResizeWidgetsRef.current = JSON.parse(JSON.stringify(useWidgetStore.getState().widgets));
    setIsResizing(true);
    setResizeDirection(dir);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      wW: widget.size.w,
      wH: widget.size.h,
    });

    setSelectedWidgetId(widget.id);
    containerRef.current?.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return;

    const scaleFactor = zoom;
    const deltaX = (e.clientX - resizeStart.x) / scaleFactor;
    const deltaY = (e.clientY - resizeStart.y) / scaleFactor;

    let targetW = resizeStart.wW;
    let targetH = resizeStart.wH;

    if (resizeDirection === "se" || resizeDirection === "e") {
      targetW = Math.max(150, resizeStart.wW + deltaX);
    }
    if (resizeDirection === "se" || resizeDirection === "s") {
      targetH = Math.max(100, resizeStart.wH + deltaY);
    }

    updateWidgetLocal(widget.id, {
      size: { w: targetW, h: targetH },
    });
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);
    containerRef.current?.releasePointerCapture(e.pointerId);

    if (preResizeWidgetsRef.current) {
      useHistoryStore.getState().pushState(preResizeWidgetsRef.current);
    }

    const viewport = getWorkspaceViewport();
    const percent = pixelsToPercent(
      {
        x: widget.position.x,
        y: widget.position.y,
        w: widget.size.w,
        h: widget.size.h,
      },
      viewport,
    );

    commitWidgetUpdate(widget.id, {
      size: { w: widget.size.w, h: widget.size.h },
      percentPosition: percent,
    }, true);
    preResizeWidgetsRef.current = null;
    if (onDragEnd) onDragEnd();
  };

  const getWidgetStyle = (): React.CSSProperties => {
    if (isFullscreenMode) return {};

    return {
      position: "absolute",
      left: `${widget.position.x}px`,
      top: `${widget.position.y}px`,
      width: `${widget.size.w}px`,
      height: `${widget.size.h}px`,
      zIndex: widget.zIndex,
      opacity: widget.opacity / 100,
      transform: `rotate(${widget.rotation}deg)`,
      transformOrigin: "center center",
    };
  };

  const getBackgroundStyle = () => {
    const type = widget.styles.backgroundType || "glass";
    const val = widget.styles.backgroundValue || "";

    if (type === "solid") return { backgroundColor: val };
    if (type === "gradient") return { backgroundImage: val };
    if (type === "image")
      return {
        backgroundImage: `url(${val})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    return {};
  };

  const renderModuleContent = () => {
    const props = {
      widgetId: widget.id,
      dataRef: widget.dataRef,
      isEditMode: isEditMode && !isFullscreenMode,
      showControls: showWidgetControls,
    };
    return (
      <Suspense
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-xs text-muted-text font-mono tracking-widest uppercase animate-pulse">
            <div className="scan-line opacity-20" />
            <span>Mounting Module...</span>
          </div>
        }
      >
        {(() => {
          switch (widget.moduleType) {
            case "notes":
              return <NotesWidget {...props} />;
            case "files":
              return <FilesWidget {...props} />;
            case "images":
              return <ImagesWidget {...props} />;
            case "videos":
              return <VideosWidget {...props} />;
            case "audio":
              return <AudioWidget {...props} />;
            case "tables":
              return <TablesWidget {...props} />;
            case "calendar":
              return <CalendarWidget {...props} />;
            case "statistics":
              return <StatisticsWidget {...props} />;
            case "charts":
              return <ChartsWidget {...props} />;
            case "kanban":
              return <KanbanWidget {...props} />;
            case "mindmap":
              return <MindMapWidget {...props} />;
            case "habits":
              return <HabitsWidget {...props} />;
            case "text":
              return <TextWidget {...props} />;
            default:
              return (
                <div className="p-4 text-xs text-muted-text">
                  Unknown OS module type
                </div>
              );
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
      },
    };

    const viewport = getWorkspaceViewport();

    if (widget.minimized) {
      updates.preMinimizeSize = { w: clampedW, h: clampedH };
    } else {
      // Apply percentage inputs
      const percentBounds = clampPercentBounds(
        { x: percentX, y: percentY, w: percentW, h: percentH },
        viewport,
      );
      const pixelCoords = percentToPixels(percentBounds, viewport);
      updates.percentPosition = percentBounds;
      updates.position = { x: pixelCoords.x, y: pixelCoords.y };
      updates.size = { w: pixelCoords.w, h: pixelCoords.h };
    }

    await commitWidgetUpdate(widget.id, updates);
    setShowSettings(false);
  };

  const entranceVariants = getEntranceVariants(
    widget.animation?.entrance || "fade",
  );

  // For free/snap/canvas mode, use motion.div with entrance animation
  // For grid mode, the DashboardCanvas handles the wrapper animation
  const wrapperContent = (
    <div
      ref={containerRef}
      onPointerDown={handleDragStart}
      onPointerMove={isResizing ? handleResizeMove : handleDragMove}
      onPointerUp={isResizing ? handleResizeEnd : handleDragEnd}
      onPointerDownCapture={() => {
        if (selectedWidgetId !== widget.id) {
          setSelectedWidgetId(widget.id);
        }
      }}
      style={getWidgetStyle()}
      className={`flex flex-col select-none group/container ${
        isFullscreenMode ? "w-full h-full relative" : "absolute"
      } ${
        isSelected
          ? "ring-2 ring-cyan-accent shadow-[0_0_20px_rgba(6,182,212,0.35)]"
          : "hover:shadow-lg"
      } ${isDragging ? "cursor-grabbing z-[999]" : ""}`}
    >
      {/* Live Positioning HUD */}
      {(isDragging || isResizing) &&
        !isFullscreenMode &&
        (() => {
          const vp = getWorkspaceViewport();
          const curPct = pixelsToPercent(
            {
              x: widget.position.x,
              y: widget.position.y,
              w: widget.size.w,
              h: widget.size.h,
            },
            vp,
          );
          const curGrid = percentToGrid(curPct);
          return (
            <div className="absolute -top-7 left-1 z-[120] px-2 py-0.5 bg-black/90 backdrop-blur-md border border-cyan-accent/80 rounded shadow-[0_0_12px_rgba(6,182,212,0.5)] text-[10px] font-mono text-cyan-accent flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
              <span className="font-bold text-white tracking-wider">POS</span>
              <span>X:{curPct.x}%</span>
              <span>Y:{curPct.y}%</span>
              <span className="text-white/40">|</span>
              <span>W:{curPct.w}%</span>
              <span>H:{curPct.h}%</span>
              <span className="text-white/40">|</span>
              <span className="text-purple-accent">
                GRID: C{curGrid.column} R{curGrid.row} ({curGrid.colSpan}×
                {curGrid.rowSpan})
              </span>
            </div>
          );
        })()}

      {widget.minimized ? (
        /* Minimized Pill */
        <div
          style={{
            ...getBackgroundStyle(),
            borderRadius: "9999px",
          }}
          onClick={(e) => {
            if (!isEditMode) {
              handleRestore(e);
            }
          }}
          className={`w-full h-full flex items-center justify-between pl-4 pr-3 border transition-all duration-200 ${
            isSelected
              ? "border-cyan-accent/50 bg-cyan-accent/5 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              : "border-color-border-color hover:border-white/10"
          } ${backgroundType === "glass" ? "glass-panel" : ""}`}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1 select-none pr-1">
            {getModuleIcon(widget.moduleType)}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleRestore}
              className="p-1 rounded-full hover:bg-glass-bg text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
              title="Restore widget"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v16.5h16.5V3.75H3.75zm12.75 6.75L12 15l-4.5-4.5"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* Widget Core Box */
        <div
          style={{
            ...getBackgroundStyle(),
            borderRadius: isFullscreenMode ? "0px" : borderRadius,
          }}
          className={`w-full h-full flex flex-col overflow-hidden relative border transition-all duration-200 ${
            isFullscreenMode
              ? "border-0"
              : isSelected
                ? "border-cyan-accent/40"
                : "border-color-border-color hover:border-white/10"
          } ${backgroundType === "glass" && !isFullscreenMode ? "glass-panel" : ""}`}
        >
          {/* Overlap Warning Indicator */}
          {isOverlapping && !isFullscreenMode && (
            <div
              className="absolute top-2 left-2 z-[25] flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/50 text-[10px] font-mono text-amber-300 pointer-events-none backdrop-blur-md shadow-sm"
              title={`Overlapping with: ${overlappingWidgets.map((w) => w.title).join(", ")}`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
              <span className="truncate max-w-[130px]">
                Overlap: {overlappingWidgets[0]?.title}
              </span>
            </div>
          )}

          {/* Floating Controls Overlay (Visible when active/selected) */}
          {selectedWidgetId === widget.id && !isFullscreenMode && (
            <div
              className="absolute top-2 right-2 flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 z-[30] pointer-events-auto shadow-lg"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleMinimize}
                className="p-1 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-primary-text cursor-pointer transition-colors shrink-0"
                title="Minimize widget"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

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
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {showDropdown &&
                  dropdownPos &&
                  createPortal(
                    <div
                      ref={dropdownPanelRef}
                      style={{
                        position: "fixed",
                        ...(dropdownPos.top !== undefined
                          ? { top: dropdownPos.top }
                          : {}),
                        ...(dropdownPos.bottom !== undefined
                          ? { bottom: dropdownPos.bottom }
                          : {}),
                        ...(dropdownPos.right !== undefined
                          ? { right: dropdownPos.right }
                          : {}),
                        ...(dropdownPos.left !== undefined
                          ? { left: dropdownPos.left }
                          : {}),
                        zIndex: 9999,
                      }}
                      className="w-48 glass-panel bg-black/95 backdrop-blur-3xl rounded-xl p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-color-border-color flex flex-col gap-0.5 text-xs text-secondary-text select-none"
                    >
                      {/* Toggle controls inside the widget */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newVal = !showWidgetControls;
                          setShowWidgetControls(newVal);
                          commitWidgetUpdate(widget.id, {
                            uiState: { showControls: newVal },
                          });
                          setShowDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer ${
                          showWidgetControls
                            ? "text-cyan-accent font-semibold bg-cyan-accent/5"
                            : ""
                        }`}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>
                          {showWidgetControls
                            ? "Hide Controls"
                            : "Show Controls"}
                        </span>
                      </button>

                      <div className="h-[1px] bg-color-border-color my-0.5" />

                      {/* Fullscreen */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFullscreenWidgetId(
                            isFullscreenMode ? null : widget.id,
                          );
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-glass-bg hover:text-primary-text transition-colors cursor-pointer"
                      >
                        {isFullscreenMode ? (
                          <Minimize2 className="w-3.5 h-3.5" />
                        ) : (
                          <Maximize2 className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isFullscreenMode ? "Exit Fullscreen" : "Fullscreen"}
                        </span>
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
                    document.body,
                  )}
              </div>
            </div>
          )}

          {/* Widget Body Content */}
          <div className="flex-1 w-full overflow-hidden relative">
            {renderModuleContent()}
          </div>

          {/* Resize Handles (multi-directional: se, e, s) */}
          {!isFullscreenMode && (
            <>
              {/* Right edge handle */}
              <div
                onPointerDown={(e) => handleResizeStart(e, "e")}
                className="absolute top-1/2 -translate-y-1/2 right-0 w-2.5 h-10 cursor-e-resize z-20 group/edge flex items-center justify-center hover:bg-cyan-accent/20 transition-colors"
                title="Resize width"
              >
                <div className="w-0.5 h-5 bg-muted-text/40 group-hover/edge:bg-cyan-accent rounded-full transition-colors" />
              </div>

              {/* Bottom edge handle */}
              <div
                onPointerDown={(e) => handleResizeStart(e, "s")}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2.5 w-10 cursor-s-resize z-20 group/edge flex items-center justify-center hover:bg-cyan-accent/20 transition-colors"
                title="Resize height"
              >
                <div className="h-0.5 w-5 bg-muted-text/40 group-hover/edge:bg-cyan-accent rounded-full transition-colors" />
              </div>

              {/* Bottom-right corner handle */}
              <div
                onPointerDown={(e) => handleResizeStart(e, "se")}
                className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-20 text-muted-text hover:text-cyan-accent transition-colors"
                title="Resize both"
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  className="fill-current"
                >
                  <path d="M6 0h2v8h-8v-2h6z" />
                </svg>
              </div>
            </>
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
                <h2 className="text-base font-bold tracking-tight">
                  Widget Diagnostics &amp; Customization
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-muted-text hover:text-primary-text cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>

              <form
                onSubmit={handleSaveSettings}
                className="flex flex-col gap-3 text-sm"
              >
                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">
                    Widget Display Title
                  </label>
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
                      <span className="text-[10px] text-muted-text">
                        Width (px)
                      </span>
                      <input
                        type="number"
                        min={150}
                        max={3000}
                        value={widthInput}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 150;
                          setWidthInput(val);
                          const vp = getWorkspaceViewport();
                          setPercentW(
                            Math.max(
                              10,
                              Math.min(100, Math.round((val / vp.width) * 100)),
                            ),
                          );
                        }}
                        className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent font-mono text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-text">
                        Height (px)
                      </span>
                      <input
                        type="number"
                        min={100}
                        max={3000}
                        value={heightInput}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 100;
                          setHeightInput(val);
                          const vp = getWorkspaceViewport();
                          setPercentH(
                            Math.max(
                              10,
                              Math.min(
                                100,
                                Math.round((val / vp.height) * 100),
                              ),
                            ),
                          );
                        }}
                        className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent font-mono text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-text mt-0.5">
                    Current: {Math.round(widget.size.w)} ×{" "}
                    {Math.round(widget.size.h)} px · Min: 150 × 100
                  </p>
                </div>

                {/* Responsive Viewport Coordinates (%) */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-cyan-accent/5 border border-cyan-accent/20">
                  <label className="text-xs text-cyan-accent font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3 h-3" />
                    Responsive Viewport Placement (%)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-text">X (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={95}
                        step={1}
                        value={percentX}
                        onChange={(e) =>
                          setPercentX(parseFloat(e.target.value) || 0)
                        }
                        className="px-2 py-1.5 rounded-lg glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent font-mono text-xs text-center"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-text">Y (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={95}
                        step={1}
                        value={percentY}
                        onChange={(e) =>
                          setPercentY(parseFloat(e.target.value) || 0)
                        }
                        className="px-2 py-1.5 rounded-lg glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent font-mono text-xs text-center"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-text">
                        Width (%)
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        step={1}
                        value={percentW}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 10;
                          setPercentW(val);
                          const vp = getWorkspaceViewport();
                          setWidthInput(Math.round((val / 100) * vp.width));
                        }}
                        className="px-2 py-1.5 rounded-lg glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent font-mono text-xs text-center"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-text">
                        Height (%)
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        step={1}
                        value={percentH}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 10;
                          setPercentH(val);
                          const vp = getWorkspaceViewport();
                          setHeightInput(Math.round((val / 100) * vp.height));
                        }}
                        className="px-2 py-1.5 rounded-lg glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent font-mono text-xs text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-cyan-accent/80 font-mono">
                    12×12 Grid: Col{" "}
                    {
                      percentToGrid({
                        x: percentX,
                        y: percentY,
                        w: percentW,
                        h: percentH,
                      }).column
                    }
                    , Row{" "}
                    {
                      percentToGrid({
                        x: percentX,
                        y: percentY,
                        w: percentW,
                        h: percentH,
                      }).row
                    }{" "}
                    (
                    {
                      percentToGrid({
                        x: percentX,
                        y: percentY,
                        w: percentW,
                        h: percentH,
                      }).colSpan
                    }
                    ×
                    {
                      percentToGrid({
                        x: percentX,
                        y: percentY,
                        w: percentW,
                        h: percentH,
                      }).rowSpan
                    }
                    )
                  </p>
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
                  <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">
                    Container Treatment
                  </label>
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

                {backgroundType !== "glass" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">
                      {backgroundType === "solid"
                        ? "Hex Color Code"
                        : backgroundType === "gradient"
                          ? "CSS Gradient definition"
                          : "Image URL link"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        backgroundType === "solid"
                          ? "#1a1a24"
                          : backgroundType === "gradient"
                            ? "linear-gradient(to right, #111827, #312e81)"
                            : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"
                      }
                      value={backgroundValue}
                      onChange={(e) => setBackgroundValue(e.target.value)}
                      className="px-3 py-2 rounded-xl glass-panel border border-color-border-color focus:outline-none focus:border-cyan-accent text-xs font-mono"
                    />
                  </div>
                )}

                {/* Border Radius */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-text font-semibold uppercase tracking-wider">
                    Border Rounded Corners
                  </label>
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
  if (
    !isFullscreenMode &&
    (widget.position.x !== 0 || widget.position.y !== 0)
  ) {
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
