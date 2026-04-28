import type { BackgroundText, Drawing, ImageObject, Page, StoredState, TextBlock } from "../types";
import { defaultBackgroundText } from "./constants";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPoint = (value: unknown): value is { x: number; y: number } =>
  isRecord(value) && typeof value.x === "number" && typeof value.y === "number";

const isDrawing = (value: unknown): value is Drawing => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.kind === "pen" || value.kind === "rect" || value.kind === "arrow") &&
    typeof value.color === "string" &&
    typeof value.strokeWidth === "number" &&
    Array.isArray(value.points) &&
    value.points.every(isPoint)
  );
};

const isTextBlock = (value: unknown): value is TextBlock => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.width === "number" &&
    typeof value.content === "string" &&
    typeof value.fontFamily === "string" &&
    typeof value.fontSize === "number" &&
    typeof value.color === "string" &&
    (value.annotation === "plain" || value.annotation === "pinyin" || value.annotation === "zhuyin")
  );
};

const isBackgroundText = (value: unknown): value is BackgroundText => {
  if (!isRecord(value)) return false;
  return (
    typeof value.content === "string" &&
    typeof value.fontFamily === "string" &&
    typeof value.fontSize === "number" &&
    typeof value.color === "string" &&
    (value.annotation === "plain" || value.annotation === "pinyin" || value.annotation === "zhuyin")
  );
};

const isImageObject = (value: unknown): value is ImageObject => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    typeof value.src === "string" &&
    typeof value.alt === "string"
  );
};

const isPage = (value: unknown): value is Page => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "number" &&
    (value.backgroundText === undefined || isBackgroundText(value.backgroundText)) &&
    Array.isArray(value.blocks) &&
    value.blocks.every(isTextBlock) &&
    Array.isArray(value.drawings) &&
    value.drawings.every(isDrawing) &&
    (value.images === undefined || (Array.isArray(value.images) && value.images.every(isImageObject)))
  );
};

export const isStoredState = (value: unknown): value is StoredState => {
  if (!isRecord(value)) return false;
  const pages = value.pages;
  if (!Array.isArray(pages)) return false;
  const pageIds = pages.map((page) => (isRecord(page) ? page.id : undefined));
  return (
    typeof value.activePageId === "string" &&
    pages.length > 0 &&
    pages.every(isPage) &&
    new Set(pageIds).size === pages.length &&
    pages.some((page) => page.id === value.activePageId)
  );
};

export const parseImportedState = (value: unknown): StoredState | null => {
  if (isStoredState(value)) return normalizeState(value);
  if (isRecord(value) && value.app === "mandarin-canvas" && isStoredState(value.state)) {
    return normalizeState(value.state);
  }
  return null;
};

export const normalizeState = (storedState: StoredState): StoredState => ({
  ...storedState,
  pages: storedState.pages.map((page) => ({
    ...page,
    backgroundText: page.backgroundText ?? defaultBackgroundText(),
    images: page.images ?? [],
  })),
});
