export type Tool = "select" | "multiline-text" | "text" | "pen" | "rect" | "arrow";
export type AnnotationMode = "plain" | "pinyin" | "zhuyin";
export type DrawingKind = "pen" | "rect" | "arrow";
export type ColorTool = "multiline-text" | "text" | DrawingKind;

export type BackgroundText = {
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  annotation: AnnotationMode;
};

export type TextBlock = {
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

export type Drawing = {
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

export type ImageObject = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  alt: string;
};

export type Page = {
  id: string;
  title: string;
  updatedAt: number;
  backgroundText: BackgroundText;
  blocks: TextBlock[];
  drawings: Drawing[];
  images: ImageObject[];
};

export type StoredState = {
  activePageId: string;
  pages: Page[];
};

export type SelectionKind = "text" | "drawing" | "image" | null;
