import type { CommandDefinition } from "../engine/commandTypes";
import { useDashboardStore } from "../../stores/useDashboardStore";

export const workspaceCommands: CommandDefinition[] = [
  {
    id: "workspace.list",
    name: "ws ls",
    aliases: ["workspace list", "workspaces", "workspace ls", "ws list"],
    category: "Workspace",
    description:
      "List all registered workspaces with IDs, layout types, and active indicator.",
    syntax: "ws ls",
    examples: ["ws ls", "workspace list"],
    relatedCommands: ["ws switch", "ws create"],
    handler: (ctx) => {
      const { dashboards, activeDashboardId } = useDashboardStore.getState();
      if (dashboards.length === 0) {
        ctx.addOutput("warning", "No workspaces registered.");
        return;
      }

      const rows = dashboards
        .map((d, i) => {
          const isActive = d.id === activeDashboardId;
          const marker = isActive ? "▶ [ACTIVE]" : "  [      ]";
          return `${marker} ${(i + 1).toString().padStart(2, " ")}. "${d.name}"\n             ID: ${d.id} | Layout: ${d.layoutType}`;
        })
        .join("\n\n");

      ctx.addOutput(
        "info",
        `=== REGISTERED WORKSPACES (${dashboards.length}) ===\n\n${rows}`,
      );
    },
  },
  {
    id: "workspace.switch",
    name: "ws switch",
    aliases: ["workspace switch"],
    category: "Workspace",
    description:
      "Switch active workspace to the specified workspace name or ID.",
    syntax: "ws switch <name|id>",
    arguments: [
      {
        name: "name|id",
        description: "Target workspace name or unique ID",
        required: true,
      },
    ],
    examples: [
      'ws switch "Home Space"',
      "ws switch projects",
      "ws switch home",
    ],
    relatedCommands: ["ws ls", "ws create"],
    handler: (ctx) => {
      const query = ctx.args[0]?.trim();
      const { dashboards, setActiveDashboardId } = useDashboardStore.getState();
      const target = dashboards.find(
        (d) =>
          d.id.toLowerCase() === query.toLowerCase() ||
          d.name.toLowerCase() === query.toLowerCase() ||
          d.name.toLowerCase().includes(query.toLowerCase()),
      );

      if (!target) {
        ctx.addOutput(
          "error",
          `Workspace "${query}" not found. Run "ws ls" to view valid workspace names.`,
        );
        return;
      }

      setActiveDashboardId(target.id);
      ctx.addOutput(
        "success",
        `Switched active workspace to "${target.name}" (${target.layoutType}).`,
      );
    },
  },
  {
    id: "workspace.create",
    name: "ws create",
    aliases: ["workspace create"],
    category: "Workspace",
    description: "Create and switch to a new workspace canvas or grid.",
    syntax: "ws create <name> [canvas|snap]",
    arguments: [
      {
        name: "name",
        description: "New workspace title",
        required: true,
      },
      {
        name: "layout",
        description: "Layout engine: canvas (infinite 2D) or snap (grid)",
        required: false,
        choices: ["canvas", "snap"],
      },
    ],
    examples: [
      'ws create "Cyber Lab" canvas',
      'ws create "Trading Terminal" snap',
    ],
    relatedCommands: ["ws ls", "ws switch"],
    handler: async (ctx) => {
      const name = ctx.args[0]?.trim();
      const layoutType = (
        ctx.args[1]?.toLowerCase() === "snap" ? "snap" : "canvas"
      ) as "canvas" | "snap";

      const { createDashboard, setActiveDashboardId } =
        useDashboardStore.getState();
      const id = await createDashboard(
        name,
        "Layout",
        layoutType,
        "Created via CLI",
      );
      setActiveDashboardId(id);

      ctx.addOutput(
        "success",
        `Created and activated new workspace "${name}" [Layout: ${layoutType}].`,
      );
    },
  },
  {
    id: "workspace.rename",
    name: "ws rename",
    aliases: ["workspace rename"],
    category: "Workspace",
    description: "Rename an existing workspace title.",
    syntax: "ws rename <name|id> <new_name>",
    arguments: [
      {
        name: "name|id",
        description: "Current workspace name or ID",
        required: true,
      },
      {
        name: "new_name",
        description: "New workspace title",
        required: true,
      },
    ],
    examples: ['ws rename "Cyber Lab" "Matrix Lab"'],
    relatedCommands: ["ws ls"],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim();
      const newName = ctx.args[1]?.trim();

      const { dashboards, updateDashboard } = useDashboardStore.getState();
      const target = dashboards.find(
        (d) =>
          d.id.toLowerCase() === query.toLowerCase() ||
          d.name.toLowerCase() === query.toLowerCase() ||
          d.name.toLowerCase().includes(query.toLowerCase()),
      );

      if (!target) {
        ctx.addOutput("error", `Workspace "${query}" not found.`);
        return;
      }

      await updateDashboard(target.id, { name: newName });
      ctx.addOutput(
        "success",
        `Renamed workspace "${target.name}" to "${newName}".`,
      );
    },
  },
  {
    id: "workspace.rm",
    name: "ws rm",
    aliases: ["workspace rm", "ws delete", "workspace delete"],
    category: "Workspace",
    description: "Delete a workspace and all widgets located on it.",
    syntax: "ws rm <name|id>",
    arguments: [
      {
        name: "name|id",
        description: "Workspace name or ID to delete",
        required: true,
      },
    ],
    examples: ['ws rm "Matrix Lab"'],
    relatedCommands: ["ws ls"],
    handler: async (ctx) => {
      const query = ctx.args[0]?.trim();
      const { dashboards, deleteDashboard } = useDashboardStore.getState();

      if (dashboards.length <= 1) {
        ctx.addOutput(
          "error",
          "Cannot delete the only remaining workspace. Personal OS requires at least 1 active space.",
        );
        return;
      }

      const target = dashboards.find(
        (d) =>
          d.id.toLowerCase() === query.toLowerCase() ||
          d.name.toLowerCase() === query.toLowerCase() ||
          d.name.toLowerCase().includes(query.toLowerCase()),
      );

      if (!target) {
        ctx.addOutput("error", `Workspace "${query}" not found.`);
        return;
      }

      await deleteDashboard(target.id);
      ctx.addOutput(
        "success",
        `Deleted workspace "${target.name}" and all associated widgets.`,
      );
    },
  },
];
