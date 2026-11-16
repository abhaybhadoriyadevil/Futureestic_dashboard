import type { CommandDefinition } from '../engine/commandTypes';
import { db } from '../../core/storage/db';

export const calendarCommands: CommandDefinition[] = [
  {
    id: 'calendar.list',
    name: 'event list',
    aliases: ['calendar', 'event ls', 'events'],
    category: 'Calendar',
    description: 'List all scheduled calendar events.',
    syntax: 'event list',
    examples: ['event list', 'calendar'],
    relatedCommands: ['event add', 'event today', 'event upcoming'],
    handler: async (ctx) => {
      const events = await db.events.toArray();
      if (events.length === 0) {
        ctx.addOutput('info', 'No calendar events scheduled. Use "event add <title> <YYYY-MM-DD>" to create one.');
        return;
      }

      events.sort((a, b) => a.startDate - b.startDate);
      const rows = events
        .map((ev, i) => {
          const d = new Date(ev.startDate);
          const dateStr = !isNaN(d.getTime())
            ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : String(ev.startDate);
          return `• ${(i + 1).toString().padStart(2, ' ')}. "${ev.title}"\n     ID: ${ev.id} | Date: ${dateStr}\n     Category: ${ev.category || 'work'}`;
        })
        .join('\n\n');

      ctx.addOutput('info', `=== SCHEDULED CALENDAR EVENTS (${events.length}) ===\n\n${rows}`);
    },
  },
  {
    id: 'calendar.add',
    name: 'event add',
    category: 'Calendar',
    description: 'Schedule a new calendar event.',
    syntax: 'event add <title> <YYYY-MM-DD> [HH:MM]',
    arguments: [
      {
        name: 'title',
        description: 'Event title',
        required: true,
      },
      {
        name: 'date',
        description: 'Date in YYYY-MM-DD format',
        required: true,
      },
      {
        name: 'time',
        description: 'Time in HH:MM format',
        required: false,
      },
    ],
    examples: [
      'event add "Sprint Review" 2026-11-20 14:00',
      'event add "System Deploy" 2026-11-25',
    ],
    relatedCommands: ['event list', 'event today'],
    handler: async (ctx) => {
      const title = ctx.args[0]?.trim();
      const dateStr = ctx.args[1]?.trim();
      const timeStr = ctx.args[2]?.trim() || '09:00';

      const iso = `${dateStr}T${timeStr}:00`;
      const startTs = new Date(iso).getTime();
      if (isNaN(startTs)) {
        ctx.addOutput('error', `Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
        return;
      }

      const id = `ev-${Date.now()}`;
      await db.events.add({
        id,
        title,
        startDate: startTs,
        endDate: startTs + 3600000,
        category: 'work',
        color: '#06b6d4',
        createdAt: Date.now(),
      } as any);

      ctx.addOutput('success', `Scheduled event "${title}" on ${dateStr} at ${timeStr} (ID: ${id}).`);
    },
  },
  {
    id: 'calendar.edit',
    name: 'event edit',
    category: 'Calendar',
    description: 'Edit a field on an existing calendar event.',
    syntax: 'event edit <id> <field> <value>',
    arguments: [
      {
        name: 'id',
        description: 'Event ID or partial match',
        required: true,
      },
      {
        name: 'field',
        description: 'Field to edit: title, date, or category',
        required: true,
        choices: ['title', 'date', 'category'],
      },
      {
        name: 'value',
        description: 'New value',
        required: true,
      },
    ],
    examples: [
      'event edit ev-123 title "Updated Title"',
      'event edit ev-123 date 2026-11-22',
    ],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim();
      const field = ctx.args[1]?.toLowerCase();
      const value = ctx.args[2]?.trim();

      const events = await db.events.toArray();
      const ev = events.find((e) => e.id === query || e.id.startsWith(query) || e.title.toLowerCase().includes(query.toLowerCase()));

      if (!ev) {
        ctx.addOutput('error', `Event matching "${query}" not found.`);
        return;
      }

      const updates: any = {};
      if (field === 'title') {
        updates.title = value;
      } else if (field === 'date') {
        const ts = new Date(value).getTime();
        if (isNaN(ts)) {
          ctx.addOutput('error', 'Invalid date format. Expected YYYY-MM-DD.');
          return;
        }
        updates.startDate = ts;
        updates.endDate = ts + 3600000;
      } else if (field === 'category') {
        updates.category = value;
      }

      await db.events.update(ev.id, updates);
      ctx.addOutput('success', `Updated ${field} on event "${ev.title}".`);
    },
  },
  {
    id: 'calendar.remove',
    name: 'event remove',
    aliases: ['event rm'],
    category: 'Calendar',
    description: 'Delete a calendar event.',
    syntax: 'event remove <title|id>',
    arguments: [
      {
        name: 'title|id',
        description: 'Event title or ID',
        required: true,
      },
    ],
    examples: ['event remove "Sprint Review"'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim();
      const events = await db.events.toArray();
      const ev = events.find(
        (e) =>
          e.id === query ||
          e.id.startsWith(query) ||
          e.title.toLowerCase() === query.toLowerCase() ||
          e.title.toLowerCase().includes(query.toLowerCase())
      );

      if (!ev) {
        ctx.addOutput('error', `Event matching "${query}" not found.`);
        return;
      }

      await db.events.delete(ev.id);
      ctx.addOutput('success', `Removed calendar event "${ev.title}".`);
    },
  },
  {
    id: 'calendar.today',
    name: 'event today',
    category: 'Calendar',
    description: 'Display events scheduled for today.',
    syntax: 'event today',
    examples: ['event today'],
    handler: async (ctx) => {
      const events = await db.events.toArray();
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = today.getMonth();
      const dd = today.getDate();

      const todayEvents = events.filter((e) => {
        const d = new Date(e.startDate);
        return d.getFullYear() === yyyy && d.getMonth() === mm && d.getDate() === dd;
      });

      if (todayEvents.length === 0) {
        ctx.addOutput('info', 'No events scheduled for today.');
        return;
      }

      const rows = todayEvents
        .map((e, i) => {
          const t = new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `• ${(i + 1)}. [${t}] "${e.title}" (${e.category || 'work'})`;
        })
        .join('\n');

      ctx.addOutput('info', `=== TODAY'S SCHEDULE (${todayEvents.length}) ===\n${rows}`);
    },
  },
  {
    id: 'calendar.upcoming',
    name: 'event upcoming',
    category: 'Calendar',
    description: 'Display upcoming events in chronological order.',
    syntax: 'event upcoming',
    examples: ['event upcoming'],
    handler: async (ctx) => {
      const events = await db.events.toArray();
      const now = Date.now();
      const upcoming = events.filter((e) => e.startDate >= now).sort((a, b) => a.startDate - b.startDate);

      if (upcoming.length === 0) {
        ctx.addOutput('info', 'No upcoming events found.');
        return;
      }

      const rows = upcoming
        .slice(0, 10)
        .map((e, i) => {
          const d = new Date(e.startDate);
          return `• ${(i + 1)}. ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — "${e.title}"`;
        })
        .join('\n');

      ctx.addOutput('info', `=== UPCOMING EVENTS (${upcoming.length}) ===\n${rows}`);
    },
  },
  {
    id: 'calendar.search',
    name: 'event search',
    category: 'Calendar',
    description: 'Search calendar events matching a keyword.',
    syntax: 'event search <keyword>',
    arguments: [
      {
        name: 'keyword',
        description: 'Search keyword',
        required: true,
      },
    ],
    examples: ['event search review'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const events = await db.events.toArray();
      const matches = events.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.category?.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query)
      );

      if (matches.length === 0) {
        ctx.addOutput('info', `No events matching "${query}".`);
        return;
      }

      const rows = matches
        .map((e) => `• ${new Date(e.startDate).toLocaleDateString()} — "${e.title}" (ID: ${e.id})`)
        .join('\n');
      ctx.addOutput('info', `=== MATCHING EVENTS (${matches.length}) ===\n${rows}`);
    },
  },
];
