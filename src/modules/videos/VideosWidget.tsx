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
  Maximize, 
  Upload, 
  Video, 
  List, 
  ChevronRight,
  Tv,
  Trash2,
  RotateCw,
} from 'lucide-react';

interface VideosWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

export const VideosWidget: React.FC<VideosWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const { ref: containerRef2, isSM, sz } = useContainerSize();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isLoop, setIsLoop] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [blobUrl, setBlobUrl] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);

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
        if (parsed.activeVideoId) {
          setActiveVideoId(parsed.activeVideoId);
        }
        if (parsed.showPlaylist !== undefined) {
          setShowPlaylist(parsed.showPlaylist);
        }
        if (parsed.autoPlay !== undefined) {
          setIsAutoPlay(parsed.autoPlay);
        }
        if (parsed.loop !== undefined) {
          setIsLoop(parsed.loop);
        }
        if (parsed.muted !== undefined) {
          setIsMuted(parsed.muted);
        }
      } catch (e) {
        setFileIds([]);
      }
    } else {
      setFileIds([]);
    }
  }, [dataRef]);

  // Fetch videos uploaded to this widget
  const videos = useLiveQuery(async () => {
    if (fileIds.length === 0) return [];
    const list = await db.files.bulkGet(fileIds);
    return list.filter((f): f is FileData => !!f);
  }, [fileIds]) || [];

  const activeVideo = videos.find(v => v.id === activeVideoId);

  useEffect(() => {
    if (activeVideo) {
      const url = URL.createObjectURL(activeVideo.blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setBlobUrl('');
  }, [activeVideo]);

  useEffect(() => {
    if (videos.length > 0 && !activeVideoId) {
      if (dataRef) {
        try {
          const parsed = JSON.parse(dataRef);
          if (parsed.activeVideoId && videos.some(v => v.id === parsed.activeVideoId)) {
            setActiveVideoId(parsed.activeVideoId);
            return;
          }
        } catch (e) {}
      }
      setActiveVideoId(videos[0].id);
    }
  }, [videos, activeVideoId, dataRef]);

  // Continuous Auto-play trigger: plays immediately and loops all the time
  useEffect(() => {
    if (videoRef.current && blobUrl && isAutoPlay) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Fallback for strict browser autoplay policies: mute and play
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      });
    }
  }, [blobUrl, isAutoPlay]);

  // Listen for CLI video control events
  useEffect(() => {
    const handleVideoControl = (e: any) => {
      const { action, value } = e.detail || {};
      if (action === 'play') {
        if (value && videos.some(v => v.id === value || v.name.toLowerCase() === value.toLowerCase())) {
          const match = videos.find(v => v.id === value || v.name.toLowerCase() === value.toLowerCase());
          if (match) setActiveVideoId(match.id);
        }
        if (videoRef.current) {
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      } else if (action === 'pause') {
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } else if (action === 'stop') {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      } else if (action === 'autoplay') {
        const next = value !== undefined ? Boolean(value) : !isAutoPlay;
        setIsAutoPlay(next);
        setIsLoop(next);
        if (next && videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    window.addEventListener('personal-os-video-control', handleVideoControl);
    return () => window.removeEventListener('personal-os-video-control', handleVideoControl);
  }, [videos, isAutoPlay]);

  // Handle play/pause commands
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error('Video play error', err));
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeToggle = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const id = `file-${Math.random().toString(36).substr(2, 9)}`;
      const fileEntry: FileData = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
        tags: ['video', 'media'],
        category: 'Videos',
        createdAt: Date.now(),
      };

      await db.files.add(fileEntry);
      
      const newFileIds = [...fileIds, id];
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({ fileIds: newFileIds, activeVideoId: id, showPlaylist })
      });
      setActiveVideoId(id);
    } catch (err) {
      console.error('Video upload failed', err);
    }
  };

  const handleDeleteVideo = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await db.files.delete(id);
      const newFileIds = fileIds.filter(fId => fId !== id);
      const nextActive = id === activeVideoId ? (newFileIds[0] || null) : activeVideoId;
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({ fileIds: newFileIds, activeVideoId: nextActive, showPlaylist })
      });
      if (id === activeVideoId) {
        setIsPlaying(false);
        setCurrentTime(0);
        setActiveVideoId(nextActive);
      }
    } catch (err) {
      console.error('Failed to delete video', err);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div ref={containerRef2} className="w-full h-full flex text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* 1. Main Video Screen */}
      <div className={`flex-1 flex flex-col justify-between ${activeVideo ? 'p-0' : 'p-4'} overflow-hidden relative`}>
        {activeVideo ? (
          <div className="flex-1 w-full bg-black overflow-hidden flex flex-col relative group/player">
            
            {/* HTML5 video element with Continuous Autoplay */}
            <video
              ref={videoRef}
              src={blobUrl}
              autoPlay={isAutoPlay}
              loop={isLoop}
              muted={isMuted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              className="w-full h-full object-contain bg-black cursor-pointer"
            />

            {/* Custom Sci-fi Cyber Control HUD Bar overlay (visible only on hover) */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 opacity-0 group-hover/container:opacity-100 group-hover/player:opacity-100 transition-opacity duration-300 z-20">
              
              {/* Progress Seek Scroller */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-glass-bg rounded-lg appearance-none cursor-pointer accent-cyan-accent"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-2.5">
                  <button onClick={togglePlay} className="text-white hover:text-cyan-accent cursor-pointer">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button onClick={handleVolumeToggle} className="text-white hover:text-cyan-accent cursor-pointer">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={async () => {
                      const next = !isAutoPlay;
                      setIsAutoPlay(next);
                      setIsLoop(next);
                      if (next && videoRef.current) {
                        videoRef.current.play().catch(() => {});
                      }
                      await commitWidgetUpdate(widgetId, {
                        dataRef: JSON.stringify({ fileIds, activeVideoId, showPlaylist, autoPlay: next, loop: next, muted: isMuted })
                      });
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isAutoPlay
                        ? 'bg-cyan-accent text-black shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                        : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                    title={isAutoPlay ? 'Continuous Autoplay: ON (Playing all the time)' : 'Autoplay: OFF'}
                  >
                    <RotateCw className={`w-3 h-3 ${isAutoPlay ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                    <span>AUTO</span>
                  </button>
                  <span className="text-white/80 font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeVideo && (
                    <button
                      onClick={(e) => handleDeleteVideo(activeVideo.id, e)}
                      className="text-white/70 hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors cursor-pointer mr-0.5"
                      title="Delete Video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {showControls && (
                    <label className="text-white hover:text-cyan-accent cursor-pointer mr-1" title="Upload Video">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="video/*,video/mp4,video/webm,video/ogg,video/mov,video/mkv,video/avi,.mp4,.webm,.ogg,.mov,.mkv,.avi"
                        onChange={handleUploadVideo}
                        className="hidden"
                      />
                    </label>
                  )}
                  <button 
                    onClick={() => {
                      const newVal = !showPlaylist;
                      setShowPlaylist(newVal);
                      commitWidgetUpdate(widgetId, {
                        dataRef: JSON.stringify({ fileIds, activeVideoId, showPlaylist: newVal, autoPlay: isAutoPlay, loop: isLoop, muted: isMuted })
                      });
                    }}
                    className={`text-white hover:text-cyan-accent cursor-pointer ${showPlaylist ? 'text-cyan-accent' : ''}`}
                    title="Playlist toggle"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button onClick={handleFullscreen} className="text-white hover:text-cyan-accent cursor-pointer">
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 w-full bg-black/30 rounded-xl border border-dashed border-color-border-color flex flex-col items-center justify-center gap-3 text-muted-text">
            <Tv className={sz === 'xs' ? 'w-6 h-6' : 'w-10 h-10'} />
            {!isSM && <span>No video files loaded in workspace.</span>}
            {showControls && (
              <label className="px-2.5 py-1.5 rounded-xl border border-dashed border-color-border-color hover:border-cyan-accent font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-cyan-accent/5 transition-colors">
                <Upload className="w-3.5 h-3.5 text-cyan-accent" />
                <span>Upload Video</span>
                <input
                  type="file"
                  accept="video/*,video/mp4,video/webm,video/ogg,video/mov,video/mkv,video/avi,.mp4,.webm,.ogg,.mov,.mkv,.avi"
                  onChange={handleUploadVideo}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* 2. Playlist Sidebar — hidden on very small widgets */}
      {!isSM && showPlaylist && videos.length > 0 && (
        <div className="w-1/3 border-l border-color-border-color p-3 flex flex-col gap-2 bg-secondary-bg/10 overflow-y-auto no-scrollbar">
          <span className="text-[10px] font-bold text-muted-text uppercase tracking-widest flex items-center gap-1 border-b border-color-border-color pb-1.5 mb-1.5">
            <List className="w-3.5 h-3.5" />
            <span>Playlist</span>
          </span>
          <div className="space-y-1.5">
            {videos.map(v => {
              const isActive = v.id === activeVideoId;
              return (
                <div
                  key={v.id}
                  onClick={async () => {
                    setActiveVideoId(v.id);
                    if (isAutoPlay) {
                      setTimeout(() => {
                        videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
                      }, 50);
                    }
                    await commitWidgetUpdate(widgetId, {
                      dataRef: JSON.stringify({ fileIds, activeVideoId: v.id, showPlaylist, autoPlay: isAutoPlay, loop: isLoop, muted: isMuted })
                    });
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex justify-between items-center cursor-pointer group/vitem ${
                    isActive 
                      ? 'border-cyan-accent/30 bg-cyan-accent/5 text-cyan-accent' 
                      : 'border-color-border-color bg-glass-bg/40 text-secondary-text hover:text-primary-text hover:bg-glass-bg'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate max-w-[75%]">
                    <Video className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{v.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteVideo(v.id, e)}
                      className="p-1 rounded text-muted-text hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/vitem:opacity-100 transition-all cursor-pointer"
                      title="Delete video"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
