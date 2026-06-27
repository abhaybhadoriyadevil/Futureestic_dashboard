import { create } from 'zustand';

interface LayoutState {
  zoom: number;
  panOffset: { x: number; y: number };
  snapTolerance: number;
  gridCellSize: number;
  isEditMode: boolean;
  setZoom: (zoom: number | ((z: number) => number)) => void;
  setPanOffset: (offset: { x: number; y: number } | ((o: { x: number; y: number }) => { x: number; y: number })) => void;
  setEditMode: (editMode: boolean) => void;
  resetCanvas: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  zoom: 1.0,
  panOffset: { x: 0, y: 0 },
  snapTolerance: 12,
  gridCellSize: 40, // 40px grid cell. 12 columns, 24px gap.
  isEditMode: false,

  setZoom: (zoom) => {
    set((state) => {
      const nextZoom = typeof zoom === 'function' ? zoom(state.zoom) : zoom;
      // Clamp zoom between 0.15 and 3.0 for reasonable control
      const clamped = Math.max(0.15, Math.min(3.0, nextZoom));
      return { zoom: clamped };
    });
  },

  setPanOffset: (offset) => {
    set((state) => {
      const nextOffset = typeof offset === 'function' ? offset(state.panOffset) : offset;
      return { panOffset: nextOffset };
    });
  },

  setEditMode: (isEditMode) => {
    set({ isEditMode });
  },

  resetCanvas: () => {
    set({ zoom: 1.0, panOffset: { x: 0, y: 0 } });
  }
}));
