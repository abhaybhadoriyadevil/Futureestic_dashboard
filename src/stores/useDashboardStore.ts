import { create } from 'zustand';
import { db } from '../core/storage/db';
import type { Dashboard } from '../types';

interface DashboardState {
  dashboards: Dashboard[];
  activeDashboardId: string;
  loading: boolean;
  setActiveDashboardId: (id: string) => void;
  loadDashboards: () => Promise<void>;
  createDashboard: (name: string, icon: string, layoutType: Dashboard['layoutType'], description?: string) => Promise<string>;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  activeDashboardId: 'home',
  loading: false,

  setActiveDashboardId: (id) => {
    set({ activeDashboardId: id });
  },

  loadDashboards: async () => {
    set({ loading: true });
    try {
      const list = await db.dashboards.toArray();
      set({ dashboards: list.sort((a, b) => a.createdAt - b.createdAt) });
      if (list.length > 0 && !list.find(d => d.id === get().activeDashboardId)) {
        set({ activeDashboardId: list[0].id });
      }
    } catch (e) {
      console.error('Failed to load dashboards', e);
    } finally {
      set({ loading: false });
    }
  },

  createDashboard: async (name, icon, layoutType, description = '') => {
    const id = `dash-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const newDash: Dashboard = {
      id,
      name,
      icon,
      description,
      layoutType,
      themeId: 'dark',
      createdAt: now,
      updatedAt: now,
    };
    await db.dashboards.add(newDash);
    await get().loadDashboards();
    return id;
  },

  updateDashboard: async (id, updates) => {
    const now = Date.now();
    await db.dashboards.update(id, { ...updates, updatedAt: now });
    await get().loadDashboards();
  },

  deleteDashboard: async (id) => {
    // Delete all widgets associated with this dashboard
    await db.widgets.where('dashboardId').equals(id).delete();
    // Delete the dashboard itself
    await db.dashboards.delete(id);
    await get().loadDashboards();
  }
}));
