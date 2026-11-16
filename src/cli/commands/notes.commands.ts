import type { CommandDefinition } from '../engine/commandTypes';
import { db } from '../../core/storage/db';

export const notesCommands: CommandDefinition[] = [
  {
    id: 'note.list',
    name: 'note list',
    aliases: ['notes', 'note ls'],
    category: 'Notes',
    description: 'List all notes stored in the database.',
    syntax: 'note list',
    examples: ['note list', 'notes'],
    relatedCommands: ['note add', 'note show'],
    handler: async (ctx) => {
      const notes = await db.notes.toArray();
      if (notes.length === 0) {
        ctx.addOutput('info', 'No notes found. Use "note add <title> [content]" to create one.');
        return;
      }

      notes.sort((a, b) => b.updatedAt - a.updatedAt);
      const rows = notes
        .map((n, i) => {
          const tags = n.tags && n.tags.length > 0 ? `[Tags: ${n.tags.join(', ')}]` : '';
          const preview = n.content ? n.content.replace(/\n/g, ' ').slice(0, 45) + '...' : '(Empty)';
          return `• ${(i + 1).toString().padStart(2, ' ')}. "${n.title}" ${tags}\n     ID: ${n.id} | Preview: ${preview}`;
        })
        .join('\n\n');

      ctx.addOutput('info', `=== SAVED NOTES (${notes.length}) ===\n\n${rows}`);
    },
  },
  {
    id: 'note.add',
    name: 'note add',
    category: 'Notes',
    description: 'Create a new markdown note in the database.',
    syntax: 'note add <title> [content]',
    arguments: [
      {
        name: 'title',
        description: 'Note title',
        required: true,
      },
      {
        name: 'content',
        description: 'Markdown content',
        required: false,
      },
    ],
    examples: [
      'note add "Project Roadmap" "Phase 1 complete, deploying Phase 2"',
      'note add "Ideas"',
    ],
    relatedCommands: ['note list', 'note show'],
    handler: async (ctx) => {
      const title = ctx.args[0]?.trim();
      const content = ctx.args[1] || '';

      const id = `note-${Date.now()}`;
      await db.notes.add({
        id,
        title,
        content,
        tags: ['cli'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      ctx.addOutput('success', `Created note "${title}" (ID: ${id}).`);
    },
  },
  {
    id: 'note.edit',
    name: 'note edit',
    category: 'Notes',
    description: 'Update the text content of a note.',
    syntax: 'note edit <id> <content>',
    arguments: [
      {
        name: 'id',
        description: 'Note ID or partial match',
        required: true,
      },
      {
        name: 'content',
        description: 'New markdown content',
        required: true,
      },
    ],
    examples: ['note edit note-123 "Updated architecture details"'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim();
      const newContent = ctx.args[1];

      const notes = await db.notes.toArray();
      const note = notes.find((n) => n.id === query || n.id.startsWith(query) || n.title.toLowerCase().includes(query.toLowerCase()));

      if (!note) {
        ctx.addOutput('error', `Note matching "${query}" not found.`);
        return;
      }

      await db.notes.update(note.id, {
        content: newContent,
        updatedAt: Date.now(),
      });

      ctx.addOutput('success', `Updated content for note "${note.title}".`);
    },
  },
  {
    id: 'note.show',
    name: 'note show',
    category: 'Notes',
    description: 'Display full markdown content of a note.',
    syntax: 'note show <id|title>',
    arguments: [
      {
        name: 'id|title',
        description: 'Note ID or title',
        required: true,
      },
    ],
    examples: ['note show "Project Roadmap"'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const notes = await db.notes.toArray();
      const note = notes.find(
        (n) => n.id.toLowerCase() === query || n.id.toLowerCase().startsWith(query) || n.title.toLowerCase().includes(query)
      );

      if (!note) {
        ctx.addOutput('error', `Note matching "${ctx.args[0]}" not found.`);
        return;
      }

      ctx.addOutput(
        'info',
        `╔═══════════════════════════════════════════════════════════════╗
║ NOTE: "${note.title}"
╠═══════════════════════════════════════════════════════════════╣
${note.content || '(Empty content)'}
╚═══════════════════════════════════════════════════════════════╝
Tags: ${note.tags?.join(', ') || 'none'} | Updated: ${new Date(note.updatedAt).toLocaleString()}`
      );
    },
  },
  {
    id: 'note.search',
    name: 'note search',
    category: 'Notes',
    description: 'Search notes by title, content, or tags.',
    syntax: 'note search <keyword>',
    arguments: [
      {
        name: 'keyword',
        description: 'Search term',
        required: true,
      },
    ],
    examples: ['note search roadmap'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const notes = await db.notes.toArray();
      const matches = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content?.toLowerCase().includes(query) ||
          n.tags?.some((t) => t.toLowerCase().includes(query))
      );

      if (matches.length === 0) {
        ctx.addOutput('info', `No notes matching keyword "${query}".`);
        return;
      }

      const rows = matches.map((n) => `• "${n.title}" (ID: ${n.id})`).join('\n');
      ctx.addOutput('info', `=== MATCHING NOTES (${matches.length}) ===\n${rows}`);
    },
  },
  {
    id: 'note.tag',
    name: 'note tag',
    category: 'Notes',
    description: 'Attach a tag to an existing note.',
    syntax: 'note tag <id> <tag>',
    arguments: [
      {
        name: 'id',
        description: 'Note ID or title',
        required: true,
      },
      {
        name: 'tag',
        description: 'Tag name',
        required: true,
      },
    ],
    examples: ['note tag note-123 "urgent"'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim();
      const tag = ctx.args[1]?.trim();

      const notes = await db.notes.toArray();
      const note = notes.find((n) => n.id === query || n.id.startsWith(query) || n.title.toLowerCase().includes(query.toLowerCase()));

      if (!note) {
        ctx.addOutput('error', `Note matching "${query}" not found.`);
        return;
      }

      const tags = note.tags || [];
      if (!tags.includes(tag)) {
        tags.push(tag);
        await db.notes.update(note.id, { tags, updatedAt: Date.now() });
      }

      ctx.addOutput('success', `Added tag "${tag}" to note "${note.title}".`);
    },
  },
  {
    id: 'note.remove',
    name: 'note remove',
    aliases: ['note rm'],
    category: 'Notes',
    description: 'Delete a note from the database.',
    syntax: 'note remove <id|title>',
    arguments: [
      {
        name: 'id|title',
        description: 'Note ID or title',
        required: true,
      },
    ],
    examples: ['note remove "Ideas"'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const notes = await db.notes.toArray();
      const note = notes.find(
        (n) => n.id.toLowerCase() === query || n.id.toLowerCase().startsWith(query) || n.title.toLowerCase().includes(query)
      );

      if (!note) {
        ctx.addOutput('error', `Note matching "${ctx.args[0]}" not found.`);
        return;
      }

      await db.notes.delete(note.id);
      ctx.addOutput('success', `Deleted note "${note.title}".`);
    },
  },
];
