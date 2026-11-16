import type { CommandDefinition } from '../engine/commandTypes';
import { useLayoutStore } from '../../stores/useLayoutStore';

export const canvasCommands: CommandDefinition[] = [
  {
    id: 'canvas.zoom',
    name: 'zoom',
    category: 'Canvas',
    description: 'Control canvas zoom scale level.',
    syntax: 'zoom <in|out|reset>',
    arguments: [
      {
        name: 'action',
        description: 'Zoom action: in, out, or reset',
        required: true,
        choices: ['in', 'out', 'reset'],
      },
    ],
    examples: ['zoom in', 'zoom out', 'zoom reset'],
    relatedCommands: ['canvas reset'],
    handler: (ctx) => {
      const act = ctx.args[0]?.toLowerCase();
      const { zoom, setZoom } = useLayoutStore.getState();

      if (act === 'in') {
        const nextZoom = Math.min(zoom + 0.1, 2.0);
        setZoom(nextZoom);
        ctx.addOutput('success', `Zoomed canvas in to ${Math.round(nextZoom * 100)}%.`);
      } else if (act === 'out') {
        const nextZoom = Math.max(zoom - 0.1, 0.4);
        setZoom(nextZoom);
        ctx.addOutput('success', `Zoomed canvas out to ${Math.round(nextZoom * 100)}%.`);
      } else if (act === 'reset') {
        setZoom(1.0);
        ctx.addOutput('success', 'Reset canvas zoom to 100%.');
      }
    },
  },
  {
    id: 'canvas.reset',
    name: 'canvas reset',
    category: 'Canvas',
    description: 'Reset canvas pan coordinates and zoom scale back to default origin.',
    syntax: 'canvas reset',
    examples: ['canvas reset'],
    relatedCommands: ['zoom'],
    handler: (ctx) => {
      useLayoutStore.getState().resetCanvas();
      ctx.addOutput('success', 'Reset canvas viewport origin and zoom to default.');
    },
  },
];
