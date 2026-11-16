import { commandRegistry } from './commandRegistry';
import type { CommandDefinition } from './commandTypes';

/**
 * Generates a comprehensive markdown specification of all registered commands,
 * formatting rules, argument constraints, and sample batch workflows.
 * This can be copied directly and given to ChatGPT, Claude, Gemini, or DeepSeek.
 */
export function generateMasterPromptForAI(): string {
  const allCommands = commandRegistry.getAll();
  const categories = commandRegistry.getCategories();

  // Group commands by category
  const grouped: Record<string, CommandDefinition[]> = {};
  for (const cat of categories) {
    grouped[cat] = [];
  }
  for (const cmd of allCommands) {
    if (!grouped[cmd.category]) {
      grouped[cmd.category] = [];
    }
    grouped[cmd.category].push(cmd);
  }

  let doc = `# PERSONAL OS — MASTER CLI COMMAND SPECIFICATION FOR AI ASSISTANTS

You are an expert command script generator for **Personal OS** (Futuristic Cyberpunk Operating System).
Your task is to write valid, executable CLI batch scripts based on the user's instructions.

---

## ⚡ Execution Rules & Syntax

1. **Multiple Command Chaining**:
   - Commands can be separated by a semicolon \`;\` to execute sequentially:
     \`ws switch "Work Space"; widget add notes "Sprint 1"; theme accent #06b6d4\`
   - Commands can be chained with \`&&\` (runs next only if previous command succeeded):
     \`ws create "Project" canvas && ws switch "Project" && widget add kanban "Board"\`
   - Commands can be written on individual newlines for multi-line batch scripts.
2. **Arguments with Spaces**:
   - Any argument that contains spaces MUST be enclosed in double quotes (e.g. \`ws create "Cyber Lab" canvas\`).
3. **Pure CLI Output**:
   - When generating scripts for the user, provide clean CLI lines so they can copy and paste directly into the Personal OS Terminal (<kbd>Ctrl+\`</kbd>).

---

## 📋 Complete Command Registry by Category
`;

  for (const cat of categories) {
    const list = grouped[cat] || [];
    if (list.length === 0) continue;

    doc += `\n### ${cat}\n`;

    for (const cmd of list) {
      doc += `\n- **\`${cmd.syntax}\`**\n`;
      doc += `  - *Description*: ${cmd.description}\n`;

      if (cmd.aliases && cmd.aliases.length > 0) {
        doc += `  - *Aliases*: ${cmd.aliases.map((a) => `\`${a}\``).join(', ')}\n`;
      }

      if (cmd.arguments && cmd.arguments.length > 0) {
        const req = cmd.arguments.filter((a) => a.required).map((a) => `\`<${a.name}>\`${a.choices ? ` (${a.choices.join('|')})` : ''}`).join(', ');
        const opt = cmd.arguments.filter((a) => !a.required).map((a) => `\`[${a.name}]\`${a.choices ? ` (${a.choices.join('|')})` : ''}`).join(', ');
        if (req) doc += `  - *Required Arguments*: ${req}\n`;
        if (opt) doc += `  - *Optional Arguments*: ${opt}\n`;
      }

      if (cmd.examples && cmd.examples.length > 0) {
        doc += `  - *Examples*: ${cmd.examples.map((ex) => `\`${ex}\``).join(' | ')}\n`;
      }
    }
  }

  doc += `
---

## 🚀 Pre-Built Example Batch Workflows (Prompt Templates)

### 1. Developer Engineering Space Setup
\`\`\`bash
ws create "Dev Environment" canvas
ws switch "Dev Environment"
widget add kanban "Sprint Backlog"
kanban add todo "Implement OAuth 2.0 PKCE flow"
kanban add progress "Build Personal OS CLI Command Control Room"
kanban add done "Setup project scaffold & Dexie DB"
widget add notes "Architecture Notes"
note add "Microservice Architecture" "Event-driven architecture with Kafka, Redis caching, and Go workers."
widget add habits "Engineering Discipline"
habit add "Solve 1 Algorithmic Problem" everyday
habit add "Code Review Pull Requests" weekdays
widget add charts "Sprint Telemetry"
chart create donut "Sprint Status"
theme accent #06b6d4
\`\`\`

### 2. Daily Productivity & Habits Hub
\`\`\`bash
ws create "Daily Focus" canvas
ws switch "Daily Focus"
widget add habits "Habit Matrix"
habit add "Morning 5KM Jog" everyday
habit add "Drink 3 Liters Water" everyday
habit add "Read 20 Pages Non-Fiction" everyday
widget add calendar "Timeline"
event add "Deep Work Block" 2026-11-20 09:00
event add "Team Architecture Sync" 2026-11-20 15:30
theme accent #10b981
\`\`\`

### 3. Financial & Trading Analytics Dashboard
\`\`\`bash
ws create "Finance Terminal" snap
ws switch "Finance Terminal"
widget add tables "Investment Portfolio"
table create "Crypto Holdings"
widget add charts "Asset Allocation"
chart create radar "Risk Exposure"
theme accent #f59e0b
\`\`\`

### 4. Responsive Grid & Multi-Widget Viewport Layout
\`\`\`bash
ws create "Command Center" canvas
ws switch "Command Center"
widget add images "Visual Monitor"
widget place "Visual Monitor" 5 5 45 40
widget add charts "Telemetry"
widget place "Telemetry" 52 5 43 40
widget add kanban "Active Tasks"
widget grid "Active Tasks" 1 6 6 6
widget add notes "Field Notes"
widget grid "Field Notes" 7 6 6 6
widget layout save "Dual Grid Setup"
\`\`\`
`;

  return doc.trim();
}

/**
 * Copies the master AI prompt to the user's system clipboard.
 */
export async function copyMasterPromptToClipboard(): Promise<boolean> {
  const content = generateMasterPromptForAI();
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(content);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
