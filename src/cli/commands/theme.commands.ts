import type { CommandDefinition } from '../engine/commandTypes';
import { useThemeStore } from '../../stores/useThemeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

const COLOR_MAP: Record<string, string> = {
  cyan: '#06b6d4',
  purple: '#8b5cf6',
  emerald: '#10b981',
  green: '#10b981',
  blue: '#3b82f6',
  pink: '#ec4899',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  crimson: '#ef4444',
};

export const themeCommands: CommandDefinition[] = [
  {
    id: 'theme.mode',
    name: 'theme',
    category: 'Theme & Appearance',
    description: 'Switch between Dark (Sci-Fi Void) and Light (Clean Lab) interface themes.',
    syntax: 'theme <dark|light|toggle>',
    arguments: [
      {
        name: 'mode',
        description: 'Theme mode to apply',
        required: true,
        choices: ['dark', 'light', 'toggle'],
      },
    ],
    examples: ['theme toggle', 'theme dark', 'theme light'],
    relatedCommands: ['theme accent'],
    handler: (ctx) => {
      const mode = ctx.args[0]?.toLowerCase();
      const { setTheme, toggleTheme } = useThemeStore.getState();

      if (mode === 'toggle') {
        toggleTheme();
        const nextTheme = useThemeStore.getState().theme;
        ctx.addOutput('success', `Toggled theme mode to [${nextTheme.toUpperCase()}].`);
      } else if (mode === 'dark' || mode === 'light') {
        setTheme(mode);
        ctx.addOutput('success', `Switched theme mode to [${mode.toUpperCase()}].`);
      }
    },
  },
  {
    id: 'theme.accent',
    name: 'theme accent',
    category: 'Theme & Appearance',
    description: 'Change the global cyber neon accent color and glow highlights.',
    syntax: 'theme accent <color|hex>',
    arguments: [
      {
        name: 'color',
        description: 'Preset name (cyan, purple, emerald, blue, pink, amber, red) or custom #hex',
        required: true,
      },
    ],
    examples: ['theme accent purple', 'theme accent #00ffcc', 'theme accent emerald'],
    relatedCommands: ['theme'],
    handler: (ctx) => {
      const colorInput = ctx.args[0]?.trim();
      const mapped = COLOR_MAP[colorInput.toLowerCase()] || colorInput;

      if (!mapped.startsWith('#') && !COLOR_MAP[colorInput.toLowerCase()]) {
        ctx.addOutput(
          'error',
          `Invalid accent color "${colorInput}". Valid options: [cyan, purple, emerald, blue, pink, amber, red, or hex #xxxxxx]`
        );
        return;
      }

      useSettingsStore.getState().setAccentColor(mapped);
      ctx.addOutput('success', `Updated global cyber accent color to ${mapped}.`);
    },
  },
  {
    id: 'theme.os_rename',
    name: 'os rename',
    category: 'Theme & Appearance',
    description: 'Change the OS system branding title.',
    syntax: 'os rename <new_name>',
    arguments: [
      {
        name: 'new_name',
        description: 'New OS title string',
        required: true,
      },
    ],
    examples: ['os rename "CYBER OS 2077"', 'os rename "NEO MATRIX"'],
    handler: (ctx) => {
      const newName = ctx.args[0];
      useSettingsStore.getState().setOsName(newName);
      ctx.addOutput('success', `OS system branding updated to "${newName}".`);
    },
  },
  {
    id: 'theme.user_name',
    name: 'user name',
    category: 'Theme & Appearance',
    description: 'Update the user profile operator name.',
    syntax: 'user name <new_name>',
    arguments: [
      {
        name: 'new_name',
        description: 'New operator name',
        required: true,
      },
    ],
    examples: ['user name "Abhay"', 'user name "Neo"'],
    handler: (ctx) => {
      const newName = ctx.args[0];
      useSettingsStore.getState().setUserName(newName);
      ctx.addOutput('success', `Operator profile name updated to "${newName}".`);
    },
  },
  {
    id: 'theme.user_role',
    name: 'user role',
    category: 'Theme & Appearance',
    description: 'Update the operator clearance role title.',
    syntax: 'user role <new_role>',
    arguments: [
      {
        name: 'new_role',
        description: 'Role / title',
        required: true,
      },
    ],
    examples: ['user role "System Administrator"', 'user role "Security Lead"'],
    handler: (ctx) => {
      const newRole = ctx.args[0];
      useSettingsStore.getState().setUserRole(newRole);
      ctx.addOutput('success', `Operator role updated to "${newRole}".`);
    },
  },
];
