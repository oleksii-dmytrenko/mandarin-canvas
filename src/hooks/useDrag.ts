import { useRef, useCallback } from "react";
import type { Drawing, StoredState } from "../types";
import { MIN_DRAWING_SIZE, MIN_IMAGE_SIZE, MIN_TEXT_BLOCK_WIDTH, PAGE_HEIGHT, PAGE_WIDTH } from "../utils/constants";
import { clampDrawingDelta, resizeArrowDrawing, resizeRectDrawing, translateDrawing, type DrawingResizeHandle } from "../utils/drawing";

export type DragState =
  | {
      kind: "text";
      id: string;
      startX: number;
      startY: number;
      baseX: number;
      baseY: number;
      baseState: StoredState;
      historyTracked: boolean;
    }
  | {
      kind: "text-resize";
      id: string;
      edge: "left" | "right";
      startX: number;
      baseX: number;
      baseWidth: number;
      baseState: StoredState;
      historyTracked: boolean;
    }
  | {
      kind: "drawing";
      id: string;
      startX: number;
      startY: number;
      baseDrawing: Drawing;
      baseState: StoredState;
      historyTracked: boolean;
    }
  | {
      kind: "drawing-resize";
      id: string;
      handle: DrawingResizeHandle;
      startX: number;
      startY: number;
      baseDrawing: Drawing;
      baseState: StoredState;
      historyTracked: boolean;
    }
  | {
      kind: "image";
      id: string;
      startX: number;
      startY: number;
      baseX: number;
      baseY: number;
      baseWidth: number;
      baseHeight: number;
      baseState: StoredState;
      historyTracked: boolean;
    }
  | {
      kind: "image-resize";
      id: string;
      startX: number;
      startY: number;
      baseX: number;
      baseY: number;
      baseWidth: number;
      baseHeight: number;
      baseState: StoredState;
      historyTracked: boolean;
    }
  | null;

interface UseDragProps {
  pageRef: React.RefObject<HTMLDivElement | null>;
  onTrackHistory: (snapshot: StoredState) => void;
  onUpdateBlock: (id: string, patch: { x?: number; y?: number; width?: number }, recordHistory?: boolean) => void;
  onUpdateDrawing: (id: string, drawing: Drawing, recordHistory?: boolean) => void;
  onUpdateImage: (id: string, patch: { x?: number; y?: number; width?: number; height?: number }, recordHistory?: boolean) => void;
}

