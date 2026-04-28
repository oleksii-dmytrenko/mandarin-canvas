import { Trash2 } from "lucide-react";
import { useRef, type PointerEvent, type RefObject } from "react";
import type { Drawing, ImageObject as ImageObjectType, TextBlock as TextBlockType } from "../types";
import { useCanvasStore } from "../stores/canvasStore";
import { PAGE_WIDTH, PAGE_HEIGHT } from "../utils/constants";
import { createId } from "../utils/id";
import { selectedDrawingDeletePosition } from "../utils/drawing";
import type { DrawingResizeHandle } from "../utils/drawing";
import { DrawingShape } from "./DrawingShape";
import { ImageObject as ImageObjectComponent } from "./ImageObject";
import { TextBlock } from "./TextBlock";
import { BackgroundTextLayer } from "./BackgroundTextLayer";
import type { DragState } from "../hooks/useDrag";

interface PaperProps {
  pageRef: RefObject<HTMLDivElement | null>;
  dragRef: RefObject<DragState>;
  draftTextRef: RefObject<Record<string, string>>;
  composingRef: RefObject<boolean>;
  drawRef: RefObject<{ startX: number; startY: number; drawing: Drawing } | null>;
  onTrackHistory: (snapshot: ReturnType<typeof useCanvasStore.getState>) => void;
  onCommitFocusedText: () => void;
}

