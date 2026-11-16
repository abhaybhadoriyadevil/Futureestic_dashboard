export type CommandCategory =
  | 'System'
  | 'Workspace'
  | 'Widgets'
  | 'Habits'
  | 'Calendar'
  | 'Notes'
  | 'Kanban'
  | 'Charts'
  | 'Audio'
  | 'Images'
  | 'Videos'
  | 'Tables'
  | 'Files'
  | 'Mind Map'
  | 'Theme & Appearance'
  | 'Canvas'
  | 'Settings'
  | 'Clipboard'
  | 'History & Undo/Redo'
  | 'System Diagnostics';

export interface CommandArgument {
  name: string;
  description: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean' | 'enum';
  choices?: string[];
  defaultValue?: any;
}

export interface CommandOutput {
  id: string;
  type: 'input' | 'success' | 'error' | 'info' | 'warning' | 'table';
  text: string;
  data?: any;
  timestamp: string;
}

export interface CommandContext {
  rawInput: string;
  command: string;
  subcommand?: string;
  args: string[];
  namedArgs?: Record<string, string>;
  addOutput: (type: CommandOutput['type'], text: string, data?: any) => void;
  clearTerminal: () => void;
  setTerminalInput: (val: string) => void;
  toggleDictionary?: () => void;
  closeTerminal?: () => void;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void | string> | void | string;

export interface CommandDefinition {
  id: string; // Unique identifier, e.g. 'workspace.create'
  name: string; // Canonical name, e.g. 'ws create'
  aliases?: string[]; // e.g. ['workspace create']
  category: CommandCategory;
  description: string;
  syntax: string; // e.g. 'ws create <name> [canvas|snap]'
  arguments?: CommandArgument[];
  examples: string[];
  relatedCommands?: string[];
  handler: CommandHandler;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AutocompleteSuggestion {
  text: string;
  displayText?: string;
  description: string;
  syntax?: string;
  category?: CommandCategory;
}
