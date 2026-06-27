import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface UIState {
  isQuickNoteOpen: boolean;
  isShortcutsOpen: boolean;
  showCreateWorkspaceModal: boolean;
  toasts: ToastItem[];
  setQuickNoteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setCreateWorkspaceModal: (open: boolean) => void;
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isQuickNoteOpen: false,
  isShortcutsOpen: false,
  showCreateWorkspaceModal: false,
  toasts: [],

  setQuickNoteOpen: (open) => set({ isQuickNoteOpen: open }),
  setShortcutsOpen: (open) => set({ isShortcutsOpen: open }),
  setCreateWorkspaceModal: (open) => set({ showCreateWorkspaceModal: open }),

  addToast: (message, type = 'info') => {
    const id = `toast-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { id, message, type };
    
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
