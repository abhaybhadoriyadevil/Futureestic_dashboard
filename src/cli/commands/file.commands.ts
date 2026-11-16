import type { CommandDefinition } from '../engine/commandTypes';
import { db } from '../../core/storage/db';

export const fileCommands: CommandDefinition[] = [
  {
    id: 'file.list',
    name: 'file list',
    aliases: ['files', 'file ls'],
    category: 'Files',
    description: 'List all digital files and assets stored in IndexedDB.',
    syntax: 'file list',
    examples: ['file list', 'files'],
    relatedCommands: ['file search', 'file download'],
    handler: async (ctx) => {
      const files = await db.files.toArray();
      if (files.length === 0) {
        ctx.addOutput('info', 'No files stored in database. Use "file upload" to add documents or media.');
        return;
      }

      const rows = files
        .map((f, i) => {
          const sizeKb = Math.round(f.size / 1024);
          const tags = f.tags && f.tags.length > 0 ? `[Tags: ${f.tags.join(', ')}]` : '';
          return `• ${(i + 1)}. "${f.name}" (${f.type || 'unknown'}, ${sizeKb} KB) ${tags}\n     ID: ${f.id}`;
        })
        .join('\n\n');

      ctx.addOutput('info', `=== STORED DIGITAL ASSETS (${files.length}) ===\n\n${rows}`);
    },
  },
  {
    id: 'file.search',
    name: 'file search',
    category: 'Files',
    description: 'Search files by filename, mime type, or tag.',
    syntax: 'file search <keyword>',
    arguments: [
      {
        name: 'keyword',
        description: 'Search keyword',
        required: true,
      },
    ],
    examples: ['file search pdf', 'file search report'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const files = await db.files.toArray();
      const matches = files.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.type?.toLowerCase().includes(query) ||
          f.tags?.some((t) => t.toLowerCase().includes(query))
      );

      if (matches.length === 0) {
        ctx.addOutput('info', `No files matching keyword "${query}".`);
        return;
      }

      const rows = matches
        .map((f) => `• "${f.name}" (ID: ${f.id}, Size: ${Math.round(f.size / 1024)} KB)`)
        .join('\n');
      ctx.addOutput('info', `=== MATCHING FILES (${matches.length}) ===\n${rows}`);
    },
  },
  {
    id: 'file.upload',
    name: 'file upload',
    category: 'Files',
    description: 'Trigger system file picker to upload files into IndexedDB.',
    syntax: 'file upload',
    examples: ['file upload'],
    handler: (ctx) => {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = async () => {
          const fileList = input.files;
          if (fileList && fileList.length > 0) {
            let uploadedCount = 0;
            for (let i = 0; i < fileList.length; i++) {
              const file = fileList[i];
              const id = `f-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
              await db.files.add({
                id,
                name: file.name,
                type: file.type || 'application/octet-stream',
                blob: file,
                size: file.size,
                tags: ['upload'],
                category: 'document',
                createdAt: Date.now(),
              });
              uploadedCount++;
            }
            ctx.addOutput('success', `Uploaded ${uploadedCount} file(s) into database storage.`);
          }
        };
        input.click();
        ctx.addOutput('info', 'File picker dialog triggered.');
      }
    },
  },
  {
    id: 'file.download',
    name: 'file download',
    category: 'Files',
    description: 'Download a stored file from IndexedDB to your local computer.',
    syntax: 'file download <id|name>',
    arguments: [
      {
        name: 'id|name',
        description: 'File ID or filename',
        required: true,
      },
    ],
    examples: ['file download f-123'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const files = await db.files.toArray();
      const file = files.find((f) => f.id.toLowerCase() === query || f.name.toLowerCase() === query);

      if (!file) {
        ctx.addOutput('error', `File matching "${ctx.args[0]}" not found.`);
        return;
      }

      if (typeof window !== 'undefined' && file.blob) {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        ctx.addOutput('success', `Initiated download for file "${file.name}".`);
      } else {
        ctx.addOutput('error', `File blob unavailable for "${file.name}".`);
      }
    },
  },
  {
    id: 'file.delete',
    name: 'file delete',
    aliases: ['file rm'],
    category: 'Files',
    description: 'Delete a file from IndexedDB database.',
    syntax: 'file delete <id|name>',
    arguments: [
      {
        name: 'id|name',
        description: 'File ID or filename to delete',
        required: true,
      },
    ],
    examples: ['file delete f-123'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const files = await db.files.toArray();
      const file = files.find((f) => f.id.toLowerCase() === query || f.name.toLowerCase() === query);

      if (!file) {
        ctx.addOutput('error', `File matching "${ctx.args[0]}" not found.`);
        return;
      }

      await db.files.delete(file.id);
      ctx.addOutput('success', `Deleted file "${file.name}".`);
    },
  },
  {
    id: 'file.tag',
    name: 'file tag',
    category: 'Files',
    description: 'Add a tag to an existing stored file.',
    syntax: 'file tag <id|name> <tag>',
    arguments: [
      {
        name: 'id|name',
        description: 'File ID or name',
        required: true,
      },
      {
        name: 'tag',
        description: 'Tag string',
        required: true,
      },
    ],
    examples: ['file tag f-123 "archive"'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const tag = ctx.args[1]?.trim();

      const files = await db.files.toArray();
      const file = files.find((f) => f.id.toLowerCase() === query || f.name.toLowerCase() === query);

      if (!file) {
        ctx.addOutput('error', `File matching "${ctx.args[0]}" not found.`);
        return;
      }

      const tags = file.tags || [];
      if (!tags.includes(tag)) {
        tags.push(tag);
        await db.files.update(file.id, { tags });
      }

      ctx.addOutput('success', `Added tag "${tag}" to file "${file.name}".`);
    },
  },
];
