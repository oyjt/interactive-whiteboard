export interface BrushSettings {
  color: string;
  width: number;
  fontSize: number;
}

export const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  color: '#ff0000',
  width: 5,
  fontSize: 24,
};
export const BRUSH_STORAGE_KEY = 'interactive-whiteboard:brush:v1';

export function normalizeBrushSettings(value: unknown): BrushSettings {
  const data = value && typeof value === 'object' ? (value as Partial<BrushSettings>) : {};
  const clamp = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.round(value)))
      : fallback;
  return {
    color:
      typeof data.color === 'string' && /^#[0-9a-f]{6}$/i.test(data.color)
        ? data.color.toLowerCase()
        : DEFAULT_BRUSH_SETTINGS.color,
    width: clamp(data.width, DEFAULT_BRUSH_SETTINGS.width, 1, 40),
    fontSize: clamp(data.fontSize, DEFAULT_BRUSH_SETTINGS.fontSize, 12, 96),
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
  try {
    localStorage.setItem(BRUSH_STORAGE_KEY, JSON.stringify(normalizeBrushSettings(settings)));
  } catch {
    /* Private mode or full storage must not interrupt drawing. */
  }
}
