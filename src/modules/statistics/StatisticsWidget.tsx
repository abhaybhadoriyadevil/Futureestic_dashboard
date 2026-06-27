import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import { Settings, FileText, FolderOpen, Calendar, Flame, Plus, Minus, Check } from 'lucide-react';

interface StatisticsWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

export const StatisticsWidget: React.FC<StatisticsWidgetProps> = ({ widgetId, showControls = false }) => {
  // Query actual system database metrics
  const notesCount = useLiveQuery(() => db.notes.count()) ?? 0;
  const filesCount = useLiveQuery(() => db.files.count()) ?? 0;
  const eventsCount = useLiveQuery(() => db.events.count()) ?? 0;
  const habitWidgets = useLiveQuery(() => db.widgets.where('moduleType').equals('habits').toArray()) || [];

  // Custom KPI configurations
  const [metricType, setMetricType] = useState<'system' | 'custom' | 'habits'>('system');
  const [customTitle, setCustomTitle] = useState('Workspace Goal');
  const [customValue, setCustomValue] = useState(12);
  const [customMax, setCustomMax] = useState(20);
  const [showConfig, setShowConfig] = useState(false);

  // Load custom widget config from localStorage if exists
  useEffect(() => {
    const saved = localStorage.getItem(`widget-stats-${widgetId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMetricType(parsed.metricType || 'system');
        setCustomTitle(parsed.customTitle || 'Workspace Goal');
        setCustomValue(parsed.customValue ?? 12);
        setCustomMax(parsed.customMax ?? 20);
      } catch (e) {
        console.error('Failed to parse stats widget saved state', e);
      }
    }
  }, [widgetId]);

  useEffect(() => {
    if (!showControls) {
      setShowConfig(false);
    }
  }, [showControls]);

  const saveSettings = () => {
    localStorage.setItem(
      `widget-stats-${widgetId}`,
      JSON.stringify({ metricType, customTitle, customValue, customMax })
    );
    setShowConfig(false);
  };

  const percentage = Math.min(100, Math.round((customValue / (customMax || 1)) * 100)) || 0;

  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* Top Header Controls */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] uppercase font-bold text-muted-text tracking-widest">
          {metricType === 'system' ? 'System Diagnostics' : metricType === 'habits' ? 'Habits Overview' : 'Goal Tracker'}
        </span>
        {showControls && (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1 rounded hover:bg-glass-bg border cursor-pointer transition-colors ${
              showConfig ? 'border-cyan-accent text-cyan-accent bg-cyan-accent/5' : 'border-color-border-color text-muted-text hover:text-primary-text'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main widget view */}
      <div className="flex-1 flex items-center justify-center relative">
        {showConfig ? (
          // Settings configuration panel
          <div className="absolute inset-0 bg-primary-bg/95 border border-color-border-color rounded-xl p-3 flex flex-col gap-2 overflow-y-auto no-scrollbar z-10 text-[11px]">
            <span className="font-bold text-[10px] text-muted-text uppercase tracking-widest border-b border-color-border-color pb-1 mb-1">
              Configure KPI Card
            </span>
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-muted-text font-semibold uppercase">Metric Engine Source</label>
              <select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value as any)}
                className="px-2 py-1 rounded bg-secondary-bg border border-color-border-color text-xs focus:outline-none"
              >
                <option value="system">System Database Counts</option>
                <option value="custom">Custom Manual Counter</option>
                <option value="habits">Habit Tracking Stats</option>
              </select>
            </div>

            {metricType === 'custom' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-muted-text font-semibold uppercase">Goal Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="px-2 py-1 rounded bg-glass-bg border border-color-border-color text-xs focus:outline-none text-primary-text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-muted-text font-semibold uppercase">Current Value</label>
                    <input
                      type="number"
                      value={customValue}
                      onChange={(e) => setCustomValue(parseInt(e.target.value) || 0)}
                      className="px-2 py-1 rounded bg-glass-bg border border-color-border-color text-xs focus:outline-none text-primary-text"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-muted-text font-semibold uppercase">Goal Max Target</label>
                    <input
                      type="number"
                      value={customMax}
                      onChange={(e) => setCustomMax(parseInt(e.target.value) || 1)}
                      className="px-2 py-1 rounded bg-glass-bg border border-color-border-color text-xs focus:outline-none text-primary-text"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              onClick={saveSettings}
              className="mt-2 w-full py-1 rounded bg-cyan-accent text-black font-semibold cursor-pointer text-xs"
            >
              Verify Config
            </button>
          </div>
        ) : null}

        {metricType === 'system' ? (
          // System Stats renderer (Grid cards)
          <div className="grid grid-cols-3 gap-2 w-full">
            
            {/* Notes Count */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-color-border-color bg-glass-bg/30 hover:border-cyan-accent transition-colors">
              <FileText className="w-5 h-5 text-cyan-accent mb-1.5" />
              <span className="text-lg font-bold text-primary-text animate-[countUp_1.5s_ease-out]">{notesCount}</span>
              <span className="text-[9px] text-muted-text uppercase tracking-widest mt-0.5">Notes</span>
            </div>

            {/* Files Count */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-color-border-color bg-glass-bg/30 hover:border-blue-accent transition-colors">
              <FolderOpen className="w-5 h-5 text-blue-accent mb-1.5" />
              <span className="text-lg font-bold text-primary-text">{filesCount}</span>
              <span className="text-[9px] text-muted-text uppercase tracking-widest mt-0.5">Files</span>
            </div>

            {/* Events Count */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-color-border-color bg-glass-bg/30 hover:border-purple-accent transition-colors">
              <Calendar className="w-5 h-5 text-purple-accent mb-1.5" />
              <span className="text-lg font-bold text-primary-text">{eventsCount}</span>
              <span className="text-[9px] text-muted-text uppercase tracking-widest mt-0.5">Events</span>
            </div>

          </div>
        ) : metricType === 'habits' ? (
          // Habits Stats Renderer
          (() => {
            let totalHabits = 0;
            let totalCheckins = 0;

            habitWidgets.forEach(w => {
              try {
                const parsed = JSON.parse(w.dataRef || '{}');
                if (parsed.habits) {
                  parsed.habits.forEach((h: any) => {
                    totalHabits++;
                    totalCheckins += Object.values(h.history).filter(v => v).length;
                  });
                }
              } catch (e) {}
            });

            return (
              <div className="grid grid-cols-2 gap-3 w-full px-2">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-color-border-color bg-glass-bg/30 hover:border-orange-500 transition-colors">
                  <Flame className="w-6 h-6 text-orange-500 mb-2" />
                  <span className="text-2xl font-bold text-primary-text">{totalHabits}</span>
                  <span className="text-[10px] text-muted-text uppercase tracking-widest mt-1">Active Habits</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-color-border-color bg-glass-bg/30 hover:border-green-accent transition-colors">
                  <Check className="w-6 h-6 text-green-accent mb-2" />
                  <span className="text-2xl font-bold text-primary-text">{totalCheckins}</span>
                  <span className="text-[10px] text-muted-text uppercase tracking-widest mt-1">Total Check-ins</span>
                </div>
              </div>
            );
          })()
        ) : (
          // Custom Goal Progress Tracker with animated ring
          <div className="w-full flex items-center justify-around gap-4 px-2">
            
            {/* Left: Progress ring SVG */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-glass-border fill-none"
                  strokeWidth="6"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-cyan-accent fill-none transition-all duration-500 ease-out"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - percentage / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center font-mono">
                <span className="text-sm font-bold text-primary-text">{percentage}%</span>
              </div>
            </div>

            {/* Right: Metrics counters */}
            <div className="flex flex-col justify-center gap-1.5 max-w-[55%]">
              <span className="font-bold text-primary-text text-[13px] truncate">{customTitle}</span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-cyan-accent font-mono">
                  {customValue} <span className="text-xs text-muted-text font-normal">/ {customMax}</span>
                </span>
                
                {/* Plus / minus counters */}
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const nextVal = Math.max(0, customValue - 1);
                      setCustomValue(nextVal);
                      localStorage.setItem(
                        `widget-stats-${widgetId}`,
                        JSON.stringify({ metricType, customTitle, customValue: nextVal, customMax })
                      );
                    }}
                    className="p-1 rounded bg-glass-bg border border-color-border-color hover:text-red-500 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      const nextVal = customValue + 1;
                      setCustomValue(nextVal);
                      localStorage.setItem(
                        `widget-stats-${widgetId}`,
                        JSON.stringify({ metricType, customTitle, customValue: nextVal, customMax })
                      );
                    }}
                    className="p-1 rounded bg-glass-bg border border-color-border-color hover:text-cyan-accent cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-muted-text flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>Local-first OS target</span>
              </span>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
