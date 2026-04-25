import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnnotationMode, ColorTool, Drawing, DrawingKind, ImageObject, Page, StoredState, TextBlock, Tool } from "../types";
import { DEFAULT_TEXT_BLOCK_WIDTH, PAGE_HEIGHT, PAGE_WIDTH, STORAGE_KEY, defaultTextStyle, defaultToolColors, defaultToolStrokeWidths } from "../utils/constants";
import { createId } from "../utils/id";
import { isStoredState, normalizeState } from "../utils/validation";

const createPage = (index = 1): Page => ({
  id: createId(),
  title: `Page ${index}`,
  updatedAt: Date.now(),
  blocks: [],
  drawings: [],
  images: [],
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
    return isStoredState(parsed) ? normalizeState(parsed) : initialState();
  } catch {
    return initialState();
  }
};

interface CanvasState extends StoredState {
  tool: Tool;
  selectedId: string | null;
  selectedKind: "text" | "drawing" | "image" | null;
  currentColor: string;
  toolColors: Record<ColorTool, string>;
  toolStrokeWidths: Record<DrawingKind, number>;
  textStyle: Pick<TextBlock, "fontFamily" | "fontSize" | "annotation">;
  defaultAnnotation: AnnotationMode;
  draftDrawing: Drawing | null;
  focusedBlockId: string | null;
  editingPageId: string | null;
  isExporting: boolean;
}

interface CanvasActions {
  // Tool & selection
  setTool: (tool: Tool) => void;
  setSelectedId: (id: string | null, kind?: "text" | "drawing" | "image" | null) => void;
  setSelectedKind: (kind: "text" | "drawing" | "image" | null) => void;
  setCurrentColor: (color: string) => void;
  setToolStrokeWidth: (tool: DrawingKind, strokeWidth: number) => void;
  setTextStyle: (patch: Partial<CanvasState["textStyle"]>) => void;
  setDefaultAnnotation: (mode: AnnotationMode) => void;
  setDraftDrawing: (drawing: Drawing | null) => void;
  setFocusedBlockId: (id: string | null) => void;
  setEditingPageId: (id: string | null) => void;
  setIsExporting: (value: boolean) => void;

  // Page actions
  setActivePage: (pageId: string) => void;
  addPage: () => void;
  deletePage: (pageId?: string) => void;
  duplicatePage: (pageId?: string) => void;
  renamePage: (pageId: string, title: string) => void;
  cleanPage: (pageId?: string) => void;

  // Text block actions
  addBlock: (x: number, y: number) => string;
  updateBlock: (id: string, patch: Partial<TextBlock>) => void;
  deleteBlock: (id: string) => void;

  // Drawing actions
  addDrawing: (drawing: Drawing) => void;
  updateDrawing: (id: string, patch: Partial<Drawing>) => void;
  deleteDrawing: (id: string) => void;

  // Image actions
  addImages: (images: ImageObject[]) => void;
  updateImage: (id: string, patch: Partial<ImageObject>) => void;
  deleteImage: (id: string) => void;

  // State persistence
  importState: (state: StoredState, resetDraft?: boolean) => void;
  setStateDirectly: (state: StoredState) => void;
}

const colorToolForTool = (tool: Tool): ColorTool | null => (tool === "select" ? null : tool);