export function Paper({
  pageRef,
  dragRef,
  draftTextRef,
  composingRef,
  drawRef,
  onTrackHistory,
  onCommitFocusedText,
}: PaperProps) {
  const {
    pages,
    activePageId,
    tool,
    toolColors,
    toolStrokeWidths,
    selectedId,
    focusedBlockId,
    setSelectedId,
    setTool,
    setCurrentColor,
    setFocusedBlockId,
    draftDrawing,
    setDraftDrawing,
    addBlock,
    addDrawing,
    deleteDrawing,
    addImages,
    updateBlock,
    updateDrawing,
    updateImage,
  } = useCanvasStore();
  const drawingLayerRef = useRef<SVGSVGElement>(null);

  const activePage = pages.find((p) => p.id === activePageId);
  if (!activePage) return null;

  const pagePoint = (event: PointerEvent | React.PointerEvent) => {
    const rect = pageRef.current!.getBoundingClientRect();
    const scaleX = PAGE_WIDTH / rect.width;
    const scaleY = PAGE_HEIGHT / rect.height;
    return {
      x: Math.max(0, Math.min(PAGE_WIDTH, (event.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(PAGE_HEIGHT, (event.clientY - rect.top) * scaleY)),
    };
  };

  const drawingPoint = (event: PointerEvent | React.PointerEvent) => {
    const svg = drawingLayerRef.current;
    const matrix = svg?.getScreenCTM()?.inverse();
    if (!svg || !matrix) return pagePoint(event);

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix);

    return {
      x: Math.max(0, Math.min(PAGE_WIDTH, transformed.x)),
      y: Math.max(0, Math.min(PAGE_HEIGHT, transformed.y)),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-editor-object]")) return;
    const activeEditable = document.activeElement instanceof HTMLElement ? document.activeElement.closest("[data-block-id]") : null;
    if (focusedBlockId || activeEditable) {
      onCommitFocusedText();
      setFocusedBlockId(null);
      setSelectedId(null, null);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      return;
    }
    onCommitFocusedText();
    if (tool === "multiline-text") {
      setSelectedId(null, null);
      return;
    }

    const point = tool === "text" || tool === "select" ? pagePoint(event) : drawingPoint(event);

    if (tool === "text") {
      const blockId = addBlock(point.x, point.y);
      window.setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)?.focus(), 30);
      return;
    }

    if (tool === "select") {
      setSelectedId(null, null);
      return;
    }

    event.preventDefault();

    const drawing: Drawing = {
      id: createId(),
      kind: tool,
      color: toolColors[tool],
      strokeWidth: toolStrokeWidths[tool],
      points: tool === "pen" ? [point] : [],
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
    drawRef.current = { startX: point.x, startY: point.y, drawing };
    setDraftDrawing(drawing);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      // Drag is handled by parent via useDrag hook
      return;
    }

    if (!drawRef.current) return;
    const point = drawingPoint(event);
    const { startX, startY, drawing } = drawRef.current;
    const next: Drawing =
      drawing.kind === "pen"
        ? { ...drawing, points: [...drawing.points, point] }
        : {
            ...drawing,
            x: Math.min(startX, point.x),
            y: Math.min(startY, point.y),
            width: Math.abs(point.x - startX),
            height: Math.abs(point.y - startY),
            points: [{ x: startX, y: startY }, point],
          };
    drawRef.current.drawing = next;
    setDraftDrawing(next);
  };

  const handlePointerUp = () => {
    if (drawRef.current) {
      const drawing = drawRef.current.drawing;
      const isMeaningful =
        drawing.kind === "pen" ? drawing.points.length > 2 : (drawing.width ?? 0) > 4 || (drawing.height ?? 0) > 4;
      if (isMeaningful) {
        addDrawing(drawing);
      }
      drawRef.current = null;
      setDraftDrawing(null);
    }
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (!files.length) return;
    event.preventDefault();
    onCommitFocusedText();

    try {
      const { readImageFile } = await import("../utils/export");
      const images = await Promise.all(files.map(readImageFile));
      addImages(images);
    } catch {
      window.alert("Could not paste that image.");
    }
  };

  const startTextDrag = (id: string, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      kind: "text",
      id,
      startX: event.clientX,
      startY: event.clientY,
      baseX: activePage.blocks.find((b: TextBlockType) => b.id === id)?.x ?? 0,
      baseY: activePage.blocks.find((b: TextBlockType) => b.id === id)?.y ?? 0,
      baseState: { activePageId, pages },
      historyTracked: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const startTextResize = (id: string, edge: "left" | "right", event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const block = activePage.blocks.find((b: TextBlockType) => b.id === id);
    dragRef.current = {
      kind: "text-resize",
      id,
      edge,
      startX: event.clientX,
      baseX: block?.x ?? 0,
      baseWidth: block?.width ?? 0,
      baseState: { activePageId, pages },
      historyTracked: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const startImageDrag = (id: string, event: React.PointerEvent, baseX: number, baseY: number) => {
    const image = activePage.images.find((i: ImageObjectType) => i.id === id);
    dragRef.current = {
      kind: "image",
      id,
      startX: event.clientX,
      startY: event.clientY,
      baseX,
      baseY,
      baseWidth: image?.width ?? 0,
      baseHeight: image?.height ?? 0,
      baseState: { activePageId, pages },
      historyTracked: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const startImageResize = (id: string, event: React.PointerEvent, baseX: number, baseY: number, baseWidth: number, baseHeight: number) => {
    dragRef.current = {
      kind: "image-resize",
      id,
      startX: event.clientX,
      startY: event.clientY,
      baseX,
      baseY,
      baseWidth,
      baseHeight,
      baseState: { activePageId, pages },
      historyTracked: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const startDrawingResize = (drawing: Drawing, handle: DrawingResizeHandle, event: React.PointerEvent<SVGElement>) => {
    dragRef.current = {
      kind: "drawing-resize",
      id: drawing.id,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      baseDrawing: drawing,
      baseState: { activePageId, pages },
      historyTracked: false,
    };
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
  };

  return (
    <div
      className={`paper tool-${tool}`}
      ref={pageRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <BackgroundTextLayer
        backgroundText={activePage.backgroundText}
        isActive={tool === "multiline-text"}
        composingRef={composingRef}
      />

      <svg className="drawing-layer" ref={drawingLayerRef} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} aria-hidden="true">
        <defs>
          <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="context-stroke" />
          </marker>
        </defs>
        {[...activePage.drawings, ...(draftDrawing ? [draftDrawing] : [])].map((drawing) => (
          <DrawingShape
            drawing={drawing}
            isInteractive={tool === "select" || tool === drawing.kind}
            key={drawing.id}
            selected={selectedId === drawing.id}
            onSelect={(event) => {
              setSelectedId(drawing.id, "drawing");
              setTool("select");
              setCurrentColor(drawing.color);
              dragRef.current = {
                kind: "drawing",
                id: drawing.id,
                startX: event.clientX,
                startY: event.clientY,
                baseDrawing: drawing,
                baseState: { activePageId, pages },
                historyTracked: false,
              };
              (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
            }}
            onStartResize={(handle, event) => startDrawingResize(drawing, handle, event)}
          />
        ))}
      </svg>

      {activePage.drawings.map((drawing: Drawing) => {
        if (selectedId !== drawing.id || (tool !== "select" && tool !== drawing.kind)) return null;
        const position = selectedDrawingDeletePosition(drawing);

        return (
          <button
            aria-label="Delete drawing"
            className="object-delete-button drawing-delete-button"
            data-editor-object
            data-export-hidden="true"
            key={`delete-${drawing.id}`}
            onClick={(event) => {
              event.stopPropagation();
              deleteDrawing(drawing.id);
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            style={{ left: position.left, top: position.top }}
            type="button"
          >
            <Trash2 size={12} />
          </button>
        );
      })}

      {activePage.images.map((image: ImageObjectType) => (
        <ImageObjectComponent
          key={image.id}
          image={image}
          isInteractive={tool === "select"}
          isSelected={selectedId === image.id}
          onStartDrag={startImageDrag}
          onStartResize={startImageResize}
        />
      ))}

      {activePage.blocks.map((block: TextBlockType) => (
        <TextBlock
          key={block.id}
          block={block}
          isInteractive={tool === "select" || tool === "text"}
          isSelected={selectedId === block.id}
          onStartDrag={startTextDrag}
          onStartResize={startTextResize}
          draftTextRef={draftTextRef}
          composingRef={composingRef}
        />
      ))}
    </div>
  );
}
