import {
  ArrowUpRight,
  Camera,
  CircleSlash,
  Copy,
  Download,
  Eraser,
  FilePlus2,
  MousePointer2,
  PenLine,
  Pencil,
  Printer,
  RectangleHorizontal,
  Redo2,
  TextCursorInput,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { CSSProperties, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { pinyin } from "pinyin-pro";
import { pinyinToZhuyin } from "pinyin-zhuyin";

type Tool = "select" | "text" | "pen" | "rect" | "arrow";
type AnnotationMode = "plain" | "pinyin" | "zhuyin";
type DrawingKind = "pen" | "rect" | "arrow";

type TextBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  annotation: AnnotationMode;
};

type Drawing = {
  id: string;
  kind: DrawingKind;
  color: string;
  strokeWidth: number;
  points: Array<{ x: number; y: number }>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type Page = {
  id: string;
  title: string;
  updatedAt: number;
  blocks: TextBlock[];
  drawings: Drawing[];
};

type StoredState = {
  activePageId: string;
  pages: Page[];
};

const STORAGE_KEY = "mandarin-canvas:v1";
const STATE_FILE_APP = "mandarin-canvas";
const STATE_FILE_VERSION = 1;
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const HISTORY_LIMIT = 10;
const DEFAULT_TEXT_BLOCK_WIDTH = 260;
const MIN_TEXT_BLOCK_WIDTH = 44;

const fonts = [
  { label: "Sans", value: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" },
  { label: "Kai", value: "'Kaiti TC', 'KaiTi', 'BiauKai', serif" },
  { label: "Song", value: "'Songti TC', SimSun, serif" },
];

const colorSwatches = ["#1d1d1f", "#d23f31", "#1f7a4d", "#235cc7", "#8a4fd3", "#d78a00"];

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const slugify = (value: string) => value.trim().replace(/\s+/g, "-").toLowerCase() || "untitled";

const pageFileStem = (page: Page) => `${slugify(page.title)}-${page.id}`;

const createPage = (index = 1): Page => ({
  id: createId(),
  title: `Page ${index}`,
  updatedAt: Date.now(),
  blocks: [],
  drawings: [],
});

const initialState = (): StoredState => {
  const first = createPage();
  return { activePageId: first.id, pages: [first] };
};

const loadState = (): StoredState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as unknown;
    return isStoredState(parsed) ? parsed : initialState();
  } catch {
    return initialState();
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPoint = (value: unknown): value is { x: number; y: number } =>
  isRecord(value) && typeof value.x === "number" && typeof value.y === "number";

const isDrawing = (value: unknown): value is Drawing => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.kind === "pen" || value.kind === "rect" || value.kind === "arrow") &&
    typeof value.color === "string" &&
    typeof value.strokeWidth === "number" &&
    Array.isArray(value.points) &&
    value.points.every(isPoint)
  );
};

const isTextBlock = (value: unknown): value is TextBlock => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.width === "number" &&
    typeof value.content === "string" &&
    typeof value.fontFamily === "string" &&
    typeof value.fontSize === "number" &&
    typeof value.color === "string" &&
    (value.annotation === "plain" || value.annotation === "pinyin" || value.annotation === "zhuyin")
  );
};

const isPage = (value: unknown): value is Page => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "number" &&
    Array.isArray(value.blocks) &&
    value.blocks.every(isTextBlock) &&
    Array.isArray(value.drawings) &&
    value.drawings.every(isDrawing)
  );
};

const isStoredState = (value: unknown): value is StoredState => {
  if (!isRecord(value)) return false;
  const pages = value.pages;
  if (!Array.isArray(pages)) return false;
  const pageIds = pages.map((page) => (isRecord(page) ? page.id : undefined));
  return (
    typeof value.activePageId === "string" &&
    pages.length > 0 &&
    pages.every(isPage) &&
    new Set(pageIds).size === pages.length &&
    pages.some((page) => page.id === value.activePageId)
  );
};

const parseImportedState = (value: unknown): StoredState | null => {
  if (isStoredState(value)) return value;
  if (isRecord(value) && value.app === STATE_FILE_APP && isStoredState(value.state)) return value.state;
  return null;
};

