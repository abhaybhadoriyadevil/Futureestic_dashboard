import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import type { FileData } from '../../types';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useContainerSize } from '../../hooks/useContainerSize';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Music,
  List,
  Disc,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  ArrowLeft,
  Trash2,
} from 'lucide-react';

interface AudioWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

// ── helpers ──────────────────────────────────────────────
const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// ─────────────────────────────────────────────────────────
export const AudioWidget: React.FC<AudioWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const { ref: sizeRef, sz, isSM } = useContainerSize();
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── persisted state ──────────────────────────────────
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [view, setView] = useState<'player' | 'playlist'>('player'); // 'player' | 'playlist'
  const [isLoop, setIsLoop] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  // ── transient state ───────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [blobUrl, setBlobUrl] = useState('');
  const [volume, setVolume] = useState(1);

  // ── parse dataRef on mount/change ────────────────────
  useEffect(() => {
    if (!dataRef) { setFileIds([]); return; }
    try {
      const p = JSON.parse(dataRef);
      if (p.fileIds && Array.isArray(p.fileIds)) setFileIds(p.fileIds);
      if (p.activeAudioId) setActiveAudioId(p.activeAudioId);
      if (p.view) setView(p.view as 'player' | 'playlist');
      if (typeof p.isLoop === 'boolean') setIsLoop(p.isLoop);
      if (typeof p.isShuffle === 'boolean') setIsShuffle(p.isShuffle);
    } catch { setFileIds([]); }
  }, [dataRef]);

  // ── live query ────────────────────────────────────────
  const audios = useLiveQuery(async () => {
    if (fileIds.length === 0) return [];
    const list = await db.files.bulkGet(fileIds);
    return list.filter((f): f is FileData => !!f);
  }, [fileIds]) || [];

  const activeAudio = audios.find(a => a.id === activeAudioId) || null;

  // ── auto-select first track ───────────────────────────
  useEffect(() => {
    if (audios.length > 0 && !activeAudioId) {
      setActiveAudioId(audios[0].id);
    }
  }, [audios, activeAudioId]);

  // ── blob url for active track ─────────────────────────
  useEffect(() => {
    if (!activeAudio) { setBlobUrl(''); return; }
    const url = URL.createObjectURL(activeAudio.blob);
    setBlobUrl(url);
    setCurrentTime(0);
    return () => URL.revokeObjectURL(url);
  }, [activeAudio]);

  // ── sync loop on audio element ────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = isLoop;
  }, [isLoop]);

  // ── sync volume ───────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ── commit helper ─────────────────────────────────────
  const commit = (patch: Record<string, unknown>) => {
    const base = { fileIds, activeAudioId, view, isLoop, isShuffle };
    return commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify({ ...base, ...patch }),
    });
  };

  // ── playback ──────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleEnded = () => {
    if (isLoop) return; // loop handled natively by audio element
    if (isShuffle) {
      const others = audios.filter(a => a.id !== activeAudioId);
      if (others.length === 0) return;
      const next = others[Math.floor(Math.random() * others.length)];
      switchTrack(next.id);
    } else {
      const idx = audios.findIndex(a => a.id === activeAudioId);
      if (idx < audios.length - 1) switchTrack(audios[idx + 1].id);
      else { setIsPlaying(false); setCurrentTime(0); }
    }
  };

  const switchTrack = async (id: string) => {
    setActiveAudioId(id);
    setIsPlaying(false);
    setCurrentTime(0);
    await commit({ activeAudioId: id });
    // Small delay so blobUrl updates, then auto-play
    setTimeout(() => {
      audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
    }, 80);
  };

  const skipPrev = () => {
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const idx = audios.findIndex(a => a.id === activeAudioId);
    if (idx > 0) switchTrack(audios[idx - 1].id);
  };

  const skipNext = () => {
    if (isShuffle) {
      const others = audios.filter(a => a.id !== activeAudioId);
      if (others.length > 0) switchTrack(others[Math.floor(Math.random() * others.length)].id);
    } else {
      const idx = audios.findIndex(a => a.id === activeAudioId);
      if (idx < audios.length - 1) switchTrack(audios[idx + 1].id);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  // ── view toggle ───────────────────────────────────────
  const toggleView = async (v: 'player' | 'playlist') => {
    setView(v);
    await commit({ view: v });
  };

  // ── loop / shuffle ────────────────────────────────────
  const toggleLoop = async () => {
    const next = !isLoop;
    setIsLoop(next);
    if (next) { setIsShuffle(false); await commit({ isLoop: next, isShuffle: false }); }
    else await commit({ isLoop: next });
  };

  const toggleShuffle = async () => {
    const next = !isShuffle;
    setIsShuffle(next);
    if (next) { setIsLoop(false); await commit({ isShuffle: next, isLoop: false }); }
    else await commit({ isShuffle: next });
  };

  // ── upload ────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const id = `file-${Math.random().toString(36).substr(2, 9)}`;
      await db.files.add({
        id, name: file.name, type: file.type, size: file.size,
        blob: file, tags: ['audio'], category: 'Audio', createdAt: Date.now(),
      } as FileData);
      const newIds = [...fileIds, id];
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({ fileIds: newIds, activeAudioId: id, view, isLoop, isShuffle }),
      });
    } catch (err) { console.error('Upload failed', err); }
  };

  const handleDelete = async (id: string) => {
    await db.files.delete(id);
    const newIds = fileIds.filter(f => f !== id);
    const nextActive = id === activeAudioId ? (newIds[0] || null) : activeAudioId;
    await commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify({ fileIds: newIds, activeAudioId: nextActive, view, isLoop, isShuffle }),
    });
    if (id === activeAudioId) { setIsPlaying(false); setCurrentTime(0); }
  };

  // ─────────────────────────────────────────────────────
  // PLAYLIST VIEW — full widget
  // ─────────────────────────────────────────────────────
  if (view === 'playlist') {
    return (
      <div ref={sizeRef} className="w-full h-full flex flex-col text-xs text-primary-text bg-transparent overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-color-border-color shrink-0">
          <button
            onClick={() => toggleView('player')}
            className="flex items-center gap-1.5 text-muted-text hover:text-primary-text cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-semibold">Playlist</span>
          </button>
          <div className="flex items-center gap-2">
            {/* Loop */}
            <button
              onClick={toggleLoop}
              title="Loop"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isLoop ? 'text-cyan-accent bg-cyan-accent/10' : 'text-muted-text hover:text-primary-text'}`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              title="Shuffle"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isShuffle ? 'text-purple-400 bg-purple-400/10' : 'text-muted-text hover:text-primary-text'}`}
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            {showControls && (
              <label className="px-2 py-1 rounded-lg bg-cyan-accent text-black font-bold flex items-center gap-1 cursor-pointer hover:opacity-90 transition-opacity text-[10px]">
                <Upload className="w-3 h-3" />
                <span>Add</span>
                <input type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.aac" onChange={handleUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Track list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ scrollbarWidth: 'none' }}>
          {audios.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-text">
              <Music className="w-10 h-10 opacity-30" />
              <span className="italic">No audio yet. Click Add to upload.</span>
            </div>
          ) : (
            audios.map((a, idx) => {
              const isActive = a.id === activeAudioId;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all group/track ${
                    isActive
                      ? 'border-cyan-accent/40 bg-cyan-accent/5'
                      : 'border-color-border-color bg-glass-bg/30 hover:bg-glass-bg/60'
                  }`}
                >
                  {/* Index / playing indicator */}
                  <button
                    onClick={() => isActive ? togglePlay() : switchTrack(a.id)}
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full cursor-pointer"
                  >
                    {isActive && isPlaying
                      ? <Pause className="w-3.5 h-3.5 text-cyan-accent" />
                      : isActive
                        ? <Play className="w-3.5 h-3.5 text-cyan-accent fill-current" />
                        : <span className="text-[10px] text-muted-text font-mono">{idx + 1}</span>
                    }
                  </button>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`truncate font-semibold ${isActive ? 'text-cyan-accent' : 'text-primary-text'}`}>
                      {a.name}
                    </p>
                    {isActive && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex gap-0.5 items-end h-3">
                          {[1,2,3,4].map(i => (
                            <div
                              key={i}
                              className={`w-0.5 bg-cyan-accent rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}
                              style={{ height: `${isPlaying ? 4 + Math.random() * 8 : 3}px`, animationDelay: `${i * 80}ms` }}
                            />
                          ))}
                        </div>
                        <span className="text-[9px] text-cyan-accent/70">{isPlaying ? 'Playing' : 'Paused'}</span>
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  {showControls && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="opacity-0 group-hover/track:opacity-100 p-1 rounded hover:bg-glass-bg text-muted-text hover:text-red-400 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Mini player bar at bottom */}
        {activeAudio && (
          <div className="shrink-0 border-t border-color-border-color bg-glass-bg/20 px-4 py-2 flex items-center gap-3">
            <audio
              ref={audioRef}
              src={blobUrl}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
              onEnded={handleEnded}
              className="hidden"
            />
            <button onClick={skipPrev} className="text-muted-text hover:text-primary-text cursor-pointer transition-colors">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button onClick={togglePlay} className="w-7 h-7 rounded-full bg-cyan-accent text-black flex items-center justify-center cursor-pointer hover:opacity-90 shrink-0">
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <button onClick={skipNext} className="text-muted-text hover:text-primary-text cursor-pointer transition-colors">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 accent-cyan-500 cursor-pointer"
              />
            </div>
            <span className="text-[9px] text-muted-text font-mono shrink-0">{fmt(currentTime)}/{fmt(duration)}</span>
            <button onClick={() => { setIsMuted(m => !m); }} className="text-muted-text hover:text-primary-text cursor-pointer">
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // PLAYER VIEW — default
  // ─────────────────────────────────────────────────────
  return (
    <div ref={sizeRef} className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={blobUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleEnded}
        className="hidden"
      />

      {activeAudio ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 overflow-hidden">

          {/* Vinyl disc — scales with widget size */}
          <div
            className={`rounded-full bg-gradient-to-tr from-cyan-accent via-purple-500/60 to-pink-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.25)] shrink-0 transition-all duration-700 ${isPlaying ? 'animate-spin' : ''} ${sz === 'xs' ? 'w-12 h-12' : sz === 'sm' ? 'w-16 h-16' : sz === 'md' ? 'w-20 h-20' : 'w-24 h-24'}`}
            style={{ animationDuration: '4s' }}
          >
            <div className={`bg-[#0d0d0d] rounded-full border-2 border-black/20 flex items-center justify-center ${sz === 'xs' ? 'w-4 h-4' : sz === 'sm' ? 'w-5 h-5' : 'w-8 h-8'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-accent/40" />
            </div>
          </div>

          {/* Track name */}
          {!isSM && (
            <div className="text-center px-2 w-full">
              <p className="font-bold text-sm text-primary-text truncate">{activeAudio.name}</p>
              <p className="text-[10px] text-muted-text mt-0.5">{audios.indexOf(activeAudio) + 1} / {audios.length} tracks</p>
            </div>
          )}
          {isSM && (
            <p className="font-bold text-[10px] text-primary-text truncate px-2 w-full text-center">{activeAudio.name}</p>
          )}

          {/* Progress bar */}
          <div className="w-full max-w-xs flex items-center gap-2">
            {!isSM && <span className="text-[9px] font-mono text-muted-text w-8 shrink-0 text-right">{fmt(currentTime)}</span>}
            <input
              type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-500 bg-white/10"
            />
            {!isSM && <span className="text-[9px] font-mono text-muted-text w-8 shrink-0">{fmt(duration)}</span>}
          </div>

          {/* Controls */}
          <div className={`flex items-center ${sz === 'xs' ? 'gap-2' : 'gap-4'}`}>
            {!isSM && (
              <button onClick={toggleLoop} title={isLoop ? 'Loop ON' : 'Loop OFF'}
                className={`transition-colors cursor-pointer ${isLoop ? 'text-cyan-accent' : 'text-muted-text hover:text-secondary-text'}`}>
                <Repeat className="w-3.5 h-3.5" />
              </button>
            )}

            <button onClick={skipPrev} className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors">
              <SkipBack className={sz === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>

            <button
              onClick={togglePlay}
              className={`rounded-full bg-gradient-to-br from-cyan-accent to-blue-500 text-black flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-[0_0_20px_rgba(34,211,238,0.3)] ${sz === 'xs' ? 'w-7 h-7' : 'w-10 h-10'}`}
            >
              {isPlaying
                ? <Pause className={sz === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                : <Play className={`fill-current ml-0.5 ${sz === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              }
            </button>

            <button onClick={skipNext} className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors">
              <SkipForward className={sz === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>

            {!isSM && (
              <button
                onClick={toggleShuffle}
                title={isShuffle ? 'Shuffle ON' : 'Shuffle OFF'}
                className={`transition-colors cursor-pointer ${isShuffle ? 'text-purple-400' : 'text-muted-text hover:text-secondary-text'}`}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Playlist toggle */}
            <button
              onClick={() => toggleView('playlist')}
              title="Open playlist"
              className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
            >
              <List className={sz === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>

            {/* Upload */}
            {showControls && (
              <label className="text-secondary-text hover:text-cyan-accent cursor-pointer transition-colors" title="Upload Audio">
                <Upload className={sz === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                <input type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.aac" onChange={handleUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Volume + Mute */}
          <div className="flex items-center gap-2 w-full max-w-xs">
            <button onClick={() => setIsMuted(m => !m)} className="text-muted-text hover:text-primary-text cursor-pointer shrink-0">
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range" min={0} max={1} step={0.02} value={isMuted ? 0 : volume}
              onChange={e => { const v = parseFloat(e.target.value); setVolume(v); setIsMuted(v === 0); }}
              className="flex-1 h-1 cursor-pointer accent-cyan-500"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-text border border-dashed border-color-border-color rounded-xl">
          <Disc className={sz === 'xs' ? 'w-6 h-6 opacity-30' : 'w-10 h-10 opacity-30'} />
          {!isSM && <span className="text-center italic px-4">No audio loaded. Upload a track to get started.</span>}
          {showControls && (
            <label className="px-2.5 py-1.5 rounded-xl border border-dashed border-color-border-color hover:border-cyan-accent font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-cyan-accent/5 transition-colors">
              <Upload className="w-3.5 h-3.5 text-cyan-accent" />
              <span>Upload Audio</span>
              <input type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.aac" onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      )}
    </div>
  );
};
