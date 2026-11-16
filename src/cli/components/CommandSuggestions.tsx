import React from 'react';
import type { AutocompleteSuggestion } from '../engine/commandTypes';
import { Terminal, ChevronRight } from 'lucide-react';

interface CommandSuggestionsProps {
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  onSelectSuggestion: (text: string) => void;
}

export const CommandSuggestions: React.FC<CommandSuggestionsProps> = ({
  suggestions,
  selectedIndex,
  onSelectSuggestion,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-full max-w-lg bg-[#070a14]/95 border border-cyan-accent/40 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.25)] overflow-hidden z-30 font-mono text-xs backdrop-blur-md">
      <div className="px-3 py-1 bg-black/60 border-b border-color-border-color flex items-center justify-between text-[10px] text-muted-text">
        <span className="flex items-center gap-1.5 uppercase font-bold text-cyan-accent">
          <Terminal className="w-3 h-3" />
          <span>Suggestions (Tab to autocomplete)</span>
        </span>
        <span>{suggestions.length} matches</span>
      </div>

      <div className="max-h-48 overflow-y-auto no-scrollbar p-1 space-y-0.5">
        {suggestions.map((item, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <div
              key={idx}
              onClick={() => onSelectSuggestion(item.text)}
              className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-cyan-accent/20 border border-cyan-accent/40 text-cyan-200'
                  : 'hover:bg-white/5 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <ChevronRight className={`w-3 h-3 ${isSelected ? 'text-cyan-accent' : 'text-muted-text'}`} />
                <span className="font-bold text-white truncate">
                  {item.displayText || item.text}
                </span>
              </div>

              <span className="text-[10px] text-muted-text truncate font-sans shrink-0 max-w-[200px]">
                {item.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
