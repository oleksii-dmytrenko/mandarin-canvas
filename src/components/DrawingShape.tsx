import type { CSSProperties, PointerEvent } from "react";
import type { Drawing } from "../types";

interface DrawingShapeProps {
  drawing: Drawing;
  isInteractive: boolean;
  onSelect: (event: PointerEvent<SVGElement>) => void;
  selected: boolean;
}

export function DrawingShape({ drawing, isInteractive, onSelect, selected }: DrawingShapeProps) {
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
    return (
      <g {...wrapperProps}>
        <rect
          className="drawing-hit-area"
          fill="none"
          height={drawing.height}
          stroke="transparent"
          width={drawing.width}
          x={drawing.x}
          y={drawing.y}
        />
        <rect {...visibleProps} height={drawing.height} width={drawing.width} x={drawing.x} y={drawing.y} />
      </g>
    );
  }

  if (drawing.kind === "arrow") {
    const [start, end] = drawing.points;
    if (!start || !end) return null;
    return (
      <g {...wrapperProps}>
        <line className="drawing-hit-area" fill="none" stroke="transparent" x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
        <line {...visibleProps} markerEnd="url(#arrowhead)" x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
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
