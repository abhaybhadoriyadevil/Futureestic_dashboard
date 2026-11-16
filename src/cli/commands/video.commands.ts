import type { CommandDefinition } from '../engine/commandTypes';
import { db } from '../../core/storage/db';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { useWidgetStore } from '../../stores/useWidgetStore';

function dispatchVideoEvent(action: string, value?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('personal-os-video-control', {
        detail: { action, value },
      })
    );
  }
}

export const videoCommands: CommandDefinition[] = [
  {
    id: 'video.list',
    name: 'video list',
    aliases: ['videos'],
    category: 'Videos',
    description: 'List all video clips stored in database.',
    syntax: 'video list',
    examples: ['video list'],
    relatedCommands: ['video play'],
    handler: async (ctx) => {
      const files = await db.files.toArray();
      const videoFiles = files.filter(
        (f) => f.type?.startsWith('video') || f.tags?.includes('video') || f.name.match(/\.(mp4|webm|mkv|mov)$/i)
      );

      if (videoFiles.length === 0) {
        ctx.addOutput('info', 'No video files found in database.');
        return;
      }

      const rows = videoFiles
        .map((f, i) => `• ${(i + 1)}. "${f.name}" (ID: ${f.id}, Size: ${Math.round(f.size / 1024)} KB)`)
        .join('\n');

      ctx.addOutput('info', `=== STORED VIDEO CLIPS (${videoFiles.length}) ===\n${rows}`);
    },
  },
  {
    id: 'video.play',
    name: 'video play',
    category: 'Videos',
    description: 'Trigger video playback for a specific clip.',
    syntax: 'video play [id]',
    arguments: [
      {
        name: 'id',
        description: 'Video file ID or filename',
        required: false,
      },
    ],
    examples: ['video play', 'video play vid-123'],
    relatedCommands: ['video pause', 'video stop'],
    handler: (ctx) => {
      const targetId = ctx.args[0]?.trim();
      dispatchVideoEvent('play', targetId);
      ctx.addOutput('success', `Dispatched video PLAY command ${targetId ? `for [${targetId}]` : ''}.`);
    },
  },
  {
    id: 'video.pause',
    name: 'video pause',
    category: 'Videos',
    description: 'Pause current video playback.',
    syntax: 'video pause',
    examples: ['video pause'],
    relatedCommands: ['video play'],
    handler: (ctx) => {
      dispatchVideoEvent('pause');
      ctx.addOutput('success', 'Dispatched video PAUSE command.');
    },
  },
  {
    id: 'video.stop',
    name: 'video stop',
    category: 'Videos',
    description: 'Stop video and rewind to beginning.',
    syntax: 'video stop',
    examples: ['video stop'],
    handler: (ctx) => {
      dispatchVideoEvent('stop');
      ctx.addOutput('success', 'Dispatched video STOP command.');
    },
  },
  {
    id: 'video.fullscreen',
    name: 'video fullscreen',
    category: 'Videos',
    description: 'Expand video widget to full viewport.',
    syntax: 'video fullscreen',
    examples: ['video fullscreen'],
    handler: (ctx) => {
      const { widgets } = useWidgetStore.getState();
      const vidWidget = widgets.find((w) => w.moduleType === 'videos');
      if (vidWidget) {
        useSelectionStore.getState().setFullscreenWidgetId(vidWidget.id);
        ctx.addOutput('success', `Expanded video widget "${vidWidget.title}" to fullscreen.`);
      } else {
        ctx.addOutput('error', 'No video widget found on canvas.');
      }
    },
  },
  {
    id: 'video.delete',
    name: 'video delete',
    aliases: ['video rm'],
    category: 'Videos',
    description: 'Delete video clip from database.',
    syntax: 'video delete <id>',
    arguments: [
      {
        name: 'id',
        description: 'Video file ID or filename',
        required: true,
      },
    ],
    examples: ['video delete vid-123'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim();
      const files = await db.files.toArray();
      const target = files.find((f) => f.id === query || f.name.toLowerCase() === query.toLowerCase());

      if (!target) {
        ctx.addOutput('error', `Video matching "${query}" not found.`);
        return;
      }

      await db.files.delete(target.id);
      dispatchVideoEvent('delete', target.id);
      ctx.addOutput('success', `Deleted video clip "${target.name}".`);
    },
  },
];