export function useDrag({
  pageRef,
  onTrackHistory,
  onUpdateBlock,
  onUpdateDrawing,
  onUpdateImage,
}: UseDragProps) {
  const dragRef = useRef<DragState>(null);

  const startDrag = useCallback((state: DragState) => {
    dragRef.current = state;
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent | React.PointerEvent) => {
      if (!dragRef.current || !pageRef.current) return;

      const rect = pageRef.current.getBoundingClientRect();
      const scaleX = PAGE_WIDTH / rect.width;
      const scaleY = PAGE_HEIGHT / rect.height;
      const deltaX = (event.clientX - dragRef.current.startX) * scaleX;
      const deltaY = dragRef.current.kind === "text-resize" ? 0 : (event.clientY - dragRef.current.startY) * scaleY;

      if (!dragRef.current.historyTracked && (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5)) {
        onTrackHistory(dragRef.current.baseState);
        dragRef.current.historyTracked = true;
      }

      if (dragRef.current.kind === "text") {
        const nextX = dragRef.current.baseX + deltaX;
        const nextY = dragRef.current.baseY + deltaY;
        onUpdateBlock(
          dragRef.current.id,
          {
            x: Math.max(0, Math.min(PAGE_WIDTH - 40, nextX)),
            y: Math.max(0, Math.min(PAGE_HEIGHT - 30, nextY)),
          },
          false,
        );
      } else if (dragRef.current.kind === "text-resize") {
        const nextWidth =
          dragRef.current.edge === "right"
            ? Math.max(MIN_TEXT_BLOCK_WIDTH, Math.min(PAGE_WIDTH - dragRef.current.baseX, dragRef.current.baseWidth + deltaX))
            : Math.max(MIN_TEXT_BLOCK_WIDTH, dragRef.current.baseWidth - deltaX);
        const nextX =
          dragRef.current.edge === "left"
            ? Math.max(0, Math.min(dragRef.current.baseX + dragRef.current.baseWidth - MIN_TEXT_BLOCK_WIDTH, dragRef.current.baseX + deltaX))
            : dragRef.current.baseX;
        const clampedWidth =
          dragRef.current.edge === "left"
            ? Math.min(PAGE_WIDTH - nextX, dragRef.current.baseX + dragRef.current.baseWidth - nextX)
            : nextWidth;
        onUpdateBlock(
          dragRef.current.id,
          {
            x: nextX,
            width: Math.max(MIN_TEXT_BLOCK_WIDTH, clampedWidth),
          },
          false,
        );
      } else if (dragRef.current.kind === "drawing") {
        const clamped = clampDrawingDelta(dragRef.current.baseDrawing, deltaX, deltaY);
        onUpdateDrawing(dragRef.current.id, translateDrawing(dragRef.current.baseDrawing, clamped.x, clamped.y), false);
      } else if (dragRef.current.kind === "drawing-resize") {
        const resizeDrawing =
          dragRef.current.baseDrawing.kind === "arrow"
            ? resizeArrowDrawing(dragRef.current.baseDrawing, dragRef.current.handle === "start" ? "start" : "end", deltaX, deltaY, MIN_DRAWING_SIZE)
            : dragRef.current.handle === "start" || dragRef.current.handle === "end"
              ? dragRef.current.baseDrawing
              : resizeRectDrawing(dragRef.current.baseDrawing, dragRef.current.handle, deltaX, deltaY, MIN_DRAWING_SIZE);
        onUpdateDrawing(
          dragRef.current.id,
          resizeDrawing,
          false,
        );
      } else if (dragRef.current.kind === "image") {
        const nextX = Math.max(0, Math.min(PAGE_WIDTH - dragRef.current.baseWidth, dragRef.current.baseX + deltaX));
        const nextY = Math.max(0, Math.min(PAGE_HEIGHT - dragRef.current.baseHeight, dragRef.current.baseY + deltaY));
        onUpdateImage(dragRef.current.id, { x: nextX, y: nextY }, false);
      } else if (dragRef.current.kind === "image-resize") {
        const requestedWidth = dragRef.current.baseWidth + deltaX;
        const requestedHeight = dragRef.current.baseHeight + deltaY;
        const nextWidth = Math.max(MIN_IMAGE_SIZE, Math.min(PAGE_WIDTH - dragRef.current.baseX, requestedWidth));
        const nextHeight = Math.max(MIN_IMAGE_SIZE, Math.min(PAGE_HEIGHT - dragRef.current.baseY, requestedHeight));
        const minScale = Math.max(MIN_IMAGE_SIZE / dragRef.current.baseWidth, MIN_IMAGE_SIZE / dragRef.current.baseHeight);
        const scale = Math.max(minScale, Math.min(nextWidth / dragRef.current.baseWidth, nextHeight / dragRef.current.baseHeight));
        const width = Math.min(PAGE_WIDTH - dragRef.current.baseX, dragRef.current.baseWidth * scale);
        const height = Math.min(PAGE_HEIGHT - dragRef.current.baseY, dragRef.current.baseHeight * scale);
        onUpdateImage(dragRef.current.id, { width, height }, false);
      }
    },
    [onTrackHistory, onUpdateBlock, onUpdateDrawing, onUpdateImage, pageRef],
  );

  return {
    dragRef,
    startDrag,
    endDrag,
    handlePointerMove,
  };
}
