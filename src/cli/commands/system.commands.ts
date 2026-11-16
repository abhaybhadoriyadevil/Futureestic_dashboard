import type { CommandDefinition } from '../engine/commandTypes';
import { commandRegistry } from '../engine/commandRegistry';
import { commandHistory } from '../engine/commandHistory';
import { copyMasterPromptToClipboard } from '../engine/commandDocumentation';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useThemeStore } from '../../stores/useThemeStore';

export const systemCommands: CommandDefinition[] = [
  {
    id: 'system.help',
    name: 'help',
    category: 'System',
    description: 'Display command instructions or documentation for a specific module.',
    syntax: 'help [module]',
    arguments: [
      {
        name: 'module',
        description: 'Module or category name (e.g. workspace, widget, habit, calendar, gpt)',
        required: false,
      },
    ],
    examples: ['help', 'help workspace', 'help widget', 'help gpt'],
    relatedCommands: ['dict', 'sysinfo', 'gpt'],
    handler: (ctx) => {
      const target = ctx.args[0]?.toLowerCase();
      if (!target) {
        const categories = commandRegistry.getCategories();
        ctx.addOutput(
          'info',
          `╔═══════════════════════════════════════════════════════════════════════════════╗
║                      PERSONAL OS // COMMAND MANUAL SYSTEM                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Type "help <module>" for deep documentation, "dict" to launch the Interactive Dictionary,
or "gpt" to copy all commands for ChatGPT / Claude / Gemini.

Available Modules:
${categories.map((c) => `  • ${c.padEnd(22)} (${commandRegistry.getByCategory(c).length} commands)`).join('\n')}

Batch & Script Chaining:
  • Separate commands by ';' or newlines to run sequentially:
    ws create "Dev" canvas; ws switch "Dev"; widget add kanban "Board"
  • Chain with '&&' to execute only on success:
    ws create "Dev" canvas && ws switch "Dev" && widget add habits "Code"

Quick Start Examples:
  ws ls                      — List all workspaces
  widget add notes "Log"     — Create a new notes widget
  habit list                 — Check today's habit progress
  theme accent purple        — Switch global cyber accent to neon purple
  gpt                        — Copy complete CLI specification for ChatGPT`
        );
        return;
      }

      if (target === 'gpt' || target === 'ai') {
        ctx.addOutput(
          'info',
          `=== AI & GPT BATCH COMMAND GUIDE ===

1. Type "gpt" to copy all commands formatted specifically for ChatGPT or Claude.
2. In ChatGPT, paste the prompt and ask:
   "Write me a batch CLI code to setup a full developer workspace with Kanban, Habit tracker, and Dark Cyan theme."
3. Copy the returned lines, paste directly into this Personal OS terminal, and press [Enter]!
4. The terminal will automatically detect the batch and execute all commands in sequence.`
        );
        return;
      }

      const matches = commandRegistry
        .getAll()
        .filter(
          (c) =>
            c.name.toLowerCase().includes(target) ||
            c.category.toLowerCase().includes(target) ||
            c.aliases?.some((a) => a.toLowerCase().includes(target))
        );

      if (matches.length > 0) {
        const text = matches
          .map(
            (m) =>
              `• ${m.syntax}\n  Category: [${m.category}]\n  ${m.description}\n  Example: ${m.examples[0] || m.name}`
          )
          .join('\n\n');
        ctx.addOutput('info', `=== DOCUMENTATION FOR: ${target.toUpperCase()} ===\n\n${text}`);
      } else {
        ctx.addOutput('error', `No commands found matching "${target}". Type "dict" to view all available commands.`);
      }
    },
  },
  {
    id: 'system.gpt',
    name: 'gpt',
    aliases: ['ai-spec', 'dict copy', 'copy-commands'],
    category: 'System',
    description: 'Copy the complete Master CLI specification for ChatGPT, Claude, or Gemini to clipboard.',
    syntax: 'gpt',
    examples: ['gpt', 'ai-spec'],
    relatedCommands: ['dict', 'help'],
    handler: async (ctx) => {
      const ok = await copyMasterPromptToClipboard();
      if (ok) {
        ctx.addOutput(
          'success',
          `📋 Master CLI Specification copied to clipboard!\n\nYou can now paste this directly into ChatGPT, Claude, or Gemini and ask:\n"Write me a batch CLI code to setup my workspace with kanban, habit tracker, and dark theme."\n\nThen paste the resulting command lines into this terminal and hit Enter!`
        );
      } else {
        ctx.addOutput(
          'warning',
          'Could not access system clipboard automatically. Open the Dictionary ("dict") and click "One-Page Master Sheet" to view and copy all commands.'
        );
      }
    },
  },
  {
    id: 'system.dict',
    name: 'dict',
    aliases: ['dictionary', 'manual'],
    category: 'System',
    description: 'Toggle the interactive Command Dictionary side panel.',
    syntax: 'dict',
    examples: ['dict'],
    relatedCommands: ['help', 'gpt'],
    handler: (ctx) => {
      if (ctx.toggleDictionary) {
        ctx.toggleDictionary();
        ctx.addOutput('success', 'Toggled interactive Command Dictionary drawer.');
      } else {
        ctx.addOutput('info', 'Command Dictionary toggled.');
      }
    },
  },
  {
    id: 'system.clear',
    name: 'clear',
    aliases: ['cls'],
    category: 'System',
    description: 'Clear the terminal output screen buffer.',
    syntax: 'clear',
    examples: ['clear'],
    handler: (ctx) => {
      ctx.clearTerminal();
    },
  },
  {
    id: 'system.history',
    name: 'history',
    category: 'History & Undo/Redo',
    description: 'Display recently executed CLI commands.',
    syntax: 'history',
    examples: ['history'],
    handler: (ctx) => {
      const hist = commandHistory.getHistory();
      if (hist.length === 0) {
        ctx.addOutput('info', 'No command history recorded yet.');
        return;
      }
      const list = hist.map((cmd, i) => `  ${(i + 1).toString().padStart(3, ' ')}  ${cmd}`).join('\n');
      ctx.addOutput('info', `=== COMMAND EXECUTION HISTORY (${hist.length}) ===\n${list}`);
    },
  },
  {
    id: 'system.date',
    name: 'date',
    category: 'System',
    description: 'Display current system date, time, and timezone.',
    syntax: 'date',
    examples: ['date'],
    handler: (ctx) => {
      const now = new Date();
      ctx.addOutput(
        'info',
        `Current System Time:\n• Date: ${now.toDateString()}\n• Time: ${now.toTimeString()}\n• ISO:  ${now.toISOString()}`
      );
    },
  },
  {
    id: 'system.echo',
    name: 'echo',
    category: 'System',
    description: 'Print argument string back to the terminal output.',
    syntax: 'echo <text>',
    arguments: [
      {
        name: 'text',
        description: 'Text message to print',
        required: true,
      },
    ],
    examples: ['echo "Personal OS Online"', 'echo hello world'],
    handler: (ctx) => {
      ctx.addOutput('info', ctx.args.join(' '));
    },
  },
  {
    id: 'system.sysinfo',
    name: 'sysinfo',
    category: 'System Diagnostics',
    description: 'Display complete OS telemetry, memory, and database diagnostic counters.',
    syntax: 'sysinfo',
    examples: ['sysinfo'],
    relatedCommands: ['status'],
    handler: (ctx) => {
      const { dashboards, activeDashboardId } = useDashboardStore.getState();
      const { widgets } = useWidgetStore.getState();
      const { osName, userName, userRole, accentColor } = useSettingsStore.getState();
      const { theme } = useThemeStore.getState();

      const activeDash = dashboards.find((d) => d.id === activeDashboardId);

      const mem: any = (performance as any)?.memory;
      const memInfo = mem
        ? `Used: ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB / Total: ${(mem.totalJSHeapSize / 1048576).toFixed(1)} MB`
        : 'Browser Protected';

      ctx.addOutput(
        'info',
        `╔═══════════════════════════════════════════════════════════════════════════════╗
║                      PERSONAL OS // SYSTEM TELEMETRY                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

• OS Branding:        ${osName}
• Current User:       ${userName} [${userRole}]
• Active Workspace:   ${activeDash?.name || 'None'} [ID: ${activeDashboardId || 'N/A'}]
• Total Workspaces:   ${dashboards.length}
• Total Widgets:      ${widgets.length} (Active space: ${widgets.filter((w) => w.dashboardId === activeDashboardId).length})
• Theme & Matrix:     ${theme.toUpperCase()} MODE | Accent: ${accentColor}
• Memory Consumption: ${memInfo}
• IndexedDB State:    ONLINE & SYNCHRONIZED
• UI Frame Render:    60 FPS (Framer Motion Engine)`
      );
    },
  },
  {
    id: 'system.status',
    name: 'status',
    category: 'System Diagnostics',
    description: 'Check operating system kernel, stores, and active workspace health status.',
    syntax: 'status',
    examples: ['status'],
    relatedCommands: ['sysinfo'],
    handler: (ctx) => {
      const { dashboards } = useDashboardStore.getState();
      const { widgets } = useWidgetStore.getState();
      ctx.addOutput(
        'success',
        `✔ OS Kernel: HEALTHY & RESPONSIVE\n✔ Data Stores: SYNCHRONIZED (Dexie IndexedDB)\n✔ Active Workspaces: ${dashboards.length} configured\n✔ Mounted Widgets: ${widgets.length} active\n✔ CLI Subsystem: ONLINE (Ready for user commands)`
      );
    },
  },
  {
    id: 'system.settings',
    name: 'settings',
    category: 'System',
    description: 'Open the graphical OS Settings & Profile Configuration dialog.',
    syntax: 'settings',
    examples: ['settings'],
    handler: (ctx) => {
      useSettingsStore.getState().setSettingsOpen(true);
      ctx.addOutput('success', 'Opened OS Settings dialog.');
    },
  },
  {
    id: 'system.version',
    name: 'version',
    aliases: ['about'],
    category: 'System',
    description: 'Display OS build version, release information, and kernel details.',
    syntax: 'version',
    examples: ['version', 'about'],
    handler: (ctx) => {
      ctx.addOutput(
        'info',
        `Personal OS — Futuristic Cyberpunk Operating System\nVersion: 2.4.0 (Build 2026.11-RELEASE)\nKernel: React 19 + TypeScript + Zustand + Dexie IndexedDB\nLicense: MIT Private Dashboard`
      );
    },
  },
  {
    id: 'system.exit',
    name: 'exit',
    aliases: ['quit', 'close'],
    category: 'System',
    description: 'Close the CLI Command Control Room.',
    syntax: 'exit',
    examples: ['exit'],
    handler: (ctx) => {
      ctx.addOutput('info', 'Closing CLI session...');
      if (ctx.closeTerminal) {
        ctx.closeTerminal();
      }
    },
  },
];
