import type { CommandDefinition } from '../engine/commandTypes';
import { db } from '../../core/storage/db';
import { useWidgetStore } from '../../stores/useWidgetStore';

function dispatchImageEvent(action: string, value?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('personal-os-image-control', {
        detail: { action, value },
      })
    );
  }
}

export const imageCommands: CommandDefinition[] = [
  {
    id: 'image.list',
    name: 'image list',
    aliases: ['images'],
    category: 'Images',
    description: 'List all gallery images stored in IndexedDB.',
    syntax: 'image list',
    examples: ['image list'],
    relatedCommands: ['image slideshow', 'image grid'],
    handler: async (ctx) => {
      const files = await db.files.toArray();
      const imageFiles = files.filter(
        (f) => f.type?.startsWith('image') || f.tags?.includes('image') || f.name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i)
      );

      if (imageFiles.length === 0) {
        ctx.addOutput('info', 'No image files found in database.');
        return;
      }

      const rows = imageFiles
        .map((f, i) => `• ${(i + 1)}. "${f.name}" (ID: ${f.id}, Size: ${Math.round(f.size / 1024)} KB)`)
        .join('\n');

      ctx.addOutput('info', `=== STORED GALLERY IMAGES (${imageFiles.length}) ===\n${rows}`);
    },
  },
  {
    id: 'image.slideshow',
    name: 'image slideshow',
    category: 'Images',
    description: 'Switch image widget to automated carousel slideshow mode.',
    syntax: 'image slideshow',
    examples: ['image slideshow'],
    relatedCommands: ['image grid', 'image next'],
    handler: (ctx) => {
      dispatchImageEvent('mode', 'slideshow');

      // Also persist to image widget dataRef if present
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const imgWidget = widgets.find((w) => w.moduleType === 'images');
      if (imgWidget) {
        let conf: any = {};
        try {
          if (imgWidget.dataRef) conf = JSON.parse(imgWidget.dataRef);
        } catch {}
        conf.viewMode = 'slideshow';
        conf.isPlaying = true;
        commitWidgetUpdate(imgWidget.id, { dataRef: JSON.stringify(conf) });
      }

      ctx.addOutput('success', 'Switched image widget to SLIDESHOW mode.');
    },
  },
  {
    id: 'image.grid',
    name: 'image grid',
    category: 'Images',
    description: 'Switch image widget to multi-tile grid thumbnail mode.',
    syntax: 'image grid',
    examples: ['image grid'],
    relatedCommands: ['image slideshow'],
    handler: (ctx) => {
      dispatchImageEvent('mode', 'grid');

      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const imgWidget = widgets.find((w) => w.moduleType === 'images');
      if (imgWidget) {
        let conf: any = {};
        try {
          if (imgWidget.dataRef) conf = JSON.parse(imgWidget.dataRef);
        } catch {}
        conf.viewMode = 'grid';
        conf.isPlaying = false;
        commitWidgetUpdate(imgWidget.id, { dataRef: JSON.stringify(conf) });
      }

      ctx.addOutput('success', 'Switched image widget to GRID mode.');
    },
  },
  {
    id: 'image.next',
    name: 'image next',
    category: 'Images',
    description: 'Advance slideshow to next image.',
    syntax: 'image next',
    examples: ['image next'],
    relatedCommands: ['image previous'],
    handler: (ctx) => {
      dispatchImageEvent('next');
      ctx.addOutput('success', 'Advanced to next image slide.');
    },
  },
  {
    id: 'image.previous',
    name: 'image previous',
    aliases: ['image prev'],
    category: 'Images',
    description: 'Return slideshow to previous image.',
    syntax: 'image previous',
    examples: ['image previous', 'image prev'],
    relatedCommands: ['image next'],
    handler: (ctx) => {
      dispatchImageEvent('prev');
      ctx.addOutput('success', 'Returned to previous image slide.');
    },
  },
  {
    id: 'image.delete',
    name: 'image delete',
    aliases: ['image rm'],
    category: 'Images',
    description: 'Delete a specific image from IndexedDB storage.',
    syntax: 'image delete <id>',
    arguments: [
      {
        name: 'id',
        description: 'Image file ID or filename',
        required: true,
      },
    ],
    examples: ['image delete img-123'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim();
      const files = await db.files.toArray();
      const target = files.find((f) => f.id === query || f.name.toLowerCase() === query.toLowerCase());

      if (!target) {
        ctx.addOutput('error', `Image matching "${query}" not found.`);
        return;
      }

      await db.files.delete(target.id);
      dispatchImageEvent('delete', target.id);
      ctx.addOutput('success', `Deleted image "${target.name}".`);
    },
  },
];
