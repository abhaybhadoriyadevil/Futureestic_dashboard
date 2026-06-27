import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import type { FileData } from '../../types';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  Image, 
  Film, 
  FileSpreadsheet, 
  Archive, 
  Eye, 
  X,
  FileText
} from 'lucide-react';

interface FilesWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

export const FilesWidget: React.FC<FilesWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [fileIds, setFileIds] = useState<string[]>([]);

  // Sync fileIds from dataRef
  useEffect(() => {
    if (dataRef) {
      try {
        const parsed = JSON.parse(dataRef);
        if (parsed.fileIds && Array.isArray(parsed.fileIds)) {
          setFileIds(parsed.fileIds);
        } else {
          setFileIds([]);
        }
      } catch (e) {
        setFileIds([]);
      }
    } else {
      setFileIds([]);
    }
  }, [dataRef]);

  // Load files belonging to this widget
  const files = useLiveQuery(async () => {
    if (fileIds.length === 0) return [];
    const list = await db.files.bulkGet(fileIds);
    return list.filter((f): f is FileData => !!f);
  }, [fileIds]) || [];

  // Sort files chronologically
  const sortedFiles = [...files].sort((a, b) => b.createdAt - a.createdAt);

  const categories = ['Documents', 'Images', 'Videos', 'Spreadsheets', 'Archives', 'Others'];

  // Identify file categories
  const getCategoryFromType = (type: string): string => {
    if (type.startsWith('image/')) return 'Images';
    if (type.startsWith('video/')) return 'Videos';
    if (type === 'text/plain' || type === 'application/pdf' || type.includes('word')) return 'Documents';
    if (type.includes('sheet') || type === 'text/csv') return 'Spreadsheets';
    if (type.includes('zip') || type.includes('tar') || type.includes('compressed')) return 'Archives';
    return 'Others';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const id = `file-${Math.random().toString(36).substr(2, 9)}`;
      const category = getCategoryFromType(file.type);
      
      const fileEntry: FileData = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
        tags: [category.toLowerCase()],
        category,
        createdAt: Date.now(),
      };

      await db.files.add(fileEntry);
      
      const newFileIds = [...fileIds, id];
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({ fileIds: newFileIds })
      });
    } catch (err) {
      console.error('File upload failed', err);
      alert('Failed to upload file to browser storage.');
    }
  };

  const handleDownload = (file: FileData) => {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this file from local storage?')) {
      await db.files.delete(id);
      
      const newFileIds = fileIds.filter(fid => fid !== id);
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({ fileIds: newFileIds })
      });

      if (previewFile?.id === id) {
        setPreviewFile(null);
        setPreviewContent(null);
      }
    }
  };

  const handlePreview = async (file: FileData) => {
    setPreviewFile(file);
    setPreviewContent(null);

    // If it's a previewable text file, load content
    if (file.type === 'text/plain' || file.type === 'text/csv' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      try {
        const text = await file.blob.text();
        setPreviewContent(text.substring(0, 5000)); // Limit preview size
      } catch (e) {
        setPreviewContent('Unable to read text file contents.');
      }
    }
  };

  // Filtered files
  const filteredFiles = sortedFiles.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? f.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'Images': return <Image className="w-5 h-5 text-blue-accent" />;
      case 'Videos': return <Film className="w-5 h-5 text-purple-accent" />;
      case 'Spreadsheets': return <FileSpreadsheet className="w-5 h-5 text-green-accent" />;
      case 'Archives': return <Archive className="w-5 h-5 text-yellow-500" />;
      default: return <FileText className="w-5 h-5 text-cyan-accent" />;
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* Search and upload bar */}
      {showControls && (
        <div className="flex gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-color-border-color bg-glass-bg/40 focus-within:border-cyan-accent">
            <Search className="w-4 h-4 text-muted-text" />
            <input
              type="text"
              placeholder="Search local documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs focus:outline-none text-primary-text"
            />
          </div>

          {/* Upload Button */}
          <label className="px-3.5 py-1.5 rounded-xl bg-cyan-accent text-black font-semibold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity">
            <Upload className="w-4 h-4" />
            <span>Upload</span>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Categories and Statistics Summary */}
      {showControls && (
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] cursor-pointer transition-colors ${
                selectedCategory === null 
                  ? 'border-cyan-accent bg-cyan-accent/5 text-cyan-accent' 
                  : 'border-color-border-color text-muted-text hover:text-secondary-text'
              }`}
            >
              All Categories
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2.5 py-1 rounded-lg border text-[10px] cursor-pointer transition-colors ${
                  selectedCategory === c 
                    ? 'border-cyan-accent bg-cyan-accent/5 text-cyan-accent' 
                    : 'border-color-border-color text-muted-text hover:text-secondary-text'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          
          {/* Storage Size Card */}
          <span className="text-[10px] text-muted-text font-semibold whitespace-nowrap">
            DB Storage: {(totalSize / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
      )}

      {/* Files Grid View */}
      <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar pr-0.5">
        {filteredFiles.length === 0 ? (
          <div className="p-10 text-center text-muted-text italic">
            No local files. Drag or upload a PDF, TXT, CSV, or Image file.
          </div>
        ) : (
          filteredFiles.map(f => (
            <div
              key={f.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-color-border-color bg-glass-bg/40 hover:bg-glass-bg/80 transition-colors"
            >
              <div className="flex items-center gap-3 max-w-[60%]">
                {getFileIcon(f.category)}
                <div className="flex flex-col truncate">
                  <span className="font-semibold text-primary-text truncate" title={f.name}>{f.name}</span>
                  <span className="text-[9px] text-muted-text">
                    {(f.size / 1024).toFixed(1)} KB &bull; {f.type.split('/')[1] || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {(f.type.startsWith('image/') || f.type === 'text/plain' || f.type === 'text/csv' || f.name.endsWith('.txt') || f.name.endsWith('.csv') || f.type === 'application/pdf') && (
                  <button
                    onClick={() => handlePreview(f)}
                    className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-cyan-accent cursor-pointer"
                    title="Preview file"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                
                <button
                  onClick={() => handleDownload(f)}
                  className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-cyan-accent cursor-pointer"
                  title="Download to system"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                
                {showControls && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-red-500 cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* File Preview Overlay Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-3xl h-[80vh] glass-panel rounded-2xl p-6 flex flex-col gap-4 text-primary-text animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-color-border-color pb-3">
              <div className="flex flex-col">
                <span className="font-bold text-sm">{previewFile.name}</span>
                <span className="text-[10px] text-muted-text">Category: {previewFile.category} &bull; Size: {(previewFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <button
                onClick={() => {
                  setPreviewFile(null);
                  setPreviewContent(null);
                }}
                className="p-1.5 rounded-xl hover:bg-glass-bg text-muted-text hover:text-primary-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Box content */}
            <div className="flex-1 overflow-auto bg-primary-bg/50 rounded-xl border border-color-border-color p-4 flex items-center justify-center">
              {previewFile.type.startsWith('image/') && (
                <img
                  src={URL.createObjectURL(previewFile.blob)}
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              )}

              {previewFile.type === 'application/pdf' && (
                <iframe
                  src={URL.createObjectURL(previewFile.blob)}
                  title={previewFile.name}
                  className="w-full h-full rounded-lg"
                />
              )}

              {(previewFile.type === 'text/plain' || previewFile.type === 'text/csv' || previewFile.name.endsWith('.txt') || previewFile.name.endsWith('.csv')) && (
                <pre className="w-full h-full text-[10px] text-secondary-text font-mono overflow-auto whitespace-pre-wrap">
                  {previewContent || 'Loading content preview...'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
