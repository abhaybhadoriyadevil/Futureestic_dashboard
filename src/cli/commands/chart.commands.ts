import type { CommandDefinition } from '../engine/commandTypes';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useDashboardStore } from '../../stores/useDashboardStore';

export const chartCommands: CommandDefinition[] = [
  {
    id: 'chart.list',
    name: 'chart list',
    aliases: ['charts'],
    category: 'Charts',
    description: 'List all chart visualization widgets on the active workspace.',
    syntax: 'chart list',
    examples: ['chart list'],
    relatedCommands: ['chart types', 'chart create'],
    handler: (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const { widgets } = useWidgetStore.getState();
      const chartWidgets = widgets.filter((w) => w.dashboardId === activeDashboardId && w.moduleType === 'charts');

      if (chartWidgets.length === 0) {
        ctx.addOutput('info', 'No chart widgets found on canvas. Use "chart create <type>" to spawn one.');
        return;
      }

      const rows = chartWidgets
        .map((w, i) => {
          let config: any = {};
          try {
            if (w.dataRef) config = JSON.parse(w.dataRef);
          } catch {}
          return `• ${(i + 1)}. "${w.title}"\n     ID: ${w.id} | Chart Type: ${(config.chartType || 'bar').toUpperCase()}\n     Source: ${config.source || 'Manual/Seeded'} | Metric: ${config.metric || 'default'}`;
        })
        .join('\n\n');

      ctx.addOutput('info', `=== ACTIVE CHARTS (${chartWidgets.length}) ===\n\n${rows}`);
    },
  },
  {
    id: 'chart.types',
    name: 'chart types',
    category: 'Charts',
    description: 'List supported futuristic chart styles and visualization types.',
    syntax: 'chart types',
    examples: ['chart types'],
    handler: (ctx) => {
      ctx.addOutput(
        'info',
        `=== SUPPORTED CYBERPUNK CHART TYPES ===
• bar   : Multi-stop neon column bars with rounded caps
• line  : Glowing neon bezier line with active telemetry dots
• pie   : Holographic donut chart with rotating central HUD core and cyber legend
• area  : Radiant multi-stop gradient wave fill
• radar : Polar coordinate cyber grid with polygon telemetry overlay`
      );
    },
  },
  {
    id: 'chart.create',
    name: 'chart create',
    category: 'Charts',
    description: 'Create a new chart widget pre-configured with a specific chart type.',
    syntax: 'chart create <type> [title]',
    arguments: [
      {
        name: 'type',
        description: 'Chart style',
        required: true,
        choices: ['bar', 'line', 'pie', 'area', 'radar', 'donut'],
      },
      {
        name: 'title',
        description: 'Custom title',
        required: false,
      },
    ],
    examples: [
      'chart create pie "Habits Distribution"',
      'chart create bar "Weekly Analytics"',
      'chart create radar "Skills Matrix"',
    ],
    handler: async (ctx) => {
      const { activeDashboardId } = useDashboardStore.getState();
      const rawType = ctx.args[0]?.toLowerCase();
      const chartType = rawType === 'donut' ? 'pie' : rawType;
      const title = ctx.args[1] || `${chartType.toUpperCase()} Chart`;

      const config = {
        chartType,
        source: 'habits',
        metric: 'completion-rate',
      };

      await useWidgetStore.getState().addWidget({
        dashboardId: activeDashboardId,
        moduleType: 'charts',
        title,
        position: { x: 120, y: 120 },
        size: { w: 600, h: 360 },
        rotation: 0,
        zIndex: 10,
        opacity: 100,
        styles: { borderRadius: '20px', backgroundType: 'glass' },
        animation: { entrance: 'fade', hover: 'glow' },
        dataRef: JSON.stringify(config),
        locked: false,
        visible: true,
      });

      ctx.addOutput('success', `Created [${chartType.toUpperCase()}] chart widget "${title}".`);
    },
  },
  {
    id: 'chart.source',
    name: 'chart source',
    category: 'Charts',
    description: 'Connect chart widget to a database table or habit tracker.',
    syntax: 'chart source <widget_id> <source>',
    arguments: [
      {
        name: 'widget_id',
        description: 'Chart widget ID or title',
        required: true,
      },
      {
        name: 'source',
        description: 'Data source: "habits", "habits:all", or table ID',
        required: true,
      },
    ],
    examples: [
      'chart source w-123 habits',
      'chart source "Analytics" habits:all',
    ],
    handler: async (ctx) => {
      const query = ctx.args[0]?.toLowerCase();
      const source = ctx.args[1];

      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const target = widgets.find(
        (w) =>
          w.moduleType === 'charts' &&
          (w.id.toLowerCase() === query || w.id.toLowerCase().startsWith(query) || w.title.toLowerCase().includes(query))
      );

      if (!target) {
        ctx.addOutput('error', `Chart widget matching "${ctx.args[0]}" not found.`);
        return;
      }

      let config: any = {};
      try {
        if (target.dataRef) config = JSON.parse(target.dataRef);
      } catch {}

      config.source = source;
      await commitWidgetUpdate(target.id, { dataRef: JSON.stringify(config) });
      ctx.addOutput('success', `Connected chart "${target.title}" to source "${source}".`);
    },
  },
  {
    id: 'chart.metric',
    name: 'chart metric',
    category: 'Charts',
    description: 'Set habit analytics metric for connected chart.',
    syntax: 'chart metric <widget_id> <completion-rate|total-checkins|daily-trend>',
    arguments: [
      {
        name: 'widget_id',
        description: 'Chart widget ID or title',
        required: true,
      },
      {
        name: 'metric',
        description: 'Metric calculation mode',
        required: true,
        choices: ['completion-rate', 'total-checkins', 'daily-trend'],
      },
    ],
    examples: ['chart metric w-123 completion-rate', 'chart metric w-123 daily-trend'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.toLowerCase();
      const metric = ctx.args[1]?.toLowerCase();

      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const target = widgets.find(
        (w) =>
          w.moduleType === 'charts' &&
          (w.id.toLowerCase() === query || w.id.toLowerCase().startsWith(query) || w.title.toLowerCase().includes(query))
      );

      if (!target) {
        ctx.addOutput('error', `Chart widget matching "${ctx.args[0]}" not found.`);
        return;
      }

      let config: any = {};
      try {
        if (target.dataRef) config = JSON.parse(target.dataRef);
      } catch {}

      config.metric = metric;
      await commitWidgetUpdate(target.id, { dataRef: JSON.stringify(config) });
      ctx.addOutput('success', `Updated metric on chart "${target.title}" to "${metric}".`);
    },
  },
  {
    id: 'chart.refresh',
    name: 'chart refresh',
    category: 'Charts',
    description: 'Trigger data re-fetch and render refresh for chart widget.',
    syntax: 'chart refresh <widget_id>',
    arguments: [
      {
        name: 'widget_id',
        description: 'Chart widget ID or title',
        required: true,
      },
    ],
    examples: ['chart refresh w-123'],
    handler: async (ctx) => {
      const query = ctx.args[0]?.toLowerCase();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const target = widgets.find(
        (w) =>
          w.moduleType === 'charts' &&
          (w.id.toLowerCase() === query || w.id.toLowerCase().startsWith(query) || w.title.toLowerCase().includes(query))
      );

      if (!target) {
        ctx.addOutput('error', `Chart widget matching "${ctx.args[0]}" not found.`);
        return;
      }

      // Bump dataRef timestamp
      let config: any = {};
      try {
        if (target.dataRef) config = JSON.parse(target.dataRef);
      } catch {}
      config._t = Date.now();

      await commitWidgetUpdate(target.id, { dataRef: JSON.stringify(config) });
      ctx.addOutput('success', `Refreshed telemetry pipeline for chart "${target.title}".`);
    },
  },
];
