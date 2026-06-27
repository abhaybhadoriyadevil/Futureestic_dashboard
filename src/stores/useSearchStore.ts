import { create } from 'zustand';
import { db } from '../core/storage/db';

export interface SearchResult {
  type: 'note' | 'file' | 'event' | 'dashboard' | 'widget' | 'command';
  id: string;
  title: string;
  subtitle?: string;
  targetDashboardId?: string; // If widget or event, redirect to this dashboard
  action?: () => void; // If command, the action to run
}

interface SearchState {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  setOpen: (isOpen: boolean) => void;
  setQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: '',
  results: [],

  setOpen: (isOpen) => {
    set({ isOpen });
    if (!isOpen) get().resetSearch();
  },

  setQuery: (query) => {
    set({ query });
    if (query.trim() === '') {
      set({ results: [] });
    } else {
      get().performSearch(query);
    }
  },

  performSearch: async (query) => {
    const term = query.toLowerCase().trim();
    if (!term) {
      set({ results: [] });
      return;
    }

    const results: SearchResult[] = [];

    // 0. Search Commands
    const commands: SearchResult[] = [
      { 
        type: 'command', id: 'cmd-new-note', title: 'Create Quick Note', subtitle: 'Action',
        action: () => {
          import('./useUIStore').then(module => module.useUIStore.getState().setQuickNoteOpen(true));
        }
      },
      { 
        type: 'command', id: 'cmd-new-workspace', title: 'Create New Workspace', subtitle: 'Action',
        action: () => {
          import('./useUIStore').then(module => module.useUIStore.getState().setCreateWorkspaceModal(true));
        }
      },
      { 
        type: 'command', id: 'cmd-theme-toggle', title: 'Toggle Theme', subtitle: 'Action',
        action: () => {
          import('./useThemeStore').then(module => module.useThemeStore.getState().toggleTheme());
        }
      },
      { 
        type: 'command', id: 'cmd-keyboard-shortcuts', title: 'View Keyboard Shortcuts', subtitle: 'Action',
        action: () => {
          import('./useUIStore').then(module => module.useUIStore.getState().setShortcutsOpen(true));
        }
      }
    ];

    const matchedCommands = commands.filter(c => c.title.toLowerCase().includes(term));
    results.push(...matchedCommands);

    try {
      // 1. Search Dashboards
      const dashboards = await db.dashboards
        .filter(d => d.name.toLowerCase().includes(term) || d.description.toLowerCase().includes(term))
        .toArray();
      dashboards.forEach(d => {
        results.push({
          type: 'dashboard',
          id: d.id,
          title: d.name,
          subtitle: `Workspace - ${d.layoutType} layout`,
        });
      });

      // 2. Search Notes
      const notes = await db.notes
        .filter(n => n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term) || n.tags.some(t => t.toLowerCase().includes(term)))
        .toArray();
      notes.forEach(n => {
        results.push({
          type: 'note',
          id: n.id,
          title: n.title,
          subtitle: `Note - Tags: ${n.tags.join(', ')}`,
        });
      });

      // 3. Search Files
      const files = await db.files
        .filter(f => f.name.toLowerCase().includes(term) || f.category.toLowerCase().includes(term) || f.tags.some(t => t.toLowerCase().includes(term)))
        .toArray();
      files.forEach(f => {
        results.push({
          type: 'file',
          id: f.id,
          title: f.name,
          subtitle: `File (${(f.size / 1024).toFixed(1)} KB) - Category: ${f.category}`,
        });
      });

      // 4. Search Events
      const events = await db.events
        .filter(e => e.title.toLowerCase().includes(term) || (e.description || '').toLowerCase().includes(term))
        .toArray();
      events.forEach(e => {
        results.push({
          type: 'event',
          id: e.id,
          title: e.title,
          subtitle: `Calendar - Date: ${new Date(e.startDate).toLocaleDateString()}`,
        });
      });

      // 5. Search Widgets
      const widgets = await db.widgets
        .filter(w => w.title.toLowerCase().includes(term) || w.moduleType.toLowerCase().includes(term))
        .toArray();
      widgets.forEach(w => {
        results.push({
          type: 'widget',
          id: w.id,
          title: w.title,
          subtitle: `Widget (${w.moduleType}) on dashboard: ${w.dashboardId}`,
          targetDashboardId: w.dashboardId
        });
      });

      set({ results: results.slice(0, 15) }); // Limit to top 15 results
    } catch (e) {
      console.error('Fuzzy search failed', e);
    }
  },

  resetSearch: () => {
    set({ query: '', results: [] });
  }
}));
