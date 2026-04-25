import type { Drawing } from "../types";
import { PAGE_HEIGHT, PAGE_WIDTH } from "./constants";

export type RectResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export type ArrowResizeHandle = "start" | "end";
export type DrawingResizeHandle = RectResizeHandle | ArrowResizeHandle;

export const drawingBounds = (drawing: Drawing) => {
  if (drawing.kind === "rect") {
    const x = drawing.x ?? 0;
    const y = drawing.y ?? 0;
    return {
      minX: x,
      minY: y,
      maxX: x + (drawing.width ?? 0),
      maxY: y + (drawing.height ?? 0),
    };
  }

  const xs = drawing.points.map((point) => point.x);
  const ys = drawing.points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

export const clampDrawingDelta = (drawing: Drawing, deltaX: number, deltaY: number) => {
  const bounds = drawingBounds(drawing);
  return {
    x: Math.max(-bounds.minX, Math.min(PAGE_WIDTH - bounds.maxX, deltaX)),
    y: Math.max(-bounds.minY, Math.min(PAGE_HEIGHT - bounds.maxY, deltaY)),
  };
};

export const translateDrawing = (drawing: Drawing, deltaX: number, deltaY: number): Drawing => {
  const points = drawing.points.map((point) => ({
    x: point.x + deltaX,
    y: point.y + deltaY,
  }));

  return {
    ...drawing,
    points,
    x: typeof drawing.x === "number" ? drawing.x + deltaX : drawing.x,
    y: typeof drawing.y === "number" ? drawing.y + deltaY : drawing.y,
  };
};

export const resizeRectDrawing = (
  drawing: Drawing,
  handle: RectResizeHandle,
  deltaX: number,
  deltaY: number,
  minSize: number,
): Drawing => {
  if (drawing.kind !== "rect") return drawing;

  const baseX = drawing.x ?? 0;
  const baseY = drawing.y ?? 0;
  const baseWidth = drawing.width ?? 0;
  const baseHeight = drawing.height ?? 0;
  let left = baseX;
  let top = baseY;
  let right = baseX + baseWidth;
  let bottom = baseY + baseHeight;

  if (handle.includes("w")) left = Math.max(0, Math.min(right - minSize, baseX + deltaX));
  if (handle.includes("e")) right = Math.min(PAGE_WIDTH, Math.max(left + minSize, baseX + baseWidth + deltaX));
  if (handle.includes("n")) top = Math.max(0, Math.min(bottom - minSize, baseY + deltaY));
  if (handle.includes("s")) bottom = Math.min(PAGE_HEIGHT, Math.max(top + minSize, baseY + baseHeight + deltaY));

  return {
    ...drawing,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    points: [
      { x: left, y: top },
      { x: right, y: bottom },
    ],
  };
};

export const resizeArrowDrawing = (
  drawing: Drawing,
  handle: ArrowResizeHandle,
  deltaX: number,
  deltaY: number,
  minSize: number,
): Drawing => {
  if (drawing.kind !== "arrow") return drawing;

  const [start, end] = drawing.points;
  if (!start || !end) return drawing;

  const nextPoints = [{ ...start }, { ...end }];
  const targetIndex = handle === "start" ? 0 : 1;
  const anchor = handle === "start" ? end : start;
  const requested = {
    x: Math.max(0, Math.min(PAGE_WIDTH, drawing.points[targetIndex].x + deltaX)),
    y: Math.max(0, Math.min(PAGE_HEIGHT, drawing.points[targetIndex].y + deltaY)),
  };

  const distance = Math.hypot(requested.x - anchor.x, requested.y - anchor.y);
  if (distance < minSize) {
    const baseAngle = Math.atan2(drawing.points[targetIndex].y - anchor.y, drawing.points[targetIndex].x - anchor.x);
    requested.x = Math.max(0, Math.min(PAGE_WIDTH, anchor.x + Math.cos(baseAngle) * minSize));
    requested.y = Math.max(0, Math.min(PAGE_HEIGHT, anchor.y + Math.sin(baseAngle) * minSize));
  }

  nextPoints[targetIndex] = requested;
  return { ...drawing, points: nextPoints };
};

export const selectedDrawingDeletePosition = (drawing: Drawing) => {
  const bounds = drawingBounds(drawing);
  return {
    left: Math.max(0, Math.min(PAGE_WIDTH - 24, bounds.minX - 10)),
    top: Math.max(0, Math.min(PAGE_HEIGHT - 24, bounds.minY - 10)),
  };
};
