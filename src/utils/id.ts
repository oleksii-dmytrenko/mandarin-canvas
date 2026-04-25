import type { Page } from "../types";

export const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const slugify = (value: string) => value.trim().replace(/\s+/g, "-").toLowerCase() || "untitled";

export const pageFileStem = (page: Page) => `${slugify(page.title)}-${page.id}`;
