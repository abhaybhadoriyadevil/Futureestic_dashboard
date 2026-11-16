import type { CommandDefinition } from '../engine/commandTypes';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useDashboardStore } from '../../stores/useDashboardStore';

function getKanbanWidget() {
  const { activeDashboardId } = useDashboardStore.getState();
  const { widgets } = useWidgetStore.getState();

  return (
    widgets.find((w) => w.dashboardId === activeDashboardId && w.moduleType === 'kanban') ||
    widgets.find((w) => w.moduleType === 'kanban')
  );
}

function parseKanbanData(widget: any): { todo: any[]; progress: any[]; done: any[] } {
  try {
    if (widget.dataRef) {
      const parsed = JSON.parse(widget.dataRef);
      return {
        todo: Array.isArray(parsed.todo) ? parsed.todo : [],
        progress: Array.isArray(parsed.progress) ? parsed.progress : [],
        done: Array.isArray(parsed.done) ? parsed.done : [],
      };
    }
  } catch {}
  return { todo: [], progress: [], done: [] };
}

export const kanbanCommands: CommandDefinition[] = [
  {
    id: 'kanban.list',
    name: 'kanban list',
    category: 'Kanban',
    description: 'List all task cards in TODO, PROGRESS, and DONE columns.',
    syntax: 'kanban list',
    examples: ['kanban list'],
    relatedCommands: ['kanban add', 'kanban move'],
    handler: (ctx) => {
      const widget = getKanbanWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Kanban widget found on canvas. Use "widget add kanban" to create one.');
        return;
      }

      const data = parseKanbanData(widget);
      const formatCol = (colName: string, items: any[]) => {
        if (items.length === 0) return `[${colName.toUpperCase()}]: (empty)`;
        const list = items.map((t, i) => `  ${i + 1}. [${t.id?.slice(0, 6) || 'task'}] "${t.text || t.title}"`).join('\n');
        return `[${colName.toUpperCase()}] (${items.length}):\n${list}`;
      };

      const out = [
        formatCol('Todo', data.todo),
        formatCol('In Progress', data.progress),
        formatCol('Done', data.done),
      ].join('\n\n');

      ctx.addOutput('info', `=== KANBAN BOARD TELEMETRY ===\n\n${out}`);
    },
  },
  {
    id: 'kanban.add',
    name: 'kanban add',
    category: 'Kanban',
    description: 'Add a new task card to a kanban column.',
    syntax: 'kanban add <todo|progress|done> <text>',
    arguments: [
      {
        name: 'column',
        description: 'Target column: todo, progress, or done',
        required: true,
        choices: ['todo', 'progress', 'done'],
      },
      {
        name: 'text',
        description: 'Task title / description',
        required: true,
      },
    ],
    examples: [
      'kanban add todo "Build CLI Command Engine"',
      'kanban add progress "Implement Donut HUD"',
      'kanban add done "Setup IndexedDB"',
    ],
    relatedCommands: ['kanban list', 'kanban move'],
    handler: async (ctx) => {
      const widget = getKanbanWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Kanban widget found on canvas. Run "widget add kanban" first.');
        return;
      }

      const col = ctx.args[0]?.toLowerCase() as 'todo' | 'progress' | 'done';
      const text = ctx.args[1];

      const data = parseKanbanData(widget);
      const newTask = {
        id: `t-${Date.now()}`,
        text,
        createdAt: Date.now(),
      };

      data[col].push(newTask);
      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Added task "${text}" to [${col.toUpperCase()}].`);
    },
  },
  {
    id: 'kanban.move',
    name: 'kanban move',
    category: 'Kanban',
    description: 'Move a task card between columns.',
    syntax: 'kanban move <id|text> <todo|progress|done>',
    arguments: [
      {
        name: 'id|text',
        description: 'Task ID or task text snippet',
        required: true,
      },
      {
        name: 'column',
        description: 'Destination column: todo, progress, or done',
        required: true,
        choices: ['todo', 'progress', 'done'],
      },
    ],
    examples: ['kanban move t-123 done', 'kanban move "Build CLI" progress'],
    handler: async (ctx) => {
      const widget = getKanbanWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Kanban widget found.');
        return;
      }

      const query = ctx.args[0]?.toLowerCase();
      const targetCol = ctx.args[1]?.toLowerCase() as 'todo' | 'progress' | 'done';

      const data = parseKanbanData(widget);
      let foundTask: any = null;

      // Search in all 3 columns
      for (const col of ['todo', 'progress', 'done'] as const) {
        const idx = data[col].findIndex(
          (t) => t.id?.toLowerCase() === query || t.id?.toLowerCase().startsWith(query) || (t.text || t.title)?.toLowerCase().includes(query)
        );
        if (idx !== -1) {
          foundTask = data[col].splice(idx, 1)[0];
          break;
        }
      }

      if (!foundTask) {
        ctx.addOutput('error', `Task matching "${ctx.args[0]}" not found.`);
        return;
      }

      data[targetCol].push(foundTask);
      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Moved task "${foundTask.text || foundTask.title}" to [${targetCol.toUpperCase()}].`);
    },
  },
  {
    id: 'kanban.edit',
    name: 'kanban edit',
    category: 'Kanban',
    description: 'Edit description text of an existing task card.',
    syntax: 'kanban edit <id|text> <new_text>',
    arguments: [
      {
        name: 'id|text',
        description: 'Task ID or snippet',
        required: true,
      },
      {
        name: 'new_text',
        description: 'Updated task description',
        required: true,
      },
    ],
    examples: ['kanban edit t-123 "Updated requirement details"'],
    handler: async (ctx) => {
      const widget = getKanbanWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Kanban widget found.');
        return;
      }

      const query = ctx.args[0]?.toLowerCase();
      const newText = ctx.args[1];

      const data = parseKanbanData(widget);
      let found = false;

      for (const col of ['todo', 'progress', 'done'] as const) {
        const task = data[col].find(
          (t) => t.id?.toLowerCase() === query || t.id?.toLowerCase().startsWith(query) || (t.text || t.title)?.toLowerCase().includes(query)
        );
        if (task) {
          task.text = newText;
          found = true;
          break;
        }
      }

      if (!found) {
        ctx.addOutput('error', `Task matching "${ctx.args[0]}" not found.`);
        return;
      }

      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Updated task text to "${newText}".`);
    },
  },
  {
    id: 'kanban.remove',
    name: 'kanban remove',
    aliases: ['kanban rm'],
    category: 'Kanban',
    description: 'Delete a task card from the kanban board.',
    syntax: 'kanban remove <id|text>',
    arguments: [
      {
        name: 'id|text',
        description: 'Task ID or text to delete',
        required: true,
      },
    ],
    examples: ['kanban remove t-123'],
    handler: async (ctx) => {
      const widget = getKanbanWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Kanban widget found.');
        return;
      }

      const query = ctx.args[0]?.toLowerCase();
      const data = parseKanbanData(widget);
      let removedTitle = '';

      for (const col of ['todo', 'progress', 'done'] as const) {
        const idx = data[col].findIndex(
          (t) => t.id?.toLowerCase() === query || t.id?.toLowerCase().startsWith(query) || (t.text || t.title)?.toLowerCase().includes(query)
        );
        if (idx !== -1) {
          removedTitle = data[col][idx].text || data[col][idx].title;
          data[col].splice(idx, 1);
          break;
        }
      }

      if (!removedTitle) {
        ctx.addOutput('error', `Task matching "${ctx.args[0]}" not found.`);
        return;
      }

      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Deleted task "${removedTitle}".`);
    },
  },
  {
    id: 'kanban.clear',
    name: 'kanban clear',
    category: 'Kanban',
    description: 'Clear all tasks from a specific kanban column.',
    syntax: 'kanban clear <todo|progress|done>',
    arguments: [
      {
        name: 'column',
        description: 'Column to clear: todo, progress, or done',
        required: true,
        choices: ['todo', 'progress', 'done'],
      },
    ],
    examples: ['kanban clear done', 'kanban clear todo'],
    handler: async (ctx) => {
      const widget = getKanbanWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Kanban widget found.');
        return;
      }

      const col = ctx.args[0]?.toLowerCase() as 'todo' | 'progress' | 'done';
      const data = parseKanbanData(widget);
      const count = data[col].length;
      data[col] = [];

      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Cleared ${count} tasks from [${col.toUpperCase()}].`);
    },
  },
];
