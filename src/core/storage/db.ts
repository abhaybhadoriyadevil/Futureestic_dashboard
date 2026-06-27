import Dexie, { type Table } from 'dexie';
import type { Dashboard, Widget, FileData, Note, TableData, CalendarEvent } from '../../types';

class PersonalOSDatabase extends Dexie {
  dashboards!: Table<Dashboard, string>;
  widgets!: Table<Widget, string>;
  files!: Table<FileData, string>;
  notes!: Table<Note, string>;
  customTables!: Table<TableData, string>;
  events!: Table<CalendarEvent, string>;

  constructor() {
    super('PersonalOSDatabase');
    this.version(1).stores({
      dashboards: 'id, name, layoutType, themeId, createdAt',
      widgets: 'id, dashboardId, moduleType, zIndex, locked, visible',
      files: 'id, name, type, *tags, category, createdAt',
      notes: 'id, title, *tags, folderId, createdAt',
      customTables: 'id, name, createdAt',
      events: 'id, title, startDate, endDate, category, createdAt',
    });
  }
}


export const db = new PersonalOSDatabase();

// Seed initial dashboard structures if database is empty
export async function seedInitialData() {
  const dashboardCount = await db.dashboards.count();
  if (dashboardCount > 0) return;

  const now = Date.now();

  // Create Default Dashboards
  const defaultDashboards: Dashboard[] = [
    {
      id: 'home',
      name: 'Home Space',
      icon: 'Home',
      description: 'Central command and personal index.',
      layoutType: 'canvas',
      themeId: 'dark',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'projects',
      name: 'Projects & Tasks',
      icon: 'Briefcase',
      description: 'Kanban boards and development notes.',
      layoutType: 'free',
      themeId: 'dark',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'finance',
      name: 'Analytics & Finance',
      icon: 'TrendingUp',
      description: 'Tables and data visualizers.',
      layoutType: 'snap',
      themeId: 'dark',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mind',
      name: 'Knowledge Map',
      icon: 'GitBranch',
      description: 'Infinite canvas connecting notes.',
      layoutType: 'canvas',
      themeId: 'dark',
      createdAt: now,
      updatedAt: now,
    }
  ];

  await db.dashboards.bulkAdd(defaultDashboards);

  // Initial Notes
  const initialNotes: Note[] = [
    {
      id: 'note-welcome',
      title: 'Welcome to Personal OS',
      content: `# Welcome to your Personal OS Dashboard

This is a private, local-first data dashboard. Everything you write or upload is stored **entirely in your browser database (IndexedDB)**.

### Features
* **Zero AI / Zero Social / Zero Cloud**: Safe, private, and fast.
* **Fully Modular**: Move, resize, and style any widget from the header toolbar.
* **Themes**: Instantly switch between Futuristic Cyberpunk and Minimal Light modes.

### Hotkeys
* Press \`Ctrl + K\` to launch **Universal Search**.
* Drag widgets by their headers to reposition.
* Use the corner handle to resize.
`,
      tags: ['guide', 'personal'],
      folderId: 'general',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'note-roadmap',
      title: 'Development Roadmap',
      content: `# Personal OS Roadmap

1. [x] Core Database & Themes
2. [x] Flexible Layout Engines
3. [x] Notes, Tables, and Files Modules
4. [ ] Sync & Cloud connectors (Optional)
5. [ ] Standalone desktop wrapper (Tauri)
`,
      tags: ['work', 'planning'],
      folderId: 'projects',
      createdAt: now - 3600000,
      updatedAt: now,
    }
  ];

  await db.notes.bulkAdd(initialNotes);

  // Initial Events
  const initialEvents: CalendarEvent[] = [
    {
      id: 'event-1',
      title: 'OS Launch Verification',
      description: 'Perform functional testing of all custom widgets.',
      startDate: now + 3600000 * 2, // in 2 hours
      endDate: now + 3600000 * 4,
      category: 'Work',
      color: '#3b82f6',
      createdAt: now,
    },
    {
      id: 'event-2',
      title: 'Weekly Financial Sync',
      description: 'Review expenses and balance sheets.',
      startDate: now + 86400000 * 2, // in 2 days
      endDate: now + 86400000 * 2 + 3600000,
      category: 'Finance',
      color: '#10b981',
      createdAt: now,
    }
  ];

  await db.events.bulkAdd(initialEvents);

  // Initial Tables
  const initialTables: TableData[] = [
    {
      id: 'table-finance',
      name: 'Personal Expenses',
      columns: [
        { key: 'item', name: 'Item Name', type: 'text' },
        { key: 'category', name: 'Category', type: 'select', options: ['Tech', 'Rent', 'Food', 'Leisure', 'Investments'] },
        { key: 'amount', name: 'Amount ($)', type: 'number' },
        { key: 'date', name: 'Date', type: 'date' },
        { key: 'cleared', name: 'Cleared', type: 'boolean' }
      ],
      rows: [
        { item: 'UltraWide Monitor', category: 'Tech', amount: 450, date: '2026-06-25', cleared: true },
        { item: 'Coffee Beans', category: 'Food', amount: 22.5, date: '2026-06-26', cleared: true },
        { item: 'Monthly Rent', category: 'Rent', amount: 1500, date: '2026-06-01', cleared: true },
        { item: 'Cyberpunk Game Preorder', category: 'Leisure', amount: 69.99, date: '2026-06-20', cleared: false },
        { item: 'SaaS Index Fund', category: 'Investments', amount: 300, date: '2026-06-15', cleared: true }
      ],
      createdAt: now,
      updatedAt: now,
    }
  ];

  await db.customTables.bulkAdd(initialTables);

  // Initial Widgets for Home Space (Grid Layout)
  const homeWidgets: Widget[] = [
    {
      id: 'widget-welcome-note',
      dashboardId: 'home',
      moduleType: 'notes',
      title: 'Documentation',
      position: { x: 40, y: 40 },
      size: { w: 550, h: 360 },
      rotation: 0,
      zIndex: 1,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'fade', hover: 'glow' },
      dataRef: 'note-welcome',
      locked: false,
      visible: true,
      createdAt: now,
    },
    {
      id: 'widget-calendar',
      dashboardId: 'home',
      moduleType: 'calendar',
      title: 'Scheduler OS',
      position: { x: 620, y: 40 },
      size: { w: 550, h: 360 },
      rotation: 0,
      zIndex: 2,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'slide-up', hover: 'glow' },
      locked: false,
      visible: true,
      createdAt: now,
    },
    {
      id: 'widget-stats',
      dashboardId: 'home',
      moduleType: 'statistics',
      title: 'KPI Diagnostics',
      position: { x: 40, y: 430 },
      size: { w: 360, h: 280 },
      rotation: 0,
      zIndex: 3,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'scale', hover: 'glow' },
      locked: false,
      visible: true,
      createdAt: now,
    },
    {
      id: 'widget-charts',
      dashboardId: 'home',
      moduleType: 'charts',
      title: 'Expense Trends',
      position: { x: 430, y: 430 },
      size: { w: 740, h: 280 },
      rotation: 0,
      zIndex: 4,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'zoom', hover: 'glow' },
      dataRef: 'table-finance', // Visualizes personal expenses table
      locked: false,
      visible: true,
      createdAt: now,
    }
  ];

  // Initial Widgets for Projects Space (Free Layout)
  const projectWidgets: Widget[] = [
    {
      id: 'widget-kanban',
      dashboardId: 'projects',
      moduleType: 'kanban',
      title: 'Sprint Board',
      position: { x: 50, y: 50 },
      size: { w: 600, h: 450 },
      rotation: 0,
      zIndex: 1,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'fade', hover: 'glow' },
      dataRef: JSON.stringify({
        todo: [{ id: 'k-1', title: 'Implement Infinite Canvas zooming', tags: ['High'], date: '2026-06-28' }],
        progress: [{ id: 'k-2', title: 'Write custom modular stores', tags: ['Medium'], date: '2026-06-27' }],
        done: [{ id: 'k-3', title: 'Bootstrap Vite & DB schema', tags: ['Low'], date: '2026-06-26' }]
      }),
      locked: false,
      visible: true,
      createdAt: now,
    },
    {
      id: 'widget-roadmap-note',
      dashboardId: 'projects',
      moduleType: 'notes',
      title: 'Release Milestones',
      position: { x: 700, y: 100 },
      size: { w: 400, h: 380 },
      rotation: 2, // Slight tilt in Free layout for aesthetic appeal
      zIndex: 2,
      opacity: 95,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'slide-right', hover: 'pulse' },
      dataRef: 'note-roadmap',
      locked: false,
      visible: true,
      createdAt: now,
    }
  ];

  // Initial Widgets for Finance Space (Snap Layout)
  const financeWidgets: Widget[] = [
    {
      id: 'widget-finance-table',
      dashboardId: 'finance',
      moduleType: 'tables',
      title: 'Expense Records',
      position: { x: 20, y: 20 },
      size: { w: 750, h: 480 },
      rotation: 0,
      zIndex: 1,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'scale', hover: 'glow' },
      dataRef: 'table-finance',
      locked: false,
      visible: true,
      createdAt: now,
    },
    {
      id: 'widget-finance-chart',
      dashboardId: 'finance',
      moduleType: 'charts',
      title: 'Category Breakdown',
      position: { x: 790, y: 20 },
      size: { w: 400, h: 480 },
      rotation: 0,
      zIndex: 2,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'fade', hover: 'glow' },
      dataRef: 'table-finance',
      locked: false,
      visible: true,
      createdAt: now,
    }
  ];

  // Initial Widgets for Mind Space (Canvas Layout)
  const mindWidgets: Widget[] = [
    {
      id: 'widget-mindmap',
      dashboardId: 'mind',
      moduleType: 'mindmap',
      title: 'Central Brain Map',
      position: { x: 100, y: 50 },
      size: { w: 900, h: 600 },
      rotation: 0,
      zIndex: 1,
      opacity: 100,
      styles: { borderRadius: '20px', backgroundType: 'glass' },
      animation: { entrance: 'zoom', hover: 'glow' },
      dataRef: JSON.stringify({
        nodes: [
          { id: 'n-1', label: 'Personal OS Core', x: 450, y: 300, color: '#3b82f6' },
          { id: 'n-2', label: 'Local-first Database', x: 250, y: 200, color: '#06b6d4' },
          { id: 'n-3', label: '10 Fully Custom Modules', x: 650, y: 200, color: '#8b5cf6' },
          { id: 'n-4', label: 'Dexie (IndexedDB)', x: 150, y: 100, color: '#10b981' },
          { id: 'n-5', label: 'Futuristic Sci-Fi Visuals', x: 800, y: 100, color: '#3b82f6' }
        ],
        connections: [
          { from: 'n-1', to: 'n-2' },
          { from: 'n-1', to: 'n-3' },
          { from: 'n-2', to: 'n-4' },
          { from: 'n-3', to: 'n-5' }
        ]
      }),
      locked: false,
      visible: true,
      createdAt: now,
    }
  ];

  await db.widgets.bulkAdd([
    ...homeWidgets,
    ...projectWidgets,
    ...financeWidgets,
    ...mindWidgets
  ]);

  // Seed two placeholder items into files for display in the File Module
  const encoder = new TextEncoder();
  const sampleTextBlob = new Blob([encoder.encode('Personal OS System Report - Ready.')], { type: 'text/plain' });
  const sampleCsvBlob = new Blob([encoder.encode('id,name,value\n1,Alpha,100\n2,Beta,200')], { type: 'text/csv' });

  await db.files.bulkAdd([
    {
      id: 'file-report',
      name: 'system_log.txt',
      type: 'text/plain',
      size: sampleTextBlob.size,
      blob: sampleTextBlob,
      tags: ['system', 'text'],
      category: 'Documents',
      createdAt: now,
    },
    {
      id: 'file-csv',
      name: 'data_metrics.csv',
      type: 'text/csv',
      size: sampleCsvBlob.size,
      blob: sampleCsvBlob,
      tags: ['financial', 'data'],
      category: 'Spreadsheets',
      createdAt: now,
    }
  ]);
}
