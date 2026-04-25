import type { AnnotationMode } from "../types";
import { annotationForChar } from "../utils/annotation";

interface RubyTextProps {
  text: string;
  mode: AnnotationMode;
}

export function RubyText({ text, mode }: RubyTextProps) {
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
