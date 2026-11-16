import { commandRegistry } from './commandRegistry';
import { parseCommandLine, splitCommandChains } from './commandParser';
import { validateArguments } from './commandValidator';
import { commandHistory } from './commandHistory';
import type { CommandContext } from './commandTypes';

/**
 * Executes a single atomic command string (without chain operators).
 * Returns true if execution succeeded without errors, false if an error occurred.
 */
async function executeSingleCommand(
  rawCmd: string,
  contextBase: Omit<CommandContext, 'rawInput' | 'command' | 'subcommand' | 'args'>
): Promise<boolean> {
  const trimmed = rawCmd.trim();
  if (!trimmed) return true;

  // Tokenize
  const tokens = parseCommandLine(trimmed);
  if (tokens.length === 0) return true;

  // Resolve command definition from registry
  const resolved = commandRegistry.resolve(tokens);

  if (!resolved) {
    // Attempt to find closest suggestions
    const firstToken = tokens[0].toLowerCase();
    const suggestions = commandRegistry
      .getAll()
      .filter((c) => c.name.toLowerCase().includes(firstToken) || c.aliases?.some((a) => a.toLowerCase().includes(firstToken)))
      .slice(0, 3)
      .map((c) => `• ${c.name} — ${c.description}`)
      .join('\n');

    contextBase.addOutput(
      'error',
      `Command not recognized: "${trimmed}".` +
        (suggestions ? `\n\nDid you mean:\n${suggestions}` : `\nType "help" or "dict" to browse all commands.`)
    );
    return false;
  }

  const { cmd, args } = resolved;

  // Validate arguments
  const validation = validateArguments(cmd, args);
  if (!validation.isValid) {
    contextBase.addOutput('error', validation.error || `Invalid syntax. Usage: ${cmd.syntax}`);
    return false;
  }

  // Track if error output was logged by handler
  let hasError = false;
  const wrappedAddOutput: typeof contextBase.addOutput = (type, text, data) => {
    if (type === 'error') {
      hasError = true;
    }
    contextBase.addOutput(type, text, data);
  };

  // Construct full execution context
  const fullContext: CommandContext = {
    ...contextBase,
    addOutput: wrappedAddOutput,
    rawInput: trimmed,
    command: tokens[0],
    subcommand: tokens.length > 1 ? tokens[1] : undefined,
    args,
  };

  try {
    await cmd.handler(fullContext);
    return !hasError;
  } catch (err: any) {
    console.error(`CLI execution error in [${cmd.name}]:`, err);
    contextBase.addOutput('error', `Execution failure in "${cmd.name}": ${err?.message || 'Unknown error'}`);
    return false;
  }
}

/**
 * Main execution entry point.
 * Supports:
 * - Single commands: 'ws ls'
 * - Multiple commands chained by ';' or '\n' (runs each in sequence)
 * - Conditional chaining by '&&' (runs only if previous command succeeded)
 * - Conditional chaining by '||' (runs only if previous command failed)
 */
export async function executeCommandLine(
  rawInput: string,
  contextBase: Omit<CommandContext, 'rawInput' | 'command' | 'subcommand' | 'args'>
): Promise<boolean> {
  const trimmed = rawInput.trim();
  if (!trimmed) return true;

  // Record complete raw input into execution history
  commandHistory.add(trimmed);

  // Split into chained sequence (honors quotes)
  const chains = splitCommandChains(trimmed);
  if (chains.length === 0) return true;

  // Single command fast path
  if (chains.length === 1) {
    return await executeSingleCommand(chains[0].rawCommand, contextBase);
  }

  // Multi-command batch execution path
  contextBase.addOutput(
    'info',
    `⚡ [BATCH SCRIPT] Executing ${chains.length} commands in sequence...`
  );

  let executedCount = 0;
  let successCount = 0;
  let lastSuccess = true;

  for (let i = 0; i < chains.length; i++) {
    const item = chains[i];
    const stepNum = i + 1;

    // Check condition requirements
    if (item.condition === 'on_success' && !lastSuccess) {
      contextBase.addOutput(
        'warning',
        `⏭️ [Step ${stepNum}/${chains.length} Skipped]: "${item.rawCommand}" (halted because previous command failed).`
      );
      continue;
    }

    if (item.condition === 'on_failure' && lastSuccess) {
      // Skipped because previous command succeeded
      continue;
    }

    // Announce sub-command in batch output if multiple commands
    contextBase.addOutput(
      'input',
      `[${stepNum}/${chains.length}] > ${item.rawCommand}`
    );

    const ok = await executeSingleCommand(item.rawCommand, contextBase);
    executedCount++;
    if (ok) {
      successCount++;
      lastSuccess = true;
    } else {
      lastSuccess = false;
    }
  }

  // Summary output
  if (successCount === chains.length) {
    contextBase.addOutput(
      'success',
      `✨ Batch execution finished: All ${chains.length} commands completed successfully.`
    );
  } else {
    contextBase.addOutput(
      'warning',
      `⚠️ Batch execution finished with alerts: ${successCount}/${chains.length} commands succeeded (${executedCount} executed).`
    );
  }

  return lastSuccess;
}
