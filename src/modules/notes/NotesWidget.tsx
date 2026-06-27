import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import { FileText, Save, Edit3, Folder, Plus, Search, Tag } from 'lucide-react';

interface NotesWidgetProps {
  widgetId: string;
  dataRef?: string; // Points to a specific Note ID, or undefined to show notes list
  isEditMode: boolean;
  showControls?: boolean;
}

export const NotesWidget: React.FC<NotesWidgetProps> = ({ dataRef, showControls = false }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(dataRef || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  
  // Notes list state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const newNoteFolder = 'general';

  // Load all notes
  const notes = useLiveQuery(() => db.notes.toArray()) || [];
  
  // Fetch active note
  const activeNote = notes.find(n => n.id === selectedNoteId);

  useEffect(() => {
    if (dataRef) {
      setSelectedNoteId(dataRef);
    }
  }, [dataRef]);

  useEffect(() => {
    if (activeNote) {
      setEditTitle(activeNote.title);
      setEditContent(activeNote.content);
      setEditTags(activeNote.tags.join(', '));
    }
  }, [activeNote, selectedNoteId]);

  // Quick Markdown Parser
  const parseMarkdown = (markdown: string) => {
    if (!markdown) return <p className="text-muted-text italic">No content. Click Edit to add notes.</p>;

    const lines = markdown.split('\n');

    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-bold text-primary-text border-b border-color-border-color pb-1.5 mt-3 mb-2">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-bold text-primary-text mt-3 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-base font-bold text-secondary-text mt-2 mb-1">{line.replace('### ', '')}</h3>;
      }

      // Checklists
      if (line.startsWith('* [x] ') || line.startsWith('- [x] ')) {
        return (
          <div key={idx} className="flex items-center gap-2 text-xs text-muted-text line-through my-1">
            <input type="checkbox" checked readOnly className="rounded accent-cyan-accent" />
            <span>{line.substring(6)}</span>
          </div>
        );
      }
      if (line.startsWith('* [ ] ') || line.startsWith('- [ ] ')) {
        return (
          <div key={idx} className="flex items-center gap-2 text-xs text-secondary-text my-1">
            <input type="checkbox" checked={false} readOnly className="rounded border-color-border-color" />
            <span>{line.substring(6)}</span>
          </div>
        );
      }

      // Bullets
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return (
          <li key={idx} className="list-disc list-inside text-xs text-secondary-text ml-3 my-0.5">
            {line.substring(2)}
          </li>
        );
      }

      // Code Block
      if (line.startsWith('```')) {
        return null; // Simple parser placeholder
      }

      // Paragraph / empty line
      if (line.trim() === '') return <div key={idx} className="h-2" />;
      
      return <p key={idx} className="text-xs text-secondary-text leading-relaxed my-1">{line}</p>;
    });
  };

  const handleSaveNote = async () => {
    if (!selectedNoteId) return;

    const tagsArray = editTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await db.notes.update(selectedNoteId, {
      title: editTitle,
      content: editContent,
      tags: tagsArray,
      updatedAt: Date.now()
    });

    setIsEditing(false);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    const id = `note-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    await db.notes.add({
      id,
      title: newNoteTitle,
      content: `# ${newNoteTitle}\n\nStart typing content...`,
      tags: [],
      folderId: newNoteFolder,
      createdAt: now,
      updatedAt: now
    });

    setNewNoteTitle('');
    setSelectedNoteId(id);
    setIsEditing(true);
  };

  // Get folders and tags for lists
  const folders = Array.from(new Set(notes.map(n => n.folderId || 'general')));
  const tags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  // Filtered notes
  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder ? n.folderId === selectedFolder : true;
    const matchesTag = selectedTag ? n.tags.includes(selectedTag) : true;
    return matchesSearch && matchesFolder && matchesTag;
  });

  // If a specific note was passed by dataRef, display just that note document
  if (dataRef && activeNote) {
    return (
      <div className="w-full h-full flex flex-col p-4 overflow-hidden text-primary-text bg-transparent">
        {/* Document Header */}
        <div className="flex items-center justify-between border-b border-color-border-color pb-2 mb-3">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-transparent border-b border-cyan-accent focus:outline-none text-sm font-bold text-primary-text py-0.5 px-1 w-[70%]"
            />
          ) : (
            <h2 className="text-sm font-bold truncate flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-accent" />
              {activeNote.title}
            </h2>
          )}

          <div className="flex gap-2">
            {showControls && (
              isEditing ? (
                <button
                  onClick={handleSaveNote}
                  className="px-2.5 py-1 text-[10px] font-semibold bg-cyan-accent text-black rounded-lg cursor-pointer flex items-center gap-1.5 hover:opacity-90"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 text-[10px] font-semibold bg-glass-bg border border-color-border-color rounded-lg cursor-pointer flex items-center gap-1.5 hover:bg-glass-bg/80 text-primary-text"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Document Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isEditing ? (
            <div className="flex flex-col gap-2 h-full">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full flex-1 bg-secondary-bg/50 border border-color-border-color rounded-xl p-3 focus:outline-none focus:border-cyan-accent font-mono text-[11px] leading-relaxed resize-none h-[180px] text-primary-text"
                placeholder="Markdown text here..."
              />
              <input
                type="text"
                placeholder="Tags (comma separated: work, guide)"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-color-border-color bg-glass-bg text-[10px] focus:outline-none text-primary-text"
              />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-xs leading-relaxed select-text">
              {parseMarkdown(activeNote.content)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // General Notes Manager Dashboard view (when dataRef is undefined)
  return (
    <div className="w-full h-full flex overflow-hidden text-primary-text bg-transparent text-xs">
      
      {/* 1. Left Sidebar: Folder / Tags */}
      <div className="w-1/3 border-r border-color-border-color p-3 flex flex-col gap-3 bg-secondary-bg/10 overflow-y-auto no-scrollbar">
        
        {/* Folders */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted-text uppercase tracking-widest flex items-center gap-1">
            <Folder className="w-3 h-3" />
            <span>Folders</span>
          </span>
          <button
            onClick={() => setSelectedFolder(null)}
            className={`w-full text-left px-2 py-1.5 rounded-lg font-medium transition-colors ${
              selectedFolder === null ? 'bg-glass-bg text-cyan-accent' : 'text-secondary-text hover:text-primary-text'
            }`}
          >
            All Notes
          </button>
          {folders.map(f => (
            <button
              key={f}
              onClick={() => setSelectedFolder(f)}
              className={`w-full text-left px-2 py-1.5 rounded-lg capitalize truncate transition-colors ${
                selectedFolder === f ? 'bg-glass-bg text-cyan-accent' : 'text-secondary-text hover:text-primary-text'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted-text uppercase tracking-widest flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>Tags</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {tags.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                className={`px-2 py-0.5 rounded-md border text-[10px] transition-colors cursor-pointer ${
                  selectedTag === t 
                    ? 'border-cyan-accent bg-cyan-accent/10 text-cyan-accent' 
                    : 'border-color-border-color text-muted-text hover:text-secondary-text'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>

        {/* Create Note form */}
        {showControls && (
          <form onSubmit={handleCreateNote} className="border-t border-color-border-color pt-3 mt-auto flex flex-col gap-1.5">
            <input
              type="text"
              required
              placeholder="New note title..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full px-2 py-1 rounded bg-secondary-bg/40 border border-color-border-color text-[10px] focus:outline-none focus:border-cyan-accent text-primary-text"
            />
            <button
              type="submit"
              className="w-full py-1 text-[10px] font-semibold bg-glass-bg hover:bg-cyan-accent/10 border border-color-border-color hover:border-cyan-accent text-cyan-accent rounded flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>
          </form>
        )}
      </div>

      {/* 2. Right Workspace: Note list & Document Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNoteId && activeNote ? (
          // Active Document Detail View
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-color-border-color pb-2 mb-3">
              <button 
                onClick={() => setSelectedNoteId(null)}
                className="text-muted-text hover:text-primary-text flex items-center gap-1 cursor-pointer"
              >
                <span>&larr; Back</span>
              </button>
              
              <div className="flex gap-2">
                {showControls && (
                  isEditing ? (
                    <button
                      onClick={handleSaveNote}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-cyan-accent text-black rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-glass-bg border border-color-border-color rounded-lg cursor-pointer flex items-center gap-1 text-primary-text"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Note Editor or Markdown viewer */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {isEditing ? (
                <div className="flex flex-col gap-2 h-full">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-secondary-bg/50 border border-color-border-color rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-accent text-xs font-bold text-primary-text"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full flex-1 bg-secondary-bg/50 border border-color-border-color rounded-xl p-3 focus:outline-none focus:border-cyan-accent font-mono text-[11px] leading-relaxed resize-none text-primary-text"
                  />
                  <input
                    type="text"
                    placeholder="Tags (work, guide)"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-color-border-color bg-glass-bg text-[10px] focus:outline-none text-primary-text"
                  />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-xs leading-relaxed select-text">
                  <h1 className="text-base font-bold mb-2 text-primary-text">{activeNote.title}</h1>
                  {parseMarkdown(activeNote.content)}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Folder Document list view
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-color-border-color pb-3 mb-3">
              <Search className="w-4 h-4 text-muted-text" />
              <input
                type="text"
                placeholder="Search notes indexing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none text-primary-text"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar">
              {filteredNotes.length === 0 ? (
                <div className="p-8 text-center text-muted-text italic">No notes found. Create a new document below.</div>
              ) : (
                filteredNotes.map(n => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNoteId(n.id)}
                    className="w-full text-left p-3 rounded-xl border border-color-border-color bg-glass-bg/40 hover:bg-glass-bg transition-colors flex justify-between items-start gap-4 cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-primary-text text-[13px]">{n.title}</div>
                      <div className="text-[10px] text-muted-text line-clamp-1 mt-0.5">
                        {n.content.replace(/[#*`\-[\]]/g, '').substring(0, 80)}
                      </div>
                    </div>
                    {n.tags.length > 0 && (
                      <div className="flex gap-1">
                        {n.tags.slice(0, 2).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[8px] border border-color-border-color bg-secondary-bg/50 text-secondary-text">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
