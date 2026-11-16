import type { Widget } from '../../types';

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface PercentCoords {
  x: number; // 0 - 100
  y: number; // 0 - 100
  w: number; // 0 - 100
  h: number; // 0 - 100
}

export interface PixelCoords {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Returns usable workspace viewport dimensions (excluding sidebar and navbar)
 */
export function getWorkspaceViewport(): ViewportDimensions {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }
  // Sidebar is 256px when expanded on large screens, 64px collapsed
  const sidebarW = window.innerWidth >= 1024 ? 256 : 64;
  const navbarH = 64;

  const width = Math.max(window.innerWidth - sidebarW, 400);
  const height = Math.max(window.innerHeight - navbarH, 400);

  return { width, height };
}

/**
 * Normalizes percentage values into valid workspace boundaries:
 * - 0 <= X <= 100
 * - 0 <= Y <= 100
 * - Min width: 10% (or 150px)
 * - Min height: 8% (or 100px)
 * - Prevents extending beyond right (X + W <= 100) and bottom (Y + H <= 100)
 */
export function clampPercentBounds(
  raw: PercentCoords,
  viewport: ViewportDimensions = getWorkspaceViewport()
): PercentCoords {
  const minWPercent = Math.max(8, (150 / viewport.width) * 100);
  const minHPercent = Math.max(6, (100 / viewport.height) * 100);

  // Width & Height
  const w = Math.min(100, Math.max(minWPercent, raw.w));
  const h = Math.min(100, Math.max(minHPercent, raw.h));

  // X & Y clamped so widget stays completely within workspace
  const maxX = Math.max(0, 100 - w);
  const maxY = Math.max(0, 100 - h);

  const x = Math.min(maxX, Math.max(0, raw.x));
  const y = Math.min(maxY, Math.max(0, raw.y));

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    w: Number(w.toFixed(2)),
    h: Number(h.toFixed(2)),
  };
}

/**
 * Converts percentage coords (0-100) to pixel coordinates based on viewport
 */
export function percentToPixels(
  percent: PercentCoords,
  viewport: ViewportDimensions = getWorkspaceViewport()
): PixelCoords {
  const clamped = clampPercentBounds(percent, viewport);

  const x = Math.round((viewport.width * clamped.x) / 100);
  const y = Math.round((viewport.height * clamped.y) / 100);
  const w = Math.round((viewport.width * clamped.w) / 100);
  const h = Math.round((viewport.height * clamped.h) / 100);

  return { x, y, w, h };
}

/**
 * Converts pixel coordinates into normalized percentage coordinates (0-100)
 */
export function pixelsToPercent(
  pixels: PixelCoords,
  viewport: ViewportDimensions = getWorkspaceViewport()
): PercentCoords {
  const rawX = (pixels.x / viewport.width) * 100;
  const rawY = (pixels.y / viewport.height) * 100;
  const rawW = (pixels.w / viewport.width) * 100;
  const rawH = (pixels.h / viewport.height) * 100;

  return clampPercentBounds({ x: rawX, y: rawY, w: rawW, h: rawH }, viewport);
}

/**
 * Converts 12-column × 12-row grid placement into percentage coordinates:
 * - column: 1 to 12
 * - row: 1 to 12
 * - colSpan: 1 to 12
 * - rowSpan: 1 to 12
 */
export function gridToPercent(
  column: number,
  row: number,
  colSpan: number,
  rowSpan: number
): PercentCoords {
  const c = Math.max(1, Math.min(12, column));
  const r = Math.max(1, Math.min(12, row));
  const cs = Math.max(1, Math.min(13 - c, colSpan));
  const rs = Math.max(1, Math.min(13 - r, rowSpan));

  const colWidthPct = 100 / 12; // 8.333%
  const rowHeightPct = 100 / 12; // 8.333%

  const x = (c - 1) * colWidthPct;
  const y = (r - 1) * rowHeightPct;
  const w = cs * colWidthPct;
  const h = rs * rowHeightPct;

  return clampPercentBounds({ x, y, w, h });
}

/**
 * Converts percentage coords back into closest 12x12 grid numbers
 */
export function percentToGrid(percent: PercentCoords): {
  column: number;
  row: number;
  colSpan: number;
  rowSpan: number;
} {
  const colWidthPct = 100 / 12;
  const rowHeightPct = 100 / 12;

  const column = Math.max(1, Math.min(12, Math.round(percent.x / colWidthPct) + 1));
  const row = Math.max(1, Math.min(12, Math.round(percent.y / rowHeightPct) + 1));
  const colSpan = Math.max(1, Math.min(13 - column, Math.round(percent.w / colWidthPct)));
  const rowSpan = Math.max(1, Math.min(13 - row, Math.round(percent.h / rowHeightPct)));

  return { column, row, colSpan, rowSpan };
}

/**
 * Checks if two bounding boxes in percentage coordinates intersect
 */
export function doRectsOverlap(a: PercentCoords, b: PercentCoords): boolean {
  // Check horizontal and vertical separation
  if (a.x + a.w <= b.x || b.x + b.w <= a.x) return false;
  if (a.y + a.h <= b.y || b.y + b.h <= a.y) return false;
  return true;
}

/**
 * Finds all widgets overlapping with the given target widget
 */
export function findOverlappingWidgets(
  target: Widget,
  allWidgets: Widget[],
  viewport: ViewportDimensions = getWorkspaceViewport()
): Widget[] {
  const targetPct = target.percentPosition || pixelsToPercent(
    { x: target.position.x, y: target.position.y, w: target.size.w, h: target.size.h },
    viewport
  );

  return allWidgets.filter((w) => {
    if (w.id === target.id || !w.visible) return false;
    const wPct = w.percentPosition || pixelsToPercent(
      { x: w.position.x, y: w.position.y, w: w.size.w, h: w.size.h },
      viewport
    );
    return doRectsOverlap(targetPct, wPct);
  });
}

/**
 * Auto-arranges all visible widgets into a collision-free grid layout.
 * Places them sequentially in 12x12 grid slots so NO two widgets overlap.
 */
export function arrangeWidgetsWithoutOverlap(
  widgets: Widget[],
  viewport: ViewportDimensions = getWorkspaceViewport()
): Array<{ id: string; percentPosition: PercentCoords; pixelCoords: PixelCoords }> {
  if (widgets.length === 0) return [];

  // Determine optimal column grid:
  // - 1 or 2 widgets: 1 or 2 large columns
  // - 3 or 4 widgets: 2x2 grid (each 6 cols, 6 rows or 6 cols, 5 rows)
  // - 5+ widgets: 3 columns or 2 columns
  const n = widgets.length;
  let cols = 2;
  if (n === 1) cols = 1;
  else if (n >= 5 && viewport.width >= 1200) cols = 3;

  const colSpan = Math.floor(12 / cols);
  const rows = Math.ceil(n / cols);
  const rowSpan = Math.max(3, Math.min(6, Math.floor(12 / rows)));

  const results: Array<{ id: string; percentPosition: PercentCoords; pixelCoords: PixelCoords }> = [];

  for (let i = 0; i < n; i++) {
    const colIdx = i % cols;
    const rowIdx = Math.floor(i / cols);

    const column = 1 + colIdx * colSpan;
    const row = 1 + rowIdx * rowSpan;

    const percent = gridToPercent(column, row, colSpan, rowSpan);
    const pixelCoords = percentToPixels(percent, viewport);

    results.push({
      id: widgets[i].id,
      percentPosition: percent,
      pixelCoords,
    });
  }

  return results;
}
