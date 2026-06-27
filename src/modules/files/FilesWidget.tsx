import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  FileText,
  Music,
  File,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface FilesWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

type FileCategory = 'Documents' | 'Images' | 'Videos' | 'Audio' | 'Spreadsheets' | 'Archives' | 'Others';

const getCategoryFromType = (type: string, name: string): FileCategory => {
  if (type.startsWith('image/')) return 'Images';
  if (type.startsWith('video/')) return 'Videos';
  if (type.startsWith('audio/')) return 'Audio';
  if (
    type === 'text/plain' ||
    type === 'application/pdf' ||
    type.includes('word') ||
    type.includes('document') ||
    name.endsWith('.md') ||
    name.endsWith('.txt') ||
    name.endsWith('.pdf') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  )
    return 'Documents';
  if (
    type.includes('sheet') ||
    type === 'text/csv' ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv')
  )
    return 'Spreadsheets';
  if (
    type.includes('zip') ||
    type.includes('tar') ||
    type.includes('compressed') ||
    type.includes('rar') ||
    name.endsWith('.zip') ||
    name.endsWith('.tar') ||
    name.endsWith('.rar') ||
    name.endsWith('.7z')
  )
    return 'Archives';
  return 'Others';
};

const isVideoFile = (f: FileData) =>
  f.type.startsWith('video/') ||
  ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi'].some(ext => f.name.toLowerCase().endsWith(ext));

const isAudioFile = (f: FileData) =>
  f.type.startsWith('audio/') ||
  ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'].some(ext => f.name.toLowerCase().endsWith(ext));

const isImageFile = (f: FileData) => f.type.startsWith('image/');

const isPdfFile = (f: FileData) =>
  f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

const isTextFile = (f: FileData) =>
  f.type === 'text/plain' ||
  f.type === 'text/csv' ||
  f.type === 'text/markdown' ||
  ['.txt', '.csv', '.md', '.json', '.xml', '.yaml', '.yml', '.log', '.ini', '.env'].some(ext =>
    f.name.toLowerCase().endsWith(ext)
  );

