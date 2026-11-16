import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { executeCommandLine } from '../engine/commandExecutor';
import { TerminalInput } from './TerminalInput';
import { TerminalOutput } from './TerminalOutput';
import { CommandDictionary } from './CommandDictionary';
import type { CommandOutput } from '../engine/commandTypes';
// Import commands module to trigger self-registration
import '../commands';
import { 
  Terminal as TerminalIcon, 
  X, 
  BookOpen, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  ShieldCheck 
} from 'lucide-react';

export const Terminal: React.FC = () => {
  const { isCliOpen, setCliOpen, osName, userName } = useSettingsStore();

  const [inputVal, setInputVal] = useState('');
  const [showDictionary, setShowDictionary] = useState(true);
  const [isDictWide, setIsDictWide] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [outputs, setOutputs] = useState<CommandOutput[]>([
    {
      id: 'boot-init',
      type: 'info',
      text: `╔═══════════════════════════════════════════════════════════════════════════════╗
║                 PERSONAL OS // CLI MISSION CONTROL ROOM v2.4.0                ║
║                 AUTHENTICATED: ${userName.toUpperCase()} [ROOT_ACCESS]                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Welcome to the central Command Engine. All GUI operations have direct CLI parity.
• Type "help" or "dict" to browse all 20 command categories.
• Type "gpt" to copy the full AI specification for ChatGPT / Claude / Gemini.
• Chain commands with ";" or "&&", or paste multi-line scripts to run in batch!
• Press [Tab] to autocomplete commands and arguments.
• Use [↑] and [↓] arrow keys to navigate command history.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const terminalScrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isCliOpen) {
      terminalScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputs, isCliOpen]);

  if (!isCliOpen) return null;

  const addOutput = (type: CommandOutput['type'], text: string, data?: any) => {
    const newOut: CommandOutput = {
      id: `out-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      text,
      data,
      timestamp: new Date().toLocaleTimeString(),
    };
    setOutputs((prev) => [...prev, newOut]);
  };

  const clearTerminal = () => {
    setOutputs([]);
  };

  const handleExecute = async (commandToRun: string) => {
    const trimmed = commandToRun.trim();
    if (!trimmed) return;

    // Echo user input into output log
    addOutput(
      'input',
      `${userName.toLowerCase()}@${osName.toLowerCase().replace(/\s+/g, '-')}:~$ ${trimmed}`
    );

    setInputVal('');

    await executeCommandLine(trimmed, {
      addOutput,
      clearTerminal,
      setTerminalInput: (val: string) => setInputVal(val),
      toggleDictionary: () => setShowDictionary((prev) => !prev),
      closeTerminal: () => setCliOpen(false),
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setCliOpen(false)}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Terminal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full ${
            isMaximized ? 'h-full max-w-full rounded-none' : 'max-w-6xl h-[88vh] rounded-2xl'
          } bg-[#060810]/98 border border-cyan-accent/40 shadow-[0_0_60px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col z-10 font-mono`}
        >
          {/* Cyber HUD Corner Brackets */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-accent pointer-events-none z-20" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-accent pointer-events-none z-20" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-accent pointer-events-none z-20" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-accent pointer-events-none z-20" />

          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-black/75 border-b border-color-border-color shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-accent animate-pulse shadow-[0_0_8px_#06b6d4]" />
              <div className="flex items-center gap-1.5 text-xs text-primary-text font-bold uppercase tracking-wider">
                <TerminalIcon className="w-4 h-4 text-cyan-accent" />
                <span>{osName} // CLI COMMAND CONTROL ROOM</span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-cyan-accent/10 border border-cyan-accent/30 text-cyan-accent font-semibold">
                <ShieldCheck className="w-3 h-3" />
                <span>ROOT_LEVEL</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowDictionary(!showDictionary)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer ${
                  showDictionary
                    ? 'border-cyan-accent bg-cyan-accent/15 text-cyan-accent shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'border-color-border-color text-secondary-text hover:text-primary-text'
                }`}
                title="Toggle Master Command Dictionary"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dictionary</span>
              </button>

              <button
                onClick={clearTerminal}
                className="p-1.5 rounded-lg text-secondary-text hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Clear Output Buffer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text hover:bg-white/5 transition-colors cursor-pointer"
                title={isMaximized ? 'Restore Normal Window' : 'Maximize Terminal'}
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setCliOpen(false)}
                className="p-1.5 rounded-lg text-secondary-text hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                title="Close Control Room (Esc or Ctrl+`)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Body: Terminal Screen + Dynamic Dictionary */}
          <div className="flex-1 flex overflow-hidden">
            {/* 1. Terminal Console Canvas */}
            <div className="flex-1 flex flex-col bg-black/50 overflow-hidden">
              {/* Output Scroll Canvas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar text-xs">
                <TerminalOutput outputs={outputs} />
                <div ref={terminalScrollRef} />
              </div>

              {/* Bottom Input Command Line (supports single line, multi-line, batch scripts) */}
              <TerminalInput
                osName={osName}
                userName={userName}
                inputVal={inputVal}
                setInputVal={setInputVal}
                onSubmit={handleExecute}
              />
            </div>

            {/* 2. Interactive Command Dictionary Side Drawer */}
            {showDictionary && (
              <div
                className={`${
                  isDictWide ? 'w-full max-w-[620px]' : 'w-80 sm:w-96'
                } border-l border-color-border-color bg-secondary-bg/95 flex flex-col shrink-0 overflow-hidden transition-all duration-200`}
              >
                <CommandDictionary
                  onSelectCommand={(cmdStr) => setInputVal(cmdStr)}
                  onExecuteCommand={(cmdStr) => handleExecute(cmdStr)}
                  onClose={() => setShowDictionary(false)}
                  isWide={isDictWide}
                  onToggleWide={() => setIsDictWide(!isDictWide)}
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
