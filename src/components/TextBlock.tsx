import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TextBlock as TextBlockType } from "../types";
import { useCanvasStore } from "../stores/canvasStore";
import { RubyText } from "./RubyText";

interface TextBlockProps {
  block: TextBlockType;
  isSelected: boolean;
  isInteractive: boolean;
  onStartDrag: (id: string, event: React.PointerEvent) => void;
  onStartResize: (id: string, edge: "left" | "right", event: React.PointerEvent) => void;
  draftTextRef: React.MutableRefObject<Record<string, string>>;
  composingRef: React.MutableRefObject<boolean>;
}

export function TextBlock({
  block,
  isSelected,
  isInteractive,
  onStartDrag,
  onStartResize,
  draftTextRef,
  composingRef,
}: TextBlockProps) {
  const { deleteBlock, updateBlock, setFocusedBlockId, setSelectedId } = useCanvasStore();
  const isActiveSelection = isSelected && isInteractive;
  const showAnnotations = block.annotation !== "plain";
  const editableRef = useRef<HTMLDivElement>(null);
  const [draftContent, setDraftContent] = useState(block.content);

  useEffect(() => {
    if (!isActiveSelection) setDraftContent(block.content);
  }, [block.content, isActiveSelection]);

  useEffect(() => {
    if (!isActiveSelection) return;
    const editable = editableRef.current;
    if (!editable) return;

    const focusAtEnd = () => {
      editable.focus();
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setFocusedBlockId(block.id);
      draftTextRef.current[block.id] = editable.innerText;
    };

    const frame = window.requestAnimationFrame(focusAtEnd);
    return () => window.cancelAnimationFrame(frame);
  }, [block.annotation, block.id, draftTextRef, isActiveSelection, setFocusedBlockId]);

  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    setFocusedBlockId(block.id);
    const content = event.currentTarget.innerText;
    setDraftContent(content);
    draftTextRef.current[block.id] = content;
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (composingRef.current) return;
    setFocusedBlockId(null);
    setSelectedId(null, null);
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
      className={`text-block ${isActiveSelection ? "selected" : ""} ${isInteractive ? "" : "inactive-tool"}`}
      data-editor-object={isInteractive ? true : undefined}
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        color: block.color,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
      }}
      onPointerDown={(event) => {
        if (!isInteractive) return;
        event.preventDefault();
        event.stopPropagation();
        useCanvasStore.getState().setSelectedId(block.id, "text");
        useCanvasStore.getState().setCurrentColor(block.color);
      }}
    >
      {isActiveSelection && (
        <>
          {(["top", "bottom"] as const).map((edge) => (
            <button
              aria-label={`Move text block from ${edge} edge`}
              className={`text-drag-zone text-drag-zone-${edge}`}
              data-export-hidden="true"
              key={edge}
              onPointerDown={(event) => onStartDrag(block.id, event)}
              type="button"
            />
          ))}
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
      {!isActiveSelection && showAnnotations ? (
        <div className="ruby-display">
          <RubyText text={block.content} mode={block.annotation} />
        </div>
      ) : isActiveSelection && showAnnotations ? (
        <div className="text-editor-stack">
          <div className="ruby-display annotation-preview" aria-hidden="true">
            <RubyText text={draftContent} mode={block.annotation} />
          </div>
          <div
            className="editable annotation-editable"
            contentEditable
            data-block-id={block.id}
            ref={editableRef}
            suppressContentEditableWarning
            spellCheck={false}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              const content = event.currentTarget.innerText;
              setDraftContent(content);
              draftTextRef.current[block.id] = content;
            }}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onInput={(event) => {
              const content = event.currentTarget.innerText;
              setDraftContent(content);
              draftTextRef.current[block.id] = content;
            }}
          >
            {block.content}
          </div>
        </div>
      ) : (
        <div
          className="editable"
          contentEditable={isActiveSelection}
          data-block-id={block.id}
          ref={editableRef}
          suppressContentEditableWarning
          spellCheck={false}
          onCompositionEnd={(event) => {
            composingRef.current = false;
            const content = event.currentTarget.innerText;
            setDraftContent(content);
            draftTextRef.current[block.id] = content;
          }}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={(event) => {
            const content = event.currentTarget.innerText;
            setDraftContent(content);
            draftTextRef.current[block.id] = content;
          }}
        >
          {block.content}
        </div>
      )}
    </article>
  );
}
