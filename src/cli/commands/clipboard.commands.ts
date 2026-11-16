import type { CommandDefinition } from '../engine/commandTypes';
import { useClipboardStore } from '../../stores/useClipboardStore';
import { useWidgetStore } from '../../stores/useWidgetStore';

export const clipboardCommands: CommandDefinition[] = [
  {
    id: 'clipboard.copy',
    name: 'clipboard copy',
    aliases: ['clip copy', 'copy'],
    category: 'Clipboard',
    description: 'Copy a canvas widget to the system clipboard.',
    syntax: 'clipboard copy <widget_id|title>',
    arguments: [
      {
        name: 'widget',
        description: 'Target widget ID or title',
        required: true,
      },
    ],
    examples: ['clipboard copy "Notes"', 'clipboard copy w-123'],
    relatedCommands: ['clipboard paste', 'clipboard status'],
    handler: (ctx) => {
      const query = ctx.args[0]?.toLowerCase();
      const { widgets } = useWidgetStore.getState();
      const target = widgets.find(
        (w) =>
          w.id.toLowerCase() === query ||
          w.id.toLowerCase().startsWith(query) ||
          w.title.toLowerCase().includes(query)
      );

      if (!target) {
        ctx.addOutput('error', `Widget matching "${ctx.args[0]}" not found.`);
        return;
      }

      useClipboardStore.getState().copyWidget(target);
      ctx.addOutput('success', `Copied widget "${target.title}" to clipboard.`);
    },
  },
  {
    id: 'clipboard.paste',
    name: 'clipboard paste',
    aliases: ['clip paste', 'paste'],
    category: 'Clipboard',
    description: 'Paste widget currently stored in clipboard onto active workspace.',
    syntax: 'clipboard paste',
    examples: ['clipboard paste'],
    relatedCommands: ['clipboard copy', 'clipboard status'],
    handler: async (ctx) => {
      const { copiedWidget, pasteWidget } = useClipboardStore.getState();
      if (!copiedWidget) {
        ctx.addOutput('error', 'Clipboard is empty. Copy a widget first using "clipboard copy <id>".');
        return;
      }

      const newId = await pasteWidget();
      ctx.addOutput('success', `Pasted widget "${copiedWidget.title}" (New ID: ${newId || 'assigned'}).`);
    },
  },
  {
    id: 'clipboard.status',
    name: 'clipboard status',
    aliases: ['clip status'],
    category: 'Clipboard',
    description: 'Check what widget is currently stored in clipboard memory.',
    syntax: 'clipboard status',
    examples: ['clipboard status'],
    handler: (ctx) => {
      const { copiedWidget } = useClipboardStore.getState();
      if (!copiedWidget) {
        ctx.addOutput('info', 'Clipboard buffer is empty.');
        return;
      }

      ctx.addOutput(
        'info',
        `CLIPBOARD BUFFER:\n  Widget: "${copiedWidget.title}"\n  Type  : ${copiedWidget.moduleType.toUpperCase()}\n  Size  : ${copiedWidget.size.w}x${copiedWidget.size.h}`
      );
    },
  },
];
