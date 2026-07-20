import { useRef, useState, useEffect } from 'react';

export type WidgetSizeTier = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ContainerSize {
  width: number;
  height: number;
  /** xs <200 | sm <300 | md <450 | lg <650 | xl ≥650 */
  sz: WidgetSizeTier;
  /** Convenience booleans */
  isXS: boolean;  // < 200
  isSM: boolean;  // < 300
  isMD: boolean;  // < 450
  isLG: boolean;  // < 650
  isXL: boolean;  // ≥ 650
  ref: React.RefObject<HTMLDivElement | null>;
}

function getTier(w: number): WidgetSizeTier {
  if (w < 200) return 'xs';
  if (w < 300) return 'sm';
  if (w < 450) return 'md';
  if (w < 650) return 'lg';
  return 'xl';
}

/**
 * Measures the actual rendered pixel width/height of a widget container
 * via ResizeObserver and returns a reactive size object with tier helpers.
 *
 * Usage:
 *   const { ref, sz, isXS, width } = useContainerSize();
 *   return <div ref={ref}> ... </div>
 */
export function useContainerSize(): ContainerSize {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 300 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial measurement
    setSize({ width: el.offsetWidth, height: el.offsetHeight });

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.round(width), height: Math.round(height) });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sz = getTier(size.width);

  return {
    width: size.width,
    height: size.height,
    sz,
    isXS: sz === 'xs',
    isSM: sz === 'xs' || sz === 'sm',
    isMD: sz === 'xs' || sz === 'sm' || sz === 'md',
    isLG: sz !== 'xl',
    isXL: sz === 'xl',
    ref,
  };
}
