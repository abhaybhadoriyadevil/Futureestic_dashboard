import type { CommandDefinition } from '../engine/commandTypes';
import { useHistoryStore } from '../../stores/useHistoryStore';
import { useDashboardStore } from '../../stores/useDashboardStore';

export const historyCommands: CommandDefinition[] = [
  {
    id: 'history.undo',
    name: 'undo',
    category: 'History & Undo/Redo',
    description: 'Undo the last canvas widget layout or modification action.',
    syntax: 'undo',
    examples: ['undo'],
    relatedCommands: ['redo', 'history'],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { undoStack, undo } = useHistoryStore.getState();

      if (undoStack.length === 0) {
        ctx.addOutput('warning', 'Nothing to undo in this workspace timeline.');
        return;
      }

      await undo(activeDashboardId);
      ctx.addOutput('success', 'Reverted to previous workspace layout state (Undo).');
    },
  },
  {
    id: 'history.redo',
    name: 'redo',
    category: 'History & Undo/Redo',
    description: 'Redo the previously undone workspace layout action.',
    syntax: 'redo',
    examples: ['redo'],
    relatedCommands: ['undo', 'history'],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { redoStack, redo } = useHistoryStore.getState();

      if (redoStack.length === 0) {
        ctx.addOutput('warning', 'Nothing to redo in this workspace timeline.');
        return;
      }

      await redo(activeDashboardId);
      ctx.addOutput('success', 'Restored previously undone layout state (Redo).');
    },
  },
];
