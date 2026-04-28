import type { BackgroundText, ColorTool, DrawingKind, TextBlock } from "../types";

export const STORAGE_KEY = "mandarin-canvas:v1";
export const STATE_FILE_APP = "mandarin-canvas";
export const STATE_FILE_VERSION = 1;
export const PAGE_WIDTH = 1123;
export const PAGE_HEIGHT = 794;
export const HISTORY_LIMIT = 10;
export const DEFAULT_TEXT_BLOCK_WIDTH = 260;
export const MIN_TEXT_BLOCK_WIDTH = 44;
export const MAX_PASTED_IMAGE_WIDTH = PAGE_WIDTH / 2;
export const MIN_IMAGE_SIZE = 32;
export const MIN_DRAWING_SIZE = 8;

export const fonts = [
  { label: "Sans", value: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" },
  { label: "Kai", value: "'Kaiti TC', 'KaiTi', 'BiauKai', serif" },
  { label: "Song", value: "'Songti TC', SimSun, serif" },
];

export const defaultTextStyle: Pick<TextBlock, "fontFamily" | "fontSize" | "annotation"> = {
  fontFamily: fonts[0].value,
  fontSize: 28,
  annotation: "pinyin",
};

export const colorSwatches = ["#20211F", "#D95027", "#2B6F63", "#2F5EAA", "#747B73", "#B7352C"];

export const defaultToolColors: Record<ColorTool, string> = {
  "multiline-text": "#20211F",
  text: "#2B6F63",
  pen: "#D95027",
  arrow: "#2F5EAA",
  rect: "#B7352C",
};

export const defaultBackgroundText = (): BackgroundText => ({
  content: "",
  fontFamily: defaultTextStyle.fontFamily,
  fontSize: defaultTextStyle.fontSize,
  color: defaultToolColors["multiline-text"],
  annotation: defaultTextStyle.annotation,
});

export const defaultToolStrokeWidths: Record<DrawingKind, number> = {
  pen: 3,
  rect: 2.5,
  arrow: 2.5,
};
