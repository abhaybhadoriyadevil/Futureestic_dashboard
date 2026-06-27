import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import type { FileData } from '../../types';
import { useWidgetStore } from '../../stores/useWidgetStore';
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
  Tv
} from 'lucide-react';

interface VideosWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

export const VideosWidget: React.FC<VideosWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
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
      setActiveVideoId(videos[0].id);
    }
  }, [videos, activeVideoId]);

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
        dataRef: JSON.stringify({ fileIds: newFileIds })
      });
      setActiveVideoId(id);
    } catch (err) {
      console.error('Video upload failed', err);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full h-full flex text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* 1. Main Video Screen */}
      <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
        {activeVideo ? (
          <div className="flex-1 w-full bg-black/60 rounded-xl border border-color-border-color overflow-hidden flex flex-col relative group/player">
            
            {/* HTML5 video element */}
            <video
              ref={videoRef}
              src={blobUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              className="w-full h-full object-contain bg-black cursor-pointer"
            />

            {/* Custom Sci-fi Cyber Control HUD Bar overlay (visible on hover) */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
              
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
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="text-white hover:text-cyan-accent cursor-pointer">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button onClick={handleVolumeToggle} className="text-white hover:text-cyan-accent cursor-pointer">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-white/80 font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowPlaylist(!showPlaylist)} 
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
            <Tv className="w-10 h-10" />
            <span>No video files loaded in workspace.</span>
          </div>
        )}

        {/* Bottom File Upload and Title details */}
        <div className="w-full flex items-center justify-between border-t border-color-border-color pt-3 mt-3">
          <span className="font-semibold truncate max-w-[60%]">
            {activeVideo?.name || 'Local Media OS'}
          </span>
          
          {showControls && (
            <label className="px-2.5 py-1.5 rounded-xl border border-dashed border-color-border-color hover:border-cyan-accent font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-cyan-accent/5 transition-colors">
              <Upload className="w-3.5 h-3.5 text-cyan-accent" />
              <span>Upload MP4</span>
              <input
                type="file"
                accept="video/*,video/mp4,video/webm,video/ogg,video/mov,video/mkv,video/avi,.mp4,.webm,.ogg,.mov,.mkv,.avi"
                onChange={handleUploadVideo}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* 2. Playlist Sidebar */}
      {showPlaylist && videos.length > 0 && (
        <div className="w-1/3 border-l border-color-border-color p-3 flex flex-col gap-2 bg-secondary-bg/10 overflow-y-auto no-scrollbar">
          <span className="text-[10px] font-bold text-muted-text uppercase tracking-widest flex items-center gap-1 border-b border-color-border-color pb-1.5 mb-1.5">
            <List className="w-3.5 h-3.5" />
            <span>Playlist</span>
          </span>
          <div className="space-y-1.5">
            {videos.map(v => {
              const isActive = v.id === activeVideoId;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setActiveVideoId(v.id);
                    setIsPlaying(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex justify-between items-center cursor-pointer ${
                    isActive 
                      ? 'border-cyan-accent/30 bg-cyan-accent/5 text-cyan-accent' 
                      : 'border-color-border-color bg-glass-bg/40 text-secondary-text hover:text-primary-text hover:bg-glass-bg'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate max-w-[85%]">
                    <Video className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{v.name}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
