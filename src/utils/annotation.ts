import { pinyin } from "pinyin-pro";
import { pinyinToZhuyin } from "pinyin-zhuyin";
import type { AnnotationMode } from "../types";

const hasHanzi = (value: string) => /[\u3400-\u9fff]/.test(value);

export const annotationForChar = (char: string, mode: Exclude<AnnotationMode, "plain">) => {
  if (!hasHanzi(char)) return "";
  const py = pinyin(char, { toneType: "symbol", type: "string" }).trim();
  if (mode === "pinyin") return py;
  try {
    return pinyinToZhuyin(py);
  } catch {
    return py;
  }
};
