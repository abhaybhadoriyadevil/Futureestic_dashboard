import type { CommandDefinition } from "../engine/commandTypes";
import { useWidgetStore } from "../../stores/useWidgetStore";
import { useDashboardStore } from "../../stores/useDashboardStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useSavedLayoutsStore } from '../../stores/useSavedLayoutsStore';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { useHistoryStore } from '../../stores/useHistoryStore';
import {
  getWorkspaceViewport,
  percentToPixels,
  pixelsToPercent,
  gridToPercent,
  percentToGrid,
  findOverlappingWidgets,
  arrangeWidgetsWithoutOverlap,
  clampPercentBounds,
} from '../../core/layout/positionUtils';

const VALID_WIDGET_TYPES = [
  "notes",
  "habits",
  "calendar",
  "charts",
  "kanban",
  "audio",
  "images",
  "videos",
  "tables",
  "files",
  "mindmap",
  "statistics",
];

const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
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

function resolveScreenPosition(
  posStr: string,
  targetW: number,
  targetH: number,
  isCanvasLayout: boolean
): { x: number; y: number } {
  const { width: availW, height: availH } = getWorkspaceViewport();
  const { zoom, panOffset } = useLayoutStore.getState();

  let scX = 24;
  let scY = 24;

  const p = posStr.toLowerCase().trim();

  switch (p) {
    case 'center':
    case 'middle':
      scX = (availW - targetW) / 2;
      scY = (availH - targetH) / 2;
      break;
    case 'top-left':
    case 'topleft':
    case 'tl':
      scX = 24;
      scY = 24;
      break;
    case 'top-right':
    case 'topright':
    case 'tr':
      scX = Math.max(24, availW - targetW - 24);
      scY = 24;
      break;
    case 'top':
    case 'top-center':
    case 'topcenter':
    case 'tc':
      scX = (availW - targetW) / 2;
      scY = 24;
      break;
    case 'bottom-left':
    case 'bottomleft':
    case 'bl':
      scX = 24;
      scY = Math.max(24, availH - targetH - 24);
      break;
    case 'bottom-right':
    case 'bottomright':
    case 'br':
      scX = Math.max(24, availW - targetW - 24);
      scY = Math.max(24, availH - targetH - 24);
      break;
    case 'bottom':
    case 'bottom-center':
    case 'bottomcenter':
    case 'bc':
      scX = (availW - targetW) / 2;
      scY = Math.max(24, availH - targetH - 24);
      break;
    case 'left':
    case 'left-center':
      scX = 24;
      scY = (availH - targetH) / 2;
      break;
    case 'right':
    case 'right-center':
      scX = Math.max(24, availW - targetW - 24);
      scY = (availH - targetH) / 2;
      break;
    default:
      scX = (availW - targetW) / 2;
      scY = (availH - targetH) / 2;
      break;
  }

  if (isCanvasLayout) {
    return {
      x: Math.round((-panOffset.x + scX) / zoom),
      y: Math.round((-panOffset.y + scY) / zoom),
    };
  }

  return {
    x: Math.round(scX),
    y: Math.round(scY),
  };
}

function findWidget(query: string, widgets: any[]) {
  const q = query.trim().toLowerCase();
  return widgets.find(
    (w) =>
      w.id.toLowerCase() === q ||
      w.id.toLowerCase().startsWith(q) ||
      w.title.toLowerCase() === q ||
      w.title.toLowerCase().includes(q),
  );
}

