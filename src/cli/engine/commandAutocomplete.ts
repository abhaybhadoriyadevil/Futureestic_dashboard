import { commandRegistry } from './commandRegistry';
import { parseCommandLine } from './commandParser';
import type { AutocompleteSuggestion } from './commandTypes';

export function getAutocompleteSuggestions(input: string): AutocompleteSuggestion[] {
  const trimmed = input.trim();
  if (!trimmed) {
    // Return top popular commands
    return commandRegistry.getAll().slice(0, 8).map((cmd) => ({
      text: cmd.name,
      description: cmd.description,
      syntax: cmd.syntax,
      category: cmd.category,
    }));
  }

  const tokens = parseCommandLine(input);
  const endsWithSpace = input.endsWith(' ');

  // 1. If user typed full command and ends with space, check if arguments have choices
  if (endsWithSpace && tokens.length > 0) {
    const resolved = commandRegistry.resolve(tokens);
    if (resolved && resolved.cmd.arguments) {
      const argIndex = resolved.args.length;
      const targetArg = resolved.cmd.arguments[argIndex];
      if (targetArg && targetArg.choices) {
        return targetArg.choices.map((choice) => ({
          text: `${input}${choice}`,
          displayText: choice,
          description: `Option for <${targetArg.name}>`,
          syntax: resolved.cmd.syntax,
          category: resolved.cmd.category,
        }));
      }
    }
  }

  // 2. Otherwise match command names or aliases
  const query = trimmed.toLowerCase();
  const suggestions: AutocompleteSuggestion[] = [];
  const seen = new Set<string>();

  for (const cmd of commandRegistry.getAll()) {
    if (cmd.name.toLowerCase().startsWith(query)) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name);
        suggestions.push({
          text: cmd.name,
          description: cmd.description,
          syntax: cmd.syntax,
          category: cmd.category,
        });
      }
    }

    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        if (alias.toLowerCase().startsWith(query)) {
          if (!seen.has(alias)) {
            seen.add(alias);
            suggestions.push({
              text: alias,
              displayText: `${alias} (alias for ${cmd.name})`,
              description: cmd.description,
              syntax: cmd.syntax,
              category: cmd.category,
            });
          }
        }
      }
    }
  }

  return suggestions.slice(0, 10);
}
