import type { CommandDefinition } from '../engine/commandTypes';
import { db } from '../../core/storage/db';

export const tableCommands: CommandDefinition[] = [
  {
    id: 'table.list',
    name: 'table list',
    aliases: ['tables', 'table ls'],
    category: 'Tables',
    description: 'List all custom spreadsheet tables stored in database.',
    syntax: 'table list',
    examples: ['table list', 'tables'],
    relatedCommands: ['table create', 'table show'],
    handler: async (ctx) => {
      const tables = await db.customTables.toArray();
      if (tables.length === 0) {
        ctx.addOutput('info', 'No spreadsheet tables found. Use "table create <name>" to create one.');
        return;
      }

      const rows = tables
        .map(
          (t, i) =>
            `• ${(i + 1)}. "${t.name}"\n     ID: ${t.id} | Columns: ${t.columns.length} (${t.columns.map((c) => c.name).join(', ')}) | Rows: ${t.rows.length}`
        )
        .join('\n\n');

      ctx.addOutput('info', `=== SPREADSHEET TABLES (${tables.length}) ===\n\n${rows}`);
    },
  },
  {
    id: 'table.create',
    name: 'table create',
    category: 'Tables',
    description: 'Create a new custom spreadsheet table.',
    syntax: 'table create <name>',
    arguments: [
      {
        name: 'name',
        description: 'Table name',
        required: true,
      },
    ],
    examples: ['table create "Expenses 2026"', 'table create "Inventory"'],
    relatedCommands: ['table list', 'table show'],
    handler: async (ctx) => {
      const name = ctx.args[0]?.trim();
      const id = `table-${Date.now()}`;

      await db.customTables.add({
        id,
        name,
        columns: [
          { key: 'item', name: 'Item', type: 'text' },
          { key: 'amount', name: 'Amount', type: 'number' },
          { key: 'category', name: 'Category', type: 'text' },
        ],
        rows: [
          { id: 'r-1', item: 'Initial Entry', amount: 100, category: 'General' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      ctx.addOutput('success', `Created spreadsheet table "${name}" (ID: ${id}) with 3 default columns.`);
    },
  },
  {
    id: 'table.show',
    name: 'table show',
    category: 'Tables',
    description: 'Display table columns and rows in an ASCII grid.',
    syntax: 'table show <id|name>',
    arguments: [
      {
        name: 'id|name',
        description: 'Table name or ID',
        required: true,
      },
    ],
    examples: ['table show "Expenses 2026"'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const tables = await db.customTables.toArray();
      const table = tables.find(
        (t) => t.id.toLowerCase() === query || t.name.toLowerCase() === query || t.name.toLowerCase().includes(query)
      );

      if (!table) {
        ctx.addOutput('error', `Table matching "${ctx.args[0]}" not found.`);
        return;
      }

      if (table.rows.length === 0) {
        ctx.addOutput('info', `Table "${table.name}" has ${table.columns.length} columns but 0 rows.`);
        return;
      }

      const headers = table.columns.map((c) => c.name.padEnd(16, ' ')).join(' | ');
      const divider = '-'.repeat(headers.length);

      const rowsText = table.rows
        .map((r, i) => {
          const cells = table.columns.map((c) => String(r[c.key] ?? '').padEnd(16, ' ')).join(' | ');
          return `[${(i + 1).toString().padStart(2, ' ')}] ${cells}`;
        })
        .join('\n');

      ctx.addOutput('info', `=== TABLE: "${table.name}" ===\n[ #] ${headers}\n${divider}\n${rowsText}`);
    },
  },
  {
    id: 'table.add-row',
    name: 'table add-row',
    category: 'Tables',
    description: 'Append a row of data to an existing table.',
    syntax: 'table add-row <table_id|name> <col1=val1,col2=val2...>',
    arguments: [
      {
        name: 'table',
        description: 'Table name or ID',
        required: true,
      },
      {
        name: 'data',
        description: 'Comma separated key=value pairs',
        required: true,
      },
    ],
    examples: ['table add-row "Expenses" "item=Server Host,amount=450,category=Tech"'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const rawData = ctx.args[1];

      const tables = await db.customTables.toArray();
      const table = tables.find(
        (t) => t.id.toLowerCase() === query || t.name.toLowerCase() === query || t.name.toLowerCase().includes(query)
      );

      if (!table) {
        ctx.addOutput('error', `Table matching "${ctx.args[0]}" not found.`);
        return;
      }

      const newRow: Record<string, any> = { id: `r-${Date.now()}` };
      const pairs = rawData.split(',');
      for (const pair of pairs) {
        const [k, v] = pair.split('=').map((s) => s.trim());
        if (k && v !== undefined) {
          const colDef = table.columns.find((c) => c.key === k || c.name.toLowerCase() === k.toLowerCase());
          const key = colDef ? colDef.key : k;
          newRow[key] = colDef?.type === 'number' ? Number(v) : v;
        }
      }

      table.rows.push(newRow);
      await db.customTables.update(table.id, {
        rows: table.rows,
        updatedAt: Date.now(),
      });

      ctx.addOutput('success', `Added new row to table "${table.name}".`);
    },
  },
  {
    id: 'table.remove-row',
    name: 'table remove-row',
    aliases: ['table rm-row'],
    category: 'Tables',
    description: 'Delete a row by row index or row ID.',
    syntax: 'table remove-row <table_id|name> <row_index|row_id>',
    arguments: [
      {
        name: 'table',
        description: 'Table name or ID',
        required: true,
      },
      {
        name: 'row',
        description: '1-based row index or row ID',
        required: true,
      },
    ],
    examples: ['table remove-row "Expenses" 1', 'table remove-row "Expenses" r-1'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const rowTarget = ctx.args[1]?.trim();

      const tables = await db.customTables.toArray();
      const table = tables.find(
        (t) => t.id.toLowerCase() === query || t.name.toLowerCase() === query || t.name.toLowerCase().includes(query)
      );

      if (!table) {
        ctx.addOutput('error', `Table matching "${ctx.args[0]}" not found.`);
        return;
      }

      const idxNum = Number(rowTarget) - 1;
      let removed = false;

      if (!isNaN(idxNum) && idxNum >= 0 && idxNum < table.rows.length) {
        table.rows.splice(idxNum, 1);
        removed = true;
      } else {
        const matchIdx = table.rows.findIndex((r) => r.id === rowTarget);
        if (matchIdx !== -1) {
          table.rows.splice(matchIdx, 1);
          removed = true;
        }
      }

      if (!removed) {
        ctx.addOutput('error', `Row "${rowTarget}" not found in table "${table.name}".`);
        return;
      }

      await db.customTables.update(table.id, {
        rows: table.rows,
        updatedAt: Date.now(),
      });

      ctx.addOutput('success', `Deleted row from table "${table.name}".`);
    },
  },
  {
    id: 'table.search',
    name: 'table search',
    category: 'Tables',
    description: 'Search rows in a table matching a keyword.',
    syntax: 'table search <table_id|name> <keyword>',
    arguments: [
      {
        name: 'table',
        description: 'Table name or ID',
        required: true,
      },
      {
        name: 'keyword',
        description: 'Search keyword',
        required: true,
      },
    ],
    examples: ['table search "Expenses" server'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const keyword = ctx.args[1]?.trim().toLowerCase();

      const tables = await db.customTables.toArray();
      const table = tables.find(
        (t) => t.id.toLowerCase() === query || t.name.toLowerCase() === query || t.name.toLowerCase().includes(query)
      );

      if (!table) {
        ctx.addOutput('error', `Table matching "${ctx.args[0]}" not found.`);
        return;
      }

      const matches = table.rows.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(keyword))
      );

      if (matches.length === 0) {
        ctx.addOutput('info', `No rows matching "${keyword}" in table "${table.name}".`);
        return;
      }

      const rowsText = matches
        .map((r, i) => `• [${i + 1}] ${JSON.stringify(r)}`)
        .join('\n');

      ctx.addOutput('info', `=== MATCHING ROWS (${matches.length}) ===\n${rowsText}`);
    },
  },
  {
    id: 'table.export',
    name: 'table export',
    category: 'Tables',
    description: 'Export table data as CSV or JSON file.',
    syntax: 'table export <table_id|name> <csv|json>',
    arguments: [
      {
        name: 'table',
        description: 'Table name or ID',
        required: true,
      },
      {
        name: 'format',
        description: 'Export format: csv or json',
        required: true,
        choices: ['csv', 'json'],
      },
    ],
    examples: ['table export "Expenses" csv', 'table export "Expenses" json'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim().toLowerCase();
      const format = ctx.args[1]?.toLowerCase();

      const tables = await db.customTables.toArray();
      const table = tables.find(
        (t) => t.id.toLowerCase() === query || t.name.toLowerCase() === query || t.name.toLowerCase().includes(query)
      );

      if (!table) {
        ctx.addOutput('error', `Table matching "${ctx.args[0]}" not found.`);
        return;
      }

      let content = '';
      let mimeType = 'text/plain';

      if (format === 'csv') {
        const header = table.columns.map((c) => c.name).join(',');
        const lines = table.rows.map((r) => table.columns.map((c) => `"${r[c.key] ?? ''}"`).join(','));
        content = [header, ...lines].join('\n');
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(table, null, 2);
        mimeType = 'application/json';
      }

      if (typeof window !== 'undefined') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${table.name.replace(/\s+/g, '_')}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }

      ctx.addOutput('success', `Exported table "${table.name}" as .${format} file.`);
    },
  },
];
