import { create } from 'zustand';
import type { Widget } from '../types';
import { useWidgetStore } from './useWidgetStore';
import { useDashboardStore } from './useDashboardStore';
import { useUIStore } from './useUIStore';

interface ClipboardState {
  copiedWidget: Widget | null;
  copyWidget: (widget: Widget) => void;
  pasteWidget: () => Promise<string | null>;
  clearClipboard: () => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  copiedWidget: null,

  copyWidget: (widget) => {
    // Deep clone so we don't hold a reference to the live widget object
    const cloned = JSON.parse(JSON.stringify(widget)) as Widget;
    set({ copiedWidget: cloned });
    useUIStore.getState().addToast(`"${widget.title}" copied to clipboard`, 'success');
  },

  pasteWidget: async () => {
    const { copiedWidget } = get();
    if (!copiedWidget) {
      useUIStore.getState().addToast('Nothing to paste', 'warning');
      return null;
    }

    const activeDashboardId = useDashboardStore.getState().activeDashboardId;
    const widgetStore = useWidgetStore.getState();
    const widgets = widgetStore.widgets;

    const zIndexes = widgets.map(w => w.zIndex);
    const maxZ = zIndexes.length > 0 ? Math.max(...zIndexes) : 0;

    // Paste at a slightly offset position from original so it's visible
    const newId = await widgetStore.addWidget({
      ...copiedWidget,
      dashboardId: activeDashboardId,
      position: {
        x: copiedWidget.position.x + 40,
        y: copiedWidget.position.y + 40,
      },
      zIndex: maxZ + 1,
      // dataRef is kept the same so inline data (Kanban, MindMap) is preserved
    });

    useUIStore.getState().addToast(`"${copiedWidget.title}" pasted to workspace`, 'success');
    return newId;
  },

  clearClipboard: () => {
    set({ copiedWidget: null });
  },
}));