export const widgetCommands: CommandDefinition[] = [
  {
    id: "widget.list",
    name: "w ls",
    aliases: ["widget list", "widgets"],
    category: "Widgets",
    description: "List all active widgets on the current active workspace.",
    syntax: "w ls",
    examples: ["w ls", "widget list"],
    relatedCommands: ["widget add", "widget rm"],
    handler: (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      if (curWidgets.length === 0) {
        ctx.addOutput(
          "info",
          'No widgets on active workspace canvas. Use "widget add <type>" to spawn one.',
        );
        return;
      }

      const rows = curWidgets
        .map((w, i) => {
          const lockStatus = w.locked ? "[LOCKED]" : "[UNLOCKED]";
          const visStatus = w.visible !== false ? "VISIBLE" : "HIDDEN";
          return `• ${(i + 1).toString().padStart(2, " ")}. "${w.title}"\n     ID: ${w.id}\n     Type: ${w.moduleType.toUpperCase()} | Pos: (${Math.round(w.position.x)}, ${Math.round(w.position.y)}) | Size: ${w.size.w}x${w.size.h}\n     Status: ${lockStatus} ${visStatus} | zIndex: ${w.zIndex}`;
        })
        .join("\n\n");

      ctx.addOutput(
        "info",
        `=== ACTIVE CANVAS WIDGETS (${curWidgets.length}) ===\n\n${rows}`,
      );
    },
  },
  {
    id: "widget.add",
    name: "widget add",
    category: "Widgets",
    description: "Spawn a new modular widget onto the active canvas.",
    syntax: "widget add <type> [title]",
    arguments: [
      {
        name: "type",
        description: "Module type",
        required: true,
        choices: VALID_WIDGET_TYPES,
      },
      {
        name: "title",
        description: "Custom widget title bar label",
        required: false,
      },
    ],
    examples: [
      'widget add habits "Daily Routines"',
      'widget add notes "Work Log"',
      'widget add charts "Telemetry"',
      'widget add audio "Cyber Beats"',
      'widget add kanban "Sprint Tasks"',
    ],
    relatedCommands: ["widget rm", "w ls"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, addWidget } = useWidgetStore.getState();

      const modType = ctx.args[0]?.toLowerCase();
      let title = ctx.args[1];

      let dataRef: string | undefined = undefined;
      if (modType === "kanban") {
        dataRef = JSON.stringify({ todo: [], progress: [], done: [] });
      } else if (modType === "mindmap") {
        dataRef = JSON.stringify({
          nodes: [
            {
              id: "n-1",
              label: "Central Idea",
              x: 200,
              y: 150,
              color: "#3b82f6",
            },
          ],
          connections: [],
        });
      } else if (modType === "habits") {
        const count = widgets.filter((w) => w.moduleType === "habits").length;
        if (!title)
          title = count > 0 ? `Habit Tracker ${count + 1}` : "Habit Tracker";
      }

      if (!title) {
        title = `${modType.charAt(0).toUpperCase() + modType.slice(1)} Widget`;
      }

      const size = DEFAULT_SIZES[modType] || { w: 400, h: 300 };
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );
      const position = {
        x: 100 + ((curWidgets.length * 30) % 320),
        y: 100 + ((curWidgets.length * 30) % 240),
      };

      const zIndexes = widgets.map((w) => w.zIndex);
      const maxZ = zIndexes.length > 0 ? Math.max(...zIndexes) : 0;

      await addWidget({
        dashboardId: activeDashboardId,
        moduleType: modType as any,
        title,
        position,
        size,
        rotation: 0,
        zIndex: maxZ + 1,
        opacity: 100,
        styles: { borderRadius: "20px", backgroundType: "glass" },
        animation: { entrance: "fade", hover: "glow" },
        dataRef,
        locked: false,
        visible: true,
      });

      ctx.addOutput(
        "success",
        `Spawned [${modType.toUpperCase()}] widget "${title}" at (${position.x}, ${position.y}).`,
      );
    },
  },
  {
    id: "widget.rm",
    name: "widget rm",
    aliases: ["w rm", "widget delete"],
    category: "Widgets",
    description: "Delete a widget from the current workspace canvas.",
    syntax: "widget rm <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Widget ID or title name",
        required: true,
      },
    ],
    examples: ['widget rm "Work Log"', 'w rm "Cyber Beats"'],
    relatedCommands: ["widget add", "w ls"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, deleteWidget } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput(
          "error",
          `Widget "${ctx.args[0]}" not found on active workspace.`,
        );
        return;
      }

      await deleteWidget(target.id);
      ctx.addOutput(
        "success",
        `Deleted widget "${target.title}" (ID: ${target.id.slice(0, 8)}...).`,
      );
    },
  },
  {
    id: "widget.rename",
    name: "widget rename",
    category: "Widgets",
    description: "Rename a widget title bar.",
    syntax: "widget rename <id|title> <new_title>",
    arguments: [
      {
        name: "id|title",
        description: "Widget ID or current title",
        required: true,
      },
      {
        name: "new_title",
        description: "New title name",
        required: true,
      },
    ],
    examples: ['widget rename "Habit Tracker" "Super Habits"'],
    relatedCommands: ["w ls"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const newTitle = ctx.args[1];
      await commitWidgetUpdate(target.id, { title: newTitle });
      ctx.addOutput(
        "success",
        `Renamed widget "${target.title}" to "${newTitle}".`,
      );
    },
  },
  {
    id: "widget.clear",
    name: "widget clear",
    category: "Widgets",
    description: "Delete all widgets from the active workspace.",
    syntax: "widget clear",
    examples: ["widget clear"],
    handler: (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, deleteWidget } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      curWidgets.forEach((w) => deleteWidget(w.id));
      ctx.addOutput(
        "success",
        `Cleared ${curWidgets.length} widgets from active workspace.`,
      );
    },
  },
  {
    id: "widget.duplicate",
    name: "widget duplicate",
    category: "Widgets",
    description: "Duplicate an existing widget onto the canvas.",
    syntax: "widget duplicate <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
    ],
    examples: ['widget duplicate "Daily Routines"'],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, addWidget } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const zIndexes = widgets.map((w) => w.zIndex);
      const maxZ = zIndexes.length > 0 ? Math.max(...zIndexes) : 0;

      await addWidget({
        ...target,
        id: undefined as any,
        title: `${target.title} (Copy)`,
        position: { x: target.position.x + 30, y: target.position.y + 30 },
        zIndex: maxZ + 1,
      });

      ctx.addOutput("success", `Duplicated widget "${target.title}".`);
    },
  },
  {
    id: "widget.select",
    name: "widget select",
    category: "Widgets",
    description: "Set selection focus on a specific widget.",
    syntax: "widget select <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
    ],
    examples: ['widget select "Notes"'],
    handler: (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      useSelectionStore.getState().setSelectedWidgetId(target.id);
      ctx.addOutput(
        "success",
        `Selected widget "${target.title}" (ID: ${target.id.slice(0, 8)}...).`,
      );
    },
  },
  {
    id: "widget.lock",
    name: "widget lock",
    category: "Widgets",
    description: "Lock widget position and sizing on the canvas.",
    syntax: "widget lock <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
    ],
    examples: ['widget lock "Daily Routines"'],
    relatedCommands: ["widget unlock"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      await commitWidgetUpdate(target.id, { locked: true });
      ctx.addOutput("success", `Locked widget "${target.title}".`);
    },
  },
  {
    id: "widget.unlock",
    name: "widget unlock",
    category: "Widgets",
    description: "Unlock widget position and sizing on canvas.",
    syntax: "widget unlock <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
    ],
    examples: ['widget unlock "Daily Routines"'],
    relatedCommands: ["widget lock"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      await commitWidgetUpdate(target.id, { locked: false });
      ctx.addOutput("success", `Unlocked widget "${target.title}".`);
    },
  },
  {
    id: "widget.hide",
    name: "widget hide",
    category: "Widgets",
    description: "Hide a widget from view without deleting it.",
    syntax: "widget hide <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
    ],
    examples: ['widget hide "Notes"'],
    relatedCommands: ["widget show"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      await commitWidgetUpdate(target.id, { visible: false });
      ctx.addOutput("success", `Hidden widget "${target.title}".`);
    },
  },
  {
    id: "widget.show",
    name: "widget show",
    category: "Widgets",
    description: "Unhide a previously hidden widget.",
    syntax: "widget show <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
    ],
    examples: ['widget show "Notes"'],
    relatedCommands: ["widget hide"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      await commitWidgetUpdate(target.id, { visible: true });
      ctx.addOutput(
        "success",
        `Restored visibility of widget "${target.title}".`,
      );
    },
  },
  {
    id: "widget.fullscreen",
    name: "widget fullscreen",
    category: "Widgets",
    description: "Expand a widget to fullscreen or exit fullscreen.",
    syntax: "widget fullscreen <id|title>",
    arguments: [
      {
        name: "id|title",
        description: 'Target widget ID or title (pass "off" to exit)',
        required: true,
      },
    ],
    examples: ['widget fullscreen "Calendar"', "widget fullscreen off"],
    handler: (ctx) => {
      const query = ctx.args[0]?.trim();
      if (query === "off" || query === "exit") {
        useSelectionStore.getState().setFullscreenWidgetId(null);
        ctx.addOutput("success", "Exited fullscreen mode.");
        return;
      }

      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(query, curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${query}" not found.`);
        return;
      }

      useSelectionStore.getState().setFullscreenWidgetId(target.id);
      ctx.addOutput(
        "success",
        `Expanded widget "${target.title}" to fullscreen.`,
      );
    },
  },
  {
    id: "widget.rotate",
    name: "widget rotate",
    category: "Widgets",
    description: "Rotate a canvas widget by specified degrees.",
    syntax: "widget rotate <id|title> <degrees>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
      {
        name: "degrees",
        description: "Rotation angle in degrees (-360 to 360)",
        required: true,
        type: "number",
      },
    ],
    examples: ['widget rotate "Notes" 15', 'widget rotate "Notes" 0'],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const deg = Number(ctx.args[1]) || 0;
      await commitWidgetUpdate(target.id, { rotation: deg });
      ctx.addOutput("success", `Rotated widget "${target.title}" to ${deg}°.`);
    },
  },
  {
    id: "widget.opacity",
    name: "widget opacity",
    category: "Widgets",
    description: "Set widget transparency opacity (0 to 100).",
    syntax: "widget opacity <id|title> <0-100>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
      {
        name: "opacity",
        description: "Opacity percent (0-100)",
        required: true,
        type: "number",
      },
    ],
    examples: ['widget opacity "Notes" 85'],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const val = Math.min(Math.max(Number(ctx.args[1]), 10), 100);
      await commitWidgetUpdate(target.id, { opacity: val });
      ctx.addOutput("success", `Set opacity of "${target.title}" to ${val}%.`);
    },
  },
  {
    id: 'widget.place',
    name: 'widget place',
    category: 'Widgets',
    description: 'Position and resize a widget using workspace screen percentages (X%, Y%, Width%, Height%).',
    syntax: 'widget place <id|title> <x%> <y%> <width%> <height%>',
    arguments: [
      { name: 'id|title', description: 'Target widget ID or title', required: true },
      { name: 'x%', description: 'Horizontal position percentage (0-100)', required: true, type: 'number' },
      { name: 'y%', description: 'Vertical position percentage (0-100)', required: true, type: 'number' },
      { name: 'width%', description: 'Widget width percentage (min ~8%)', required: true, type: 'number' },
      { name: 'height%', description: 'Widget height percentage (min ~6%)', required: true, type: 'number' },
    ],
    examples: [
      'widget place "Image Gallery 01" 5 5 40 35',
      'widget place "Image Gallery 02" 50 5 40 35',
      'widget place "Habit Tracker" 5 45 40 30',
      'widget place "Expense Trends" 50 45 45 30',
      'widget place "Audio Player" 5 80 90 15',
    ],
    relatedCommands: ['widget grid', 'widget inspect', 'widget move', 'widget resize'],
    handler: async (ctx) => {
      const { dashboards, activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter((w) => w.dashboardId === activeDashboardId);

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput('error', `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const rawX = parseFloat(ctx.args[1]);
      const rawY = parseFloat(ctx.args[2]);
      const rawW = parseFloat(ctx.args[3]);
      const rawH = parseFloat(ctx.args[4]);

      if (isNaN(rawX) || isNaN(rawY) || isNaN(rawW) || isNaN(rawH)) {
        ctx.addOutput('error', 'All four positioning arguments (x, y, width, height) must be valid percentages (0-100).');
        return;
      }

      const viewport = getWorkspaceViewport();
      const percentBounds = clampPercentBounds({ x: rawX, y: rawY, w: rawW, h: rawH }, viewport);
      const pixelCoords = percentToPixels(percentBounds, viewport);

      const activeDash = dashboards.find((d) => d.id === activeDashboardId);
      const isCanvas = activeDash?.layoutType === 'canvas';
      const { zoom, panOffset } = useLayoutStore.getState();

      const finalCanvasX = isCanvas ? Math.round((-panOffset.x + pixelCoords.x) / zoom) : pixelCoords.x;
      const finalCanvasY = isCanvas ? Math.round((-panOffset.y + pixelCoords.y) / zoom) : pixelCoords.y;

      await commitWidgetUpdate(target.id, {
        percentPosition: percentBounds,
        position: { x: finalCanvasX, y: finalCanvasY },
        size: { w: pixelCoords.w, h: pixelCoords.h },
      });

      const updatedTarget = {
        ...target,
        percentPosition: percentBounds,
        position: { x: finalCanvasX, y: finalCanvasY },
        size: { w: pixelCoords.w, h: pixelCoords.h },
      };
      const overlapping = findOverlappingWidgets(updatedTarget, curWidgets, viewport);
      const overlapWarning =
        overlapping.length > 0
          ? `\n⚠️ Note: Intersects with ${overlapping.map((o) => `"${o.title}"`).join(', ')}.`
          : ' (Clean placement, no overlap)';

      ctx.addOutput(
        'success',
        `✔ Placed widget "${target.title}":\n  • Position: X=${percentBounds.x}%, Y=${percentBounds.y}%\n  • Dimensions: W=${percentBounds.w}%, H=${percentBounds.h}%\n  • Pixels: [${pixelCoords.x}px, ${pixelCoords.y}px] (${pixelCoords.w}x${pixelCoords.h}px)${overlapWarning}`
      );
    },
  },
  {
    id: 'widget.grid',
    name: 'widget grid',
    category: 'Widgets',
    description: 'Position and resize a widget using a 12-column × 12-row workspace grid.',
    syntax: 'widget grid <id|title> <column> <row> <column-span> <row-span>',
    arguments: [
      { name: 'id|title', description: 'Target widget ID or title', required: true },
      { name: 'column', description: 'Starting column index (1 to 12)', required: true, type: 'number' },
      { name: 'row', description: 'Starting row index (1 to 12)', required: true, type: 'number' },
      { name: 'column-span', description: 'Number of columns to occupy (1 to 12)', required: true, type: 'number' },
      { name: 'row-span', description: 'Number of rows to occupy (1 to 12)', required: true, type: 'number' },
    ],
    examples: [
      'widget grid "Image Gallery 01" 1 1 5 4',
      'widget grid "Image Gallery 02" 7 1 5 4',
      'widget grid "Habit Tracker" 1 6 5 3',
      'widget grid "Expense Trends" 7 6 5 3',
      'widget grid "Audio Player" 1 10 11 3',
    ],
    relatedCommands: ['widget place', 'widget inspect', 'widget arrange'],
    handler: async (ctx) => {
      const { dashboards, activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter((w) => w.dashboardId === activeDashboardId);

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput('error', `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const col = parseInt(ctx.args[1], 10);
      const row = parseInt(ctx.args[2], 10);
      const colSpan = parseInt(ctx.args[3], 10);
      const rowSpan = parseInt(ctx.args[4], 10);

      if (isNaN(col) || isNaN(row) || isNaN(colSpan) || isNaN(rowSpan)) {
        ctx.addOutput('error', 'Grid parameters <column> <row> <column-span> <row-span> must be integer numbers from 1 to 12.');
        return;
      }

      const viewport = getWorkspaceViewport();
      const percentBounds = gridToPercent(col, row, colSpan, rowSpan);
      const pixelCoords = percentToPixels(percentBounds, viewport);

      const activeDash = dashboards.find((d) => d.id === activeDashboardId);
      const isCanvas = activeDash?.layoutType === 'canvas';
      const { zoom, panOffset } = useLayoutStore.getState();

      const finalCanvasX = isCanvas ? Math.round((-panOffset.x + pixelCoords.x) / zoom) : pixelCoords.x;
      const finalCanvasY = isCanvas ? Math.round((-panOffset.y + pixelCoords.y) / zoom) : pixelCoords.y;

      await commitWidgetUpdate(target.id, {
        percentPosition: percentBounds,
        position: { x: finalCanvasX, y: finalCanvasY },
        size: { w: pixelCoords.w, h: pixelCoords.h },
      });

      const updatedTarget = {
        ...target,
        percentPosition: percentBounds,
        position: { x: finalCanvasX, y: finalCanvasY },
        size: { w: pixelCoords.w, h: pixelCoords.h },
      };
      const overlapping = findOverlappingWidgets(updatedTarget, curWidgets, viewport);
      const overlapWarning =
        overlapping.length > 0
          ? `\n⚠️ Note: Intersects with ${overlapping.map((o) => `"${o.title}"`).join(', ')}.`
          : ' (Clean placement, no overlap)';

      ctx.addOutput(
        'success',
        `✔ Grid aligned "${target.title}":\n  • Grid Slot: Col ${col}, Row ${row} [Span: ${colSpan} cols × ${rowSpan} rows]\n  • Percentages: X=${percentBounds.x}%, Y=${percentBounds.y}%, W=${percentBounds.w}%, H=${percentBounds.h}%\n  • Pixels: [${pixelCoords.x}px, ${pixelCoords.y}px] (${pixelCoords.w}x${pixelCoords.h}px)${overlapWarning}`
      );
    },
  },
  {
    id: 'widget.inspect',
    name: 'widget inspect',
    category: 'Widgets',
    description: 'Inspect widget positioning diagnostics: percentages, grid coordinates, pixel dimensions, and overlap status.',
    syntax: 'widget inspect <id|title>',
    arguments: [
      { name: 'id|title', description: 'Target widget ID or title', required: true },
    ],
    examples: ['widget inspect "Habit Tracker"', 'widget inspect "Notes"'],
    relatedCommands: ['widget place', 'widget grid'],
    handler: (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets } = useWidgetStore.getState();
      const curWidgets = widgets.filter((w) => w.dashboardId === activeDashboardId);

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput('error', `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const viewport = getWorkspaceViewport();
      const percentBounds =
        target.percentPosition ||
        pixelsToPercent(
          { x: target.position.x, y: target.position.y, w: target.size.w, h: target.size.h },
          viewport
        );
      const grid = percentToGrid(percentBounds);
      const overlapping = findOverlappingWidgets(target, curWidgets, viewport);

      const overlapText =
        overlapping.length === 0
          ? '✔ CLEAN (No overlapping widgets)'
          : `⚠️ OVERLAPPING (${overlapping.length} widgets):\n${overlapping.map((o) => `    • "${o.title}" [ID: ${o.id}]`).join('\n')}`;

      ctx.addOutput(
        'info',
        `╔═══════════════════════════════════════════════════════════════════════════════╗
║                      WIDGET DIAGNOSTICS & POSITION INSPECTOR                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

• Title:              "${target.title}"
• ID:                 ${target.id}
• Module:             ${target.moduleType}
• Layer (zIndex):     ${target.zIndex} | Status: ${target.locked ? 'LOCKED' : 'UNLOCKED'}

[PERCENTAGE VIEWPORT COORDINATES]
• X:                  ${percentBounds.x}%
• Y:                  ${percentBounds.y}%
• Width:              ${percentBounds.w}%
• Height:             ${percentBounds.h}%

[12 × 12 VISUAL GRID]
• Column:             ${grid.column} / 12
• Row:                ${grid.row} / 12
• Column Span:        ${grid.colSpan} cols
• Row Span:           ${grid.rowSpan} rows

[PIXEL BOUNDS (${viewport.width} × ${viewport.height} viewport)]
• Left / Top:         ${target.position.x}px, ${target.position.y}px
• Width / Height:     ${target.size.w}px × ${target.size.h}px

[OVERLAP STATUS]
${overlapText}`
      );
    },
  },
  {
    id: 'widget.layout.save',
    name: 'widget layout save',
    aliases: ['layout save'],
    category: 'Widgets',
    description: 'Save the current workspace widget arrangement as a named layout preset.',
    syntax: 'widget layout save <name>',
    arguments: [
      { name: 'name', description: 'Layout preset name', required: true },
    ],
    examples: ['widget layout save "Dual Column"', 'widget layout save "Trading View"'],
    relatedCommands: ['widget layout load', 'widget layout list'],
    handler: (ctx) => {
      const { activeDashboardId, dashboards } = useDashboardStore.getState();
      const { widgets } = useWidgetStore.getState();
      const curWidgets = widgets.filter((w) => w.dashboardId === activeDashboardId && w.visible);

      if (curWidgets.length === 0) {
        ctx.addOutput('warning', 'No visible widgets in current workspace to save.');
        return;
      }

      const name = ctx.args[0]?.trim();
      const saved = useSavedLayoutsStore.getState().saveLayout(name, activeDashboardId, curWidgets);
      const dash = dashboards.find((d) => d.id === activeDashboardId);

      ctx.addOutput(
        'success',
        `✔ Saved layout preset "${saved.name}" for workspace "${dash?.name || activeDashboardId}" with ${saved.widgets.length} widgets.`
      );
    },
  },
  {
    id: 'widget.layout.load',
    name: 'widget layout load',
    aliases: ['layout load'],
    category: 'Widgets',
    description: 'Restore a previously saved widget layout preset onto the current workspace.',
    syntax: 'widget layout load <name>',
    arguments: [
      { name: 'name', description: 'Saved layout name or ID', required: true },
    ],
    examples: ['widget layout load "Dual Column"', 'widget layout load "Trading View"'],
    relatedCommands: ['widget layout save', 'widget layout list'],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const layout = useSavedLayoutsStore.getState().getLayout(ctx.args[0], activeDashboardId);

      if (!layout) {
        ctx.addOutput('error', `Saved layout "${ctx.args[0]}" not found. Run "widget layout list" to view available layouts.`);
        return;
      }

      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter((w) => w.dashboardId === activeDashboardId);
      const viewport = getWorkspaceViewport();

      let restoredCount = 0;

      for (const item of layout.widgets) {
        const match = curWidgets.find(
          (w) => w.id === item.id || w.title.toLowerCase() === item.title.toLowerCase()
        );
        if (match) {
          const percentBounds =
            item.percentPosition ||
            pixelsToPercent(
              { x: item.position.x, y: item.position.y, w: item.size.w, h: item.size.h },
              viewport
            );
          const pixelCoords = percentToPixels(percentBounds, viewport);

          await commitWidgetUpdate(match.id, {
            percentPosition: percentBounds,
            position: { x: pixelCoords.x, y: pixelCoords.y },
            size: { w: pixelCoords.w, h: pixelCoords.h },
            zIndex: item.zIndex || match.zIndex,
          });
          restoredCount++;
        }
      }

      ctx.addOutput(
        'success',
        `✔ Restored layout "${layout.name}": successfully positioned ${restoredCount} matching widgets.`
      );
    },
  },
  {
    id: 'widget.layout.list',
    name: 'widget layout list',
    aliases: ['layout list', 'layouts'],
    category: 'Widgets',
    description: 'List all saved widget layout presets.',
    syntax: 'widget layout list',
    examples: ['widget layout list', 'layouts'],
    relatedCommands: ['widget layout save', 'widget layout load'],
    handler: (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const layouts = useSavedLayoutsStore.getState().listLayouts();

      if (layouts.length === 0) {
        ctx.addOutput('info', 'No saved layouts found. Save your current layout using "widget layout save <name>".');
        return;
      }

      const list = layouts
        .map((l, i) => {
          const isCurrentWs = l.dashboardId === activeDashboardId ? ' [Current WS]' : '';
          const dateStr = new Date(l.createdAt).toLocaleString();
          return `  ${(i + 1).toString().padStart(2, ' ')}. "${l.name}"${isCurrentWs}\n      Widgets: ${l.widgets.length} | Created: ${dateStr}`;
        })
        .join('\n\n');

      ctx.addOutput('info', `=== SAVED LAYOUT PRESETS (${layouts.length}) ===\n\n${list}`);
    },
  },
  {
    id: "widget.move",
    name: "widget move",
    category: "Widgets",
    description: "Reposition a widget to exact canvas coordinates (x, y).",
    syntax: "widget move <id|title> <x> <y>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
      {
        name: "x",
        description: "X coordinate",
        required: true,
        type: "number",
      },
      {
        name: 'y',
        description: 'Y coordinate (pixels or %) when using numeric/percentage X coordinate',
        required: false,
      },
    ],
    examples: [
      'widget move "Notes" center',
      'widget move "Notes" top-right',
      'widget move "Notes" 50% 50%',
      'widget move "Notes" 250 180',
    ],
    relatedCommands: ['widget place', 'widget align', 'widget arrange', 'widget fullscreen'],
    handler: async (ctx) => {
      const { dashboards, activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter((w) => w.dashboardId === activeDashboardId);

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput('error', `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const activeDash = dashboards.find((d) => d.id === activeDashboardId);
      const isCanvas = activeDash?.layoutType === 'canvas';

      const arg1 = ctx.args[1]?.trim();
      const arg2 = ctx.args[2]?.trim();

      let finalX: number;
      let finalY: number;

      // Case A: Named screen anchor position (e.g. "center", "top-left", "top-right")
      const namedPositions = [
        'center',
        'middle',
        'top-left',
        'topleft',
        'tl',
        'top-right',
        'topright',
        'tr',
        'top',
        'top-center',
        'topcenter',
        'tc',
        'bottom-left',
        'bottomleft',
        'bl',
        'bottom-right',
        'bottomright',
        'br',
        'bottom',
        'bottom-center',
        'bottomcenter',
        'bc',
        'left',
        'left-center',
        'right',
        'right-center',
      ];

      if (!arg2 || namedPositions.includes(arg1.toLowerCase())) {
        const coords = resolveScreenPosition(arg1, target.size.w, target.size.h, isCanvas);
        finalX = coords.x;
        finalY = coords.y;
        const viewport = getWorkspaceViewport();
        const percent = pixelsToPercent({ x: finalX, y: finalY, w: target.size.w, h: target.size.h }, viewport);
        await commitWidgetUpdate(target.id, { position: { x: finalX, y: finalY }, percentPosition: percent });
        ctx.addOutput(
          'success',
          `Positioned widget "${target.title}" to screen anchor "${arg1}" [Coords: (${finalX}, ${finalY}), ${percent.x}%, ${percent.y}%].`
        );
        return;
      }

      // Case B: Coordinate pair (pixels or percentages like "50% 50%")
      const viewport = getWorkspaceViewport();
      const { zoom, panOffset } = useLayoutStore.getState();

      if (arg1.endsWith('%')) {
        const pctX = parseFloat(arg1) / 100;
        const scX = viewport.width * pctX - target.size.w / 2;
        finalX = isCanvas ? Math.round((-panOffset.x + scX) / zoom) : Math.round(scX);
      } else {
        finalX = Number(arg1);
      }

      if (arg2.endsWith('%')) {
        const pctY = parseFloat(arg2) / 100;
        const scY = viewport.height * pctY - target.size.h / 2;
        finalY = isCanvas ? Math.round((-panOffset.y + scY) / zoom) : Math.round(scY);
      } else {
        finalY = Number(arg2);
      }

      if (isNaN(finalX) || isNaN(finalY)) {
        ctx.addOutput(
          'error',
          `Invalid coordinates "${arg1}" "${arg2}". Use numbers (e.g. 200 150), percentages (e.g. 50% 50%), or screen anchors (e.g. center, top-left, top-right).`
        );
        return;
      }

      const percent = pixelsToPercent({ x: finalX, y: finalY, w: target.size.w, h: target.size.h }, viewport);
      await commitWidgetUpdate(target.id, { position: { x: finalX, y: finalY }, percentPosition: percent });
      ctx.addOutput('success', `Moved widget "${target.title}" to (${finalX}, ${finalY}) [${percent.x}%, ${percent.y}%].`);
    },
  },
  {
    id: 'widget.align',
    name: 'widget align',
    aliases: ['widget position', 'align'],
    category: 'Widgets',
    description: 'Align a widget according to screen viewport (center, top-left, top-right, bottom-left, bottom-right).',
    syntax: 'widget align <id|title> <position>',
    arguments: [
      {
        name: 'id|title',
        description: 'Target widget ID or title',
        required: true,
        type: "number",
      },
    ],
    examples: [
      'widget align "Notes" center',
      'widget align "Habits" top-right',
      'widget align "Kanban" top-left',
    ],
    relatedCommands: ['widget place', 'widget move', 'widget arrange', 'widget fullscreen'],
    handler: async (ctx) => {
      const { activeDashboardId, dashboards } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const activeDash = dashboards.find((d) => d.id === activeDashboardId);
      const isCanvas = activeDash?.layoutType === 'canvas';
      const pos = ctx.args[1]?.trim() || 'center';

      const coords = resolveScreenPosition(pos, target.size.w, target.size.h, isCanvas);
      const viewport = getWorkspaceViewport();
      const percent = pixelsToPercent({ x: coords.x, y: coords.y, w: target.size.w, h: target.size.h }, viewport);

      await commitWidgetUpdate(target.id, { position: coords, percentPosition: percent });
      ctx.addOutput(
        'success',
        `Aligned widget "${target.title}" to screen [${pos}] at canvas coordinates (${coords.x}, ${coords.y}) [${percent.x}%, ${percent.y}%].`
      );
    },
  },
  {
    id: 'widget.arrange',
    name: 'widget arrange',
    aliases: ['widget tile', 'widget layout', 'arrange'],
    category: 'Widgets',
    description: 'Auto-arrange all active widgets across the screen in a clean grid, horizontal row, vertical stack, or reset layout.',
    syntax: 'widget arrange [grid|reset|horizontal|vertical]',
    arguments: [
      {
        name: 'style',
        description: 'Layout arrangement style: grid (collision-free tile), reset (clean default), horizontal, or vertical',
        required: false,
        choices: ['grid', 'reset', 'horizontal', 'vertical'],
      },
    ],
    examples: [
      'widget arrange grid',
      'widget arrange reset',
      'widget arrange horizontal',
      'widget arrange vertical',
      'widget tile',
    ],
    relatedCommands: ['widget place', 'widget move', 'widget align'],
    handler: async (ctx) => {
      const { dashboards, activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter((w) => w.dashboardId === activeDashboardId && w.visible);

      if (curWidgets.length === 0) {
        ctx.addOutput('warning', 'No visible widgets in current workspace to arrange.');
        return;
      }

      useHistoryStore.getState().pushState(widgets);

      const activeDash = dashboards.find((d) => d.id === activeDashboardId);
      const isCanvas = activeDash?.layoutType === 'canvas';
      const style = ctx.args[0]?.toLowerCase() || 'grid';
      const viewport = getWorkspaceViewport();
      const { zoom, panOffset } = useLayoutStore.getState();

      const padding = 24;
      const gap = 24;

      if (style === 'reset' || style === 'grid') {
        const arranged = arrangeWidgetsWithoutOverlap(curWidgets, viewport);
        for (const item of arranged) {
          const finalX = isCanvas ? Math.round((-panOffset.x + item.pixelCoords.x) / zoom) : item.pixelCoords.x;
          const finalY = isCanvas ? Math.round((-panOffset.y + item.pixelCoords.y) / zoom) : item.pixelCoords.y;

          await commitWidgetUpdate(item.id, {
            percentPosition: item.percentPosition,
            position: { x: finalX, y: finalY },
            size: { w: item.pixelCoords.w, h: item.pixelCoords.h },
          });
        }
        ctx.addOutput(
          'success',
          `Arranged ${arranged.length} widgets into a clean, collision-free ${style === 'reset' ? 'default reset' : 'responsive grid'} layout.`
        );
        return;
      }

      if (style === 'horizontal') {
        let currentX = padding;
        const currentY = padding;
        for (const w of curWidgets) {
          const finalX = isCanvas ? Math.round((-panOffset.x + currentX) / zoom) : currentX;
          const finalY = isCanvas ? Math.round((-panOffset.y + currentY) / zoom) : currentY;
          const pct = pixelsToPercent({ x: currentX, y: currentY, w: w.size.w, h: w.size.h }, viewport);
          await commitWidgetUpdate(w.id, { position: { x: finalX, y: finalY }, percentPosition: pct });
          currentX += w.size.w + gap;
        }
        ctx.addOutput('success', `Arranged ${curWidgets.length} widgets horizontally across the screen.`);
        return;
      }

      if (style === 'vertical') {
        const currentX = padding;
        let currentY = padding;
        for (const w of curWidgets) {
          const finalX = isCanvas ? Math.round((-panOffset.x + currentX) / zoom) : currentX;
          const finalY = isCanvas ? Math.round((-panOffset.y + currentY) / zoom) : currentY;
          const pct = pixelsToPercent({ x: currentX, y: currentY, w: w.size.w, h: w.size.h }, viewport);
          await commitWidgetUpdate(w.id, { position: { x: finalX, y: finalY }, percentPosition: pct });
          currentY += w.size.h + gap;
        }
        ctx.addOutput('success', `Arranged ${curWidgets.length} widgets vertically in a column.`);
        return;
      }
    },
  },
  {
    id: 'widget.resize',
    name: 'widget resize',
    category: 'Widgets',
    description: 'Resize a widget to exact width and height dimensions (pixels or %).',
    syntax: 'widget resize <id|title> <width> <height>',
    arguments: [
      {
        name: 'id|title',
        description: 'Target widget ID or title',
        required: true,
      },
      {
        name: 'width',
        description: 'Width in pixels or percentage (min: 150px / 8%)',
        required: true,
      },
      {
        name: 'height',
        description: 'Height in pixels or percentage (min: 100px / 6%)',
        required: true,
      },
    ],
    examples: ['widget resize "Notes" 500 350', 'widget resize "Notes" 40% 30%'],
    relatedCommands: ['widget place'],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const viewport = getWorkspaceViewport();
      let w = target.size.w;
      let h = target.size.h;

      if (ctx.args[1].endsWith('%')) {
        w = Math.max(150, Math.round((viewport.width * parseFloat(ctx.args[1])) / 100));
      } else {
        w = Math.max(150, Number(ctx.args[1]));
      }

      if (ctx.args[2].endsWith('%')) {
        h = Math.max(100, Math.round((viewport.height * parseFloat(ctx.args[2])) / 100));
      } else {
        h = Math.max(100, Number(ctx.args[2]));
      }

      const percent = pixelsToPercent({ x: target.position.x, y: target.position.y, w, h }, viewport);
      await commitWidgetUpdate(target.id, { size: { w, h }, percentPosition: percent });
      ctx.addOutput('success', `Resized widget "${target.title}" to ${w}x${h}px [W=${percent.w}%, H=${percent.h}%].`);
    },
  },
  {
    id: "widget.front",
    name: "widget front",
    category: "Widgets",
    description: "Bring a widget to the absolute front of canvas layering.",
    syntax: "widget front <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
    ],
    examples: ['widget front "Notes"'],
    relatedCommands: ["widget back"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      const maxZ = Math.max(...widgets.map((w) => w.zIndex), 0);
      await commitWidgetUpdate(target.id, { zIndex: maxZ + 1 });
      ctx.addOutput(
        "success",
        `Brought widget "${target.title}" to front (zIndex: ${maxZ + 1}).`,
      );
    },
  },
  {
    id: "widget.back",
    name: "widget back",
    category: "Widgets",
    description: "Send a widget to the back of canvas layering.",
    syntax: "widget back <id|title>",
    arguments: [
      {
        name: "id|title",
        description: "Target widget ID or title",
        required: true,
      },
    ],
    examples: ['widget back "Notes"'],
    relatedCommands: ["widget front"],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const curWidgets = widgets.filter(
        (w) => w.dashboardId === activeDashboardId,
      );

      const target = findWidget(ctx.args[0], curWidgets);
      if (!target) {
        ctx.addOutput("error", `Widget "${ctx.args[0]}" not found.`);
        return;
      }

      await commitWidgetUpdate(target.id, { zIndex: 1 });
      ctx.addOutput(
        "success",
        `Sent widget "${target.title}" to back (zIndex: 1).`,
      );
    },
  },
];
