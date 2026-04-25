import { ArrowUpRight, Camera, Download, MousePointer2, PenLine, Printer, RectangleHorizontal, Redo2, TextCursorInput, Undo2, Upload } from "lucide-react";
import { useRef } from "react";
import { useCanvasStore } from "../stores/canvasStore";
import { colorSwatches } from "../utils/constants";
import { IconButton } from "./IconButton";
import { downloadStateFile, importStateFile } from "../utils/export";
import { toPng } from "html-to-image";
import { pageFileStem } from "../utils/id";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../utils/constants";

interface TopBarProps {
  pageRef: React.RefObject<HTMLDivElement | null>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function TopBar({ pageRef, canUndo, canRedo, onUndo, onRedo }: TopBarProps) {
  const {
    tool,
    setTool,
    currentColor,
    setCurrentColor,
    selectedId,
    pages,
    activePageId,
    isExporting,
    setIsExporting,
    updateBlock,
    updateDrawing,
    importState,
  } = useCanvasStore();

  const activePage = pages.find((p) => p.id === activePageId);

  const importInputRef = useRef<HTMLInputElement>(null);

  const selectedBlock = activePage?.blocks.find((b: { id: string }) => b.id === selectedId);
  const selectedDrawing = activePage?.drawings.find((d: { id: string }) => d.id === selectedId);

  const handleDownloadSnapshot = async () => {
    if (!pageRef.current || !activePage) return;
    setIsExporting(true);
    pageRef.current.dataset.exporting = "true";
    try {
      const dataUrl = await toPng(pageRef.current, {
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        canvasWidth: PAGE_WIDTH * 2,
        canvasHeight: PAGE_HEIGHT * 2,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportHidden === "true"),
        style: {
          background: "#ffffff",
          boxShadow: "none",
          height: `${PAGE_HEIGHT}px`,
          margin: "0",
          overflow: "hidden",
          transform: "none",
          width: `${PAGE_WIDTH}px`,
        },
      });
      const link = document.createElement("a");
      link.download = `${pageFileStem(activePage)}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      if (pageRef.current) delete pageRef.current.dataset.exporting;
      setIsExporting(false);
    }
  };

  const handleDownloadState = () => {
    if (!activePage) return;
    const state = { activePageId, pages };
    downloadStateFile(state, activePage);
  };

  const handleImportState = async (file: File) => {
    const state = { activePageId, pages };
    const newState = await importStateFile(file, state);
    if (newState) {
      importState(newState);
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand-mark" src="/mandarin-logo.svg" alt="" />
        <div>
          <strong>Mandarin Canvas</strong>
        </div>
      </div>

      <div className="tool-strip" aria-label="Tools">
        <IconButton active={tool === "select"} label="Select" onClick={() => setTool("select")}>
          <MousePointer2 size={18} />
        </IconButton>
        <IconButton active={tool === "text"} label="Text" onClick={() => setTool("text")}>
          <TextCursorInput size={18} />
        </IconButton>
        <IconButton active={tool === "pen"} label="Pen" onClick={() => setTool("pen")}>
          <PenLine size={18} />
        </IconButton>
        <IconButton active={tool === "rect"} label="Rectangle" onClick={() => setTool("rect")}>
          <RectangleHorizontal size={18} />
        </IconButton>
        <IconButton active={tool === "arrow"} label="Arrow" onClick={() => setTool("arrow")}>
          <ArrowUpRight size={18} />
        </IconButton>
      </div>

      <div className="color-row" aria-label="Colors">
        {colorSwatches.map((color) => (
          <button
            aria-label={`Use ${color}`}
            className={`swatch ${currentColor === color ? "active" : ""}`}
            key={color}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setCurrentColor(color);
              if (selectedBlock) updateBlock(selectedBlock.id, { color });
              if (selectedDrawing) updateDrawing(selectedDrawing.id, { color });
            }}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="history-strip" aria-label="History">
        <IconButton label="Undo" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={18} />
        </IconButton>
        <IconButton label="Redo" onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={18} />
        </IconButton>
      </div>

      <div className="action-strip">
        <IconButton label="Print" onClick={() => window.print()}>
          <Printer size={18} />
        </IconButton>
        <IconButton label={isExporting ? "Exporting screenshot" : "Screenshot"} onClick={handleDownloadSnapshot} disabled={isExporting}>
          <Camera size={18} />
        </IconButton>
        <IconButton label="Download state" onClick={handleDownloadState}>
          <Download size={18} />
        </IconButton>
        <IconButton label="Upload state" onClick={() => importInputRef.current?.click()}>
          <Upload size={18} />
        </IconButton>
        <input
          accept="application/json,.json"
          aria-label="Upload state file"
          className="state-file-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportState(file);
            event.currentTarget.value = "";
          }}
          ref={importInputRef}
          type="file"
        />
      </div>
    </header>
  );
}
