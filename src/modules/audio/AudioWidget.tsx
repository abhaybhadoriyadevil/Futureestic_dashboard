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

// ── Realistic Futuristic Vinyl Record Disc ────────────────
const VinylRecord: React.FC<{
  isPlaying: boolean;
  size: number;
  showTonearm?: boolean;
  onClick?: () => void;
}> = ({ isPlaying, size, showTonearm = true, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 rounded-full cursor-pointer select-none group/vinyl ${
        isPlaying
          ? 'shadow-[0_0_35px_rgba(6,182,212,0.45)] ring-1 ring-cyan-accent/40'
          : 'shadow-[0_0_15px_rgba(0,0,0,0.6)] ring-1 ring-white/10 hover:ring-cyan-accent/30'
      }`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transition: 'width 0.45s cubic-bezier(0.25, 0.1, 0.25, 1), height 0.45s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.45s ease',
      }}
      title={isPlaying ? 'Click to Pause' : 'Click to Play'}
    >
      {/* Vinyl Disc Body with continuous smooth rotation */}
      <div
        className="w-full h-full rounded-full relative overflow-hidden flex items-center justify-center border border-white/10 transition-all duration-500"
        style={{
          background: `
            radial-gradient(circle, 
              #14151f 0%, 
              #14151f 28%, 
              #202230 29%, 
              #111219 32%, 
              #282a3c 45%, 
              #161722 47%, 
              #32354a 60%, 
              #12131b 62%, 
              #2c2f42 76%, 
              #0c0d12 78%, 
              #222434 92%, 
              #08080c 100%
            )
          `,
          animation: 'vinylSpin 3.5s linear infinite',
          animationPlayState: isPlaying ? 'running' : 'paused',
        }}
      >
        {/* Holographic light reflection sheen */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-50 group-hover/vinyl:opacity-75 transition-opacity"
          style={{
            background: 'conic-gradient(from 45deg, rgba(255,255,255,0.2) 0deg, transparent 45deg, rgba(6,182,212,0.25) 90deg, transparent 135deg, rgba(255,255,255,0.2) 180deg, transparent 225deg, rgba(139,92,246,0.25) 270deg, transparent 315deg, rgba(255,255,255,0.2) 360deg)'
          }}
        />

        {/* Fine concentric micro-grooves */}
        <div className="absolute inset-[15%] rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute inset-[27%] rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute inset-[38%] rounded-full border border-white/10 pointer-events-none" />

        {/* Center Vinyl Label with Sci-Fi Neon Gradient */}
        <div
          className="rounded-full flex items-center justify-center shadow-lg relative z-10 border border-black/40"
          style={{
            width: `${Math.round(size * 0.38)}px`,
            height: `${Math.round(size * 0.38)}px`,
            background: 'radial-gradient(circle at 35% 35%, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
            transition: 'width 0.45s cubic-bezier(0.25, 0.1, 0.25, 1), height 0.45s cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
          {/* Circular track ring on label */}
          <div className="absolute inset-[18%] rounded-full border border-white/30 pointer-events-none" />

          {/* Center spindle hole */}
          <div
            className="rounded-full bg-[#050507] border border-cyan-300/40 shadow-inner flex items-center justify-center"
            style={{
              width: `${Math.max(6, Math.round(size * 0.12))}px`,
              height: `${Math.max(6, Math.round(size * 0.12))}px`,
              transition: 'width 0.45s ease, height 0.45s ease',
            }}
          >
            <div className="w-1 h-1 rounded-full bg-cyan-accent" />
          </div>
        </div>
      </div>

      {/* Floating Stylus Tonearm Indicator in standard size */}
      {size >= 80 && showTonearm && (
        <div 
          className="absolute -top-1 -right-2 pointer-events-none transition-all duration-500 origin-top-right z-20"
          style={{
            transform: isPlaying ? 'rotate(0deg)' : 'rotate(-18deg)'
          }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-gray-600 to-gray-900 border border-white/20 shadow-md flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-accent/80" />
          </div>
          <div className="w-1.5 h-10 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm -mt-0.5 ml-1 shadow-sm relative">
            <div className="absolute -bottom-1 -left-1 w-3.5 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xs shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
export const AudioWidget: React.FC<AudioWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const { ref: sizeRef, width, height } = useContainerSize();
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Dynamic disc sizes: gets big when unhovered, shrinks when hovered
  const bigDiscSize = Math.max(130, Math.min(width - 24, height - 24, 280));
  const isCompact = height < 240 || width < 280;
  const isTiny = height < 170 || width < 220;
  const smallDiscSize = isCompact ? (isTiny ? 46 : 56) : (height > 340 ? 100 : 80);
  const currentDiscSize = isHovered ? smallDiscSize : bigDiscSize;

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

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

                  {/* Delete Track */}
                  <button
                    onClick={(e) => handleDelete(a.id, e)}
                    className="opacity-0 group-hover/track:opacity-100 p-1.5 rounded hover:bg-red-500/10 text-muted-text hover:text-red-400 cursor-pointer transition-all"
                    title="Delete track"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Mini player bar at bottom */}
        {activeAudio && (
          <div className="shrink-0 border-t border-color-border-color bg-glass-bg/20 px-3 py-1.5 flex items-center gap-2.5">
            <audio
              ref={audioRef}
              src={blobUrl || undefined}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
              onEnded={handleEnded}
              className="hidden"
            />
            <VinylRecord isPlaying={isPlaying} size={28} onClick={togglePlay} />
            <button onClick={skipPrev} className="text-muted-text hover:text-primary-text cursor-pointer transition-colors">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button onClick={togglePlay} className="w-6 h-6 rounded-full bg-cyan-accent text-black flex items-center justify-center cursor-pointer hover:opacity-90 shrink-0">
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
            </button>
            <button onClick={skipNext} className="text-muted-text hover:text-primary-text cursor-pointer transition-colors">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 accent-cyan-400 cursor-pointer"
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
    <div
      ref={sizeRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-3 text-xs text-primary-text bg-transparent overflow-hidden relative select-none"
    >

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={blobUrl || undefined}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleEnded}
        className="hidden"
      />

      {activeAudio ? (
        <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden relative">
          
          {/* Centered Vinyl Record container */}
          <div className={`relative flex items-center justify-center transition-all duration-500 ease-out ${
            isHovered ? 'shrink-0 my-1' : 'flex-1 my-auto'
          }`}>
            <VinylRecord
              isPlaying={isPlaying}
              size={currentDiscSize}
              showTonearm={isHovered}
              onClick={togglePlay}
            />
          </div>

          {/* Controls & Options Overlay — visible only on hover */}
          <div
            className={`w-full flex flex-col items-center justify-end transition-all duration-300 ease-out ${
              isHovered
                ? 'opacity-100 max-h-[350px] pointer-events-auto pb-1'
                : 'opacity-0 max-h-0 pointer-events-none overflow-hidden'
            }`}
          >
            {/* Track Title & Equalizer */}
            <div className="text-center px-2 w-full shrink-0 mb-1">
              <div className="flex items-center justify-center gap-2">
                <p className="font-bold text-xs sm:text-sm text-primary-text truncate max-w-[240px]">
                  {activeAudio.name}
                </p>
                <div className="flex gap-0.5 items-end h-3 shrink-0">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`w-0.5 bg-cyan-accent rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
                      style={{
                        height: isPlaying ? `${4 + (i % 2 === 0 ? 8 : 4)}px` : '3px',
                        animationDuration: `${0.4 + i * 0.15}s`
                      }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-text mt-0.5">
                Track {audios.indexOf(activeAudio) + 1} of {audios.length} · {isPlaying ? 'Playing' : 'Paused'}
              </p>
            </div>

            {/* Progress Scrub Bar */}
            <div className="w-full max-w-xs flex items-center gap-2 shrink-0 mb-1.5 px-2">
              <span className="text-[9px] font-mono text-muted-text w-7 shrink-0 text-right">{fmt(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-white/10 hover:bg-white/20 transition-colors"
              />
              <span className="text-[9px] font-mono text-muted-text w-7 shrink-0">{fmt(duration)}</span>
            </div>

            {/* Primary Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 mb-1.5">
              <button
                onClick={toggleLoop}
                title={isLoop ? 'Loop ON' : 'Loop OFF'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isLoop ? 'text-cyan-accent bg-cyan-accent/10' : 'text-muted-text hover:text-secondary-text'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={skipPrev}
                className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-accent to-blue-500 text-black flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button
                onClick={skipNext}
                className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={toggleShuffle}
                title={isShuffle ? 'Shuffle ON' : 'Shuffle OFF'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isShuffle ? 'text-purple-400 bg-purple-400/10' : 'text-muted-text hover:text-secondary-text'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleView('playlist')}
                title="Open playlist"
                className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
              >
                <List className="w-4 h-4" />
              </button>
              {showControls && (
                <label
                  className="p-1.5 rounded-lg text-secondary-text hover:text-cyan-accent cursor-pointer transition-colors"
                  title="Upload Audio"
                >
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.flac,.aac"
                    onChange={handleUpload}
                    className="hidden"
                  />
                </label>
              )}
              <button
                onClick={(e) => activeAudio && handleDelete(activeAudio.id, e)}
                className="p-1.5 rounded-lg text-secondary-text hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                title="Delete Track"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume + Mute */}
            <div className="flex items-center gap-2 w-full max-w-xs shrink-0 px-2">
              <button
                onClick={() => setIsMuted(m => !m)}
                className="text-muted-text hover:text-primary-text cursor-pointer shrink-0"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  setIsMuted(v === 0);
                }}
                className="flex-1 h-1 cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-text border border-dashed border-color-border-color rounded-xl p-3">
          <VinylRecord isPlaying={false} size={isHovered ? 64 : bigDiscSize} showTonearm={false} />
          {!isTiny && <span className="text-center italic text-[11px] px-2">No audio loaded. Upload a track to start.</span>}
          {showControls && (
            <label className="px-2.5 py-1 rounded-lg border border-dashed border-color-border-color hover:border-cyan-accent font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-cyan-accent/5 transition-colors text-[10px] text-cyan-accent">
              <Upload className="w-3 h-3 text-cyan-accent" />
              <span>Upload Audio</span>
              <input type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.aac" onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      )}
    </div>
  );
};
