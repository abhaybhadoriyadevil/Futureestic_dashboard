import type { CommandDefinition, ValidationResult } from './commandTypes';

/**
 * Validates command arguments against definition schema
 */
export function validateArguments(
  cmd: CommandDefinition,
  args: string[]
): ValidationResult {
  if (!cmd.arguments || cmd.arguments.length === 0) {
    return { isValid: true };
  }

  for (let i = 0; i < cmd.arguments.length; i++) {
    const argDef = cmd.arguments[i];
    const userVal = args[i];

    // Check required arguments
    if (argDef.required && (userVal === undefined || userVal.trim() === '')) {
      return {
        isValid: false,
        error: `Missing required argument <${argDef.name}>. Syntax: ${cmd.syntax}`,
      };
    }

    if (userVal !== undefined) {
      // Validate choices / enum
      if (argDef.choices && argDef.choices.length > 0) {
        const lowerChoices = argDef.choices.map((c) => c.toLowerCase());
        if (!lowerChoices.includes(userVal.toLowerCase())) {
          return {
            isValid: false,
            error: `Invalid value "${userVal}" for <${argDef.name}>. Allowed choices: [${argDef.choices.join(', ')}]`,
          };
        }
      }

      // Validate number type
      if (argDef.type === 'number') {
        const num = Number(userVal);
        if (isNaN(num)) {
          return {
            isValid: false,
            error: `Argument <${argDef.name}> must be a valid number, received "${userVal}".`,
          };
        }
      }
    }
  }

  return { isValid: true };
}
