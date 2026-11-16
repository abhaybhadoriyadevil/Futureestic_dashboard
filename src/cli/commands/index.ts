import { commandRegistry } from '../engine/commandRegistry';
import { systemCommands } from './system.commands';
import { workspaceCommands } from './workspace.commands';
import { widgetCommands } from './widget.commands';
import { habitCommands } from './habit.commands';
import { calendarCommands } from './calendar.commands';
import { notesCommands } from './notes.commands';
import { kanbanCommands } from './kanban.commands';
import { chartCommands } from './chart.commands';
import { audioCommands } from './audio.commands';
import { imageCommands } from './image.commands';
import { videoCommands } from './video.commands';
import { tableCommands } from './table.commands';
import { fileCommands } from './file.commands';
import { mindmapCommands } from './mindmap.commands';
import { themeCommands } from './theme.commands';
import { canvasCommands } from './canvas.commands';
import { clipboardCommands } from './clipboard.commands';
import { historyCommands } from './history.commands';

export const allCommands = [
  ...systemCommands,
  ...workspaceCommands,
  ...widgetCommands,
  ...habitCommands,
  ...calendarCommands,
  ...notesCommands,
  ...kanbanCommands,
  ...chartCommands,
  ...audioCommands,
  ...imageCommands,
  ...videoCommands,
  ...tableCommands,
  ...fileCommands,
  ...mindmapCommands,
  ...themeCommands,
  ...canvasCommands,
  ...clipboardCommands,
  ...historyCommands,
];

// Initialize registry with all application commands
commandRegistry.registerAll(allCommands);

export {
  systemCommands,
  workspaceCommands,
  widgetCommands,
  habitCommands,
  calendarCommands,
  notesCommands,
  kanbanCommands,
  chartCommands,
  audioCommands,
  imageCommands,
  videoCommands,
  tableCommands,
  fileCommands,
  mindmapCommands,
  themeCommands,
  canvasCommands,
  clipboardCommands,
  historyCommands,
};
