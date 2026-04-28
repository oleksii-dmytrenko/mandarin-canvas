import { useEffect, useRef, useState } from "react";
import type { BackgroundText } from "../types";
import { useCanvasStore } from "../stores/canvasStore";
import { RubyText } from "./RubyText";

interface BackgroundTextLayerProps {
  backgroundText: BackgroundText;
  isActive: boolean;
  composingRef: React.MutableRefObject<boolean>;
}

export function BackgroundTextLayer({ backgroundText, isActive, composingRef }: BackgroundTextLayerProps) {
  const { setCurrentColor, updateBackgroundText } = useCanvasStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draftContent, setDraftContent] = useState(backgroundText.content);
  const showAnnotations = backgroundText.annotation !== "plain";

  useEffect(() => {
    if (backgroundText.content === draftContent) return;
    if (isActive && document.activeElement === textareaRef.current) return;
    setDraftContent(backgroundText.content);
  }, [backgroundText.content, draftContent, isActive]);

  useEffect(() => {
    if (!isActive || !textareaRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isActive]);

  const updateContent = (content: string) => {
    setDraftContent(content);
    updateBackgroundText({ content });
  };

  const previewText = isActive ? draftContent : backgroundText.content;
  const preview = showAnnotations ? (
    <div className="ruby-display background-text-preview" aria-hidden={isActive ? true : undefined}>
      <RubyText text={previewText} mode={backgroundText.annotation} />
    </div>
  ) : (
    <div className="ruby-display background-text-preview">{previewText || " "}</div>
  );

  return (
    <section
      className={`background-text-layer ${isActive ? "active" : ""}`}
      style={{
        color: backgroundText.color,
        fontFamily: backgroundText.fontFamily,
        fontSize: backgroundText.fontSize,
      }}
    >
      {isActive ? (
        <div className="background-text-editor-stack">
          {showAnnotations && preview}
          <textarea
            aria-label="Multiline background text"
            className={`background-text-input ${showAnnotations ? "annotated" : ""}`}
            data-background-text
            data-editor-object
            ref={textareaRef}
            spellCheck={false}
            value={draftContent}
            onChange={(event) => updateContent(event.currentTarget.value)}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onFocus={() => {
              setCurrentColor(backgroundText.color);
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              setCurrentColor(backgroundText.color);
            }}
          />
        </div>
      ) : (
        preview
      )}
    </section>
  );
}
