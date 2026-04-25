import { CircleSlash, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { TextBlock as TextBlockType } from "../types";
import { useCanvasStore } from "../stores/canvasStore";
import { RubyText } from "./RubyText";

interface TextBlockProps {
  block: TextBlockType;
  isSelected: boolean;
  onStartDrag: (id: string, event: React.PointerEvent) => void;
  onStartResize: (id: string, edge: "left" | "right", event: React.PointerEvent) => void;
  draftTextRef: React.MutableRefObject<Record<string, string>>;
  composingRef: React.MutableRefObject<boolean>;
}

export function TextBlock({
  block,
  isSelected,
  onStartDrag,
  onStartResize,
  draftTextRef,
  composingRef,
}: TextBlockProps) {
  const { deleteBlock, updateBlock, setFocusedBlockId, focusedBlockId } = useCanvasStore();
  const isFocused = focusedBlockId === block.id;
  const showRuby = block.annotation !== "plain" && !isFocused;

  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    setFocusedBlockId(block.id);
    draftTextRef.current[block.id] = event.currentTarget.innerText;
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (composingRef.current) return;
    setFocusedBlockId(null);
    const content = event.currentTarget.innerText.replace(/\n$/, "");
    commitText(content);
  };

  const commitText = (content: string) => {
    if (!content.trim()) {
      deleteBlock(block.id);
      delete draftTextRef.current[block.id];
      return;
    }
    draftTextRef.current[block.id] = content;
    updateBlock(block.id, { content });
  };

  return (
    <article
      className={`text-block ${isSelected ? "selected" : ""}`}
      data-editor-object
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        color: block.color,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        useCanvasStore.getState().setSelectedId(block.id, "text");
        useCanvasStore.getState().setCurrentColor(block.color);
      }}
    >
      {isSelected && (
        <>
          <button
            aria-label="Move text block"
            className="drag-handle"
            data-export-hidden="true"
            onPointerDown={(event) => onStartDrag(block.id, event)}
            type="button"
          >
            <CircleSlash size={12} />
          </button>
          <button
            aria-label="Delete text block"
            className="object-delete-button text-delete-button"
            data-export-hidden="true"
            onClick={(event) => {
              event.stopPropagation();
              deleteBlock(block.id);
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            type="button"
          >
            <Trash2 size={12} />
          </button>
          {(["left", "right"] as const).map((edge) => (
            <button
              aria-label={`Resize text block ${edge}`}
              className={`resize-handle resize-handle-${edge}`}
              data-export-hidden="true"
              key={edge}
              onPointerDown={(event) => onStartResize(block.id, edge, event)}
              type="button"
            />
          ))}
        </>
      )}
      {showRuby ? (
        <div
          className="ruby-display"
          onDoubleClick={() => {
            setFocusedBlockId(block.id);
            window.setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`)?.focus(), 20);
          }}
        >
          <RubyText text={block.content} mode={block.annotation} />
        </div>
      ) : (
        <div
          className="editable"
          contentEditable
          data-block-id={block.id}
          suppressContentEditableWarning
          spellCheck={false}
          onCompositionEnd={(event) => {
            composingRef.current = false;
            draftTextRef.current[block.id] = event.currentTarget.innerText;
          }}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={(event) => {
            draftTextRef.current[block.id] = event.currentTarget.innerText;
          }}
        >
          {block.content}
        </div>
      )}
    </article>
  );
}