const colorToolForSelection = (state: CanvasState): ColorTool | null => {
  if (state.selectedKind === "text") return "text";
  if (state.selectedKind !== "drawing" || !state.selectedId) return colorToolForTool(state.tool);

  const activePage = state.pages.find((page) => page.id === state.activePageId);
  const selectedDrawing = activePage?.drawings.find((drawing) => drawing.id === state.selectedId);
  return selectedDrawing?.kind ?? colorToolForTool(state.tool);
};

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  persist(
    (set, get) => ({
      // Initial state
      ...loadState(),
      tool: "text",
      selectedId: null,
      selectedKind: null,
      currentColor: defaultToolColors.text,
      toolColors: defaultToolColors,
      toolStrokeWidths: defaultToolStrokeWidths,
      textStyle: defaultTextStyle,
      defaultAnnotation: defaultTextStyle.annotation,
      draftDrawing: null,
      focusedBlockId: null,
      editingPageId: null,
      isExporting: false,

      // Tool & selection
      setTool: (tool) => {
        const colorTool = colorToolForTool(tool);
        set((state) => ({
          tool,
          ...(colorTool && { currentColor: state.toolColors[colorTool] }),
        }));
      },
      setSelectedId: (id, kind) => set({ selectedId: id, ...(kind !== undefined && { selectedKind: kind }) }),
      setSelectedKind: (kind) => set({ selectedKind: kind }),
      setCurrentColor: (color) =>
        set((state) => {
          const colorTool = colorToolForSelection(state);
          return {
            currentColor: color,
            ...(colorTool && { toolColors: { ...state.toolColors, [colorTool]: color } }),
          };
        }),
      setToolStrokeWidth: (tool, strokeWidth) =>
        set((state) => ({ toolStrokeWidths: { ...state.toolStrokeWidths, [tool]: strokeWidth } })),
      setTextStyle: (patch) =>
        set((state) => ({
          textStyle: { ...state.textStyle, ...patch },
          ...(patch.annotation && { defaultAnnotation: patch.annotation }),
        })),
      setDefaultAnnotation: (mode) =>
        set((state) => ({ defaultAnnotation: mode, textStyle: { ...state.textStyle, annotation: mode } })),
      setDraftDrawing: (drawing) => set({ draftDrawing: drawing }),
      setFocusedBlockId: (id) => set({ focusedBlockId: id }),
      setEditingPageId: (id) => set({ editingPageId: id }),
      setIsExporting: (value) => set({ isExporting: value }),

      // Page actions
      setActivePage: (pageId) => {
        set({ activePageId: pageId, selectedId: null, selectedKind: null });
      },

      addPage: () => {
        const { pages } = get();
        const page = createPage(pages.length + 1);
        set({ activePageId: page.id, pages: [page, ...pages] });
      },

      deletePage: (pageId) => {
        const { pages, activePageId } = get();
        const targetPageId = pageId ?? activePageId;
        if (pages.length === 1) {
          const page = createPage();
          set({ activePageId: page.id, pages: [page] });
          return;
        }
        const remaining = pages.filter((p) => p.id !== targetPageId);
        set({
          activePageId: targetPageId === activePageId ? remaining[0].id : activePageId,
          pages: remaining,
          selectedId: null,
          selectedKind: null,
        });
      },

      duplicatePage: (pageId) => {
        const { pages, activePageId } = get();
        const targetPage = pages.find((p) => p.id === (pageId ?? activePageId));
        if (!targetPage) return;

        const copy: Page = {
          ...targetPage,
          id: createId(),
          title: `${targetPage.title} copy`,
          updatedAt: Date.now(),
          blocks: targetPage.blocks.map((block) => ({ ...block, id: createId() })),
          drawings: targetPage.drawings.map((drawing) => ({ ...drawing, id: createId() })),
          images: targetPage.images.map((image) => ({ ...image, id: createId() })),
        };
        set({ activePageId: copy.id, pages: [copy, ...pages] });
      },

      renamePage: (pageId, title) => {
        const { pages } = get();
        const nextTitle = title.trim() || "Untitled page";
        set({
          pages: pages.map((page) =>
            page.id === pageId ? { ...page, title: nextTitle, updatedAt: Date.now() } : page,
          ),
        });
      },

      cleanPage: (pageId) => {
        const { pages, activePageId } = get();
        const targetPageId = pageId ?? activePageId;
        set({
          pages: pages.map((page) =>
            page.id === targetPageId ? { ...page, blocks: [], drawings: [], images: [] } : page,
          ),
          ...(targetPageId === activePageId && { selectedId: null, selectedKind: null, focusedBlockId: null }),
        });
      },

      // Text block actions
      addBlock: (x, y) => {
        const { pages, activePageId, toolColors, textStyle } = get();
        const block: TextBlock = {
          id: createId(),
          x,
          y,
          width: DEFAULT_TEXT_BLOCK_WIDTH,
          content: "",
          fontFamily: textStyle.fontFamily,
          fontSize: textStyle.fontSize,
          color: toolColors.text,
          annotation: textStyle.annotation,
        };
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? { ...page, blocks: [...page.blocks, block], updatedAt: Date.now() }
              : page,
          ),
          selectedId: block.id,
          selectedKind: "text",
          focusedBlockId: block.id,
        });
        return block.id;
      },

      updateBlock: (id, patch) => {
        const { pages, activePageId } = get();
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? {
                  ...page,
                  blocks: page.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
                  updatedAt: Date.now(),
                }
              : page,
          ),
        });
      },

      deleteBlock: (id) => {
        const { pages, activePageId, selectedId, focusedBlockId } = get();
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? { ...page, blocks: page.blocks.filter((block) => block.id !== id) }
              : page,
          ),
          selectedId: selectedId === id ? null : selectedId,
          selectedKind: selectedId === id ? null : get().selectedKind,
          focusedBlockId: focusedBlockId === id ? null : focusedBlockId,
        });
      },

      // Drawing actions
      addDrawing: (drawing) => {
        const { pages, activePageId } = get();
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? { ...page, drawings: [...page.drawings, drawing], updatedAt: Date.now() }
              : page,
          ),
          selectedId: drawing.id,
          selectedKind: "drawing",
          draftDrawing: null,
        });
      },

      updateDrawing: (id, patch) => {
        const { pages, activePageId } = get();
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? {
                  ...page,
                  drawings: page.drawings.map((drawing) => (drawing.id === id ? { ...drawing, ...patch } : drawing)),
                  updatedAt: Date.now(),
                }
              : page,
          ),
        });
      },

      deleteDrawing: (id) => {
        const { pages, activePageId, selectedId } = get();
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? { ...page, drawings: page.drawings.filter((drawing) => drawing.id !== id) }
              : page,
          ),
          selectedId: selectedId === id ? null : selectedId,
          selectedKind: selectedId === id ? null : get().selectedKind,
        });
      },

      // Image actions
      addImages: (images) => {
        const { pages, activePageId } = get();
        const lastImage = images[images.length - 1];
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? { ...page, images: [...page.images, ...images], updatedAt: Date.now() }
              : page,
          ),
          selectedId: lastImage?.id ?? null,
          selectedKind: "image",
          tool: "select",
          focusedBlockId: null,
        });
      },

      updateImage: (id, patch) => {
        const { pages, activePageId } = get();
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? {
                  ...page,
                  images: page.images.map((image) => (image.id === id ? { ...image, ...patch } : image)),
                  updatedAt: Date.now(),
                }
              : page,
          ),
        });
      },

      deleteImage: (id) => {
        const { pages, activePageId, selectedId } = get();
        set({
          pages: pages.map((page) =>
            page.id === activePageId
              ? { ...page, images: page.images.filter((image) => image.id !== id) }
              : page,
          ),
          selectedId: selectedId === id ? null : selectedId,
          selectedKind: selectedId === id ? null : get().selectedKind,
        });
      },

      // State persistence
      importState: (state, resetDraft = true) => {
        const newState: Partial<CanvasState> = {
          activePageId: state.activePageId,
          pages: state.pages,
          selectedId: null,
          selectedKind: null,
          editingPageId: null,
        };
        if (resetDraft) {
          newState.focusedBlockId = null;
        }
        set(newState);
      },

      setStateDirectly: (state) => {
        set({ activePageId: state.activePageId, pages: state.pages });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        activePageId: state.activePageId,
        pages: state.pages,
      }),
    },
  ),
);
