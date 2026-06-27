import { useEffect } from 'react';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useUIStore } from '../stores/useUIStore';
import { useDashboardStore } from '../stores/useDashboardStore';
import { useClipboardStore } from '../stores/useClipboardStore';
import { useSelectionStore } from '../stores/useSelectionStore';
import { useWidgetStore } from '../stores/useWidgetStore';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const activeDashId = useDashboardStore.getState().activeDashboardId;
        if (activeDashId) {
          useHistoryStore.getState().undo(activeDashId);
        }
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        const activeDashId = useDashboardStore.getState().activeDashboardId;
        if (activeDashId) {
          useHistoryStore.getState().redo(activeDashId);
        }
      }

      // Toggle Theme: Ctrl+Shift+L or Cmd+Shift+L
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        useThemeStore.getState().toggleTheme();
        useUIStore.getState().addToast('Theme toggled', 'success');
      }

      // Quick Note: Alt+N
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const uiStore = useUIStore.getState();
        uiStore.setQuickNoteOpen(!uiStore.isQuickNoteOpen);
      }

      // Shortcuts Modal: ? (Shift+/)
      if (e.key === '?') {
        e.preventDefault();
        const uiStore = useUIStore.getState();
        uiStore.setShortcutsOpen(!uiStore.isShortcutsOpen);
      }

      // Copy selected widget: Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selectedId = useSelectionStore.getState().selectedWidgetId;
        if (selectedId) {
          const widget = useWidgetStore.getState().widgets.find(w => w.id === selectedId);
          if (widget) {
            useClipboardStore.getState().copyWidget(widget);
          }
        }
      }

      // Paste widget: Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        useClipboardStore.getState().pasteWidget();
      }

      // Delete selected widget: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = useSelectionStore.getState().selectedWidgetId;
        if (selectedId) {
          e.preventDefault();
          useWidgetStore.getState().deleteWidget(selectedId);
          useSelectionStore.getState().setSelectedWidgetId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
