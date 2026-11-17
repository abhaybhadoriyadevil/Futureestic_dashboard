import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../core/storage/db';
import type { FileData } from '../../types';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { useContainerSize } from '../../hooks/useContainerSize';
import {
  Grid,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Layers3,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface ImagesWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

export const ImagesWidget: React.FC<ImagesWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const { ref, sz, isSM, width } = useContainerSize();

  const [viewMode, setViewMode] = useState<'grid' | 'masonry' | 'slideshow'>('grid');
  const [fileIds, setFileIds] = useState<string[]>([]);

  // Slideshow
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<FileData | null>(null);
  const [zoomScale, setZoomScale] = useState(1.0);

  // Persistent selected image
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  useEffect(() => {
    if (dataRef) {
      try {
        const parsed = JSON.parse(dataRef);
        if (parsed.fileIds && Array.isArray(parsed.fileIds)) setFileIds(parsed.fileIds);
        else setFileIds([]);
        setSelectedImageId(parsed.selectedImageId || null);
        if (parsed.viewMode && ['grid', 'masonry', 'slideshow'].includes(parsed.viewMode)) {
          setViewMode(parsed.viewMode);
          if (parsed.viewMode === 'slideshow') {
            setIsPlaying(parsed.isPlaying !== undefined ? parsed.isPlaying : true);
          } else {
            setIsPlaying(false);
          }
        }
      } catch { setFileIds([]); setSelectedImageId(null); }
    } else { setFileIds([]); setSelectedImageId(null); }
  }, [dataRef]);

  const images = useLiveQuery(async () => {
    if (fileIds.length === 0) return [];
    const list = await db.files.bulkGet(fileIds);
    return list.filter((f): f is FileData => !!f);
  }, [fileIds]) || [];

  const selectedImage = images.find(img => img.id === selectedImageId);

  useEffect(() => {
    let interval: any;
    if (isPlaying && images.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, images]);

  const handleSelectViewMode = async (mode: 'grid' | 'masonry' | 'slideshow') => {
    setViewMode(mode);
    const playState = mode === 'slideshow' ? true : false;
    setIsPlaying(playState);
    await commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify({
        fileIds,
        selectedImageId: selectedImageId || undefined,
        viewMode: mode,
        isPlaying: playState,
      })
    });
  };

  const handleTogglePlay = async () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    await commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify({
        fileIds,
        selectedImageId: selectedImageId || undefined,
        viewMode: 'slideshow',
        isPlaying: nextPlaying,
      })
    });
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const id = `file-${Math.random().toString(36).substr(2, 9)}`;
      await db.files.add({
        id, name: file.name, type: file.type, size: file.size,
        blob: file, tags: ['gallery', 'image'], category: 'Images', createdAt: Date.now(),
      } as FileData);
      const newFileIds = [...fileIds, id];
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({
          fileIds: newFileIds,
          selectedImageId: selectedImageId || undefined,
          viewMode,
          isPlaying: viewMode === 'slideshow' ? isPlaying : undefined,
        })
      });
    } catch (err) { console.error('Image upload failed', err); }
  };

  const handleDeleteImage = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await db.files.delete(id);
      const newFileIds = fileIds.filter(fId => fId !== id);
      const nextSelected = selectedImageId === id ? null : selectedImageId;
      await commitWidgetUpdate(widgetId, {
        dataRef: JSON.stringify({
          fileIds: newFileIds,
          selectedImageId: nextSelected || undefined,
          viewMode,
          isPlaying: viewMode === 'slideshow' ? (newFileIds.length > 0 && isPlaying) : false,
        })
      });
      if (selectedImageId === id) setSelectedImageId(null);
      if (lightboxImage?.id === id) setLightboxImage(null);
      if (currentIndex >= newFileIds.length) {
        setCurrentIndex(Math.max(0, newFileIds.length - 1));
      }
    } catch (err) {
      console.error('Failed to delete image', err);
    }
  };

  const handleZoom = (d: 'in' | 'out') =>
    setZoomScale(p => d === 'in' ? Math.min(p + 0.25, 3) : Math.max(p - 0.25, 0.5));

  const handleNextLightbox = () => {
    if (!lightboxImage) return;
    setLightboxImage(images[(images.findIndex(i => i.id === lightboxImage.id) + 1) % images.length]);
    setZoomScale(1);
  };
  const handlePrevLightbox = () => {
    if (!lightboxImage) return;
    setLightboxImage(images[(images.findIndex(i => i.id === lightboxImage.id) - 1 + images.length) % images.length]);
    setZoomScale(1);
  };

  // Responsive grid cols based on widget width
  const gridCols = width < 200 ? 'grid-cols-1'
    : width < 320 ? 'grid-cols-2'
    : width < 500 ? 'grid-cols-3'
    : width < 700 ? 'grid-cols-4'
    : 'grid-cols-5';

  const masonryCols = width < 200 ? 'columns-1'
    : width < 350 ? 'columns-2'
    : width < 550 ? 'columns-3'
    : 'columns-4';

  return (
    <div ref={ref} className="w-full h-full flex flex-col p-2 text-xs text-primary-text bg-transparent overflow-hidden">

      {/* Controls bar — show when showControls is true */}
      {showControls && (
        <div className={`flex ${isSM ? 'flex-col gap-1.5' : 'justify-between items-center'} mb-2 gap-2 shrink-0`}>
          {/* View mode pills — only shown when no image is selected */}
          {!selectedImageId ? (
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-xl bg-glass-bg border border-color-border-color p-0.5 shrink-0">
                <button
                  onClick={() => handleSelectViewMode('grid')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'}`}
                  title="Grid View"
                >
                  <Grid className={sz === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
                </button>
                <button
                  onClick={() => handleSelectViewMode('masonry')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${viewMode === 'masonry' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'}`}
                  title="Masonry View"
                >
                  <Layers3 className={sz === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
                </button>
                <button
                  onClick={() => handleSelectViewMode('slideshow')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${viewMode === 'slideshow' ? 'bg-cyan-accent text-black font-semibold' : 'text-secondary-text hover:text-primary-text'}`}
                  title="Slideshow View"
                >
                  <Play className={sz === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
                </button>
              </div>

              {/* In Slideshow mode, show Play/Pause button in top controls */}
              {viewMode === 'slideshow' && images.length > 0 && (
                <button
                  onClick={handleTogglePlay}
                  className={`px-2 py-1 rounded-xl text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                    isPlaying 
                      ? 'bg-purple-accent/90 hover:bg-purple-accent text-white shadow-[0_0_10px_rgba(139,92,246,0.25)]' 
                      : 'bg-cyan-accent hover:bg-cyan-accent/90 text-black shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  }`}
                  title={isPlaying ? 'Pause Slideshow' : 'Play Slideshow'}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      {!isSM && <span>Pause</span>}
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      {!isSM && <span>Play</span>}
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Back & Delete buttons — shown when single image is selected */
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => { await commitWidgetUpdate(widgetId, { dataRef: JSON.stringify({ fileIds, viewMode, isPlaying: viewMode === 'slideshow' ? true : false }) }); }}
                className={`rounded-xl border border-color-border-color hover:border-cyan-accent font-semibold flex items-center gap-1 cursor-pointer hover:bg-cyan-accent/5 transition-colors ${isSM ? 'px-2 py-1 text-[9px]' : 'px-2.5 py-1.5 text-[10px]'}`}
                title="Back to gallery"
              >
                <ChevronLeft className={sz === 'xs' ? 'w-2.5 h-2.5 text-cyan-accent' : 'w-3.5 h-3.5 text-cyan-accent'} />
                {!isSM && <span>Back</span>}
              </button>
              <button
                onClick={(e) => selectedImageId && handleDeleteImage(selectedImageId, e)}
                className={`rounded-xl border border-red-500/30 hover:border-red-500 text-red-400 font-semibold flex items-center gap-1 cursor-pointer hover:bg-red-500/10 transition-colors ${isSM ? 'px-2 py-1 text-[9px]' : 'px-2.5 py-1.5 text-[10px]'}`}
                title="Delete Image"
              >
                <Trash2 className={sz === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
                {!isSM && <span>Delete</span>}
              </button>
            </div>
          )}

          <label className={`rounded-xl border border-dashed border-color-border-color hover:border-cyan-accent font-semibold flex items-center gap-1 cursor-pointer hover:bg-cyan-accent/5 transition-colors ${isSM ? 'px-2 py-1 text-[9px]' : 'px-2.5 py-1.5 text-[10px]'}`}>
            <Upload className={sz === 'xs' ? 'w-2.5 h-2.5 text-cyan-accent' : 'w-3.5 h-3.5 text-cyan-accent'} />
            {!isSM && <span>Upload</span>}
            <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
          </label>
        </div>
      )}

      {/* Gallery body */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col">
        {selectedImage ? (
          /* Inline persistent viewer */
          <div className="w-full h-full flex flex-col justify-between items-center rounded-xl p-1 relative overflow-hidden min-h-0">
            <div className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden bg-black/10 rounded-lg">
              <img
                src={URL.createObjectURL(selectedImage.blob)}
                alt={selectedImage.name}
                className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg shadow-lg transition-transform duration-300"
              />
              {/* Overlay controls in top right */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 opacity-0 group-hover/container:opacity-100 transition-opacity duration-200">
                <button
                  onClick={(e) => handleDeleteImage(selectedImage.id, e)}
                  className="p-1.5 rounded-xl bg-black/70 hover:bg-red-500/80 text-white/80 hover:text-white border border-white/10 hover:border-red-500 transition-all cursor-pointer shadow-md"
                  title="Delete Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {!showControls && (
                  <button
                    onClick={async () => { await commitWidgetUpdate(widgetId, { dataRef: JSON.stringify({ fileIds, viewMode, isPlaying: viewMode === 'slideshow' ? true : false }) }); }}
                    className="p-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white/80 hover:text-cyan-accent border border-white/10 hover:border-cyan-accent/50 transition-all cursor-pointer shadow-md"
                    title="Back to gallery"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-text">
            <ImageIcon className={`${sz === 'xs' ? 'w-6 h-6' : 'w-10 h-10'} opacity-30`} />
            {!isSM && <p className="italic text-center px-3">No images. Upload to get started.</p>}
          </div>
        ) : viewMode === 'grid' ? (
          <div className={`flex-1 overflow-y-auto no-scrollbar grid ${gridCols} gap-1.5 pb-4 min-h-0`}>
            {images.map(img => (
              <div
                key={img.id}
                onClick={async () => { await commitWidgetUpdate(widgetId, { dataRef: JSON.stringify({ fileIds, selectedImageId: img.id, viewMode, isPlaying: false }) }); }}
                className="aspect-square rounded-lg overflow-hidden border border-color-border-color bg-glass-bg cursor-pointer hover:border-cyan-accent transition-colors relative group/item"
              >
                <img
                  src={URL.createObjectURL(img.blob)}
                  alt={img.name}
                  className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={(e) => handleDeleteImage(img.id, e)}
                  className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-red-500 text-white/70 hover:text-white opacity-0 group-hover/item:opacity-100 transition-all cursor-pointer shadow-md z-10"
                  title="Delete image"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : viewMode === 'masonry' ? (
          <div className={`flex-1 overflow-y-auto no-scrollbar ${masonryCols} gap-1.5 space-y-1.5 pb-4 min-h-0`}>
            {images.map(img => (
              <div
                key={img.id}
                onClick={async () => { await commitWidgetUpdate(widgetId, { dataRef: JSON.stringify({ fileIds, selectedImageId: img.id, viewMode, isPlaying: false }) }); }}
                className="break-inside-avoid rounded-lg overflow-hidden border border-color-border-color bg-glass-bg cursor-pointer hover:border-cyan-accent transition-colors relative group/item"
              >
                <img src={URL.createObjectURL(img.blob)} alt={img.name} className="w-full h-auto object-cover" />
                <button
                  onClick={(e) => handleDeleteImage(img.id, e)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 hover:bg-red-500 text-white/70 hover:text-white opacity-0 group-hover/item:opacity-100 transition-all cursor-pointer shadow-md z-10"
                  title="Delete image"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Slideshow */
          <div className="w-full h-full flex flex-col justify-between items-center bg-transparent rounded-xl p-0 relative overflow-hidden min-h-0">
            {images[currentIndex] ? (
              <div
                className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden cursor-pointer group/slide select-none"
                onClick={async () => {
                  await commitWidgetUpdate(widgetId, { dataRef: JSON.stringify({ fileIds, selectedImageId: images[currentIndex].id, viewMode, isPlaying: false }) });
                }}
              >
                <img
                  src={URL.createObjectURL(images[currentIndex].blob)}
                  alt={images[currentIndex].name}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg shadow-lg pointer-events-none transition-all duration-300"
                />

                {/* Floating Previous & Next arrow buttons on hover */}
                <button
                  onClick={e => { e.stopPropagation(); setCurrentIndex(p => (p - 1 + images.length) % images.length); }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 hover:border-cyan-accent/50 hover:text-cyan-accent cursor-pointer transition-all z-10 opacity-0 group-hover/container:opacity-100 shadow-md"
                  title="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setCurrentIndex(p => (p + 1) % images.length); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 hover:border-cyan-accent/50 hover:text-cyan-accent cursor-pointer transition-all z-10 opacity-0 group-hover/container:opacity-100 shadow-md"
                  title="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            {/* Bottom Controls Bar — visible on hover so unhovered widget shows pure elements */}
            <div className="absolute bottom-0 inset-x-0 h-9 shrink-0 flex items-center justify-between bg-black/80 backdrop-blur-md border-t border-white/10 px-2 z-10 opacity-0 group-hover/container:opacity-100 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTogglePlay}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm ${
                    isPlaying ? 'bg-purple-accent text-white' : 'bg-cyan-accent text-black font-bold'
                  }`}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </button>
                {images[currentIndex] && (
                  <button
                    onClick={(e) => handleDeleteImage(images[currentIndex].id, e)}
                    className="p-1 rounded-lg text-muted-text hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                    title="Delete this image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {images[currentIndex] && (
                  <span className="text-[10px] text-muted-text truncate max-w-[120px] hidden sm:inline" title={images[currentIndex].name}>
                    {images[currentIndex].name}
                  </span>
                )}
                <span className="text-[10px] text-cyan-accent font-mono font-semibold bg-cyan-accent/10 border border-cyan-accent/20 px-2 py-0.5 rounded-full">
                  {currentIndex + 1} / {images.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button onClick={() => handleZoom('in')} className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-white hover:text-cyan-accent cursor-pointer" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => handleZoom('out')} className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-white hover:text-cyan-accent cursor-pointer" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={(e) => handleDeleteImage(lightboxImage.id, e)} className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-white hover:text-red-500 cursor-pointer" title="Delete Image"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => setLightboxImage(null)} className="p-2 rounded-xl bg-glass-bg border border-color-border-color text-white hover:text-red-500 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
          </div>
          <button onClick={handlePrevLightbox} className="absolute left-6 p-3 rounded-full bg-glass-bg border border-color-border-color text-white hover:text-cyan-accent cursor-pointer"><ChevronLeft className="w-6 h-6" /></button>
          <div className="max-w-[70vw] max-h-[75vh] flex items-center justify-center overflow-hidden">
            <img src={URL.createObjectURL(lightboxImage.blob)} alt={lightboxImage.name} style={{ transform: `scale(${zoomScale})` }} className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200" />
          </div>
          <button onClick={handleNextLightbox} className="absolute right-6 p-3 rounded-full bg-glass-bg border border-color-border-color text-white hover:text-cyan-accent cursor-pointer"><ChevronRight className="w-6 h-6" /></button>
          <div className="absolute bottom-6 glass-panel rounded-xl px-4 py-2 border border-color-border-color text-[11px] text-secondary-text max-w-lg">
            <div className="font-bold text-white">{lightboxImage.name}</div>
            <div className="text-[10px] text-muted-text">Size: {(lightboxImage.size / 1024).toFixed(1)} KB · Type: {lightboxImage.type}</div>
          </div>
        </div>
      )}
    </div>
  );
};
