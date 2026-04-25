import type { Drawing } from "../types";
import { PAGE_HEIGHT, PAGE_WIDTH } from "./constants";

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

export const selectedDrawingDeletePosition = (drawing: Drawing) => {
  const bounds = drawingBounds(drawing);
  return {
    left: Math.max(0, Math.min(PAGE_WIDTH - 24, bounds.minX - 10)),
    top: Math.max(0, Math.min(PAGE_HEIGHT - 24, bounds.minY - 10)),
  };
};
