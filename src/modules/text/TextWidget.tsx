import React, { useState, useEffect } from 'react';
import { useWidgetStore } from '../../stores/useWidgetStore';
import { 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette,
  GripHorizontal
} from 'lucide-react';

interface TextWidgetProps {
  widgetId: string;
  dataRef?: string;
  isEditMode: boolean;
  showControls?: boolean;
}

interface TextWidgetData {
  content: string;
  color: string;
  fontFamily: string;
  fontSize: string;
  textAlign: 'left' | 'center' | 'right';
}

const DEFAULT_DATA: TextWidgetData = {
  content: '',
  color: '#ffffff',
  fontFamily: 'Inter',
  fontSize: '16px',
  textAlign: 'left'
};

const FONT_OPTIONS = ['Inter', 'Roboto', 'Outfit', 'monospace', 'serif', 'cursive'];
const PRESET_COLORS = ['#ffffff', '#a8b2d1', '#64ffda', '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#f368e0', '#0abde3', '#10ac84', '#ee5253'];
const SIZE_OPTIONS = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px', '64px'];

export const TextWidget: React.FC<TextWidgetProps> = ({ widgetId, dataRef, showControls = false }) => {
  const { commitWidgetUpdate } = useWidgetStore();
  const [data, setData] = useState<TextWidgetData>(DEFAULT_DATA);
  
  useEffect(() => {
    if (dataRef) {
      try {
        const parsed = JSON.parse(dataRef);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (e) {
        console.error('Failed to parse text widget data', e);
      }
    }
  }, [dataRef]);

  const updateData = (updates: Partial<TextWidgetData>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify(newData)
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Only update local state while typing for performance
    setData(prev => ({ ...prev, content: e.target.value }));
  };

  const handleBlur = () => {
    // Save to store when focus is lost
    commitWidgetUpdate(widgetId, {
      dataRef: JSON.stringify(data)
    });
  };

  return (
    <div className="w-full h-full relative group/text flex flex-col">
      {/* Hidden formatting toolbar that appears on hover when controls are enabled */}
      {showControls && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/text:opacity-100 transition-opacity duration-300">
          <div className="glass-panel bg-black/80 backdrop-blur-md rounded-xl border border-color-border-color p-1.5 flex items-center gap-2 shadow-xl">
            
            {/* Font Family */}
            <div className="relative group/font">
              <button className="px-2 py-1 hover:bg-glass-bg rounded text-xs flex items-center gap-1 text-primary-text">
                <Type className="w-3 h-3" />
                <span className="w-16 truncate text-left">{data.fontFamily}</span>
              </button>
              <div className="absolute top-full left-0 mt-1 hidden group-hover/font:flex flex-col bg-black/90 border border-color-border-color rounded-lg p-1 min-w-[120px]">
                {FONT_OPTIONS.map(font => (
                  <button 
                    key={font}
                    onClick={() => updateData({ fontFamily: font })}
                    className={`text-xs text-left px-2 py-1.5 rounded hover:bg-glass-bg ${data.fontFamily === font ? 'text-cyan-accent' : 'text-primary-text'}`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-4 bg-color-border-color" />

            {/* Font Size */}
            <div className="relative group/size">
              <button className="px-2 py-1 hover:bg-glass-bg rounded text-xs text-primary-text min-w-[40px]">
                {data.fontSize}
              </button>
              <div className="absolute top-full left-0 mt-1 hidden group-hover/size:flex flex-col bg-black/90 border border-color-border-color rounded-lg p-1 max-h-64 overflow-y-auto no-scrollbar w-24">
                <div className="px-1 py-1 mb-1 border-b border-color-border-color">
                  <input
                    type="text"
                    value={data.fontSize.replace('px', '')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val) updateData({ fontSize: `${val}px` });
                    }}
                    placeholder="Custom"
                    className="w-full bg-glass-bg border border-color-border-color rounded px-1.5 py-1 text-xs text-primary-text outline-none focus:border-cyan-accent"
                  />
                </div>
                {SIZE_OPTIONS.map(size => (
                  <button 
                    key={size}
                    onClick={() => updateData({ fontSize: size })}
                    className={`text-xs text-center px-2 py-1.5 rounded hover:bg-glass-bg ${data.fontSize === size ? 'text-cyan-accent' : 'text-primary-text'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-4 bg-color-border-color" />

            {/* Text Alignment */}
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => updateData({ textAlign: 'left' })}
                className={`p-1 rounded hover:bg-glass-bg ${data.textAlign === 'left' ? 'text-cyan-accent bg-cyan-accent/10' : 'text-primary-text'}`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => updateData({ textAlign: 'center' })}
                className={`p-1 rounded hover:bg-glass-bg ${data.textAlign === 'center' ? 'text-cyan-accent bg-cyan-accent/10' : 'text-primary-text'}`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => updateData({ textAlign: 'right' })}
                className={`p-1 rounded hover:bg-glass-bg ${data.textAlign === 'right' ? 'text-cyan-accent bg-cyan-accent/10' : 'text-primary-text'}`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-4 bg-color-border-color" />

            {/* Colors */}
            <div className="relative group/color">
              <button className="p-1 hover:bg-glass-bg rounded text-primary-text flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border border-color-border-color" style={{ backgroundColor: data.color }} />
              </button>
              <div className="absolute top-full right-0 mt-1 hidden group-hover/color:flex flex-col bg-black/90 border border-color-border-color rounded-lg p-2 gap-2 min-w-[150px]">
                <div className="grid grid-cols-4 gap-1.5">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => updateData({ color })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${data.color === color ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-color-border-color">
                  <Palette className="w-3.5 h-3.5 text-muted-text" />
                  <input 
                    type="color" 
                    value={data.color}
                    onChange={(e) => updateData({ color: e.target.value })}
                    className="w-full h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Drag handle area */}
      <div className="drag-handle absolute top-0 left-0 right-0 h-6 flex justify-center items-center opacity-0 group-hover/text:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing text-muted-text z-20">
        <GripHorizontal className="w-4 h-4 pointer-events-none" />
      </div>

      {/* Main Text Area */}
      <div className="flex-1 w-full h-full p-4 sm:p-6 lg:p-8 pt-8 sm:pt-8 lg:pt-10">
        <textarea
          value={data.content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          placeholder="Start typing..."
          className="w-full h-full bg-transparent border-none outline-none resize-none no-scrollbar cursor-text placeholder:opacity-30 placeholder:text-inherit"
          style={{
            color: data.color,
            fontFamily: data.fontFamily,
            fontSize: data.fontSize,
            textAlign: data.textAlign,
            lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  );
};
