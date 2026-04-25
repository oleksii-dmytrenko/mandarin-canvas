import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnnotationMode, Drawing, DrawingKind, ImageObject, Page, StoredState, TextBlock, Tool } from "../types";
import { DEFAULT_TEXT_BLOCK_WIDTH, PAGE_HEIGHT, PAGE_WIDTH, STORAGE_KEY } from "../utils/constants";
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
  setDefaultAnnotation: (mode: AnnotationMode) => void;
  setDraftDrawing: (drawing: Drawing | null) => void;
  setFocusedBlockId: (id: string | null) => void;
  setEditingPageId: (id: string | null) => void;
  setIsExporting: (value: boolean) => void;

  // Page actions
  setActivePage: (pageId: string) => void;
  addPage: () => void;
  deletePage: () => void;
  duplicatePage: () => void;
  renamePage: (pageId: string, title: string) => void;
  cleanPage: () => void;

  // Text block actions
  addBlock: (x: number, y: number) => void;
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

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  persist(
    (set, get) => ({
      // Initial state
      ...loadState(),
      tool: "text",
      selectedId: null,
      selectedKind: null,
      currentColor: "#1d1d1f",
      defaultAnnotation: "plain",
      draftDrawing: null,
      focusedBlockId: null,
      editingPageId: null,
      isExporting: false,

      // Tool & selection
      setTool: (tool) => set({ tool }),
      setSelectedId: (id, kind) => set({ selectedId: id, ...(kind !== undefined && { selectedKind: kind }) }),
      setSelectedKind: (kind) => set({ selectedKind: kind }),
      setCurrentColor: (color) => set({ currentColor: color }),
      setDefaultAnnotation: (mode) => set({ defaultAnnotation: mode }),
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

      deletePage: () => {
        const { pages, activePageId } = get();
        if (pages.length === 1) {
          const page = createPage();
          set({ activePageId: page.id, pages: [page] });
          return;
        }
        const remaining = pages.filter((p) => p.id !== activePageId);
        set({ activePageId: remaining[0].id, pages: remaining, selectedId: null, selectedKind: null });
      },

      duplicatePage: () => {
        const { pages, activePageId } = get();
        const activePage = pages.find((p) => p.id === activePageId);
        if (!activePage) return;

        const copy: Page = {
          ...activePage,
          id: createId(),
          title: `${activePage.title} copy`,
          updatedAt: Date.now(),
          blocks: activePage.blocks.map((block) => ({ ...block, id: createId() })),
          drawings: activePage.drawings.map((drawing) => ({ ...drawing, id: createId() })),
          images: activePage.images.map((image) => ({ ...image, id: createId() })),
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

      cleanPage: () => {
        const { pages, activePageId } = get();
        set({
          pages: pages.map((page) =>
            page.id === activePageId ? { ...page, blocks: [], drawings: [], images: [] } : page,
          ),
          selectedId: null,
          selectedKind: null,
          focusedBlockId: null,
        });
      },

      // Text block actions
      addBlock: (x, y) => {
        const { pages, activePageId, currentColor, defaultAnnotation } = get();
        const block: TextBlock = {
          id: createId(),
          x,
          y,
          width: DEFAULT_TEXT_BLOCK_WIDTH,
          content: "",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 28,
          color: currentColor,
          annotation: defaultAnnotation,
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
