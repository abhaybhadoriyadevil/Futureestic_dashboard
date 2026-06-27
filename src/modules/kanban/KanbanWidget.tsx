import React, { useState, useEffect } from 'react';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { Plus, Trash2, Calendar, Tag, Check, X } from 'lucide-react';

interface KanbanCard {
  id: string;
  title: string;
  tags: string[];
  date: string;
}

interface KanbanWidgetProps {
  widgetId: string;
  dataRef?: string; // Stores JSON string of lanes: { todo: KanbanCard[], progress: KanbanCard[], done: KanbanCard[] }
  isEditMode: boolean;
  showControls?: boolean;
}

export const KanbanWidget: React.FC<KanbanWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  
  // Lanes state
  const [lanes, setLanes] = useState<{ [key: string]: KanbanCard[] }>({
    todo: [],
    progress: [],
    done: []
  });

  // Card Creator Form States
  const [showAddCard, setShowAddCard] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // Load board layout from dataRef
  useEffect(() => {
    if (dataRef) {
      try {
        const parsed = JSON.parse(dataRef);
        if (parsed.todo && parsed.progress && parsed.done) {
          setLanes(parsed);
        }
      } catch (e) {
        console.error('Failed to parse Kanban dataRef', e);
      }
    }
  }, [dataRef]);

  const saveBoard = async (newBoardLanes: typeof lanes) => {
    setLanes(newBoardLanes);
    await commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify(newBoardLanes)
    });
  };

  // Drag and Drop implementation using HTML5 DnD API
  const handleDragStart = (e: React.DragEvent, cardId: string, sourceLane: string) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('sourceLane', sourceLane);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetLane: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const sourceLane = e.dataTransfer.getData('sourceLane');

    if (sourceLane === targetLane) return;

    const sourceCards = [...lanes[sourceLane]];
    const targetCards = [...lanes[targetLane]];

    const cardIdx = sourceCards.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return;

    const [draggedCard] = sourceCards.splice(cardIdx, 1);
    targetCards.push(draggedCard);

    const updated = {
      ...lanes,
      [sourceLane]: sourceCards,
      [targetLane]: targetCards
    };

    saveBoard(updated);
  };

  const handleAddCardSubmit = (laneKey: string) => {
    if (!newTitle.trim()) return;

    const newCard: KanbanCard = {
      id: `card-${Math.random().toString(36).substr(2, 9)}`,
      title: newTitle,
      tags: newTag ? [newTag] : [],
      date: newDate
    };

    const updated = {
      ...lanes,
      [laneKey]: [...lanes[laneKey], newCard]
    };

    saveBoard(updated);
    
    // Reset Creator
    setNewTitle('');
    setNewTag('');
    setShowAddCard(null);
  };

  const handleDeleteCard = (laneKey: string, cardId: string) => {
    const updated = {
      ...lanes,
      [laneKey]: lanes[laneKey].filter(c => c.id !== cardId)
    };
    saveBoard(updated);
  };

  const getLaneTitle = (key: string) => {
    switch (key) {
      case 'todo': return 'To Do';
      case 'progress': return 'In Progress';
      case 'done': return 'Completed';
      default: return key;
    }
  };

  return (
    <div className="w-full h-full flex gap-3 p-4 text-xs text-primary-text bg-transparent overflow-x-auto no-scrollbar select-none">
      
      {Object.keys(lanes).map((laneKey) => (
        <div
          key={laneKey}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, laneKey)}
          className="w-1/3 min-w-[160px] max-w-[240px] flex-shrink-0 flex flex-col rounded-xl border border-color-border-color bg-glass-bg/15 p-3 overflow-hidden"
        >
          {/* Lane Header */}
          <div className="flex justify-between items-center border-b border-color-border-color pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${
                laneKey === 'todo' ? 'bg-blue-accent' : laneKey === 'progress' ? 'bg-purple-accent' : 'bg-green-accent'
              }`} />
              <span className="font-bold text-[11px] text-primary-text uppercase tracking-wider">{getLaneTitle(laneKey)}</span>
            </div>
            <span className="text-[10px] text-muted-text font-bold font-mono bg-glass-bg px-1.5 py-0.5 rounded border border-color-border-color">
              {lanes[laneKey].length}
            </span>
          </div>

          {/* Cards List container */}
          <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar pb-4">
            {lanes[laneKey].map(card => (
              <div
                key={card.id}
                draggable
                onDragStart={(e) => handleDragStart(e, card.id, laneKey)}
                className="p-3 rounded-xl border border-color-border-color bg-glass-bg/50 hover:border-cyan-accent/40 hover:bg-glass-bg transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2 relative group/card"
              >
                {/* Delete button */}
                {showControls && (
                  <button
                    onClick={() => handleDeleteCard(laneKey, card.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 p-0.5 text-muted-text hover:text-red-500 rounded transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <span className="font-semibold text-primary-text leading-tight pr-4">{card.title}</span>

                {/* Subinfo (date / tag) */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1">
                  {card.tags.map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[8px] border border-color-border-color bg-secondary-bg/50 text-secondary-text flex items-center gap-1 font-mono">
                      <Tag className="w-2.5 h-2.5 text-cyan-accent" />
                      {t}
                    </span>
                  ))}
                  {card.date && (
                    <span className="text-[8px] text-muted-text flex items-center gap-1 font-mono ml-auto">
                      <Calendar className="w-2.5 h-2.5 text-purple-accent" />
                      {card.date}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Inline Card Creator Form */}
            {showAddCard === laneKey ? (
              <div className="p-3 rounded-xl border border-dashed border-cyan-accent/30 bg-cyan-accent/5 flex flex-col gap-2 animate-[fadeIn_0.15s_ease-out]">
                <input
                  type="text"
                  required
                  placeholder="Task card name..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-secondary-bg border border-color-border-color focus:outline-none focus:border-cyan-accent text-[10px] text-primary-text"
                />
                
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-1/2 px-2 py-1 rounded bg-secondary-bg border border-color-border-color focus:outline-none text-[9px] text-primary-text"
                  />
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-1/2 px-1 py-1 rounded bg-secondary-bg border border-color-border-color focus:outline-none text-[9px] text-primary-text"
                  />
                </div>

                <div className="flex justify-end gap-1.5 mt-1">
                  <button
                    onClick={() => setShowAddCard(null)}
                    className="p-1 text-muted-text hover:text-primary-text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleAddCardSubmit(laneKey)}
                    className="p-1 bg-cyan-accent text-black rounded"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : showControls ? (
              <button
                onClick={() => setShowAddCard(laneKey)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-color-border-color hover:border-cyan-accent text-[10px] text-muted-text hover:text-cyan-accent hover:bg-cyan-accent/5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task Card</span>
              </button>
            ) : null}
          </div>
        </div>
      ))}

    </div>
  );
};
