import { create } from 'zustand';
import { db } from '../core/storage/db';
import type { Widget } from '../types';

interface WidgetState {
  widgets: Widget[];
  loading: boolean;
  loadWidgets: (dashboardId: string) => Promise<void>;
  updateWidgetLocal: (id: string, updates: Partial<Widget>) => void;
  commitWidgetUpdate: (id: string, updates: Partial<Widget>) => Promise<void>;
  addWidget: (widget: Omit<Widget, 'id' | 'createdAt'>) => Promise<string>;
  duplicateWidget: (id: string) => Promise<string | null>;
  deleteWidget: (id: string) => Promise<void>;
  bringToFront: (id: string) => Promise<void>;
  sendToBack: (id: string) => Promise<void>;
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
  widgets: [],
  loading: false,

  loadWidgets: async (dashboardId) => {
    set({ loading: true });
    try {
      const list = await db.widgets.where('dashboardId').equals(dashboardId).toArray();
      set({ widgets: list.sort((a, b) => a.zIndex - b.zIndex) });
    } catch (e) {
      console.error('Failed to load widgets', e);
    } finally {
      set({ loading: false });
    }
  },

  updateWidgetLocal: (id, updates) => {
    set((state) => ({
      widgets: state.widgets.map((w) => {
        if (w.id === id) {
          // Deep merge position and size if they exist in updates
          return {
            ...w,
            ...updates,
            position: updates.position ? { ...w.position, ...updates.position } : w.position,
            size: updates.size ? { ...w.size, ...updates.size } : w.size,
            styles: updates.styles ? { ...w.styles, ...updates.styles } : w.styles,
            animation: updates.animation ? { ...w.animation, ...updates.animation } : w.animation,
          };
        }
        return w;
      }),
    }));
  },

  commitWidgetUpdate: async (id, updates) => {
    // Find the widget first to perform a clean merge for deep properties
    const widget = get().widgets.find((w) => w.id === id);
    if (!widget) return;

    // Push layout state before modifying
    const historyStore = (await import('./useHistoryStore')).useHistoryStore;
    historyStore.getState().pushState(get().widgets);

    const merged = {
      ...widget,
      ...updates,
      position: updates.position ? { ...widget.position, ...updates.position } : widget.position,
      size: updates.size ? { ...widget.size, ...updates.size } : widget.size,
      styles: updates.styles ? { ...widget.styles, ...updates.styles } : widget.styles,
      animation: updates.animation ? { ...widget.animation, ...updates.animation } : widget.animation,
    };

    // Update locally
    set((state) => ({
      widgets: state.widgets.map((w) => (w.id === id ? merged : w)),
    }));

    // Update in IndexedDB
    await db.widgets.update(id, merged);
  },

  addWidget: async (widgetData) => {
    // Push layout state before modifying
    const historyStore = (await import('./useHistoryStore')).useHistoryStore;
    historyStore.getState().pushState(get().widgets);

    const id = `widget-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const newWidget: Widget = {
      ...widgetData,
      id,
      createdAt: now,
    };
    await db.widgets.add(newWidget);
    set((state) => ({ widgets: [...state.widgets, newWidget] }));
    return id;
  },

  duplicateWidget: async (id) => {
    const widget = get().widgets.find((w) => w.id === id);
    if (!widget) return null;

    // Push layout state before modifying
    const historyStore = (await import('./useHistoryStore')).useHistoryStore;
    historyStore.getState().pushState(get().widgets);

    const newId = `widget-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const zIndexes = get().widgets.map((w) => w.zIndex);
    const maxZ = zIndexes.length > 0 ? Math.max(...zIndexes) : 0;

    const duplicate: Widget = {
      ...widget,
      id: newId,
      // Offset position slightly so user can see it is a duplicate
      position: {
        x: widget.position.x + 30,
        y: widget.position.y + 30,
      },
      zIndex: maxZ + 1,
      createdAt: now,
    };

    await db.widgets.add(duplicate);
    set((state) => ({ widgets: [...state.widgets, duplicate] }));
    return newId;
  },

  deleteWidget: async (id) => {
    // Push layout state before modifying
    const historyStore = (await import('./useHistoryStore')).useHistoryStore;
    historyStore.getState().pushState(get().widgets);

    await db.widgets.delete(id);
    set((state) => ({ widgets: state.widgets.filter((w) => w.id !== id) }));
  },

  bringToFront: async (id) => {
    const widgets = get().widgets;
    if (widgets.length <= 1) return;

    const zIndexes = widgets.map((w) => w.zIndex);
    const maxZ = Math.max(...zIndexes);

    const widget = widgets.find((w) => w.id === id);
    if (widget && widget.zIndex < maxZ) {
      await get().commitWidgetUpdate(id, { zIndex: maxZ + 1 });
    }
  },

  sendToBack: async (id) => {
    const widgets = get().widgets;
    if (widgets.length <= 1) return;

    const zIndexes = widgets.map((w) => w.zIndex);
    const minZ = Math.min(...zIndexes);

    const widget = widgets.find((w) => w.id === id);
    if (widget && widget.zIndex > minZ) {
      await get().commitWidgetUpdate(id, { zIndex: Math.max(0, minZ - 1) });
    }
  }
}));
