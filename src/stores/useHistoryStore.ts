import { create } from 'zustand';
import { useWidgetStore } from './useWidgetStore';
import { db } from '../core/storage/db';
import type { Widget } from '../types';
import { useUIStore } from './useUIStore';

interface HistoryState {
  undoStack: Widget[][];
  redoStack: Widget[][];
  pushState: (widgets: Widget[]) => void;
  undo: (dashboardId: string) => Promise<void>;
  redo: (dashboardId: string) => Promise<void>;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],

  pushState: (widgets) => {
    // Clone widgets array to capture snapshot before edits
    const snapshot = JSON.parse(JSON.stringify(widgets));
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), snapshot], // Limit history to 50 operations
      redoStack: [], // Clear redo stack on a new user action
    }));
  },

  undo: async (dashboardId) => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) {
      useUIStore.getState().addToast('Nothing to undo', 'warning');
      return;
    }

    const currentWidgets = useWidgetStore.getState().widgets;
    // Pop the last layout from the undo stack
    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Push the current widgets list to the redo stack
    set({
      undoStack: newUndoStack,
      redoStack: [...redoStack, JSON.parse(JSON.stringify(currentWidgets))],
    });

    try {
      // Sync back to IndexedDB: remove existing widgets for this dashboard, bulk add the previous ones
      await db.widgets.where('dashboardId').equals(dashboardId).delete();
      await db.widgets.bulkAdd(previousState);

      // Apply update directly to the widget store
      useWidgetStore.setState({ widgets: previousState });
      useUIStore.getState().addToast('Action undone', 'info');
    } catch (e) {
      console.error('History undo transaction failed', e);
      useUIStore.getState().addToast('Failed to undo action', 'warning');
    }
  },

  redo: async (dashboardId) => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) {
      useUIStore.getState().addToast('Nothing to redo', 'warning');
      return;
    }

    const currentWidgets = useWidgetStore.getState().widgets;
    // Pop the last layout from the redo stack
    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Push current widgets to the undo stack
    set({
      undoStack: [...undoStack, JSON.parse(JSON.stringify(currentWidgets))],
      redoStack: newRedoStack,
    });

    try {
      // Sync back to IndexedDB
      await db.widgets.where('dashboardId').equals(dashboardId).delete();
      await db.widgets.bulkAdd(nextState);

      // Apply update directly to the widget store
      useWidgetStore.setState({ widgets: nextState });
      useUIStore.getState().addToast('Action redone', 'info');
    } catch (e) {
      console.error('History redo transaction failed', e);
      useUIStore.getState().addToast('Failed to redo action', 'warning');
    }
  },

  clearHistory: () => {
    set({ undoStack: [], redoStack: [] });
  },
}));
