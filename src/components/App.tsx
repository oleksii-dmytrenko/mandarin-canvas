import { useEffect, useRef } from "react";
import { useCanvasStore } from "../stores/canvasStore";
import { useHistory } from "../hooks/useHistory";
import { useDrag } from "../hooks/useDrag";
import type { Drawing } from "../types";
import { ContextBar } from "./ContextBar";
import { PageList } from "./PageList";
import { Paper } from "./Paper";
import { TopBar } from "./TopBar";
import "../styles.css";

export function App() {
  const pageRef = useRef<HTMLDivElement>(null);
  const draftTextRef = useRef<Record<string, string>>({});
  const composingRef = useRef(false);
  const drawRef = useRef<{ startX: number; startY: number; drawing: Drawing } | null>(null);

  const { pages, activePageId, setFocusedBlockId, focusedBlockId, updateBlock, deleteBlock, deleteDrawing, deleteImage, importState } = useCanvasStore();
  const { historyRef, trackHistory, canUndo, canRedo } = useHistory();

  const dragState = useDrag({
    pageRef,
    onTrackHistory: (snapshot) => {
      historyRef.current.past.push(snapshot as ReturnType<typeof useCanvasStore.getState>);
    },
    onUpdateBlock: (id, patch, recordHistory = true) => {
      if (recordHistory) {
        const state = { activePageId, pages };
        trackHistory(state);
      }
      updateBlock(id, patch);
    },
    onUpdateDrawing: (id, drawing, recordHistory = true) => {
      if (recordHistory) {
        const state = { activePageId, pages };
        trackHistory(state);
      }
      const { updateDrawing } = useCanvasStore.getState();
      updateDrawing(id, drawing);
    },
    onUpdateImage: (id, patch, recordHistory = true) => {
      if (recordHistory) {
        const state = { activePageId, pages };
        trackHistory(state);
      }
      updateImage(id, patch);
    },
  });

  const { dragRef, handlePointerMove, endDrag } = dragState;

  const undo = () => {
    const { past } = historyRef.current;
    const previous = past[past.length - 1];
    if (!previous) return;

    const currentState = { activePageId, pages };
    historyRef.current = {
      past: past.slice(0, -1),
      future: [currentState, ...historyRef.current.future].slice(0, 10),
    };
    importState(previous as unknown as { activePageId: string; pages: typeof pages }, true);
  };

  const redo = () => {
    const { future } = historyRef.current;
    const next = future[0];
    if (!next) return;

    const currentState = { activePageId, pages };
    historyRef.current = {
      past: [...historyRef.current.past, currentState].slice(0, 10),
      future: future.slice(1),
    };
    importState(next as unknown as { activePageId: string; pages: typeof pages }, true);
  };

  const commitFocusedText = () => {
    if (composingRef.current) return;
    const activeEditable = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>("[data-block-id]") : null;
    const blockId = activeEditable?.dataset.blockId ?? focusedBlockId;
    if (!blockId) return;

    const liveElement = document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
    const content = (liveElement?.innerText ?? draftTextRef.current[blockId] ?? "").replace(/\n$/, "");

    if (!content.trim()) {
      deleteBlock(blockId);
      delete draftTextRef.current[blockId];
      return;
    }

    draftTextRef.current[blockId] = content;
    updateBlock(blockId, { content });
  };

  const updateImage = (id: string, patch: Partial<{ x: number; y: number; width: number; height: number }>) => {
    const { updateImage: doUpdateImage } = useCanvasStore.getState();
    doUpdateImage(id, patch);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if ((event.metaKey || event.ctrlKey) && (event.key === "y" || (event.shiftKey && event.key === "z"))) {
        event.preventDefault();
        redo();
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        const target = event.target as HTMLElement;
        if (target.isContentEditable) return;
        const { selectedId, selectedKind } = useCanvasStore.getState();
        if (selectedId && selectedKind) {
          if (selectedKind === "text") deleteBlock(selectedId);
          if (selectedKind === "drawing") deleteDrawing(selectedId);
          if (selectedKind === "image") deleteImage(selectedId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePageId, pages]);

  return (
    <main className="app-shell" onPointerMove={handlePointerMove} onPointerUp={endDrag}>
      <TopBar pageRef={pageRef} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />

      <PageList />

      <section className="workspace">
        <ContextBar />

        <div className="page-wrap">
          <Paper
            pageRef={pageRef}
            dragRef={dragRef}
            draftTextRef={draftTextRef}
            composingRef={composingRef}
            drawRef={drawRef}
            onTrackHistory={trackHistory}
            onCommitFocusedText={commitFocusedText}
          />
        </div>
      </section>
    </main>
  );
}
