import type { CommandDefinition } from '../engine/commandTypes';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useDashboardStore } from '../../stores/useDashboardStore';

function getHabitWidget() {
  const { activeDashboardId } = useDashboardStore.getState();
  const { widgets } = useWidgetStore.getState();

  // Try finding in active workspace first, else globally
  return (
    widgets.find((w) => w.dashboardId === activeDashboardId && w.moduleType === 'habits') ||
    widgets.find((w) => w.moduleType === 'habits')
  );
}

function parseHabitsData(habitWidget: any): { habits: any[] } {
  try {
    if (habitWidget.dataRef) {
      const parsed = JSON.parse(habitWidget.dataRef);
      if (Array.isArray(parsed.habits)) return parsed;
    }
  } catch {}
  return { habits: [] };
}

export const habitCommands: CommandDefinition[] = [
  {
    id: 'habit.list',
    name: 'habit list',
    aliases: ['habits', 'habit ls'],
    category: 'Habits',
    description: 'List all registered habits, frequency, and today check-in state.',
    syntax: 'habit list',
    examples: ['habit list', 'habits'],
    relatedCommands: ['habit add', 'habit check'],
    handler: (ctx) => {
      const widget = getHabitWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Habit Tracker widget found on canvas. Use "widget add habits" first.');
        return;
      }

      const data = parseHabitsData(widget);
      if (data.habits.length === 0) {
        ctx.addOutput('info', 'No habits found in tracker. Use "habit add <title>" to create your first habit.');
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const rows = data.habits
        .map((h, i) => {
          const isDone = !!(h.history && h.history[todayStr]);
          const status = isDone ? '[✓ DONE]' : '[  TODO]';
          const totalChecks = Object.values(h.history || {}).filter(Boolean).length;
          return `• ${(i + 1).toString().padStart(2, ' ')}. ${status} "${h.title}"\n     Repeat: ${h.repeatType || 'everyday'} | Total Check-ins: ${totalChecks}`;
        })
        .join('\n\n');

      ctx.addOutput('info', `=== HABIT TRACKER PROGRESS (${data.habits.length}) ===\n\n${rows}`);
    },
  },
  {
    id: 'habit.add',
    name: 'habit add',
    category: 'Habits',
    description: 'Add a new habit into the habit tracker.',
    syntax: 'habit add <title> [everyday|weekdays|weekends]',
    arguments: [
      {
        name: 'title',
        description: 'Habit title',
        required: true,
      },
      {
        name: 'repeat',
        description: 'Repeat frequency',
        required: false,
        choices: ['everyday', 'weekdays', 'weekends'],
      },
    ],
    examples: [
      'habit add "Morning Workout" everyday',
      'habit add "Review Code" weekdays',
      'habit add "Read Cyberpunk Novel" weekends',
    ],
    relatedCommands: ['habit list', 'habit check'],
    handler: async (ctx) => {
      const widget = getHabitWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Habit Tracker widget found on canvas. Run "widget add habits" first.');
        return;
      }

      const title = ctx.args[0]?.trim();
      const repeatType = ctx.args[1]?.toLowerCase() || 'everyday';

      const data = parseHabitsData(widget);
      const newHabit = {
        id: `h-${Date.now()}`,
        title,
        category: 'general',
        repeatType,
        color: '#06b6d4',
        history: {},
        createdAt: new Date().toISOString(),
      };

      data.habits.push(newHabit);
      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Created habit "${title}" [Repeat: ${repeatType}].`);
    },
  },
  {
    id: 'habit.check',
    name: 'habit check',
    category: 'Habits',
    description: 'Mark a habit completed for today.',
    syntax: 'habit check <title>',
    arguments: [
      {
        name: 'title',
        description: 'Habit title or partial match',
        required: true,
      },
    ],
    examples: ['habit check "Workout"', 'habit check "Code"'],
    relatedCommands: ['habit uncheck', 'habit list'],
    handler: async (ctx) => {
      const widget = getHabitWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Habit Tracker widget found.');
        return;
      }

      const query = ctx.args[0]?.trim().toLowerCase();
      const data = parseHabitsData(widget);
      const habit = data.habits.find((h) => h.title.toLowerCase().includes(query));

      if (!habit) {
        ctx.addOutput('error', `Habit matching "${ctx.args[0]}" not found.`);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (!habit.history) habit.history = {};
      habit.history[todayStr] = true;

      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Marked habit "${habit.title}" completed for today (✓).`);
    },
  },
  {
    id: 'habit.uncheck',
    name: 'habit uncheck',
    category: 'Habits',
    description: 'Unmark a habit check-in for today.',
    syntax: 'habit uncheck <title>',
    arguments: [
      {
        name: 'title',
        description: 'Habit title or partial match',
        required: true,
      },
    ],
    examples: ['habit uncheck "Workout"'],
    relatedCommands: ['habit check'],
    handler: async (ctx) => {
      const widget = getHabitWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Habit Tracker widget found.');
        return;
      }

      const query = ctx.args[0]?.trim().toLowerCase();
      const data = parseHabitsData(widget);
      const habit = data.habits.find((h) => h.title.toLowerCase().includes(query));

      if (!habit) {
        ctx.addOutput('error', `Habit matching "${ctx.args[0]}" not found.`);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (habit.history) {
        delete habit.history[todayStr];
      }

      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Unmarked habit "${habit.title}" for today.`);
    },
  },
  {
    id: 'habit.remove',
    name: 'habit remove',
    aliases: ['habit rm'],
    category: 'Habits',
    description: 'Delete a habit and its tracking history from the tracker.',
    syntax: 'habit remove <title>',
    arguments: [
      {
        name: 'title',
        description: 'Habit title to delete',
        required: true,
      },
    ],
    examples: ['habit remove "Workout"'],
    handler: async (ctx) => {
      const widget = getHabitWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Habit Tracker widget found.');
        return;
      }

      const query = ctx.args[0]?.trim().toLowerCase();
      const data = parseHabitsData(widget);
      const initialCount = data.habits.length;
      data.habits = data.habits.filter((h) => !h.title.toLowerCase().includes(query));

      if (data.habits.length === initialCount) {
        ctx.addOutput('error', `Habit matching "${ctx.args[0]}" not found.`);
        return;
      }

      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Removed habit "${ctx.args[0]}" from tracker.`);
    },
  },
  {
    id: 'habit.stats',
    name: 'habit stats',
    category: 'Habits',
    description: 'Display detailed metrics, streaks, and 30-day rate for a habit.',
    syntax: 'habit stats <title>',
    arguments: [
      {
        name: 'title',
        description: 'Habit title',
        required: true,
      },
    ],
    examples: ['habit stats "Workout"'],
    handler: (ctx) => {
      const widget = getHabitWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Habit Tracker widget found.');
        return;
      }

      const query = ctx.args[0]?.trim().toLowerCase();
      const data = parseHabitsData(widget);
      const habit = data.habits.find((h) => h.title.toLowerCase().includes(query));

      if (!habit) {
        ctx.addOutput('error', `Habit matching "${ctx.args[0]}" not found.`);
        return;
      }

      const history = habit.history || {};
      const totalCheckins = Object.values(history).filter(Boolean).length;

      // 30-day calculation
      let validDays = 0;
      let checksInWindow = 0;
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const str = `${yyyy}-${mm}-${dd}`;
        validDays++;
        if (history[str]) checksInWindow++;
      }
      const rate = validDays > 0 ? Math.round((checksInWindow / validDays) * 100) : 0;

      ctx.addOutput(
        'info',
        `╔═══════════════════════════════════════════════════════════════╗
║ HABIT TELEMETRY: "${habit.title}"
╠═══════════════════════════════════════════════════════════════╣
  REPEAT SCHEDULE   : ${habit.repeatType || 'everyday'}
  ALL-TIME CHECK-INS: ${totalCheckins} check-ins
  30-DAY SUCCESS    : ${rate}% (${checksInWindow} / ${validDays} days)
  CREATED AT        : ${habit.createdAt || 'N/A'}
╚═══════════════════════════════════════════════════════════════╝`
      );
    },
  },
  {
    id: 'habit.search',
    name: 'habit search',
    category: 'Habits',
    description: 'Search habits matching a keyword.',
    syntax: 'habit search <keyword>',
    arguments: [
      {
        name: 'keyword',
        description: 'Keyword search term',
        required: true,
      },
    ],
    examples: ['habit search workout'],
    handler: (ctx) => {
      const widget = getHabitWidget();
      if (!widget) {
        ctx.addOutput('error', 'No Habit Tracker widget found.');
        return;
      }

      const query = ctx.args[0]?.trim().toLowerCase();
      const data = parseHabitsData(widget);
      const matches = data.habits.filter((h) => h.title.toLowerCase().includes(query));

      if (matches.length === 0) {
        ctx.addOutput('info', `No habits matching keyword "${query}".`);
        return;
      }

      const list = matches.map((m) => `• "${m.title}" (${m.repeatType || 'everyday'})`).join('\n');
      ctx.addOutput('info', `=== MATCHING HABITS (${matches.length}) ===\n${list}`);
    },
  },
];
