import type { CommandDefinition } from '../engine/commandTypes';
import { db } from '../../core/storage/db';

function dispatchAudioEvent(action: string, value?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('personal-os-audio-control', {
        detail: { action, value },
      })
    );
  }
}

export const audioCommands: CommandDefinition[] = [
  {
    id: 'audio.list',
    name: 'audio list',
    category: 'Audio',
    description: 'List all audio tracks and synthesized sound clips stored in database.',
    syntax: 'audio list',
    examples: ['audio list'],
    relatedCommands: ['audio play', 'audio pause'],
    handler: async (ctx) => {
      const files = await db.files.toArray();
      const audioFiles = files.filter(
        (f) => f.type?.startsWith('audio') || f.tags?.includes('audio') || f.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
      );

      if (audioFiles.length === 0) {
        ctx.addOutput('info', 'No audio tracks found in database. Upload audio clips using the Audio widget.');
        return;
      }

      const rows = audioFiles
        .map((f, i) => `• ${(i + 1)}. "${f.name}" (ID: ${f.id}, Size: ${Math.round(f.size / 1024)} KB)`)
        .join('\n');

      ctx.addOutput('info', `=== STORED AUDIO TRACKS (${audioFiles.length}) ===\n${rows}`);
    },
  },
  {
    id: 'audio.play',
    name: 'audio play',
    category: 'Audio',
    description: 'Trigger audio playback on the revolving vinyl record player.',
    syntax: 'audio play',
    examples: ['audio play'],
    relatedCommands: ['audio pause', 'audio stop'],
    handler: (ctx) => {
      dispatchAudioEvent('play');
      ctx.addOutput('success', 'Dispatched audio PLAY command. Vinyl record spinning.');
    },
  },
  {
    id: 'audio.pause',
    name: 'audio pause',
    category: 'Audio',
    description: 'Pause audio playback and vinyl record rotation.',
    syntax: 'audio pause',
    examples: ['audio pause'],
    relatedCommands: ['audio play'],
    handler: (ctx) => {
      dispatchAudioEvent('pause');
      ctx.addOutput('success', 'Dispatched audio PAUSE command.');
    },
  },
  {
    id: 'audio.next',
    name: 'audio next',
    category: 'Audio',
    description: 'Skip to the next audio track in playlist.',
    syntax: 'audio next',
    examples: ['audio next'],
    relatedCommands: ['audio previous'],
    handler: (ctx) => {
      dispatchAudioEvent('next');
      ctx.addOutput('success', 'Skipped to NEXT audio track.');
    },
  },
  {
    id: 'audio.previous',
    name: 'audio previous',
    aliases: ['audio prev'],
    category: 'Audio',
    description: 'Skip to the previous audio track in playlist.',
    syntax: 'audio previous',
    examples: ['audio previous', 'audio prev'],
    relatedCommands: ['audio next'],
    handler: (ctx) => {
      dispatchAudioEvent('prev');
      ctx.addOutput('success', 'Skipped to PREVIOUS audio track.');
    },
  },
  {
    id: 'audio.stop',
    name: 'audio stop',
    category: 'Audio',
    description: 'Stop audio playback and reset track to beginning.',
    syntax: 'audio stop',
    examples: ['audio stop'],
    handler: (ctx) => {
      dispatchAudioEvent('stop');
      ctx.addOutput('success', 'Audio playback stopped.');
    },
  },
  {
    id: 'audio.volume',
    name: 'audio volume',
    category: 'Audio',
    description: 'Set master audio output volume (0 to 100).',
    syntax: 'audio volume <0-100>',
    arguments: [
      {
        name: 'volume',
        description: 'Volume level (0-100)',
        required: true,
        type: 'number',
      },
    ],
    examples: ['audio volume 75', 'audio volume 20'],
    relatedCommands: ['audio mute'],
    handler: (ctx) => {
      const vol = Math.min(Math.max(Number(ctx.args[0]), 0), 100);
      dispatchAudioEvent('volume', vol / 100);
      ctx.addOutput('success', `Audio volume set to ${vol}%.`);
    },
  },
  {
    id: 'audio.mute',
    name: 'audio mute',
    category: 'Audio',
    description: 'Toggle audio output mute.',
    syntax: 'audio mute',
    examples: ['audio mute'],
    handler: (ctx) => {
      dispatchAudioEvent('mute');
      ctx.addOutput('success', 'Toggled audio mute state.');
    },
  },
  {
    id: 'audio.repeat',
    name: 'audio repeat',
    category: 'Audio',
    description: 'Toggle track repeat mode.',
    syntax: 'audio repeat',
    examples: ['audio repeat'],
    handler: (ctx) => {
      dispatchAudioEvent('repeat');
      ctx.addOutput('success', 'Toggled audio repeat mode.');
    },
  },
  {
    id: 'audio.shuffle',
    name: 'audio shuffle',
    category: 'Audio',
    description: 'Toggle track shuffle mode.',
    syntax: 'audio shuffle',
    examples: ['audio shuffle'],
    handler: (ctx) => {
      dispatchAudioEvent('shuffle');
      ctx.addOutput('success', 'Toggled audio shuffle mode.');
    },
  },
];
