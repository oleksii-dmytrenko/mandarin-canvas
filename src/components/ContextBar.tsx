import { useMemo } from "react";
import type { DrawingKind, Tool } from "../types";
import { useCanvasStore } from "../stores/canvasStore";
import { fonts } from "../utils/constants";
import { Segmented } from "./Segmented";

const isDrawingTool = (tool: Tool): tool is DrawingKind => tool === "pen" || tool === "rect" || tool === "arrow";

export function ContextBar() {
  const {
    tool,
    selectedId,
    selectedKind,
    pages,
    activePageId,
    toolStrokeWidths,
    textStyle,
    updateBlock,
    updateDrawing,
    setToolStrokeWidth,
    setTextStyle,
    setDefaultAnnotation,
  } = useCanvasStore();

  const activePage = useMemo(() => pages.find((p) => p.id === activePageId), [pages, activePageId]);
  const selectedBlock = activePage?.blocks.find((b) => b.id === selectedId);
  const selectedDrawing = activePage?.drawings.find((d) => d.id === selectedId);

  const setBlockAnnotation = (blockId: string, annotation: "plain" | "pinyin" | "zhuyin") => {
    setDefaultAnnotation(annotation);
    updateBlock(blockId, { annotation });
  };

  const updateTextStyle = (patch: Partial<typeof textStyle>) => {
    setTextStyle(patch);
    if (selectedKind === "text" && selectedBlock) {
      updateBlock(selectedBlock.id, patch);
    }
  };

  const visibleTextStyle = selectedKind === "text" && selectedBlock ? selectedBlock : textStyle;

  return (
    <div className="contextbar">
      {isDrawingTool(tool) ? (
        <>
          <span className="context-label">{tool}</span>
          <label>
            Stroke
            <input
              aria-label={`${tool} stroke width`}
              min={1}
              max={12}
              type="number"
              value={toolStrokeWidths[tool]}
              onChange={(event) => {
                const strokeWidth = Number(event.target.value);
                setToolStrokeWidth(tool, strokeWidth);
                if (selectedKind === "drawing" && selectedDrawing?.kind === tool) {
                  updateDrawing(selectedDrawing.id, { strokeWidth });
                }
              }}
            />
          </label>
        </>
      ) : tool === "text" ? (
        <>
          <label>
            Font
            <select
              value={visibleTextStyle.fontFamily}
              onChange={(event) => {
                updateTextStyle({ fontFamily: event.target.value });
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
              value={visibleTextStyle.fontSize}
              onChange={(event) => {
                updateTextStyle({ fontSize: Number(event.target.value) });
              }}
            />
          </label>
          <Segmented
            value={visibleTextStyle.annotation}
            options={[
              ["plain", "Plain"],
              ["pinyin", "Pinyin"],
              ["zhuyin", "Zhuyin"],
            ]}
            onChange={(value) => updateTextStyle({ annotation: value as "plain" | "pinyin" | "zhuyin" })}
          />
        </>
      ) : selectedKind === "text" && selectedBlock ? (
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
