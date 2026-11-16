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
  X,
  Edit2,
  Check
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

  // Edit Event Form States
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editCategory, setEditCategory] = useState('Personal');
  const [editColor, setEditColor] = useState('#3b82f6');

  // Selected Day for expanded viewing (when day has multiple events)
  const [selectedDayForView, setSelectedDayForView] = useState<Date | null>(null);

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
      title: newEventTitle.trim(),
      description: newEventDesc.trim(),
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

  const handleOpenEdit = (event: CalendarEvent, evt?: React.MouseEvent) => {
    evt?.stopPropagation();
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditDesc(event.description || '');

    const d = new Date(event.startDate);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    setEditDate(dateStr);
    setEditTime(timeStr);
    setEditCategory(event.category || 'Personal');
    setEditColor(event.color || '#3b82f6');
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editTitle.trim()) return;

    const startTimestamp = new Date(`${editDate}T${editTime}`).getTime();
    const duration = (editingEvent.endDate && editingEvent.startDate) 
      ? Math.max(1800000, editingEvent.endDate - editingEvent.startDate) 
      : 3600000;
    const endTimestamp = startTimestamp + duration;

    await db.events.update(editingEvent.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      startDate: startTimestamp,
      endDate: endTimestamp,
      category: editCategory,
      color: editColor,
    });

    setEditingEvent(null);
  };

  const handleDeleteEvent = async (id: string, evt?: React.MouseEvent) => {
    evt?.stopPropagation();
    if (confirm('Delete this scheduled event?')) {
      await db.events.delete(id);
      if (editingEvent?.id === id) {
        setEditingEvent(null);
      }
    }
  };

  const handleDeleteFromModal = async () => {
    if (!editingEvent) return;
    if (confirm(`Delete event "${editingEvent.title}"?`)) {
      await db.events.delete(editingEvent.id);
      setEditingEvent(null);
    }
  };

  const handleDayAdd = (day: Date, evt?: React.MouseEvent) => {
    evt?.stopPropagation();
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    setNewEventDate(dateStr);
    setShowAddForm(true);
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
              <button onClick={prevMonth} className="p-1 rounded hover:bg-glass-bg cursor-pointer text-primary-text" title="Previous Month">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-primary-text min-w-[90px] text-center">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-glass-bg cursor-pointer text-primary-text" title="Next Month">
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
                    onClick={() => {
                      if (dayEvents.length > 0) {
                        setSelectedDayForView(day);
                      } else if (showControls) {
                        handleDayAdd(day);
                      }
                    }}
                    className={`min-h-[45px] border border-color-border-color/30 rounded-xl p-1.5 bg-glass-bg/20 flex flex-col justify-between transition-colors relative cursor-pointer hover:border-cyan-accent/40 hover:bg-glass-bg/30 group/day ${
                      isToday ? 'border-cyan-accent bg-cyan-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${isToday ? 'text-cyan-accent' : 'text-primary-text'}`}>
                        {day.getDate()}
                      </span>
                      {showControls && (
                        <button
                          onClick={(e) => handleDayAdd(day, e)}
                          className="opacity-0 group-hover/day:opacity-100 p-0.5 rounded hover:bg-cyan-accent/20 hover:text-cyan-accent text-muted-text transition-all"
                          title="Add event on this date"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Event Pills */}
                    <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map(e => (
                        <div
                          key={e.id}
                          onClick={(evt) => handleOpenEdit(e, evt)}
                          style={{ backgroundColor: `${e.color}25`, borderLeftColor: e.color }}
                          className="w-full text-[8px] leading-tight font-semibold rounded px-1.5 py-0.5 truncate border-l-2 text-primary-text hover:brightness-125 cursor-pointer flex items-center justify-between group/pill transition-all"
                          title={`${e.title} (Click to edit or delete)`}
                        >
                          <span className="truncate">{e.title}</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/pill:opacity-100 shrink-0 ml-1 text-cyan-accent transition-opacity" />
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            setSelectedDayForView(day);
                          }}
                          className="text-[7px] text-cyan-accent hover:underline px-1 font-semibold text-left"
                        >
                          +{dayEvents.length - 3} more
                        </button>
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
                  onClick={() => handleOpenEdit(e)}
                  className="flex items-center justify-between p-3 rounded-xl border border-color-border-color bg-glass-bg/40 hover:bg-glass-bg transition-colors cursor-pointer group"
                >
                  <div className="flex gap-3 items-start max-w-[80%]">
                    <span 
                      style={{ backgroundColor: e.color }}
                      className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary-text text-[13px]">{e.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-glass-bg border border-color-border-color text-muted-text">
                          {e.category}
                        </span>
                      </div>
                      {e.description && <span className="text-[10px] text-muted-text line-clamp-1 mt-0.5">{e.description}</span>}
                      <span className="text-[9px] text-muted-text flex items-center gap-1.5 mt-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-cyan-accent" />
                        {new Date(e.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(evt) => handleOpenEdit(e, evt)}
                      className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-cyan-accent cursor-pointer transition-colors"
                      title="Edit event"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(evt) => handleDeleteEvent(e.id, evt)}
                      className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-red-400 cursor-pointer transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Day View Modal */}
      {selectedDayForView && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDayForView(null)}
        >
          <div 
            className="w-full max-w-sm glass-panel p-5 rounded-2xl flex flex-col gap-3 text-primary-text animate-[fadeIn_0.2s_ease-out] shadow-2xl border border-color-border-color"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-color-border-color pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-primary-text">
                  {selectedDayForView.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>
                <span className="text-[10px] text-muted-text font-mono">
                  {getEventsForDate(selectedDayForView).length} scheduled event(s)
                </span>
              </div>
              <button 
                onClick={() => setSelectedDayForView(null)} 
                className="text-muted-text hover:text-primary-text p-1 rounded-lg hover:bg-glass-bg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar py-1">
              {getEventsForDate(selectedDayForView).length === 0 ? (
                <div className="py-6 text-center text-muted-text italic text-xs">No events on this day.</div>
              ) : (
                getEventsForDate(selectedDayForView).map(e => (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedDayForView(null);
                      handleOpenEdit(e);
                    }}
                    style={{ borderLeftColor: e.color }}
                    className="flex items-center justify-between p-2.5 rounded-xl border-l-4 border border-color-border-color bg-glass-bg/40 hover:bg-glass-bg transition-colors cursor-pointer group"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-semibold text-xs text-primary-text truncate">{e.title}</span>
                      {e.description && (
                        <span className="text-[10px] text-muted-text truncate mt-0.5">{e.description}</span>
                      )}
                      <span className="text-[9px] text-muted-text flex items-center gap-1 font-mono mt-1">
                        <Clock className="w-3 h-3 text-cyan-accent" />
                        {new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          setSelectedDayForView(null);
                          handleOpenEdit(e);
                        }}
                        className="p-1 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-cyan-accent transition-colors cursor-pointer"
                        title="Edit event"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          handleDeleteEvent(e.id);
                        }}
                        className="p-1 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {showControls && (
              <button
                onClick={() => {
                  const d = selectedDayForView;
                  setSelectedDayForView(null);
                  handleDayAdd(d);
                }}
                className="w-full py-2 bg-cyan-accent/10 border border-cyan-accent/30 hover:bg-cyan-accent/20 text-cyan-accent font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event on This Day</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Event Form Modal */}
      {editingEvent && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditingEvent(null)}
        >
          <div 
            className="w-full max-w-sm glass-panel p-6 rounded-2xl flex flex-col gap-4 text-primary-text animate-[fadeIn_0.2s_ease-out] shadow-2xl border border-color-border-color"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-color-border-color pb-3">
              <div className="flex items-center gap-2">
                <span 
                  style={{ backgroundColor: editColor }} 
                  className="w-3 h-3 rounded-full shrink-0" 
                />
                <h2 className="text-base font-bold tracking-tight">Edit Event</h2>
              </div>
              <button 
                onClick={() => setEditingEvent(null)} 
                className="text-muted-text hover:text-primary-text cursor-pointer p-1 rounded-lg hover:bg-glass-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Server Migration check"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Standard diagnostics report."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Time</label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                    <option value="Finance">Finance</option>
                    <option value="System">System</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase tracking-wider">Color Label</label>
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
                        onClick={() => setEditColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                          editColor === c.hex ? 'scale-110 border-white ring-2 ring-cyan-accent/50' : 'border-transparent hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Delete and Save */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleDeleteFromModal}
                  className="px-3 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  title="Delete this event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-accent hover:bg-cyan-accent/90 text-black font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Form Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddForm(false)}
        >
          <div 
            className="w-full max-w-sm glass-panel p-6 rounded-2xl flex flex-col gap-4 text-primary-text animate-[fadeIn_0.2s_ease-out] shadow-2xl border border-color-border-color"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-color-border-color pb-3">
              <h2 className="text-base font-bold tracking-tight">Schedule New Event</h2>
              <button onClick={() => setShowAddForm(false)} className="text-muted-text hover:text-primary-text cursor-pointer p-1 rounded-lg hover:bg-glass-bg transition-colors">
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
                  className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted-text font-semibold uppercase">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Standard diagnostics report."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
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
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase">Time</label>
                  <input
                    type="time"
                    required
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-text font-semibold uppercase">Category</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
                    className="px-3 py-1.5 rounded-lg glass-panel border border-color-border-color bg-secondary-bg text-primary-text focus:outline-none focus:border-cyan-accent"
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
                          newEventColor === c.hex ? 'scale-110 border-white ring-2 ring-cyan-accent/50' : 'border-transparent hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-cyan-accent text-black font-bold rounded-xl mt-3 hover:opacity-90 transition-opacity cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
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
