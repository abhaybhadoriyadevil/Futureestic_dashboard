import type { CommandDefinition } from '../engine/commandTypes';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useDashboardStore } from '../../stores/useDashboardStore';

function getMindMapWidget(query?: string) {
  const { activeDashboardId } = useDashboardStore.getState();
  const { widgets } = useWidgetStore.getState();
  const maps = widgets.filter((w) => w.moduleType === 'mindmap');

  if (query) {
    const q = query.toLowerCase();
    return maps.find(
      (w) => w.id.toLowerCase() === q || w.id.toLowerCase().startsWith(q) || w.title.toLowerCase().includes(q)
    );
  }

  return (
    maps.find((w) => w.dashboardId === activeDashboardId) ||
    maps[0]
  );
}

function parseMindmap(widget: any): { nodes: any[]; connections: any[] } {
  try {
    if (widget.dataRef) {
      const parsed = JSON.parse(widget.dataRef);
      return {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      };
    }
  } catch {}
  return { nodes: [], connections: [] };
}

export const mindmapCommands: CommandDefinition[] = [
  {
    id: 'mindmap.list',
    name: 'mindmap list',
    aliases: ['mindmap ls'],
    category: 'Mind Map',
    description: 'List all mindmap widgets and concept node counts.',
    syntax: 'mindmap list',
    examples: ['mindmap list'],
    relatedCommands: ['mindmap create', 'mindmap add-node'],
    handler: (ctx) => {
      const { widgets } = useWidgetStore.getState();
      const maps = widgets.filter((w) => w.moduleType === 'mindmap');

      if (maps.length === 0) {
        ctx.addOutput('info', 'No mindmap widgets found. Use "mindmap create <name>" to spawn one.');
        return;
      }

      const rows = maps
        .map((m, i) => {
          const data = parseMindmap(m);
          return `• ${(i + 1)}. "${m.title}"\n     ID: ${m.id} | Nodes: ${data.nodes.length} | Connections: ${data.connections.length}`;
        })
        .join('\n\n');

      ctx.addOutput('info', `=== MIND MAPS (${maps.length}) ===\n\n${rows}`);
    },
  },
  {
    id: 'mindmap.create',
    name: 'mindmap create',
    category: 'Mind Map',
    description: 'Create a new concept mindmap widget on the canvas.',
    syntax: 'mindmap create <name>',
    arguments: [
      {
        name: 'name',
        description: 'Mind map title',
        required: true,
      },
    ],
    examples: ['mindmap create "AI Architecture"'],
    handler: async (ctx) => {
      const name = ctx.args[0]?.trim();
      const { activeDashboardId } = useDashboardStore.getState();

      const initialData = {
        nodes: [
          { id: `node-1`, label: name, x: 250, y: 150, color: '#06b6d4' },
        ],
        connections: [],
      };

      await useWidgetStore.getState().addWidget({
        dashboardId: activeDashboardId,
        moduleType: 'mindmap',
        title: name,
        position: { x: 120, y: 120 },
        size: { w: 800, h: 500 },
        rotation: 0,
        zIndex: 10,
        opacity: 100,
        styles: { borderRadius: '20px', backgroundType: 'glass' },
        animation: { entrance: 'fade', hover: 'glow' },
        dataRef: JSON.stringify(initialData),
        locked: false,
        visible: true,
      });

      ctx.addOutput('success', `Created mind map widget "${name}" with central root node.`);
    },
  },
  {
    id: 'mindmap.add-node',
    name: 'mindmap add-node',
    category: 'Mind Map',
    description: 'Add a concept node to a mind map.',
    syntax: 'mindmap add-node <map_id|name> <label>',
    arguments: [
      {
        name: 'map',
        description: 'Mind map ID or title',
        required: true,
      },
      {
        name: 'label',
        description: 'Node concept label',
        required: true,
      },
    ],
    examples: ['mindmap add-node "Architecture" "Neural Network"'],
    handler: async (ctx) => {
      const mapTarget = ctx.args[0];
      const label = ctx.args[1];

      const widget = getMindMapWidget(mapTarget);
      if (!widget) {
        ctx.addOutput('error', `Mindmap matching "${mapTarget}" not found.`);
        return;
      }

      const data = parseMindmap(widget);
      const newNode = {
        id: `node-${Date.now()}`,
        label,
        x: 150 + ((data.nodes.length * 50) % 400),
        y: 100 + ((data.nodes.length * 40) % 280),
        color: '#8b5cf6',
      };

      data.nodes.push(newNode);
      await useWidgetStore.getState().commitWidgetUpdate(widget.id, {
        dataRef: JSON.stringify(data),
      });

      ctx.addOutput('success', `Added node "${label}" (ID: ${newNode.id}) to mind map "${widget.title}".`);
    },
  },
  {
    id: 'mindmap.edit-node',
    name: 'mindmap edit-node',
    category: 'Mind Map',
    description: 'Update the label text of an existing mind map node.',
    syntax: 'mindmap edit-node <node_id> <label>',
    arguments: [
      {
        name: 'node_id',
        description: 'Node ID or exact label',
        required: true,
      },
      {
        name: 'label',
        description: 'New node label text',
        required: true,
      },
    ],
    examples: ['mindmap edit-node node-1 "Updated Core Idea"'],
    handler: async (ctx) => {
      const nodeTarget = ctx.args[0]?.toLowerCase();
      const newLabel = ctx.args[1];

      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const maps = widgets.filter((w) => w.moduleType === 'mindmap');

      for (const map of maps) {
        const data = parseMindmap(map);
        const node = data.nodes.find(
          (n) => n.id?.toLowerCase() === nodeTarget || n.label?.toLowerCase() === nodeTarget
        );
        if (node) {
          node.label = newLabel;
          await commitWidgetUpdate(map.id, { dataRef: JSON.stringify(data) });
          ctx.addOutput('success', `Updated node to "${newLabel}".`);
          return;
        }
      }

      ctx.addOutput('error', `Node matching "${ctx.args[0]}" not found in any mind map.`);
    },
  },
  {
    id: 'mindmap.connect',
    name: 'mindmap connect',
    category: 'Mind Map',
    description: 'Draw a connection link between two concept nodes.',
    syntax: 'mindmap connect <source_id> <target_id>',
    arguments: [
      {
        name: 'source_id',
        description: 'Source node ID',
        required: true,
      },
      {
        name: 'target_id',
        description: 'Target node ID',
        required: true,
      },
    ],
    examples: ['mindmap connect node-1 node-2'],
    handler: async (ctx) => {
      const src = ctx.args[0]?.toLowerCase();
      const tgt = ctx.args[1]?.toLowerCase();

      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const maps = widgets.filter((w) => w.moduleType === 'mindmap');

      for (const map of maps) {
        const data = parseMindmap(map);
        const srcNode = data.nodes.find((n) => n.id?.toLowerCase() === src || n.label?.toLowerCase() === src);
        const tgtNode = data.nodes.find((n) => n.id?.toLowerCase() === tgt || n.label?.toLowerCase() === tgt);

        if (srcNode && tgtNode) {
          data.connections.push({
            from: srcNode.id,
            to: tgtNode.id,
          });
          await commitWidgetUpdate(map.id, { dataRef: JSON.stringify(data) });
          ctx.addOutput('success', `Connected node "${srcNode.label}" → "${tgtNode.label}".`);
          return;
        }
      }

      ctx.addOutput('error', `Could not find source and target nodes to connect.`);
    },
  },
  {
    id: 'mindmap.remove-node',
    name: 'mindmap remove-node',
    category: 'Mind Map',
    description: 'Remove a node and its connections from mind map.',
    syntax: 'mindmap remove-node <node_id>',
    arguments: [
      {
        name: 'node_id',
        description: 'Node ID or label to delete',
        required: true,
      },
    ],
    examples: ['mindmap remove-node node-2'],
    handler: async (ctx) => {
      const nodeTarget = ctx.args[0]?.toLowerCase();
      const { widgets, commitWidgetUpdate } = useWidgetStore.getState();
      const maps = widgets.filter((w) => w.moduleType === 'mindmap');

      for (const map of maps) {
        const data = parseMindmap(map);
        const idx = data.nodes.findIndex(
          (n) => n.id?.toLowerCase() === nodeTarget || n.label?.toLowerCase() === nodeTarget
        );
        if (idx !== -1) {
          const removed = data.nodes.splice(idx, 1)[0];
          data.connections = data.connections.filter((c) => c.from !== removed.id && c.to !== removed.id);
          await commitWidgetUpdate(map.id, { dataRef: JSON.stringify(data) });
          ctx.addOutput('success', `Removed node "${removed.label}".`);
          return;
        }
      }

      ctx.addOutput('error', `Node "${ctx.args[0]}" not found.`);
    },
  },
];
