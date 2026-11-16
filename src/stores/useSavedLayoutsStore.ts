import { create } from 'zustand';
import type { SavedLayout, Widget } from '../types';

interface SavedLayoutsState {
  layouts: SavedLayout[];
  saveLayout: (name: string, dashboardId: string, widgets: Widget[]) => SavedLayout;
  getLayout: (nameOrId: string, dashboardId?: string) => SavedLayout | undefined;
  listLayouts: (dashboardId?: string) => SavedLayout[];
  deleteLayout: (nameOrId: string) => boolean;
}

const STORAGE_KEY = 'personal_os_saved_layouts';

function loadFromStorage(): SavedLayout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load saved layouts from localStorage', e);
    return [];
  }
}

function persistToStorage(layouts: SavedLayout[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch (e) {
    console.error('Failed to save layouts to localStorage', e);
  }
}

export const useSavedLayoutsStore = create<SavedLayoutsState>((set, get) => ({
  layouts: loadFromStorage(),

  saveLayout: (name, dashboardId, widgets) => {
    const existing = get().layouts;
    const cleanName = name.trim();
    const id = `layout-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const newLayout: SavedLayout = {
      id,
      name: cleanName,
      dashboardId,
      createdAt: Date.now(),
      widgets: widgets.map((w) => ({
        id: w.id,
        title: w.title,
        moduleType: w.moduleType,
        position: { ...w.position },
        size: { ...w.size },
        percentPosition: w.percentPosition ? { ...w.percentPosition } : undefined,
        zIndex: w.zIndex,
      })),
    };

    // Replace if same name on same dashboard, otherwise prepend
    const filtered = existing.filter(
      (l) => !(l.name.toLowerCase() === cleanName.toLowerCase() && l.dashboardId === dashboardId)
    );
    const updated = [newLayout, ...filtered];

    set({ layouts: updated });
    persistToStorage(updated);
    return newLayout;
  },

  getLayout: (nameOrId, dashboardId) => {
    const q = nameOrId.trim().toLowerCase();
    const all = get().layouts;
    return all.find(
      (l) =>
        (l.id.toLowerCase() === q || l.name.toLowerCase() === q) &&
        (!dashboardId || l.dashboardId === dashboardId)
    ) || all.find((l) => l.id.toLowerCase() === q || l.name.toLowerCase() === q);
  },

  listLayouts: (dashboardId) => {
    const all = get().layouts;
    if (!dashboardId) return all;
    return all.filter((l) => l.dashboardId === dashboardId);
  },

  deleteLayout: (nameOrId) => {
    const q = nameOrId.trim().toLowerCase();
    const before = get().layouts;
    const filtered = before.filter(
      (l) => l.id.toLowerCase() !== q && l.name.toLowerCase() !== q
    );
    if (filtered.length !== before.length) {
      set({ layouts: filtered });
      persistToStorage(filtered);
      return true;
    }
    return false;
  },
}));
