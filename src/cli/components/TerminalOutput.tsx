import React from 'react';
import type { CommandOutput } from '../engine/commandTypes';
import { 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert 
} from 'lucide-react';

interface TerminalOutputProps {
  outputs: CommandOutput[];
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ outputs }) => {
  return (
    <div className="space-y-3 font-mono text-xs">
      {outputs.map((out) => {
        if (out.type === 'input') {
          return (
            <div key={out.id} className="flex items-center gap-2 text-cyan-300 font-bold group">
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-cyan-accent animate-pulse" />
              <span className="break-all">{out.text}</span>
              <span className="ml-auto text-[9px] text-muted-text font-normal shrink-0">
                {out.timestamp}
              </span>
            </div>
          );
        }

        if (out.type === 'success') {
          return (
            <div
              key={out.id}
              className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 whitespace-pre-wrap flex items-start gap-2.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{out.text}</div>
            </div>
          );
        }

        if (out.type === 'error') {
          return (
            <div
              key={out.id}
              className="p-3 rounded-xl bg-red-950/20 border border-red-500/40 text-red-300 whitespace-pre-wrap flex items-start gap-2.5 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            >
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{out.text}</div>
            </div>
          );
        }

        if (out.type === 'warning') {
          return (
            <div
              key={out.id}
              className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 whitespace-pre-wrap flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{out.text}</div>
            </div>
          );
        }

        // Info / Default
        return (
          <div
            key={out.id}
            className="p-3 rounded-xl bg-primary-bg/50 border border-color-border-color text-slate-300 whitespace-pre-wrap leading-relaxed shadow-sm"
          >
            {out.text}
          </div>
        );
      })}
    </div>
  );
};
