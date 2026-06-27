import { create } from 'zustand';

interface SelectionState {
  selectedWidgetId: string | null;
  fullscreenWidgetId: string | null;
  widgetSettingsOpenId: string | null;
  isResizing: boolean;
  isDragging: boolean;
  setSelectedWidgetId: (id: string | null) => void;
  setFullscreenWidgetId: (id: string | null) => void;
  setWidgetSettingsOpenId: (id: string | null) => void;
  setIsResizing: (resizing: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedWidgetId: null,
  fullscreenWidgetId: null,
  widgetSettingsOpenId: null,
  isResizing: false,
  isDragging: false,

  setSelectedWidgetId: (id) => {
    set({ selectedWidgetId: id });
  },

  setFullscreenWidgetId: (id) => {
    set({ fullscreenWidgetId: id });
  },

  setWidgetSettingsOpenId: (id) => {
    set({ widgetSettingsOpenId: id });
  },

  setIsResizing: (isResizing) => {
    set({ isResizing });
  },

  setIsDragging: (isDragging) => {
    set({ isDragging });
  },

  clearSelection: () => {
    set({ 
      selectedWidgetId: null, 
      fullscreenWidgetId: null, 
      widgetSettingsOpenId: null, 
      isResizing: false, 
      isDragging: false 
    });
  }
}));
