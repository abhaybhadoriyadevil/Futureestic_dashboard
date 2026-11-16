import React, { useState, useMemo } from 'react';
import { commandRegistry } from '../engine/commandRegistry';
import { copyMasterPromptToClipboard } from '../engine/commandDocumentation';
import { 
  BookOpen, 
  Search, 
  Play, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  CornerDownLeft, 
  X,
  Sparkles,
  FileText,
  Layers,
  Bot
} from 'lucide-react';

interface CommandDictionaryProps {
  onSelectCommand: (commandString: string) => void;
  onExecuteCommand: (commandString: string) => void;
  onClose?: () => void;
  isWide?: boolean;
  onToggleWide?: () => void;
}

export const CommandDictionary: React.FC<CommandDictionaryProps> = ({
  onSelectCommand,
  onExecuteCommand,
  onClose,
  isWide,
  onToggleWide,
}) => {
  const [viewMode, setViewMode] = useState<'browse' | 'onepage'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedCmdId, setExpandedCmdId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [gptCopied, setGptCopied] = useState(false);

  // Dynamic reflection of registry
  const allCommands = useMemo(() => commandRegistry.getAll(), []);
  const allCategories = useMemo(() => ['All', ...commandRegistry.getCategories()], []);

  const filteredCommands = useMemo(() => {
    return commandRegistry.search(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Grouped commands for One-Page Master view
  const groupedByCategory = useMemo(() => {
    const categories = commandRegistry.getCategories();
    const map: Record<string, typeof allCommands> = {};
    for (const cat of categories) {
      map[cat] = allCommands.filter((c) => c.category === cat);
    }
    return map;
  }, [allCommands]);

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleCopyAllForGpt = async () => {
    const success = await copyMasterPromptToClipboard();
    if (success) {
      setGptCopied(true);
      setTimeout(() => setGptCopied(false), 3000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070913]/98 text-primary-text font-mono text-xs border-l border-color-border-color overflow-hidden">
      {/* Header Bar */}
      <div className="p-3 border-b border-color-border-color bg-black/60 flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-accent/15 border border-cyan-accent/40 flex items-center justify-center text-cyan-accent shadow-[0_0_8px_rgba(6,182,212,0.3)]">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-xs text-primary-text block">
                Command Dictionary
              </span>
              <span className="text-[9px] text-muted-text">
                {allCommands.length} commands across 20 modules
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleWide && (
              <button
                onClick={onToggleWide}
                className="px-2 py-0.5 rounded border border-color-border-color hover:border-cyan-accent text-secondary-text hover:text-cyan-accent text-[10px] cursor-pointer"
                title={isWide ? 'Compact view' : 'Wide view'}
              >
                {isWide ? 'Narrow' : 'Expand'}
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded text-muted-text hover:text-primary-text cursor-pointer"
                title="Close Dictionary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Global Action: Copy All For GPT Button */}
        <button
          onClick={handleCopyAllForGpt}
          className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold transition-all cursor-pointer shadow-sm ${
            gptCopied
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-gradient-to-r from-cyan-950/50 via-purple-950/40 to-blue-950/50 border-cyan-accent/50 text-cyan-200 hover:border-cyan-accent hover:brightness-110 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
          }`}
          title="Copies full command documentation formatted specifically for ChatGPT, Claude, or Gemini"
        >
          <div className="flex items-center gap-2">
            {gptCopied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-accent animate-pulse" />
            )}
            <span className="truncate">
              {gptCopied ? 'Copied Master Spec for GPT!' : 'Copy All Commands for GPT / AI'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
            <Bot className="w-3 h-3 text-cyan-accent" />
            <span>AI Ready</span>
          </div>
        </button>

        {/* Mode Selector Tabs */}
        <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-color-border-color">
          <button
            onClick={() => setViewMode('browse')}
            className={`flex-1 py-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'browse'
                ? 'bg-cyan-accent/20 border border-cyan-accent/40 text-cyan-accent'
                : 'text-muted-text hover:text-primary-text'
            }`}
          >
            <Search className="w-3 h-3" />
            <span>Search & Browse</span>
          </button>

          <button
            onClick={() => setViewMode('onepage')}
            className={`flex-1 py-1 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'onepage'
                ? 'bg-purple-accent/20 border border-purple-accent/40 text-purple-300'
                : 'text-muted-text hover:text-primary-text'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>One-Page Master Sheet</span>
          </button>
        </div>

        {/* Search Bar (in Browse Mode) */}
        {viewMode === 'browse' && (
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-text" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands, syntax, tags..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-primary-bg/70 border border-color-border-color text-xs text-primary-text placeholder:text-muted-text focus:outline-none focus:border-cyan-accent font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-muted-text hover:text-primary-text cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills Bar */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-[10px]">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap border transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-accent text-black font-bold border-cyan-accent shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-primary-bg/40 border-color-border-color text-secondary-text hover:text-primary-text'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'browse' ? (
        /* 1. BROWSE & SEARCH ACCORDION VIEW */
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
          {filteredCommands.map((cmd) => {
            const isExpanded = expandedCmdId === cmd.id;
            const requiredArgs = cmd.arguments?.filter((a) => a.required) || [];
            const optionalArgs = cmd.arguments?.filter((a) => !a.required) || [];

            return (
              <div
                key={cmd.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isExpanded
                    ? 'border-cyan-accent/50 bg-black/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'border-color-border-color bg-primary-bg/40 hover:border-white/20'
                }`}
              >
                {/* Command Title Row */}
                <div
                  onClick={() => setExpandedCmdId(isExpanded ? null : cmd.id)}
                  className="p-2.5 flex items-start justify-between gap-2 cursor-pointer select-none group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-xs text-cyan-300 group-hover:text-cyan-accent transition-colors">
                        {cmd.syntax}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
                        {cmd.category}
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-secondary-text line-clamp-2">
                      {cmd.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExecuteCommand(cmd.examples[0] || cmd.name);
                      }}
                      className="p-1 rounded bg-cyan-accent/15 border border-cyan-accent/40 text-cyan-300 hover:bg-cyan-accent hover:text-black transition-all cursor-pointer"
                      title="Execute first example immediately"
                    >
                      <Play className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCommand(cmd.examples[0] || cmd.name);
                      }}
                      className="p-1 rounded border border-color-border-color hover:border-cyan-accent text-secondary-text hover:text-cyan-accent transition-all cursor-pointer"
                      title="Populate terminal prompt"
                    >
                      <CornerDownLeft className="w-3 h-3" />
                    </button>

                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-cyan-accent" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-text group-hover:text-white" />
                    )}
                  </div>
                </div>

                {/* Expanded Documentation Panel */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-3 bg-black/40 text-[11px]">
                    {/* Aliases */}
                    {cmd.aliases && cmd.aliases.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider">
                          Aliases:
                        </span>
                        {cmd.aliases.map((alias) => (
                          <span
                            key={alias}
                            onClick={() => onSelectCommand(alias)}
                            className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-200/90 font-mono text-[10px] cursor-pointer hover:border-cyan-accent"
                            title="Click to populate prompt"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Arguments Breakdown */}
                    {cmd.arguments && cmd.arguments.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider block">
                          Parameters:
                        </span>

                        {/* Required */}
                        {requiredArgs.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] text-red-400 font-semibold uppercase tracking-wider">
                              Required:
                            </span>
                            {requiredArgs.map((arg) => (
                              <div key={arg.name} className="pl-2 border-l border-red-500/30">
                                <span className="font-bold text-red-300 font-mono">&lt;{arg.name}&gt;</span>
                                {arg.choices && (
                                  <span className="ml-1 text-[9px] text-muted-text">
                                    [{arg.choices.join(' | ')}]
                                  </span>
                                )}
                                <p className="text-[10px] font-sans text-slate-400">{arg.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Optional */}
                        {optionalArgs.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[9px] text-cyan-400 font-semibold uppercase tracking-wider">
                              Optional:
                            </span>
                            {optionalArgs.map((arg) => (
                              <div key={arg.name} className="pl-2 border-l border-cyan-500/30">
                                <span className="font-bold text-cyan-300 font-mono">[{arg.name}]</span>
                                {arg.choices && (
                                  <span className="ml-1 text-[9px] text-muted-text">
                                    [{arg.choices.join(' | ')}]
                                  </span>
                                )}
                                <p className="text-[10px] font-sans text-slate-400">{arg.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Examples */}
                    {cmd.examples && cmd.examples.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider block">
                          Examples (Click to run):
                        </span>
                        {cmd.examples.map((ex, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-1.5 rounded bg-primary-bg border border-color-border-color font-mono text-[10px] text-slate-300 hover:border-cyan-accent group/ex"
                          >
                            <span className="truncate">{ex}</span>
                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover/ex:opacity-100">
                              <button
                                onClick={() => handleCopy(`${cmd.id}-${idx}`, ex)}
                                className="p-1 hover:text-cyan-accent cursor-pointer"
                                title="Copy syntax"
                              >
                                {copiedId === `${cmd.id}-${idx}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => onExecuteCommand(ex)}
                                className="px-2 py-0.5 rounded bg-cyan-accent/20 border border-cyan-accent/40 text-cyan-300 hover:bg-cyan-accent hover:text-black cursor-pointer text-[9px]"
                              >
                                Run
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Related Commands */}
                    {cmd.relatedCommands && cmd.relatedCommands.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider">
                          Related:
                        </span>
                        {cmd.relatedCommands.map((rel) => (
                          <button
                            key={rel}
                            onClick={() => {
                              setSearchQuery(rel);
                              setSelectedCategory('All');
                            }}
                            className="text-[10px] font-mono text-cyan-accent/80 hover:text-cyan-accent underline underline-offset-2 cursor-pointer"
                          >
                            {rel}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredCommands.length === 0 && (
            <div className="p-8 text-center text-muted-text italic">
              No commands found matching "{searchQuery}".
            </div>
          )}
        </div>
      ) : (
        /* 2. ONE-PAGE MASTER SHEET & AI GENERATOR VIEW */
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar text-xs leading-relaxed">
          {/* GPT Instructions Guide Card */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200/90 space-y-2">
            <div className="flex items-center gap-2 font-bold text-cyan-300">
              <Bot className="w-4 h-4 text-cyan-accent" />
              <span>How to use with ChatGPT / Claude / Gemini:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 pl-1 font-sans">
              <li>
                Click <strong className="text-cyan-300">"Copy All Commands for GPT / AI"</strong> at the top.
              </li>
              <li>
                Paste into your AI chat prompt, e.g.:
                <br />
                <em className="text-amber-300">"Here is the Personal OS CLI spec. Write me a batch CLI code to setup a full developer workspace with Kanban, Habit tracker, and Dark Cyan theme."</em>
              </li>
              <li>
                Copy the batch command lines generated by GPT, paste them into this terminal, and press <strong className="text-cyan-300">Enter</strong>!
              </li>
            </ol>
          </div>

          {/* Quick Workflow Templates */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-purple-300">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Sample Pre-Built Batch Scripts (Click to Run):</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Template 1: Dev Workspace */}
              <div className="p-2.5 rounded-xl bg-black/60 border border-color-border-color space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-[11px]">Developer Workspace Setup</span>
                  <button
                    onClick={() =>
                      onExecuteCommand(
                        'ws create "Developer Lab" canvas; ws switch "Developer Lab"; widget add kanban "Active Sprint"; kanban add todo "Build CLI Control Room"; widget add habits "Coding Habits"; habit add "LeetCode" everyday; theme accent #06b6d4'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-cyan-accent/20 border border-cyan-accent/40 text-cyan-300 hover:bg-cyan-accent hover:text-black text-[10px] cursor-pointer"
                  >
                    Run Script
                  </button>
                </div>
                <div className="p-2 rounded bg-black/80 font-mono text-[10px] text-slate-400 whitespace-pre overflow-x-auto no-scrollbar">
                  ws create "Developer Lab" canvas; ws switch "Developer Lab"
                  <br />
                  widget add kanban "Active Sprint"
                  <br />
                  kanban add todo "Build CLI Control Room"
                  <br />
                  widget add habits "Coding Habits"
                  <br />
                  habit add "LeetCode" everyday
                  <br />
                  theme accent #06b6d4
                </div>
              </div>

              {/* Template 2: Fitness & Health */}
              <div className="p-2.5 rounded-xl bg-black/60 border border-color-border-color space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 text-[11px]">Fitness & Daily Routines</span>
                  <button
                    onClick={() =>
                      onExecuteCommand(
                        'ws create "Fitness Hub" canvas; ws switch "Fitness Hub"; widget add habits "Daily Fitness"; habit add "Morning Run 5KM" everyday; habit add "Drink 3L Water" everyday; theme accent #10b981'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black text-[10px] cursor-pointer"
                  >
                    Run Script
                  </button>
                </div>
                <div className="p-2 rounded bg-black/80 font-mono text-[10px] text-slate-400 whitespace-pre overflow-x-auto no-scrollbar">
                  ws create "Fitness Hub" canvas; ws switch "Fitness Hub"
                  <br />
                  widget add habits "Daily Fitness"
                  <br />
                  habit add "Morning Run 5KM" everyday
                  <br />
                  habit add "Drink 3L Water" everyday
                  <br />
                  theme accent #10b981
                </div>
              </div>
            </div>
          </div>

          {/* Full Category-by-Category Listing on One Page */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-primary-text">
                All 20 Modules & Commands
              </span>
              <span className="text-[10px] text-muted-text">One-Page Master Cheatsheet</span>
            </div>

            {Object.entries(groupedByCategory).map(([category, cmds]) => {
              if (cmds.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      {category} ({cmds.length})
                    </span>

                    <button
                      onClick={() => {
                        const snippet = cmds
                          .map((c) => `# ${c.description}\n${c.examples[0] || c.syntax}`)
                          .join('\n\n');
                        handleCopy(`cat-${category}`, snippet);
                      }}
                      className="flex items-center gap-1 text-[10px] text-muted-text hover:text-cyan-accent cursor-pointer"
                      title="Copy all commands for this category"
                    >
                      {copiedId === `cat-${category}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy Category</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-color-border-color bg-black/40 overflow-hidden divide-y divide-white/5">
                    {cmds.map((cmd) => (
                      <div
                        key={cmd.id}
                        className="p-2.5 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs font-bold text-cyan-300 group-hover:text-cyan-accent">
                              {cmd.syntax}
                            </code>
                          </div>
                          <p className="text-[11px] font-sans text-secondary-text">
                            {cmd.description}
                          </p>
                          {cmd.examples && cmd.examples[0] && (
                            <div className="text-[10px] text-muted-text font-mono truncate">
                              e.g.: <span className="text-slate-300">{cmd.examples[0]}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-1">
                          <button
                            onClick={() => handleCopy(cmd.id, cmd.examples[0] || cmd.syntax)}
                            className="p-1 text-muted-text hover:text-cyan-accent cursor-pointer"
                            title="Copy command syntax"
                          >
                            {copiedId === cmd.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => onExecuteCommand(cmd.examples[0] || cmd.syntax)}
                            className="px-2 py-0.5 rounded bg-cyan-accent/20 border border-cyan-accent/30 text-cyan-300 hover:bg-cyan-accent hover:text-black text-[9px] cursor-pointer"
                            title="Run command immediately"
                          >
                            Run
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
