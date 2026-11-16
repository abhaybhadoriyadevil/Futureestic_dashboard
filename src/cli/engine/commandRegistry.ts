import type { CommandDefinition, CommandCategory } from './commandTypes';

export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();
  private nameMap = new Map<string, CommandDefinition>();

  public register(cmd: CommandDefinition): void {
    this.commands.set(cmd.id, cmd);
    this.nameMap.set(cmd.name.toLowerCase(), cmd);

    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.nameMap.set(alias.toLowerCase(), cmd);
      }
    }
  }

  public registerAll(cmds: CommandDefinition[]): void {
    for (const cmd of cmds) {
      this.register(cmd);
    }
  }

  /**
   * Resolves command definition and remaining arguments from token array.
   * Matches multi-word commands (e.g. 'ws create', 'theme accent') before single-word commands.
   */
  public resolve(tokens: string[]): { cmd: CommandDefinition; args: string[] } | null {
    if (tokens.length === 0) return null;

    // Check 2-word command name: e.g. "ws create" or "widget add"
    if (tokens.length >= 2) {
      const twoWordKey = `${tokens[0]} ${tokens[1]}`.toLowerCase();
      const twoWordCmd = this.nameMap.get(twoWordKey);
      if (twoWordCmd) {
        return {
          cmd: twoWordCmd,
          args: tokens.slice(2),
        };
      }
    }

    // Check single-word command: e.g. "clear", "dict", "sysinfo"
    const oneWordKey = tokens[0].toLowerCase();
    const oneWordCmd = this.nameMap.get(oneWordKey);
    if (oneWordCmd) {
      return {
        cmd: oneWordCmd,
        args: tokens.slice(1),
      };
    }

    return null;
  }

  public getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  public getById(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  public getCategories(): CommandCategory[] {
    const cats = new Set<CommandCategory>();
    for (const cmd of this.commands.values()) {
      cats.add(cmd.category);
    }
    return Array.from(cats);
  }

  public getByCategory(category: CommandCategory): CommandDefinition[] {
    return this.getAll().filter((c) => c.category === category);
  }

  public search(query: string, category?: string): CommandDefinition[] {
    const q = query.trim().toLowerCase();
    return this.getAll().filter((cmd) => {
      const matchCat = !category || category === 'All' || cmd.category === category;
      if (!matchCat) return false;
      if (!q) return true;

      return (
        cmd.name.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.syntax.toLowerCase().includes(q) ||
        cmd.aliases?.some((a) => a.toLowerCase().includes(q)) ||
        cmd.examples.some((e) => e.toLowerCase().includes(q))
      );
    });
  }
}

export const commandRegistry = new CommandRegistry();