const cloneImportedState = (importedState: StoredState): StoredState => {
  const pageIdMap = new Map(importedState.pages.map((page) => [page.id, createId()]));
  const now = Date.now();
  const pages = importedState.pages.map((page) => ({
    ...page,
    id: pageIdMap.get(page.id) ?? createId(),
    updatedAt: now,
    blocks: page.blocks.map((block) => ({ ...block, id: createId() })),
    drawings: page.drawings.map((drawing) => ({ ...drawing, id: createId() })),
  }));

  return {
    activePageId: pageIdMap.get(importedState.activePageId) ?? pages[0].id,
    pages,
  };
};

const appendImportedState = (currentState: StoredState, importedState: StoredState): StoredState => {
  const clonedState = cloneImportedState(importedState);
  return {
    activePageId: clonedState.activePageId,
    pages: [...clonedState.pages, ...currentState.pages],
  };
};

const hasHanzi = (value: string) => /[\u3400-\u9fff]/.test(value);

const drawingBounds = (drawing: Drawing) => {
  if (drawing.kind === "rect") {
    const x = drawing.x ?? 0;
    const y = drawing.y ?? 0;
    return {
      minX: x,
      minY: y,
      maxX: x + (drawing.width ?? 0),
      maxY: y + (drawing.height ?? 0),
    };
  }

  const xs = drawing.points.map((point) => point.x);
  const ys = drawing.points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const clampDrawingDelta = (drawing: Drawing, deltaX: number, deltaY: number) => {
  const bounds = drawingBounds(drawing);
  return {
    x: Math.max(-bounds.minX, Math.min(PAGE_WIDTH - bounds.maxX, deltaX)),
    y: Math.max(-bounds.minY, Math.min(PAGE_HEIGHT - bounds.maxY, deltaY)),
  };
};

const translateDrawing = (drawing: Drawing, deltaX: number, deltaY: number): Drawing => {
  const points = drawing.points.map((point) => ({
    x: point.x + deltaX,
    y: point.y + deltaY,
  }));

  return {
    ...drawing,
    points,
    x: typeof drawing.x === "number" ? drawing.x + deltaX : drawing.x,
    y: typeof drawing.y === "number" ? drawing.y + deltaY : drawing.y,
  };
};

const selectedDrawingDeletePosition = (drawing: Drawing) => {
  const bounds = drawingBounds(drawing);
  return {
    left: Math.max(0, Math.min(PAGE_WIDTH - 24, bounds.minX - 10)),
    top: Math.max(0, Math.min(PAGE_HEIGHT - 24, bounds.minY - 10)),
  };
};

const annotationForChar = (char: string, mode: Exclude<AnnotationMode, "plain">) => {
  if (!hasHanzi(char)) return "";
  const py = pinyin(char, { toneType: "symbol", type: "string" }).trim();
  if (mode === "pinyin") return py;
  try {
    return pinyinToZhuyin(py);
  } catch {
    return py;
  }
};

function RubyText({ text, mode }: { text: string; mode: AnnotationMode }) {
  if (mode === "plain") return <>{text || " "}</>;

  return (
    <>
      {[...text].map((char, index) => {
        const annotation = annotationForChar(char, mode);
        if (!annotation) return <span key={`${char}-${index}`}>{char}</span>;
        return (
          <ruby key={`${char}-${index}`}>
            {char}
            <rt>{annotation}</rt>
          </ruby>
        );
      })}
    </>
  );
}

function App() {
  const [state, setState] = useState<StoredState>(() => loadState());
  const [tool, setTool] = useState<Tool>("text");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<"text" | "drawing" | null>(null);
  const [currentColor, setCurrentColor] = useState("#1d1d1f");
  const [defaultAnnotation, setDefaultAnnotation] = useState<AnnotationMode>("plain");
  const [draftDrawing, setDraftDrawing] = useState<Drawing | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<{ past: StoredState[]; future: StoredState[] }>({ past: [], future: [] });
  const dragRef = useRef<
    | {
        kind: "text";
        id: string;
        startX: number;
        startY: number;
        baseX: number;
        baseY: number;
        baseState: StoredState;
        historyTracked: boolean;
      }
    | {
        kind: "text-resize";
        id: string;
        edge: "left" | "right";
        startX: number;
        baseX: number;
        baseWidth: number;
        baseState: StoredState;
        historyTracked: boolean;
      }
    | {
        kind: "drawing";
        id: string;
        startX: number;
        startY: number;
        baseDrawing: Drawing;
        baseState: StoredState;
        historyTracked: boolean;
      }
    | null
  >(null);
  const drawRef = useRef<{ startX: number; startY: number; drawing: Drawing } | null>(null);
  const pageTitleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const draftTextRef = useRef<Record<string, string>>({});
  const composingRef = useRef(false);

  const activePage = useMemo(
    () => state.pages.find((page) => page.id === state.activePageId) ?? state.pages[0],
    [state],
  );

  const selectedBlock = activePage.blocks.find((block) => block.id === selectedId);
  const selectedDrawing = activePage.drawings.find((drawing) => drawing.id === selectedId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!editingPageId) return;
    const input = pageTitleInputRefs.current[editingPageId];
    input?.focus();
    input?.select();
  }, [editingPageId]);

  const trackHistory = (snapshot: StoredState) => {
    historyRef.current = {
      past: [...historyRef.current.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
    };
  };

  const updateStoredState = (updater: (previous: StoredState) => StoredState, recordHistory = true) => {
    setState((previous) => {
      const next = updater(previous);
      if (recordHistory) trackHistory(previous);
      return next;
    });
  };

  const updateActivePage = (updater: (page: Page) => Page, recordHistory = true) => {
    updateStoredState(
      (previous) => ({
        ...previous,
        pages: previous.pages.map((page) =>
          page.id === previous.activePageId ? { ...updater(page), updatedAt: Date.now() } : page,
        ),
      }),
      recordHistory,
    );
  };

  const undo = () => {
    const previous = historyRef.current.past[historyRef.current.past.length - 1];
    if (!previous) return;

    historyRef.current = {
      past: historyRef.current.past.slice(0, -1),
      future: [state, ...historyRef.current.future].slice(0, HISTORY_LIMIT),
    };
    setState(previous);
    setSelectedId(null);
    setSelectedKind(null);
    setFocusedBlockId(null);
  };

  const redo = () => {
    const next = historyRef.current.future[0];
    if (!next) return;

    historyRef.current = {
      past: [...historyRef.current.past, state].slice(-HISTORY_LIMIT),
      future: historyRef.current.future.slice(1),
    };
    setState(next);
    setSelectedId(null);
    setSelectedKind(null);
    setFocusedBlockId(null);
  };

  const pagePoint = (event: PointerEvent) => {
    const rect = pageRef.current!.getBoundingClientRect();
    const scaleX = PAGE_WIDTH / rect.width;
    const scaleY = PAGE_HEIGHT / rect.height;
    return {
      x: Math.max(0, Math.min(PAGE_WIDTH, (event.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(PAGE_HEIGHT, (event.clientY - rect.top) * scaleY)),
    };
  };

  const addBlock = (x: number, y: number) => {
    const block: TextBlock = {
      id: createId(),
      x,
      y,
      width: DEFAULT_TEXT_BLOCK_WIDTH,
      content: "",
      fontFamily: fonts[0].value,
      fontSize: 28,
      color: currentColor,
      annotation: defaultAnnotation,
    };
    updateActivePage((page) => ({ ...page, blocks: [...page.blocks, block] }));
    setSelectedId(block.id);
    setSelectedKind("text");
    setFocusedBlockId(block.id);
    window.setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`)?.focus(), 30);
  };

  const handlePagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-editor-object]")) return;
    commitFocusedText();
    const point = pagePoint(event);

    if (tool === "text") {
      addBlock(point.x, point.y);
      return;
    }

    if (tool === "select") {
      setSelectedId(null);
      setSelectedKind(null);
      setFocusedBlockId(null);
      return;
    }

    const drawing: Drawing = {
      id: createId(),
      kind: tool,
      color: currentColor,
      strokeWidth: tool === "pen" ? 3 : 2.5,
      points: tool === "pen" ? [point] : [],
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
    drawRef.current = { startX: point.x, startY: point.y, drawing };
    setDraftDrawing(drawing);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      const rect = pageRef.current!.getBoundingClientRect();
      const scaleX = PAGE_WIDTH / rect.width;
      const scaleY = PAGE_HEIGHT / rect.height;
      const deltaX = (event.clientX - dragRef.current.startX) * scaleX;
      const deltaY = dragRef.current.kind === "text-resize" ? 0 : (event.clientY - dragRef.current.startY) * scaleY;

      if (!dragRef.current.historyTracked && (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5)) {
        trackHistory(dragRef.current.baseState);
        dragRef.current.historyTracked = true;
      }

      if (dragRef.current.kind === "text") {
        const nextX = dragRef.current.baseX + deltaX;
        const nextY = dragRef.current.baseY + deltaY;
        updateBlock(
          dragRef.current.id,
          {
            x: Math.max(0, Math.min(PAGE_WIDTH - 40, nextX)),
            y: Math.max(0, Math.min(PAGE_HEIGHT - 30, nextY)),
          },
          false,
        );
      } else if (dragRef.current.kind === "text-resize") {
        const nextWidth =
          dragRef.current.edge === "right"
            ? Math.max(MIN_TEXT_BLOCK_WIDTH, Math.min(PAGE_WIDTH - dragRef.current.baseX, dragRef.current.baseWidth + deltaX))
            : Math.max(MIN_TEXT_BLOCK_WIDTH, dragRef.current.baseWidth - deltaX);
        const nextX =
          dragRef.current.edge === "left"
            ? Math.max(0, Math.min(dragRef.current.baseX + dragRef.current.baseWidth - MIN_TEXT_BLOCK_WIDTH, dragRef.current.baseX + deltaX))
            : dragRef.current.baseX;
        const clampedWidth =
          dragRef.current.edge === "left"
            ? Math.min(PAGE_WIDTH - nextX, dragRef.current.baseX + dragRef.current.baseWidth - nextX)
            : nextWidth;
        updateBlock(
          dragRef.current.id,
          {
            x: nextX,
            width: Math.max(MIN_TEXT_BLOCK_WIDTH, clampedWidth),
          },
          false,
        );
      } else {
        const clamped = clampDrawingDelta(dragRef.current.baseDrawing, deltaX, deltaY);
        updateDrawing(dragRef.current.id, translateDrawing(dragRef.current.baseDrawing, clamped.x, clamped.y), false);
      }
      return;
    }

    if (!drawRef.current) return;
    const point = pagePoint(event);
    const { startX, startY, drawing } = drawRef.current;
    const next: Drawing =
      drawing.kind === "pen"
        ? { ...drawing, points: [...drawing.points, point] }
        : {
            ...drawing,
            x: Math.min(startX, point.x),
            y: Math.min(startY, point.y),
            width: Math.abs(point.x - startX),
            height: Math.abs(point.y - startY),
            points: [
              { x: startX, y: startY },
              point,
            ],
          };
    drawRef.current.drawing = next;
    setDraftDrawing(next);
  };

  const handlePagePointerUp = () => {
    if (drawRef.current) {
      const drawing = drawRef.current.drawing;
      const isMeaningful =
        drawing.kind === "pen" ? drawing.points.length > 2 : (drawing.width ?? 0) > 4 || (drawing.height ?? 0) > 4;
      if (isMeaningful) {
        updateActivePage((page) => ({ ...page, drawings: [...page.drawings, drawing] }));
        setSelectedId(drawing.id);
        setSelectedKind("drawing");
      }
      drawRef.current = null;
      setDraftDrawing(null);
    }
    dragRef.current = null;
  };

  const updateBlock = (id: string, patch: Partial<TextBlock>, recordHistory = true) => {
    updateActivePage(
      (page) => ({
        ...page,
        blocks: page.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
      }),
      recordHistory,
    );
  };

  const commitBlockText = (id: string, fallbackContent?: string) => {
    const liveElement = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
    const content = (fallbackContent ?? liveElement?.innerText ?? draftTextRef.current[id] ?? "").replace(/\n$/, "");

    if (!content.trim()) {
      deleteBlock(id);
      delete draftTextRef.current[id];
      return;
    }

    draftTextRef.current[id] = content;
    updateBlock(id, { content });
  };

  const commitFocusedText = () => {
    if (composingRef.current) return;

    const activeEditable = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>("[data-block-id]") : null;
    const blockId = activeEditable?.dataset.blockId ?? focusedBlockId;
    if (blockId) commitBlockText(blockId);
  };

  const updateDrawing = (id: string, patch: Partial<Drawing>, recordHistory = true) => {
    updateActivePage(
      (page) => ({
        ...page,
        drawings: page.drawings.map((drawing) => (drawing.id === id ? { ...drawing, ...patch } : drawing)),
      }),
      recordHistory,
    );
  };

  const deleteSelection = () => {
    if (!selectedId) return;
    updateActivePage((page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== selectedId),
      drawings: page.drawings.filter((drawing) => drawing.id !== selectedId),
    }));
    setSelectedId(null);
    setSelectedKind(null);
  };

  const deleteBlock = (id: string) => {
    updateActivePage((page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== id),
    }));
    delete draftTextRef.current[id];
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
    if (focusedBlockId === id) setFocusedBlockId(null);
  };

  const deleteDrawing = (id: string) => {
    updateActivePage((page) => ({
      ...page,
      drawings: page.drawings.filter((drawing) => drawing.id !== id),
    }));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
  };

  const createNewPage = () => {
    commitFocusedText();
    const page = createPage(state.pages.length + 1);
    updateStoredState((previous) => ({ activePageId: page.id, pages: [page, ...previous.pages] }));
    setSelectedId(null);
    setSelectedKind(null);
    setTool("text");
  };

  const duplicatePage = () => {
    commitFocusedText();
    const copy: Page = {
      ...activePage,
      id: createId(),
      title: `${activePage.title} copy`,
      updatedAt: Date.now(),
      blocks: activePage.blocks.map((block) => ({ ...block, id: createId() })),
      drawings: activePage.drawings.map((drawing) => ({ ...drawing, id: createId() })),
    };
    updateStoredState((previous) => ({ activePageId: copy.id, pages: [copy, ...previous.pages] }));
  };

  const cleanPage = () => {
    commitFocusedText();
    updateActivePage((page) => ({
      ...page,
      blocks: [],
      drawings: [],
    }));
    draftTextRef.current = {};
    setSelectedId(null);
    setSelectedKind(null);
    setFocusedBlockId(null);
  };

  const deletePage = () => {
    commitFocusedText();
    if (state.pages.length === 1) {
      const page = createPage();
      updateStoredState(() => ({ activePageId: page.id, pages: [page] }));
      setSelectedId(null);
      setSelectedKind(null);
      setFocusedBlockId(null);
      return;
    }
    updateStoredState((previous) => {
      const pages = previous.pages.filter((page) => page.id !== previous.activePageId);
      return { activePageId: pages[0].id, pages };
    });
    setSelectedId(null);
    setSelectedKind(null);
    setFocusedBlockId(null);
  };

  const downloadSnapshot = async () => {
    if (!pageRef.current) return;
    commitFocusedText();
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

  const downloadState = () => {
    commitFocusedText();
    const payload = {
      app: STATE_FILE_APP,
      version: STATE_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${pageFileStem(activePage)}-state.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importStateFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const importedState = parseImportedState(parsed);
      if (!importedState) {
        window.alert("That file does not look like a Mandarin Canvas state export.");
        return;
      }

      commitFocusedText();
      trackHistory(state);
      setState((previous) => appendImportedState(previous, importedState));
      setSelectedId(null);
      setSelectedKind(null);
      setFocusedBlockId(null);
      setEditingPageId(null);
      draftTextRef.current = {};
      historyRef.current.future = [];
    } catch {
      window.alert("Could not import that file. Please choose a valid JSON state export.");
    }
  };

  const setActivePage = (pageId: string) => {
    commitFocusedText();
    updateStoredState((previous) => ({ ...previous, activePageId: pageId }), false);
    setSelectedId(null);
    setSelectedKind(null);
  };

  const renamePage = (pageId: string, title: string) => {
    const nextTitle = title.trim() || "Untitled page";
    updateStoredState((previous) => ({
      ...previous,
      pages: previous.pages.map((page) =>
        page.id === pageId ? { ...page, title: nextTitle, updatedAt: Date.now() } : page,
      ),
    }));
  };

  const finishRenamingPage = (pageId: string, title: string) => {
    renamePage(pageId, title);
    setEditingPageId(null);
  };

  const setBlockAnnotation = (blockId: string, annotation: AnnotationMode) => {
    commitBlockText(blockId);
    setDefaultAnnotation(annotation);
    updateBlock(blockId, { annotation });
  };

  return (
    <main className="app-shell">
      <header className="topbar" onPointerDownCapture={commitFocusedText}>
        <div className="brand">
          <span className="brand-mark">文</span>
          <div>
            <strong>Mandarin Canvas</strong>
            <span>{activePage.blocks.length} text · {activePage.drawings.length} drawing</span>
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
          <IconButton label="Undo" onClick={undo} disabled={!historyRef.current.past.length}>
            <Undo2 size={18} />
          </IconButton>
          <IconButton label="Redo" onClick={redo} disabled={!historyRef.current.future.length}>
            <Redo2 size={18} />
          </IconButton>
        </div>

        <div className="action-strip">
          <IconButton label="Print" onClick={() => window.print()}>
            <Printer size={18} />
          </IconButton>
          <IconButton label={isExporting ? "Exporting screenshot" : "Screenshot"} onClick={downloadSnapshot} disabled={isExporting}>
            <Camera size={18} />
          </IconButton>
          <IconButton label="Download state" onClick={downloadState}>
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
              if (file) void importStateFile(file);
              event.currentTarget.value = "";
            }}
            ref={importInputRef}
            type="file"
          />
        </div>
      </header>

      <aside className="page-list" onPointerDownCapture={commitFocusedText}>
        <button className="primary-action" onClick={createNewPage}>
          <FilePlus2 size={17} />
          New page
        </button>
        <div className="page-stack">
          {state.pages.map((page) => {
            const isActive = page.id === activePage.id;

            return (
              <div
                className={`page-card ${page.id === activePage.id ? "active" : ""}`}
                key={page.id}
                onClick={() => setActivePage(page.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActivePage(page.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="page-card-title-row">
                  {editingPageId === page.id ? (
                    <input
                      aria-label="Page title"
                      className="page-card-title"
                      defaultValue={page.title}
                      onBlur={(event) => finishRenamingPage(page.id, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onFocus={() => setActivePage(page.id)}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                        if (event.key === "Escape") {
                          event.currentTarget.value = page.title;
                          setEditingPageId(null);
                        }
                      }}
                      ref={(input) => {
                        pageTitleInputRefs.current[page.id] = input;
                      }}
                    />
                  ) : (
                    <>
                      <span className="page-card-title-text">{page.title}</span>
                      <button
                        aria-label={`Rename ${page.title}`}
                        className="page-title-edit-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActivePage(page.id);
                          setEditingPageId(page.id);
                        }}
                        title="Rename page"
                        type="button"
                      >
                        <Pencil size={14} />
                      </button>
                    </>
                  )}
                </div>
                <div className="page-card-footer">
                  <small>{new Date(page.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                  {isActive && (
                    <div className="page-card-actions" aria-label="Page actions">
                      <IconButton
                        label="Duplicate page"
                        onClick={(event) => {
                          event.stopPropagation();
                          duplicatePage();
                        }}
                      >
                        <Copy size={15} />
                      </IconButton>
                      <IconButton
                        label="Delete page"
                        onClick={(event) => {
                          event.stopPropagation();
                          deletePage();
                        }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                      <IconButton
                        label="Clean page"
                        onClick={(event) => {
                          event.stopPropagation();
                          cleanPage();
                        }}
                        disabled={!page.blocks.length && !page.drawings.length}
                      >
                        <Eraser size={15} />
                      </IconButton>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="workspace">
        <div className="contextbar" onPointerDownCapture={commitFocusedText}>
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
                    <option key={font.label} value={font.value}>{font.label}</option>
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
                onChange={(value) => setBlockAnnotation(selectedBlock.id, value as AnnotationMode)}
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
            <span className="hint">{tool === "text" ? "Click the page to type." : "Choose a tool, then work directly on the page."}</span>
          )}

        </div>

        <div className="page-wrap">
          <div
            className={`paper tool-${tool}`}
            ref={pageRef}
            onPointerDown={handlePagePointerDown}
            onPointerMove={handlePagePointerMove}
            onPointerUp={handlePagePointerUp}
            onPointerCancel={handlePagePointerUp}
          >
            <svg className="drawing-layer" viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} aria-hidden="true">
              <defs>
                <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="context-stroke" />
                </marker>
              </defs>
              {[...activePage.drawings, ...(draftDrawing ? [draftDrawing] : [])].map((drawing) => (
                <DrawingShape
                  drawing={drawing}
                  key={drawing.id}
                  selected={selectedId === drawing.id}
                  onSelect={(event) => {
                    setSelectedId(drawing.id);
                    setSelectedKind("drawing");
                    setTool("select");
                    setCurrentColor(drawing.color);
                    dragRef.current = {
                      kind: "drawing",
                      id: drawing.id,
                      startX: event.clientX,
                      startY: event.clientY,
                      baseDrawing: drawing,
                      baseState: state,
                      historyTracked: false,
                    };
                    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
                  }}
                />
              ))}
            </svg>

            {activePage.drawings.map((drawing) => {
              if (selectedId !== drawing.id) return null;
              const position = selectedDrawingDeletePosition(drawing);

              return (
                <button
                  aria-label="Delete drawing"
                  className="object-delete-button drawing-delete-button"
                  data-editor-object
                  data-export-hidden="true"
                  key={`delete-${drawing.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteDrawing(drawing.id);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  style={{ left: position.left, top: position.top }}
                  type="button"
                >
                  <Trash2 size={12} />
                </button>
              );
            })}

            {activePage.blocks.map((block) => (
              <article
                className={`text-block ${selectedId === block.id ? "selected" : ""}`}
                data-editor-object
                key={block.id}
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
                  setSelectedId(block.id);
                  setSelectedKind("text");
                  setCurrentColor(block.color);
                  if (tool === "select") {
                    event.preventDefault();
                    dragRef.current = {
                      kind: "text",
                      id: block.id,
                      startX: event.clientX,
                      startY: event.clientY,
                      baseX: block.x,
                      baseY: block.y,
                      baseState: state,
                      historyTracked: false,
                    };
                    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                  }
                }}
              >
                {selectedId === block.id && (
                  <>
                    <button
                      aria-label="Move text block"
                      className="drag-handle"
                      data-export-hidden="true"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        dragRef.current = {
                          kind: "text",
                          id: block.id,
                          startX: event.clientX,
                          startY: event.clientY,
                          baseX: block.x,
                          baseY: block.y,
                          baseState: state,
                          historyTracked: false,
                        };
                        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                      }}
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
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          dragRef.current = {
                            kind: "text-resize",
                            id: block.id,
                            edge,
                            startX: event.clientX,
                            baseX: block.x,
                            baseWidth: block.width,
                            baseState: state,
                            historyTracked: false,
                          };
                          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                        }}
                        type="button"
                      />
                    ))}
                  </>
                )}
                {block.annotation !== "plain" && focusedBlockId !== block.id ? (
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
                    onFocus={(event) => {
                      setFocusedBlockId(block.id);
                      draftTextRef.current[block.id] = event.currentTarget.innerText;
                    }}
                    onBlur={(event) => {
                      if (composingRef.current) return;
                      setFocusedBlockId(null);
                      const content = event.currentTarget.innerText.replace(/\n$/, "");
                      commitBlockText(block.id, content);
                    }}
                    onInput={(event) => {
                      draftTextRef.current[block.id] = event.currentTarget.innerText;
                    }}
                  >
                    {block.content}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function IconButton({
  active = false,
  children,
  disabled = false,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${active ? "active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function Segmented({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <div className="segmented">
      {options.map(([optionValue, label]) => (
        <button className={value === optionValue ? "active" : ""} key={optionValue} onClick={() => onChange(optionValue)} type="button">
          {label}
        </button>
      ))}
    </div>
  );
}

function DrawingShape({
  drawing,
  onSelect,
  selected,
}: {
  drawing: Drawing;
  onSelect: (event: PointerEvent<SVGElement>) => void;
  selected: boolean;
}) {
  const wrapperProps = {
    "data-editor-object": true,
    className: `drawing-shape ${selected ? "selected" : ""}`,
    onPointerDown: (event: PointerEvent<SVGElement>) => {
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

export default App;
