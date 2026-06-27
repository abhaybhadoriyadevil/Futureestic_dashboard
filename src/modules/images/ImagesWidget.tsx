import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import type { FileData } from '../../types';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { 
  Grid, 
  Play, 
  Square, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  X,
  Layers3
} from 'lucide-react';

interface ImagesWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

export const ImagesWidget: React.FC<ImagesWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const [viewMode, setViewMode] = useState<'grid' | 'masonry' | 'slideshow'>('grid');
  const [fileIds, setFileIds] = useState<string[]>([]);
  
  // Slideshow States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Lightbox States
  const [lightboxImage, setLightboxImage] = useState<FileData | null>(null);
  const [zoomScale, setZoomScale] = useState(1.0);

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

  // Read images belonging to this widget
  const images = useLiveQuery(async () => {
    if (fileIds.length === 0) return [];
    const list = await db.files.bulkGet(fileIds);
    return list.filter((f): f is FileData => !!f);
  }, [fileIds]) || [];

  // Slideshow auto-play hook
  useEffect(() => {
    let interval: any;
    if (isPlaying && images.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, images]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        tags: ['gallery', 'image'],
        category: 'Images',
        createdAt: Date.now(),
      };

      await db.files.add(fileEntry);
      
      const newFileIds = [...fileIds, id];
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({ fileIds: newFileIds })
      });
    } catch (err) {
      console.error('Image upload failed', err);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomScale(prev => {
      if (direction === 'in') return Math.min(prev + 0.25, 3.0);
      return Math.max(prev - 0.25, 0.5);
    });
  };

  const handleNextLightbox = () => {
    if (!lightboxImage) return;
    const index = images.findIndex(img => img.id === lightboxImage.id);
    const nextIndex = (index + 1) % images.length;
    setLightboxImage(images[nextIndex]);
    setZoomScale(1.0);
  };

  const handlePrevLightbox = () => {
    if (!lightboxImage) return;
    const index = images.findIndex(img => img.id === lightboxImage.id);
    const prevIndex = (index - 1 + images.length) % images.length;
    setLightboxImage(images[prevIndex]);
    setZoomScale(1.0);
  };

  return (
    <div className="w-full h-full flex flex-col p-4 text-xs text-primary-text bg-transparent overflow-hidden">
      
      {/* View mode toggle controls */}
      {showControls && (
        <div className="flex justify-between items-center mb-3 gap-2">
          <div className="flex rounded-xl bg-glass-bg border border-color-border-color p-0.5">
            <button
              onClick={() => { setViewMode('grid'); setIsPlaying(false); }}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'grid' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setViewMode('masonry'); setIsPlaying(false); }}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'masonry' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
              }`}
              title="Masonry View"
            >
              <Layers3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('slideshow')}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                viewMode === 'slideshow' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'
              }`}
              title="Slideshow View"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Upload Trigger */}
          <label className="px-2.5 py-1.5 rounded-xl border border-dashed border-color-border-color hover:border-cyan-accent text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-cyan-accent/5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-cyan-accent" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Gallery content body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {images.length === 0 ? (
          <div className="p-10 text-center text-muted-text italic">
            No images in workspace. Upload a PNG, JPG, or GIF above.
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-3 gap-2 pb-6">
            {images.map(img => (
              <div
                key={img.id}
                onClick={() => { setLightboxImage(img); setZoomScale(1.0); }}
                className="aspect-square rounded-xl overflow-hidden border border-color-border-color bg-glass-bg cursor-pointer hover:border-cyan-accent transition-colors relative group/item"
              >
                <img
                  src={URL.createObjectURL(img.blob)}
                  alt={img.name}
                  className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        ) : viewMode === 'masonry' ? (
          // Masonry columns
          <div className="columns-3 gap-2 space-y-2 pb-6">
            {images.map(img => (
              <div
                key={img.id}
                onClick={() => { setLightboxImage(img); setZoomScale(1.0); }}
                className="break-inside-avoid rounded-xl overflow-hidden border border-color-border-color bg-glass-bg cursor-pointer hover:border-cyan-accent transition-colors"
              >
                <img
                  src={URL.createObjectURL(img.blob)}
                  alt={img.name}
                  className="w-full h-auto object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          // Slideshow View
          <div className="w-full h-full min-h-[220px] flex flex-col justify-between items-center bg-primary-bg/40 border border-color-border-color rounded-xl p-4 relative overflow-hidden">
            {images[currentIndex] && (
              <div className="flex-1 w-full flex items-center justify-center relative">
                <img
                  src={URL.createObjectURL(images[currentIndex].blob)}
                  alt={images[currentIndex].name}
                  className="max-h-[170px] max-w-full object-contain rounded-lg shadow-lg"
                />
                
                {/* Overlay navigation arrows */}
                <button
                  onClick={() => setCurrentIndex(prev => (prev - 1 + images.length) % images.length)}
                  className="absolute left-1 p-1 rounded-full glass-panel hover:bg-glass-bg cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentIndex(prev => (prev + 1) % images.length)}
                  className="absolute right-1 p-1 rounded-full glass-panel hover:bg-glass-bg cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Playback Controls */}
            <div className="w-full flex items-center justify-between border-t border-color-border-color pt-3 mt-3">
              <span className="text-[10px] text-muted-text truncate max-w-[50%]">
                {images[currentIndex]?.name}
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    isPlaying 
                      ? 'bg-purple-accent text-white' 
                      : 'bg-cyan-accent text-black'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-muted-text">
                  {currentIndex + 1} / {images.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox full overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => handleZoom('in')}
              className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-white hover:text-cyan-accent cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-white hover:text-cyan-accent cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-white hover:text-red-500 cursor-pointer animate-[pulse_2s_infinite]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Left Arrow */}
          <button
            onClick={handlePrevLightbox}
            className="absolute left-6 p-3 rounded-full bg-glass-bg border border-color-border-color text-white hover:text-cyan-accent cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Lightbox Center Area */}
          <div className="max-w-[70vw] max-h-[75vh] flex items-center justify-center overflow-hidden">
            <img
              src={URL.createObjectURL(lightboxImage.blob)}
              alt={lightboxImage.name}
              style={{ transform: `scale(${zoomScale})` }}
              className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
            />
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNextLightbox}
            className="absolute right-6 p-3 rounded-full bg-glass-bg border border-color-border-color text-white hover:text-cyan-accent cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Bottom metadata tag information */}
          <div className="absolute bottom-6 glass-panel rounded-xl px-4 py-2 border border-color-border-color text-[11px] text-secondary-text max-w-lg flex flex-col gap-1 shadow-2xl">
            <div className="font-bold text-white">{lightboxImage.name}</div>
            <div className="text-[10px] text-muted-text">
              Size: {(lightboxImage.size / 1024).toFixed(1)} KB &bull; Type: {lightboxImage.type}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
