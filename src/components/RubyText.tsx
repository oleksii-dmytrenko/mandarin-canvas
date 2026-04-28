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
      {(text || " ").split("\n").map((line, lineIndex) => (
        <span className="ruby-line" key={lineIndex}>
          {line
            ? [...line].map((char, charIndex) => {
                const annotation = annotationForChar(char, mode);
                if (!annotation) return <span key={`${char}-${lineIndex}-${charIndex}`}>{char}</span>;
                return (
                  <span className="ruby-token" key={`${char}-${lineIndex}-${charIndex}`}>
                    <span className="ruby-base">{char}</span>
                    <span className="ruby-annotation">{annotation}</span>
                  </span>
                );
              })
            : "\u00a0"}
        </span>
      ))}
    </>
  );
}
