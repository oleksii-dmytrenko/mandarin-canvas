import type { CSSProperties, PointerEvent } from "react";
import type { Drawing } from "../types";
import type { ArrowResizeHandle, DrawingResizeHandle, RectResizeHandle } from "../utils/drawing";

interface DrawingShapeProps {
  drawing: Drawing;
  isInteractive: boolean;
  onSelect: (event: PointerEvent<SVGElement>) => void;
  onStartResize: (handle: DrawingResizeHandle, event: PointerEvent<SVGElement>) => void;
  selected: boolean;
}

const handlePositions: Array<{ handle: RectResizeHandle; cursor: string; x: number; y: number }> = [
  { handle: "nw", cursor: "nwse-resize", x: 0, y: 0 },
  { handle: "n", cursor: "ns-resize", x: 0.5, y: 0 },
  { handle: "ne", cursor: "nesw-resize", x: 1, y: 0 },
  { handle: "e", cursor: "ew-resize", x: 1, y: 0.5 },
  { handle: "se", cursor: "nwse-resize", x: 1, y: 1 },
  { handle: "s", cursor: "ns-resize", x: 0.5, y: 1 },
  { handle: "sw", cursor: "nesw-resize", x: 0, y: 1 },
  { handle: "w", cursor: "ew-resize", x: 0, y: 0.5 },
];

export function DrawingShape({ drawing, isInteractive, onSelect, onStartResize, selected }: DrawingShapeProps) {
  const isActiveSelection = selected && isInteractive;
  const wrapperProps = {
    "data-editor-object": isInteractive ? true : undefined,
    className: `drawing-shape ${isActiveSelection ? "selected" : ""} ${isInteractive ? "" : "inactive-tool"}`,
    onPointerDown: (event: PointerEvent<SVGElement>) => {
      if (!isInteractive) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect(event);
    },
  };

  const visibleProps = {
    className: "drawing-shape-visible",
    fill: "none",
    stroke: drawing.color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: drawing.strokeWidth,
    style: { fill: "none", stroke: drawing.color },
    vectorEffect: "non-scaling-stroke" as CSSProperties["vectorEffect"],
  };

  if (drawing.kind === "rect") {
    const x = drawing.x ?? 0;
    const y = drawing.y ?? 0;
    const width = drawing.width ?? 0;
    const height = drawing.height ?? 0;

    return (
      <g {...wrapperProps}>
        <rect
          className="drawing-hit-area"
          fill="none"
          height={height}
          stroke="transparent"
          width={width}
          x={x}
          y={y}
        />
        <rect {...visibleProps} height={height} width={width} x={x} y={y} />
        {isActiveSelection &&
          handlePositions.map(({ handle, cursor, x: xRatio, y: yRatio }) => {
            const handleX = x + width * xRatio;
            const handleY = y + height * yRatio;
            const commonProps = {
              "aria-label": `Resize rectangle ${handle}`,
              className: "drawing-resize-handle",
              "data-editor-object": true,
              "data-export-hidden": true,
              fill: drawing.color,
              key: handle,
              onPointerDown: (event: PointerEvent<SVGElement>) => {
                event.preventDefault();
                event.stopPropagation();
                onStartResize(handle, event);
              },
              style: { cursor },
            };

            return <circle {...commonProps} cx={handleX} cy={handleY} r="4" />;
          })}
      </g>
    );
  }

  if (drawing.kind === "arrow") {
    const [start, end] = drawing.points;
    if (!start || !end) return null;
    const arrowHandles: Array<{ handle: ArrowResizeHandle; point: typeof start; label: string }> = [
      { handle: "start", point: start, label: "start" },
      { handle: "end", point: end, label: "end" },
    ];

    return (
      <g {...wrapperProps}>
        <line className="drawing-hit-area" fill="none" stroke="transparent" x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
        <line {...visibleProps} markerEnd="url(#arrowhead)" x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
        {isActiveSelection &&
          arrowHandles.map(({ handle, point, label }) => (
            <circle
              aria-label={`Resize arrow ${label}`}
              className="drawing-resize-handle"
              data-editor-object
              data-export-hidden="true"
              fill={drawing.color}
              key={handle}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onStartResize(handle, event);
              }}
              r="4"
              style={{ cursor: "move" }}
              cx={point.x}
              cy={point.y}
            />
          ))}
      </g>
    );
  }

  const path = drawing.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  return (
    <g {...wrapperProps}>
      <path className="drawing-hit-area" d={path} fill="none" stroke="transparent" />
      <path {...visibleProps} d={path} />
    </g>
  );
}
