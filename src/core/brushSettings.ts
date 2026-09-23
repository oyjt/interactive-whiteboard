export interface BrushSettings {
  color: string;
  width: number;
  eraserWidth: number;
}

export const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  color: '#ff0000', width: 5, eraserWidth: 20,
};
export const BRUSH_STORAGE_KEY = 'interactive-whiteboard:brush:v1';

export function normalizeBrushSettings(value: unknown): BrushSettings {
  const data = value && typeof value === 'object' ? value as Partial<BrushSettings> : {};
  const width = (value: unknown, fallback: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(1, Math.round(value))) : fallback;
  return {
    color: typeof data.color === 'string' && /^#[0-9a-f]{6}$/i.test(data.color)
      ? data.color.toLowerCase() : DEFAULT_BRUSH_SETTINGS.color,
    width: width(data.width, DEFAULT_BRUSH_SETTINGS.width, 40),
    eraserWidth: width(data.eraserWidth, DEFAULT_BRUSH_SETTINGS.eraserWidth, 80),
  };
}

export function readBrushSettings(): BrushSettings {
  try {
    return normalizeBrushSettings(JSON.parse(localStorage.getItem(BRUSH_STORAGE_KEY) || 'null'));
  } catch {
    return { ...DEFAULT_BRUSH_SETTINGS };
  }
}

export function saveBrushSettings(settings: BrushSettings) {
  try { localStorage.setItem(BRUSH_STORAGE_KEY, JSON.stringify(normalizeBrushSettings(settings))); }
  catch { /* Private mode or full storage must not interrupt drawing. */ }
}
