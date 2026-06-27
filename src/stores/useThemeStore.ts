import { create } from 'zustand';

interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },
  setTheme: (theme) => {
    localStorage.setItem('personal-os-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  initTheme: () => {
    const savedTheme = localStorage.getItem('personal-os-theme') as 'dark' | 'light' | null;
    const theme = savedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  }
}));
