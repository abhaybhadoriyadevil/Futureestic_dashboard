/**
 * Robust command line tokenizer that handles:
 * - Single quotes: 'hello world'
 * - Double quotes: "hello world"
 * - Escaped characters: \" or \'
 * - Normal whitespace separation
 */
export function parseCommandLine(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const tokens: string[] = [];
  let currentToken = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let isEscaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (isEscaped) {
      currentToken += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (/\s/.test(char) && !inDoubleQuote && !inSingleQuote) {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = '';
      }
      continue;
    }

    currentToken += char;
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return tokens;
}

export interface ChainedCommand {
  rawCommand: string;
  condition: 'always' | 'on_success' | 'on_failure';
}

/**
 * Splits raw CLI input into sequential chained commands by:
 * - Semicolon: ';' (always run next)
 * - Logical AND: '&&' (run next only if previous succeeded)
 * - Logical OR: '||' (run next only if previous failed)
 * - Newlines: '\n' (always run next)
 * 
 * Accurately ignores delimiters inside quotes ("..." or '...').
 */
export function splitCommandChains(input: string): ChainedCommand[] {
  const result: ChainedCommand[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;
  let isEscaped = false;
  let nextCondition: 'always' | 'on_success' | 'on_failure' = 'always';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (isEscaped) {
      current += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      current += char;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      current += char;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      current += char;
      continue;
    }

    // Check operators when outside quotes
    if (!inDouble && !inSingle) {
      // 1. && operator
      if (char === '&' && nextChar === '&') {
        const trimmed = current.trim();
        if (trimmed) {
          result.push({ rawCommand: trimmed, condition: nextCondition });
        }
        current = '';
        nextCondition = 'on_success';
        i++; // skip second &
        continue;
      }

      // 2. || operator
      if (char === '|' && nextChar === '|') {
        const trimmed = current.trim();
        if (trimmed) {
          result.push({ rawCommand: trimmed, condition: nextCondition });
        }
        current = '';
        nextCondition = 'on_failure';
        i++; // skip second |
        continue;
      }

      // 3. Semicolon or newline
      if (char === ';' || char === '\n' || char === '\r') {
        const trimmed = current.trim();
        if (trimmed) {
          result.push({ rawCommand: trimmed, condition: nextCondition });
        }
        current = '';
        nextCondition = 'always';
        continue;
      }
    }

    current += char;
  }

  const lastTrimmed = current.trim();
  if (lastTrimmed) {
    result.push({ rawCommand: lastTrimmed, condition: nextCondition });
  }

  return result;
}
