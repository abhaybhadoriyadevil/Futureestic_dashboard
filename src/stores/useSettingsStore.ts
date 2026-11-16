import { create } from 'zustand';

export interface UserSettings {
  osName: string;
  userName: string;
  userRole: string;
  userAvatar: string;
  accentColor: string;
}

interface SettingsState extends UserSettings {
  isSettingsOpen: boolean;
  isCliOpen: boolean;
  setOsName: (osName: string) => void;
  setUserName: (userName: string) => void;
  setUserRole: (userRole: string) => void;
  setUserAvatar: (userAvatar: string) => void;
  setAccentColor: (accentColor: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setCliOpen: (open: boolean) => void;
  initSettings: () => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  osName: 'PERSONAL OS',
  userName: 'Abhay',
  userRole: 'System Architect',
  userAvatar: '',
  accentColor: '#06b6d4',
};

const STORAGE_KEY = 'future_os_user_settings';

export const applyAccentColor = (color: string) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--cyan-accent', color);
  root.style.setProperty('--color-cyan-accent', color);
  root.style.setProperty('--glow-color', `${color}33`);
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isSettingsOpen: false,
  isCliOpen: false,

  setOsName: (osName: string) => {
    const trimmed = osName.trim() || DEFAULT_SETTINGS.osName;
    set({ osName: trimmed });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), osName: trimmed }));
    if (typeof document !== 'undefined') {
      document.title = trimmed;
    }
  },

  setUserName: (userName: string) => {
    const trimmed = userName.trim() || DEFAULT_SETTINGS.userName;
    set({ userName: trimmed });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), userName: trimmed }));
  },

  setUserRole: (userRole: string) => {
    const trimmed = userRole.trim() || DEFAULT_SETTINGS.userRole;
    set({ userRole: trimmed });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), userRole: trimmed }));
  },

  setUserAvatar: (userAvatar: string) => {
    set({ userAvatar });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), userAvatar }));
  },

  setAccentColor: (accentColor: string) => {
    set({ accentColor });
    applyAccentColor(accentColor);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), accentColor }));
  },

  setSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),
  setCliOpen: (open: boolean) => set({ isCliOpen: open }),

  initSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged: UserSettings = {
          osName: parsed.osName || DEFAULT_SETTINGS.osName,
          userName: parsed.userName || DEFAULT_SETTINGS.userName,
          userRole: parsed.userRole || DEFAULT_SETTINGS.userRole,
          userAvatar: parsed.userAvatar || DEFAULT_SETTINGS.userAvatar,
          accentColor: parsed.accentColor || DEFAULT_SETTINGS.accentColor,
        };
        set({ ...merged });
        applyAccentColor(merged.accentColor);
        if (typeof document !== 'undefined') {
          document.title = merged.osName;
        }
        return;
      }
    } catch (e) {
      console.error('Failed to load user settings:', e);
    }
    applyAccentColor(DEFAULT_SETTINGS.accentColor);
    if (typeof document !== 'undefined') {
      document.title = DEFAULT_SETTINGS.osName;
    }
  },

  resetSettings: () => {
    set({ ...DEFAULT_SETTINGS });
    applyAccentColor(DEFAULT_SETTINGS.accentColor);
    localStorage.removeItem(STORAGE_KEY);
    if (typeof document !== 'undefined') {
      document.title = DEFAULT_SETTINGS.osName;
    }
  },
}));
