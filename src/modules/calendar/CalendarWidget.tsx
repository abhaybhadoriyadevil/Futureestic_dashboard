import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import type { CalendarEvent } from '../../types';
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  X
} from 'lucide-react';

interface CalendarWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ showControls = false }) => {
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Create Event Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');
  const [newEventCategory, setNewEventCategory] = useState('Personal');
  const [newEventColor, setNewEventColor] = useState('#3b82f6');

  // Load scheduler events
  const events = useLiveQuery(() => db.events.toArray()) || [];

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const startTimestamp = new Date(`${newEventDate}T${newEventTime}`).getTime();
    
    // Add 1 hour default duration
    const endTimestamp = startTimestamp + 3600000;

    const newEvent: CalendarEvent = {
      id: `event-${Math.random().toString(36).substr(2, 9)}`,
      title: newEventTitle,
      description: newEventDesc,
      startDate: startTimestamp,
      endDate: endTimestamp,
      category: newEventCategory,
      color: newEventColor,
      createdAt: Date.now()
    };

    await db.events.add(newEvent);
    
    // Reset Form
    setNewEventTitle('');
    setNewEventDesc('');
    setShowAddForm(false);
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Delete this scheduled event?')) {
      await db.events.delete(id);
    }
  };

  // Month navigation
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Generate Month Grid Days
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    
    // Padding for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const monthDays = getDaysInMonth();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Match events to a particular date (disregard time details)
  const getEventsForDate = (date: Date) => {
    return events.filter(e => {
      const eDate = new Date(e.startDate);
      return eDate.getDate() === date.getDate() &&
             eDate.getMonth() === date.getMonth() &&
             eDate.getFullYear() === date.getFullYear();
    });
  };

  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => a.startDate - b.startDate);

  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* Top Header controls */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {showControls && (
            <div className="flex rounded-xl bg-glass-bg border border-color-border-color p-0.5 mr-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                  viewMode === 'month' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                Month Grid
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                  viewMode === 'agenda' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                Agenda
              </button>
            </div>
          )}

          {viewMode === 'month' && (
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-glass-bg cursor-pointer text-primary-text">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-primary-text min-w-[90px] text-center">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-glass-bg cursor-pointer text-primary-text">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Add Event trigger */}
        {showControls && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-2.5 py-1 bg-cyan-accent text-black font-semibold rounded-lg flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer text-[10px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Event</span>
          </button>
        )}
      </div>

      {/* Main calendar area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {viewMode === 'month' ? (
          // Month Grid View
          <div className="flex flex-col h-full min-h-[220px] pb-6">
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-muted-text uppercase tracking-widest mb-1">
              {dayNames.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 flex-1">
              {monthDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="bg-transparent border border-transparent rounded-lg" />;
                
                const dayEvents = getEventsForDate(day);
                const isToday = new Date().toDateString() === day.toDateString();

                return (
                  <div
                    key={idx}
                    className={`min-h-[35px] border border-color-border-color/30 rounded-xl p-1 bg-glass-bg/20 flex flex-col justify-between transition-colors relative ${
                      isToday ? 'border-cyan-accent bg-cyan-accent/5' : ''
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isToday ? 'text-cyan-accent' : 'text-primary-text'}`}>
                      {day.getDate()}
                    </span>

                    {/* Event Pills */}
                    <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map(e => (
                        <div
                          key={e.id}
                          style={{ backgroundColor: `${e.color}20`, borderLeftColor: e.color }}
                          className="w-full text-[8px] leading-tight font-semibold rounded-sm px-1 py-0.5 truncate border-l-2 text-primary-text hover:opacity-80 cursor-pointer"
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[7px] text-muted-text px-1 font-semibold">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Agenda chronological view
          <div className="space-y-2 pb-6">
            {sortedEvents.length === 0 ? (
              <div className="p-8 text-center text-muted-text italic">No events scheduled.</div>
            ) : (
              sortedEvents.map(e => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-color-border-color bg-glass-bg/40 hover:bg-glass-bg transition-colors"
                >
                  <div className="flex gap-3 items-start max-w-[80%]">
                    <span 
                      style={{ backgroundColor: e.color }}
                      className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary-text text-[13px]">{e.title}</span>
                      {e.description && <span className="text-[10px] text-muted-text line-clamp-1 mt-0.5">{e.description}</span>}
                      <span className="text-[9px] text-muted-text flex items-center gap-1.5 mt-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-cyan-accent" />
                        {new Date(e.startDate).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(e.id)}
                    className="p-1 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Event Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm glass-panel p-6 rounded-2xl flex flex-col gap-4 text-primary-text animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-color-border-color pb-3">
              <h2 className="text-base font-bold tracking-tight">Schedule New Event</h2>
              <button onClick={() => setShowAddForm(false)} className="text-muted-text hover:text-primary-text cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-text font-semibold uppercase">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Server Migration check"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-transparent focus:outline-none focus:border-cyan-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-text font-semibold uppercase">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Standard diagnostics report."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-transparent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase">Time</label>
                  <input
                    type="time"
                    required
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase">Category</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg focus:outline-none"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                    <option value="Finance">Finance</option>
                    <option value="System">System</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase">Color Label</label>
                  <div className="flex gap-1.5 mt-1.5">
                    {[
                      { hex: '#3b82f6', label: 'blue' },
                      { hex: '#8b5cf6', label: 'purple' },
                      { hex: '#06b6d4', label: 'cyan' },
                      { hex: '#10b981', label: 'green' }
                    ].map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewEventColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                          newEventColor === c.hex ? 'scale-110 border-white' : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-cyan-accent text-black font-bold rounded-xl mt-3 hover:opacity-90 transition-opacity cursor-pointer"
              >
                Schedule Event
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
