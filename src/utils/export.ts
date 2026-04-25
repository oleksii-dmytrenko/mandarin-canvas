import type { Page, StoredState } from "../types";
import { MAX_PASTED_IMAGE_WIDTH, MIN_IMAGE_SIZE, PAGE_HEIGHT, PAGE_WIDTH, STATE_FILE_APP, STATE_FILE_VERSION } from "./constants";
import { createId } from "./id";
import { slugify } from "./id";
import { normalizeState, parseImportedState } from "./validation";

export const pageFileStem = (page: Page) => `${slugify(page.title)}-${page.id}`;

export const readImageFile = (file: File) =>
  new Promise<{ id: string; x: number; y: number; width: number; height: number; src: string; alt: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () => reject(reader.error));
    reader.addEventListener("load", () => {
      const src = String(reader.result ?? "");
      const image = new Image();
      image.addEventListener("error", reject);
      image.addEventListener("load", () => {
        const scale = Math.min(1, MAX_PASTED_IMAGE_WIDTH / image.naturalWidth, PAGE_HEIGHT / 2 / image.naturalHeight);
        const width = Math.max(MIN_IMAGE_SIZE, image.naturalWidth * scale);
        const height = Math.max(MIN_IMAGE_SIZE, image.naturalHeight * scale);
        resolve({
          id: createId(),
          x: Math.max(0, (PAGE_WIDTH - width) / 2),
          y: Math.max(0, (PAGE_HEIGHT - height) / 2),
          width,
          height,
          src,
          alt: file.name || "Pasted image",
        });
      });
      image.src = src;
    });
    reader.readAsDataURL(file);
  });

export const cloneImportedState = (importedState: StoredState): StoredState => {
  const pageIdMap = new Map(importedState.pages.map((page) => [page.id, createId()]));
  const now = Date.now();
  const pages = importedState.pages.map((page) => ({
    ...page,
    id: pageIdMap.get(page.id) ?? createId(),
    updatedAt: now,
    blocks: page.blocks.map((block) => ({ ...block, id: createId() })),
    drawings: page.drawings.map((drawing) => ({ ...drawing, id: createId() })),
    images: page.images.map((image) => ({ ...image, id: createId() })),
  }));

  return {
    activePageId: pageIdMap.get(importedState.activePageId) ?? pages[0].id,
    pages,
  };
};

export const appendImportedState = (currentState: StoredState, importedState: StoredState): StoredState => {
  const clonedState = cloneImportedState(importedState);
  return {
    activePageId: clonedState.activePageId,
    pages: [...clonedState.pages, ...currentState.pages],
  };
};

export const downloadStateFile = (state: StoredState, page: Page) => {
  const payload = {
    app: STATE_FILE_APP,
    version: STATE_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${pageFileStem(page)}-state.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

export const importStateFile = async (file: File, currentState: StoredState): Promise<StoredState | null> => {
  const parsed = JSON.parse(await file.text()) as unknown;
  const importedState = parseImportedState(parsed);
  if (!importedState) {
    window.alert("That file does not look like a Mandarin Canvas state export.");
    return null;
  }
  return appendImportedState(currentState, importedState);
};
