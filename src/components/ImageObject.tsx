import { CircleSlash, Trash2 } from "lucide-react";
import type { ImageObject as ImageObjectType } from "../types";
import { useCanvasStore } from "../stores/canvasStore";

interface ImageObjectProps {
  image: ImageObjectType;
  isSelected: boolean;
  isInteractive: boolean;
  onStartDrag: (id: string, event: React.PointerEvent, baseX: number, baseY: number) => void;
  onStartResize: (id: string, event: React.PointerEvent, baseX: number, baseY: number, baseWidth: number, baseHeight: number) => void;
}

export function ImageObject({ image, isSelected, isInteractive, onStartDrag, onStartResize }: ImageObjectProps) {
  const { deleteImage, setSelectedId, setTool } = useCanvasStore();
  const isActiveSelection = isSelected && isInteractive;

  return (
    <figure
      className={`image-object ${isActiveSelection ? "selected" : ""} ${isInteractive ? "" : "inactive-tool"}`}
      data-editor-object={isInteractive ? true : undefined}
      style={{
        left: image.x,
        top: image.y,
        width: image.width,
        height: image.height,
      }}
      onPointerDown={(event) => {
        if (!isInteractive) return;
        event.preventDefault();
        event.stopPropagation();
        setSelectedId(image.id, "image");
        setTool("select");
        onStartDrag(image.id, event, image.x, image.y);
      }}
    >
      <img alt={image.alt} draggable={false} src={image.src} />
      {isActiveSelection && (
        <>
          <button
            aria-label="Move image"
            className="drag-handle"
            data-export-hidden="true"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartDrag(image.id, event, image.x, image.y);
            }}
            type="button"
          >
            <CircleSlash size={12} />
          </button>
          <button
            aria-label="Delete image"
            className="object-delete-button text-delete-button"
            data-export-hidden="true"
            onClick={(event) => {
              event.stopPropagation();
              deleteImage(image.id);
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            type="button"
          >
            <Trash2 size={12} />
          </button>
          <button
            aria-label="Resize image"
            className="image-resize-handle"
            data-export-hidden="true"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartResize(image.id, event, image.x, image.y, image.width, image.height);
            }}
            type="button"
          />
        </>
      )}
    </figure>
  );
}
