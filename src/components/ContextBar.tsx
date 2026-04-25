import { useMemo } from "react";
import { useCanvasStore } from "../stores/canvasStore";
import { fonts } from "../utils/constants";
import { Segmented } from "./Segmented";

export function ContextBar() {
  const {
    selectedId,
    selectedKind,
    pages,
    activePageId,
    updateBlock,
    updateDrawing,
    setDefaultAnnotation,
  } = useCanvasStore();

  const activePage = useMemo(() => pages.find((p) => p.id === activePageId), [pages, activePageId]);
  const selectedBlock = activePage?.blocks.find((b) => b.id === selectedId);
  const selectedDrawing = activePage?.drawings.find((d) => d.id === selectedId);

  const setBlockAnnotation = (blockId: string, annotation: "plain" | "pinyin" | "zhuyin") => {
    setDefaultAnnotation(annotation);
    updateBlock(blockId, { annotation });
  };

  return (
    <div className="contextbar">
      {selectedKind === "text" && selectedBlock ? (
        <>
          <label>
            Font
            <select
              value={selectedBlock.fontFamily}
              onChange={(event) => {
                updateBlock(selectedBlock.id, { fontFamily: event.target.value });
              }}
            >
              {fonts.map((font) => (
                <option key={font.label} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Size
            <input
              aria-label="Font size"
              min={12}
              max={96}
              type="number"
              value={selectedBlock.fontSize}
              onChange={(event) => {
                updateBlock(selectedBlock.id, { fontSize: Number(event.target.value) });
              }}
            />
          </label>
          <Segmented
            value={selectedBlock.annotation}
            options={[
              ["plain", "Plain"],
              ["pinyin", "Pinyin"],
              ["zhuyin", "Zhuyin"],
            ]}
            onChange={(value) => setBlockAnnotation(selectedBlock.id, value as "plain" | "pinyin" | "zhuyin")}
          />
        </>
      ) : selectedKind === "drawing" && selectedDrawing ? (
        <>
          <span className="context-label">{selectedDrawing.kind}</span>
          <label>
            Stroke
            <input
              aria-label="Stroke width"
              min={1}
              max={12}
              type="number"
              value={selectedDrawing.strokeWidth}
              onChange={(event) => updateDrawing(selectedDrawing.id, { strokeWidth: Number(event.target.value) })}
            />
          </label>
        </>
      ) : (
        <span className="hint">Click the page to type, or choose a tool.</span>
      )}
    </div>
  );
}
