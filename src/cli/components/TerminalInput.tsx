import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAutocompleteSuggestions } from '../engine/commandAutocomplete';
import { commandHistory } from '../engine/commandHistory';
import { splitCommandChains } from '../engine/commandParser';
import { CommandSuggestions } from './CommandSuggestions';
import type { AutocompleteSuggestion } from '../engine/commandTypes';
import { CornerDownLeft, X, Layers, Zap } from 'lucide-react';

interface TerminalInputProps {
  osName: string;
  userName: string;
  inputVal: string;
  setInputVal: (val: string) => void;
  onSubmit: (command: string) => void;
}

export const TerminalInput: React.FC<TerminalInputProps> = ({
  osName,
  userName,
  inputVal,
  setInputVal,
  onSubmit,
}) => {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus input automatically
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 36), 140)}px`;
    }
  }, [inputVal]);

  // Count commands in current input (split by ;, &&, or newlines)
  const chainedCommands = useMemo(() => {
    if (!inputVal.trim()) return [];
    return splitCommandChains(inputVal);
  }, [inputVal]);

  const commandCount = chainedCommands.length;
  const isMultiCommand = commandCount > 1;

  // Update suggestions on input change (only for the last active token in single-line mode)
  useEffect(() => {
    const trimmed = inputVal.trim();
    if (trimmed && !trimmed.includes('\n') && !trimmed.includes(';') && !trimmed.includes('&&')) {
      const items = getAutocompleteSuggestions(trimmed);
      setSuggestions(items);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [inputVal]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Enter key (without Shift): Submit command(s)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        const chosen = suggestions[selectedSuggestionIndex].text;
        onSubmit(chosen);
      } else {
        onSubmit(inputVal);
      }
      setSuggestions([]);
      setHistoryIndex(-1);
      return;
    }

    // 2. Tab key: Autocomplete
    if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        const nextIdx = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
        setInputVal(suggestions[nextIdx].text + ' ');
        setSuggestions([]);
      }
      return;
    }

    // 3. Arrow Up: History (if single line or on first row)
    if (e.key === 'ArrowUp') {
      if (suggestions.length > 0 && selectedSuggestionIndex > 0) {
        e.preventDefault();
        setSelectedSuggestionIndex(selectedSuggestionIndex - 1);
        return;
      }

      // History navigation only when single line
      if (!inputVal.includes('\n')) {
        const hist = commandHistory.getHistory();
        if (hist.length > 0) {
          e.preventDefault();
          const nextIdx = historyIndex + 1 < hist.length ? historyIndex + 1 : historyIndex;
          setHistoryIndex(nextIdx);
          setInputVal(hist[hist.length - 1 - nextIdx] || '');
        }
      }
      return;
    }

    // 4. Arrow Down: History (if single line)
    if (e.key === 'ArrowDown') {
      if (suggestions.length > 0 && selectedSuggestionIndex + 1 < suggestions.length) {
        e.preventDefault();
        setSelectedSuggestionIndex(selectedSuggestionIndex + 1);
        return;
      }

      if (!inputVal.includes('\n')) {
        const hist = commandHistory.getHistory();
        if (historyIndex > 0) {
          e.preventDefault();
          const nextIdx = historyIndex - 1;
          setHistoryIndex(nextIdx);
          setInputVal(hist[hist.length - 1 - nextIdx] || '');
        } else if (historyIndex === 0) {
          e.preventDefault();
          setHistoryIndex(-1);
          setInputVal('');
        }
      }
      return;
    }

    // 5. Escape: Dismiss suggestions
    if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  const promptPrefix = `${userName.toLowerCase()}@${osName.toLowerCase().replace(/\s+/g, '-')}:~$`;

  return (
    <div className="relative p-3 bg-black/60 border-t border-color-border-color flex flex-col gap-2 shrink-0 font-mono text-xs">
      {/* Suggestions Dropdown */}
      <CommandSuggestions
        suggestions={suggestions}
        selectedIndex={selectedSuggestionIndex}
        onSelectSuggestion={(text) => {
          setInputVal(text + ' ');
          setSuggestions([]);
          textareaRef.current?.focus();
        }}
      />

      {/* Batch Mode Indicator Bar */}
      {isMultiCommand && (
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[10px] animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold">
            <Zap className="w-3 h-3 text-cyan-accent animate-pulse" />
            <span>BATCH MODE DETECTED</span>
            <span className="text-muted-text font-normal">|</span>
            <span className="text-white bg-cyan-500/20 px-1.5 py-0.2 rounded border border-cyan-500/40 font-mono">
              {commandCount} Commands Queued
            </span>
          </div>
          <span className="text-muted-text text-[9px] hidden sm:inline">
            Press [Enter] to run all • [Shift+Enter] for newline • Chains supported: (; or &&)
          </span>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-start gap-2.5">
        {/* Cyber Prompt String */}
        <div className="text-cyan-accent font-bold select-none shrink-0 flex items-center gap-1.5 pt-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-accent animate-pulse" />
          <span className="hidden sm:inline">{promptPrefix}</span>
          <span className="sm:hidden">&gt;</span>
        </div>

        {/* Textarea (supports single line, multi-line, pasting scripts) */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command, chain with ';' or '&&', or paste full multi-line script..."
          className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs placeholder:text-muted-text caret-cyan-accent resize-none leading-relaxed py-1.5 no-scrollbar max-h-36"
          autoComplete="off"
          spellCheck="false"
        />

        {inputVal && (
          <button
            onClick={() => setInputVal('')}
            className="text-muted-text hover:text-white p-1 pt-1.5 cursor-pointer"
            title="Clear input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Run Button */}
        <button
          onClick={() => {
            onSubmit(inputVal);
            setSuggestions([]);
            setHistoryIndex(-1);
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-all shrink-0 pt-2 pb-2 ${
            isMultiCommand
              ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:brightness-110'
              : 'bg-cyan-accent text-black hover:opacity-90 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
          }`}
          title={isMultiCommand ? `Execute ${commandCount} chained commands` : 'Execute command'}
        >
          {isMultiCommand ? <Layers className="w-3 h-3" /> : <CornerDownLeft className="w-3 h-3" />}
          <span>{isMultiCommand ? `Run All (${commandCount})` : 'Run'}</span>
        </button>
      </div>
    </div>
  );
};
