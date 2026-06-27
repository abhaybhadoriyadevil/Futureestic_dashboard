import React, { useState, useEffect } from 'react';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { Plus, Trash2, Check, X as XIcon, Flame, Clock } from 'lucide-react';

export type RepeatType = 'everyday' | 'weekdays' | 'weekends' | 'custom';

export interface Habit {
  id: string;
  title: string;
  time?: string; // HH:MM target time
  repeatType: RepeatType;
  customDays: number[]; // 0=Sun, 1=Mon...
  history: Record<string, boolean>; // 'YYYY-MM-DD' -> true/false
  createdAt: number;
}

interface HabitsData {
  habits: Habit[];
}

interface HabitsWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

const getPast7Days = () => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
};

const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatTime12h = (timeStr?: string) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const min = parseInt(minStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMin = String(min).padStart(2, '0');
  return `${displayHour}:${displayMin} ${ampm}`;
};

export const HabitsWidget: React.FC<HabitsWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newRepeat, setNewRepeat] = useState<RepeatType>('everyday');
  const [newCustomDays, setNewCustomDays] = useState<number[]>([]);

  useEffect(() => {
    if (dataRef) {
      try {
        const parsed = JSON.parse(dataRef) as HabitsData;
        if (parsed.habits) {
          setHabits(parsed.habits);
        }
      } catch (e) {
        console.error('Failed to parse Habits dataRef', e);
      }
    }
  }, [dataRef]);

  const saveHabits = async (newHabits: Habit[]) => {
    setHabits(newHabits);
    await commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify({ habits: newHabits })
    });
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newHabit: Habit = {
      id: `habit-${Math.random().toString(36).substr(2, 9)}`,
      title: newTitle.trim(),
      time: newTime.trim() || undefined,
      repeatType: newRepeat,
      customDays: newRepeat === 'custom' ? newCustomDays : [],
      history: {},
      createdAt: Date.now()
    };

    saveHabits([...habits, newHabit]);
    setNewTitle('');
    setNewTime('');
    setNewRepeat('everyday');
    setNewCustomDays([]);
    setShowAddForm(false);
  };

  const handleDeleteHabit = (id: string) => {
    saveHabits(habits.filter(h => h.id !== id));
  };

  const toggleHabitHistory = (habitId: string, dateStr: string) => {
    const updated = habits.map(h => {
      if (h.id === habitId) {
        const current = h.history[dateStr];
        return {
          ...h,
          history: { ...h.history, [dateStr]: !current }
        };
      }
      return h;
    });
    saveHabits(updated);
  };

  const isDayValidForHabit = (habit: Habit, date: Date) => {
    const day = date.getDay();
    if (habit.repeatType === 'everyday') return true;
    if (habit.repeatType === 'weekdays') return day >= 1 && day <= 5;
    if (habit.repeatType === 'weekends') return day === 0 || day === 6;
    if (habit.repeatType === 'custom') return habit.customDays.includes(day);
    return false;
  };

  // Calculate Streak
  const calculateStreak = (habit: Habit) => {
    let streak = 0;
    const d = new Date();
    // Start checking from today backwards
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(d);
      checkDate.setDate(checkDate.getDate() - i);
      
      // Stop checking if before creation date
      if (checkDate.getTime() < new Date(habit.createdAt).setHours(0,0,0,0)) break;

      const isValid = isDayValidForHabit(habit, checkDate);
      if (!isValid) continue; // Skip days where habit is not required

      const dateStr = formatDate(checkDate);
      if (habit.history[dateStr]) {
        streak++;
      } else {
        // If today is missed, it doesn't break the streak immediately (they still have time),
        // but if yesterday was missed, streak is broken.
        if (i > 0) break; 
      }
    }
    return streak;
  };

  const past7Days = getPast7Days();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayStr = formatDate(new Date());

  // Calculate Today's Progress
  const todayHabits = habits.filter(h => isDayValidForHabit(h, new Date()));
  const todayCompleted = todayHabits.filter(h => h.history[todayStr]).length;
  const todayProgress = todayHabits.length > 0 ? (todayCompleted / todayHabits.length) * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* Top Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-wide">Weekly Routine</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-text uppercase font-semibold">Today's Progress</span>
            <span className="text-cyan-accent font-bold text-xs">{todayCompleted} / {todayHabits.length}</span>
          </div>
          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-glass-bg rounded-full mt-1.5 overflow-hidden">
            <div 
              className="h-full bg-cyan-accent transition-all duration-500 ease-out"
              style={{ width: `${todayProgress}%` }}
            />
          </div>
        </div>

        {showControls && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-2.5 py-1.5 bg-cyan-accent text-black font-semibold rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Habit</span>
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-color-border-color">
              <th className="py-2 px-2 text-[10px] uppercase tracking-wider text-muted-text font-semibold w-1/3">Task</th>
              {past7Days.map(d => (
                <th key={d.toISOString()} className={`py-2 px-1 text-center text-[10px] uppercase tracking-wider font-semibold ${formatDate(d) === todayStr ? 'text-cyan-accent' : 'text-muted-text'}`}>
                  {dayNames[d.getDay()][0]}
                </th>
              ))}
              <th className="py-2 px-2 text-[10px] uppercase tracking-wider text-muted-text font-semibold text-center"><Flame className="w-3.5 h-3.5 inline text-orange-500" /></th>
            </tr>
          </thead>
          <tbody>
            {habits.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-text italic">
                  No habits added yet. Start tracking!
                </td>
              </tr>
            ) : (
              habits.map(habit => {
                const streak = calculateStreak(habit);
                return (
                  <tr key={habit.id} className="border-b border-color-border-color/30 group">
                    <td className="py-2 px-2 max-w-[120px]">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate pr-1" title={habit.title}>{habit.title}</span>
                          {habit.time && (
                            <span className="text-[9px] text-muted-text flex items-center gap-1 mt-0.5 font-mono">
                              <Clock className="w-2.5 h-2.5 text-cyan-accent/80 shrink-0" />
                              {formatTime12h(habit.time)}
                            </span>
                          )}
                        </div>
                      {showControls && (
                        <button 
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-text hover:text-red-500 transition-opacity rounded hover:bg-glass-bg cursor-pointer shrink-0 mt-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    </td>
                    
                    {past7Days.map(d => {
                      const dStr = formatDate(d);
                      const isValid = isDayValidForHabit(habit, d);
                      const isDone = habit.history[dStr];
                      
                      return (
                        <td key={dStr} className="py-2 px-1 text-center align-middle">
                          {isValid ? (
                            <button
                              onClick={() => toggleHabitHistory(habit.id, dStr)}
                              className={`w-5 h-5 mx-auto rounded flex items-center justify-center transition-all cursor-pointer border ${
                                isDone 
                                  ? 'bg-green-accent/20 border-green-accent text-green-accent' 
                                  : 'bg-glass-bg border-color-border-color text-transparent hover:border-cyan-accent hover:text-cyan-accent/50'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          ) : (
                            <div className="text-muted-text/30 font-bold">-</div>
                          )}
                        </td>
                      );
                    })}
                    
                    <td className="py-2 px-2 text-center text-orange-400 font-bold font-mono text-[10px]">
                      {streak > 0 ? streak : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Habit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm glass-panel p-6 rounded-2xl flex flex-col gap-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-color-border-color pb-3">
              <h2 className="text-base font-bold tracking-tight">New Recurring Task</h2>
              <button onClick={() => setShowAddForm(false)} className="text-muted-text hover:text-primary-text cursor-pointer">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHabit} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Task Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Exercise, Read 30 mins"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="px-3 py-2 rounded-xl glass-panel border border-color-border-color bg-transparent focus:outline-none focus:border-cyan-accent"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Target Time (Optional)</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="px-3 py-2 rounded-xl glass-panel border border-color-border-color bg-transparent focus:outline-none focus:border-cyan-accent text-xs font-mono text-primary-text [color-scheme:dark]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Repeat Pattern</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'everyday', label: 'Every Day' },
                    { val: 'weekdays', label: 'Monday-Friday' },
                    { val: 'weekends', label: 'Weekends' },
                    { val: 'custom', label: 'Custom Days' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setNewRepeat(opt.val as RepeatType)}
                      className={`px-3 py-2 rounded-lg border text-center transition-colors ${
                        newRepeat === opt.val 
                          ? 'border-cyan-accent bg-cyan-accent/10 text-cyan-accent font-bold'
                          : 'border-color-border-color bg-glass-bg text-secondary-text hover:text-primary-text'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {newRepeat === 'custom' && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Select Days</label>
                  <div className="flex gap-1 justify-between">
                    {['S','M','T','W','T','F','S'].map((letter, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (newCustomDays.includes(idx)) setNewCustomDays(newCustomDays.filter(d => d !== idx));
                          else setNewCustomDays([...newCustomDays, idx]);
                        }}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold transition-colors ${
                          newCustomDays.includes(idx)
                            ? 'border-cyan-accent bg-cyan-accent/20 text-cyan-accent'
                            : 'border-color-border-color bg-glass-bg text-secondary-text'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-accent text-black font-bold rounded-xl mt-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                Add Habit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
