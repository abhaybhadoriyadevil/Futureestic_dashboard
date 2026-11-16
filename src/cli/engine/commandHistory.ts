const STORAGE_KEY = 'personal_os_cli_history';
const MAX_HISTORY = 100;

export class CommandHistoryManager {
  private history: string[] = [];

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.history = JSON.parse(stored);
        }
      }
    } catch {
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
      }
    } catch {
      // Ignore quota errors
    }
  }

  public add(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;

    // Avoid duplicate consecutive commands
    if (this.history.length > 0 && this.history[this.history.length - 1] === trimmed) {
      return;
    }

    this.history.push(trimmed);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    this.saveHistory();
  }

  public getHistory(): string[] {
    return [...this.history];
  }

  public clear(): void {
    this.history = [];
    this.saveHistory();
  }
}

export const commandHistory = new CommandHistoryManager();