const isPreviewable = (f: FileData) =>
  isVideoFile(f) || isAudioFile(f) || isImageFile(f) || isPdfFile(f) || isTextFile(f);

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatTime = (t: number): string => {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// ──────────────────────────────────────────────
// Video player sub-component
// ──────────────────────────────────────────────
const VideoPreview: React.FC<{ file: FileData }> = ({ file }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const blobUrl = useRef<string>('');

  useEffect(() => {
    blobUrl.current = URL.createObjectURL(file.blob);
    return () => URL.revokeObjectURL(blobUrl.current);
  }, [file.blob]);

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const handleFullscreen = () => videoRef.current?.requestFullscreen?.();

  return (
    <div className="w-full h-full flex flex-col gap-3">
      <div className="relative flex-1 rounded-xl overflow-hidden bg-black group/vp">
        <video
          ref={videoRef}
          src={blobUrl.current}
          className="w-full h-full object-contain"
          onClick={toggle}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
          onEnded={() => setPlaying(false)}
          muted={muted}
        />
        {/* Overlay controls */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/vp:opacity-100 transition-opacity pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center border border-white/20 backdrop-blur-sm">
            {playing
              ? <Pause className="w-7 h-7 text-white fill-white" />
              : <Play className="w-7 h-7 text-white fill-white ml-1" />
            }
          </div>
        </div>
        <div
          className="absolute inset-0 cursor-pointer pointer-events-auto"
          onClick={toggle}
        />
      </div>
      {/* Control bar */}
      <div className="flex flex-col gap-2 px-1">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={e => {
            const t = parseFloat(e.target.value);
            if (videoRef.current) videoRef.current.currentTime = t;
            setCurrentTime(t);
          }}
          className="w-full h-1.5 accent-cyan-500 cursor-pointer rounded-full bg-white/10"
        />
        <div className="flex items-center justify-between text-[10px] text-secondary-text">
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="hover:text-cyan-400 transition-colors cursor-pointer">
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <button onClick={handleFullscreen} className="hover:text-cyan-400 transition-colors cursor-pointer">
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Audio player sub-component
// ──────────────────────────────────────────────
const AudioPreview: React.FC<{ file: FileData }> = ({ file }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const blobUrl = useRef<string>('');

  useEffect(() => {
    blobUrl.current = URL.createObjectURL(file.blob);
    return () => URL.revokeObjectURL(blobUrl.current);
  }, [file.blob]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 px-8 select-none">
      {/* Album Art Placeholder */}
      <div className="relative flex items-center justify-center">
        <div
          className={`w-32 h-32 rounded-full border-4 border-cyan-500/30 bg-gradient-to-br from-cyan-900/40 to-purple-900/40 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)] ${playing ? 'animate-spin' : ''}`}
          style={{ animationDuration: '8s' }}
        >
          <Music className="w-12 h-12 text-cyan-400/70" />
        </div>
        <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-ping opacity-30" style={{ animationDuration: playing ? '2s' : '999s' }} />
      </div>

      {/* Song name */}
      <div className="text-center">
        <p className="font-bold text-sm text-primary-text truncate max-w-xs">{file.name}</p>
        <p className="text-[10px] text-muted-text mt-0.5">{formatSize(file.size)} · {file.type || 'audio'}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={e => {
            const t = parseFloat(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = t;
            setCurrentTime(t);
          }}
          className="w-full h-1.5 accent-cyan-500 cursor-pointer rounded-full"
          style={{ background: `linear-gradient(to right, #06b6d4 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 0%)` }}
        />
        <div className="flex justify-between text-[9px] font-mono text-muted-text">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => { setMuted(m => !m); if (audioRef.current) audioRef.current.muted = !muted; }}
          className="text-secondary-text hover:text-cyan-400 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <button
          onClick={toggle}
          className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all cursor-pointer hover:scale-105"
        >
          {playing
            ? <Pause className="w-7 h-7 fill-current" />
            : <Play className="w-7 h-7 fill-current ml-1" />}
        </button>

        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-muted-text" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={e => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="w-16 h-1 accent-cyan-500 cursor-pointer"
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={blobUrl.current}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
        muted={muted}
        className="hidden"
      />
    </div>
  );
};

// ──────────────────────────────────────────────
// Main FilesWidget
// ──────────────────────────────────────────────
export const FilesWidget: React.FC<FilesWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | null>(null);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [fileIds, setFileIds] = useState<string[]>([]);

  // ── Sync fileIds from per-widget dataRef ──────────────────────
  // Each widget instance stores its own list of file IDs in dataRef.
  // This ensures full data isolation between multiple FilesWidgets.
  useEffect(() => {
    if (dataRef) {
      try {
        const parsed = JSON.parse(dataRef);
        if (parsed.fileIds && Array.isArray(parsed.fileIds)) {
          setFileIds(parsed.fileIds);
        } else {
          setFileIds([]);
        }
      } catch {
        setFileIds([]);
      }
    } else {
      setFileIds([]);
    }
  }, [dataRef]);

  // Load only files belonging to THIS widget
  const files = useLiveQuery(async () => {
    if (fileIds.length === 0) return [];
    const list = await db.files.bulkGet(fileIds);
    return list.filter((f): f is FileData => !!f);
  }, [fileIds]) || [];

  const sortedFiles = [...files].sort((a, b) => b.createdAt - a.createdAt);

  const categories: FileCategory[] = ['Documents', 'Images', 'Videos', 'Audio', 'Spreadsheets', 'Archives', 'Others'];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    // Reset input so same file can be re-uploaded
    e.target.value = '';

    const newIds: string[] = [];
    for (const file of selected) {
      try {
        const id = `file-${Math.random().toString(36).substr(2, 9)}`;
        const category = getCategoryFromType(file.type, file.name);
        const fileEntry: FileData = {
          id,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          blob: file,
          tags: [category.toLowerCase()],
          category,
          createdAt: Date.now(),
        };
        await db.files.add(fileEntry);
        newIds.push(id);
      } catch (err) {
        console.error('File upload failed:', file.name, err);
      }
    }

    if (newIds.length > 0) {
      const updatedIds = [...fileIds, ...newIds];
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({ fileIds: updatedIds }),
      });
    }
  };

  const handleDownload = (file: FileData) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this file from local storage?')) return;
    await db.files.delete(id);
    const newIds = fileIds.filter(fid => fid !== id);
    await commitWidgetUpdate(widgetId, { dataRef: JSON.stringify({ fileIds: newIds }) });
    if (previewFile?.id === id) {
      setPreviewFile(null);
      setPreviewContent(null);
    }
  };

  const handlePreview = async (file: FileData) => {
    setPreviewFile(file);
    setPreviewContent(null);
    if (isTextFile(file)) {
      try {
        const text = await file.blob.text();
        setPreviewContent(text.substring(0, 10000));
      } catch {
        setPreviewContent('Unable to read file contents.');
      }
    }
  };

  const filteredFiles = sortedFiles.filter(f => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? f.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (f: FileData, size = 'w-5 h-5') => {
    if (isVideoFile(f)) return <Film className={`${size} text-purple-accent`} />;
    if (isAudioFile(f)) return <Music className={`${size} text-pink-400`} />;
    if (isImageFile(f)) return <Image className={`${size} text-blue-accent`} />;
    if (isPdfFile(f)) return <FileText className={`${size} text-red-400`} />;
    switch (f.category) {
      case 'Spreadsheets': return <FileSpreadsheet className={`${size} text-green-accent`} />;
      case 'Archives': return <Archive className={`${size} text-yellow-500`} />;
      case 'Documents': return <FileText className={`${size} text-cyan-accent`} />;
      default: return <File className={`${size} text-muted-text`} />;
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  // Navigate preview (next / prev)
  const previewIndex = previewFile ? filteredFiles.findIndex(f => f.id === previewFile.id) : -1;
  const goPrev = () => {
    if (previewIndex > 0) handlePreview(filteredFiles[previewIndex - 1]);
  };
  const goNext = () => {
    if (previewIndex < filteredFiles.length - 1) handlePreview(filteredFiles[previewIndex + 1]);
  };

  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">

      {/* ── Search + Upload Bar ── */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-color-border-color bg-glass-bg/40 focus-within:border-cyan-accent transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-text shrink-0" />
          <input
            type="text"
            placeholder="Search files…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs focus:outline-none text-primary-text placeholder:text-muted-text"
          />
        </div>
        {showControls && (
          <label className="px-3 py-1.5 rounded-xl bg-cyan-accent text-black font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity shrink-0">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* ── Category Filter + Size ── */}
      {showControls && (
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-2 py-0.5 rounded-lg border text-[9px] cursor-pointer transition-colors ${
                selectedCategory === null
                  ? 'border-cyan-accent bg-cyan-accent/5 text-cyan-accent'
                  : 'border-color-border-color text-muted-text hover:text-secondary-text'
              }`}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2 py-0.5 rounded-lg border text-[9px] cursor-pointer transition-colors ${
                  selectedCategory === c
                    ? 'border-cyan-accent bg-cyan-accent/5 text-cyan-accent'
                    : 'border-color-border-color text-muted-text hover:text-secondary-text'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-[9px] text-muted-text font-semibold whitespace-nowrap shrink-0">
            {formatSize(totalSize)}
          </span>
        </div>
      )}

      {/* ── File List ── */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5" style={{ scrollbarWidth: 'none' }}>
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-text">
            <File className="w-10 h-10 opacity-30" />
            <p className="italic text-center leading-relaxed">
              No files yet. Click <strong className="text-secondary-text">Upload</strong> (via controls) to add any file.
            </p>
          </div>
        ) : (
          filteredFiles.map(f => (
            <div
              key={f.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-color-border-color bg-glass-bg/30 hover:bg-glass-bg/70 transition-colors group/file"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {getFileIcon(f)}
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-primary-text truncate" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-[9px] text-muted-text">
                    {formatSize(f.size)} · {f.category}
                    {isVideoFile(f) && ' · Video'}
                    {isAudioFile(f) && ' · Audio'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => handlePreview(f)}
                  className={`p-1.5 rounded-lg text-secondary-text cursor-pointer transition-colors ${
                    isPreviewable(f)
                      ? 'hover:bg-glass-bg hover:text-cyan-accent'
                      : 'hover:bg-glass-bg hover:text-muted-text'
                  }`}
                  title={isPreviewable(f) ? 'Open / Play' : 'View file info'}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDownload(f)}
                  className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-cyan-accent cursor-pointer transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {showControls && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-red-500 cursor-pointer transition-colors opacity-0 group-hover/file:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Universal File Preview / Player Modal ── */}
      {previewFile && createPortal(
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[60] p-6"
          onClick={e => { if (e.target === e.currentTarget) { setPreviewFile(null); setPreviewContent(null); } }}
        >
          <div className="w-full max-w-3xl h-[85vh] glass-panel rounded-2xl flex flex-col overflow-hidden border border-color-border-color shadow-2xl animate-[fadeIn_0.2s_ease-out]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-color-border-color bg-glass-bg/30 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(previewFile, 'w-4 h-4')}
                <div className="min-w-0">
                  <p className="font-bold text-sm text-primary-text truncate">{previewFile.name}</p>
                  <p className="text-[10px] text-muted-text">{previewFile.category} · {formatSize(previewFile.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Prev / Next navigation */}
                {filteredFiles.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      disabled={previewIndex <= 0}
                      className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-primary-text cursor-pointer disabled:opacity-30 transition-colors"
                      title="Previous file"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-muted-text font-mono">{previewIndex + 1}/{filteredFiles.length}</span>
                    <button
                      onClick={goNext}
                      disabled={previewIndex >= filteredFiles.length - 1}
                      className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-primary-text cursor-pointer disabled:opacity-30 transition-colors"
                      title="Next file"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="p-1.5 rounded-lg hover:bg-glass-bg text-secondary-text hover:text-cyan-accent cursor-pointer transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setPreviewFile(null); setPreviewContent(null); }}
                  className="p-1.5 rounded-xl hover:bg-glass-bg text-muted-text hover:text-primary-text cursor-pointer transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden relative">

              {/* 🎬 Video player */}
              {isVideoFile(previewFile) && (
                <div className="w-full h-full p-4">
                  <VideoPreview file={previewFile} />
                </div>
              )}

              {/* 🎵 Audio player */}
              {!isVideoFile(previewFile) && isAudioFile(previewFile) && (
                <div className="w-full h-full">
                  <AudioPreview file={previewFile} />
                </div>
              )}

              {/* 🖼️ Image viewer */}
              {isImageFile(previewFile) && (
                <div className="w-full h-full flex items-center justify-center p-4 bg-black/30">
                  <img
                    src={URL.createObjectURL(previewFile.blob)}
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                </div>
              )}

              {/* 📄 PDF viewer */}
              {isPdfFile(previewFile) && !isVideoFile(previewFile) && !isAudioFile(previewFile) && !isImageFile(previewFile) && (
                <iframe
                  src={URL.createObjectURL(previewFile.blob)}
                  title={previewFile.name}
                  className="w-full h-full"
                />
              )}

              {/* 📝 Text / code viewer */}
              {isTextFile(previewFile) && !isVideoFile(previewFile) && !isAudioFile(previewFile) && !isImageFile(previewFile) && !isPdfFile(previewFile) && (
                <pre className="w-full h-full text-[11px] text-secondary-text font-mono p-5 overflow-auto leading-relaxed whitespace-pre-wrap break-words">
                  {previewContent ?? 'Loading…'}
                </pre>
              )}

              {/* 📦 Unpreviewable file — info + download card */}
              {!isPreviewable(previewFile) && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl border border-color-border-color bg-glass-bg/40 flex items-center justify-center">
                    {getFileIcon(previewFile, 'w-10 h-10')}
                  </div>
                  <div>
                    <p className="font-bold text-base text-primary-text mb-1">{previewFile.name}</p>
                    <p className="text-sm text-muted-text">{previewFile.category} · {formatSize(previewFile.size)}</p>
                    <p className="text-[11px] text-muted-text mt-2 opacity-70">
                      This file type cannot be previewed in the browser.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-accent text-black font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download to Open
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
