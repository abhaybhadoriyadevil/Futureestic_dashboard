export interface Dashboard {
  id: string;
  name: string;
  icon: string;
  description: string;
  layoutType: 'free' | 'snap' | 'canvas';
  themeId: string;
  createdAt: number;
  updatedAt: number;
}

export type WidgetModuleType = 'files' | 'images' | 'videos' | 'notes' | 'tables' | 'calendar' | 'charts' | 'statistics' | 'kanban' | 'mindmap' | 'habits';

export interface Widget {
  id: string;
  dashboardId: string;
  moduleType: WidgetModuleType;
  title: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  rotation: number;
  zIndex: number;
  opacity: number;
  styles: {
    borderRadius?: string;
    backgroundType?: 'solid' | 'gradient' | 'image' | 'glass';
    backgroundValue?: string;
    borderWidth?: string;
    borderColor?: string;
    boxShadow?: string;
    blurEffect?: string;
    textColor?: string;
    padding?: string;
  };
  animation: {
    entrance?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale' | 'zoom' | 'rotate';
    hover?: 'glow' | 'scale' | 'ripple' | 'floating' | 'pulse' | 'none';
    exit?: 'fade-out' | 'slide-out' | 'shrink' | 'collapse';
    trigger?: 'load' | 'hover' | 'click' | 'update';
  };
  dataRef?: string; // Links to data ID or stores inline config (like custom statistics or Kanban lanes)
  locked: boolean;
  visible: boolean;
  minimized?: boolean; // Whether the widget is collapsed to a pill
  preMinimizeSize?: { w: number; h: number }; // Saved size before minimizing, for restore
  createdAt: number;
}

export interface FileData {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  thumbnail?: string; // Base64 thumbnail for preview
  tags: string[];
  category: string;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string; // Markdown content
  tags: string[];
  folderId?: string; // Folder classification
  createdAt: number;
  updatedAt: number;
}

export interface TableData {
  id: string;
  name: string;
  columns: { key: string; name: string; type: 'text' | 'number' | 'date' | 'boolean' | 'select'; options?: string[] }[];
  rows: Record<string, any>[];
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: number; // Timestamp
  endDate: number; // Timestamp
  category: string;
  color: string; // Hex color code
  createdAt: number;
}
