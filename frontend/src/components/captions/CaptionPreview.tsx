import React from "react";
import { useEditorStore } from "../../stores/editorStore";
import type { WordTiming } from "../../types/transcript";

interface CaptionPreviewProps {
  currentTime: number;
  previewScale?: number;
}

export const CaptionPreview: React.FC<CaptionPreviewProps> = ({
  currentTime,
  previewScale = 0.28,
}) => {
  const project = useEditorStore((s) => s.project);
  const style = project?.settings?.captionStyle;

  if (!project || !project.transcript || !style) return null;

  // Find active segment
  const activeSegment = project.transcript.find(
    (seg) => currentTime >= seg.start && currentTime < seg.end
  );

  if (!activeSegment || !activeSegment.words || activeSegment.words.length === 0) {
    return null;
  }

  // Find current active word index
  const activeWordIdx = activeSegment.words.findIndex(
    (w) => currentTime >= w.start && currentTime < w.end
  );

  // Group into chunks of maxWordsPerLine
  const maxWords = Math.max(style.maxWordsPerLine || 4, 2);
  const targetIdx = activeWordIdx !== -1 ? activeWordIdx : 0;
  const chunkStart = Math.floor(targetIdx / maxWords) * maxWords;
  const currentChunk = activeSegment.words.slice(chunkStart, chunkStart + maxWords);

  // Outline stroke width mathematically scaled to preview canvas
  const strokePx = Math.max(0, Math.round((style.strokeWidth ?? 3) * previewScale));
  const strokeColor = style.strokeColor || "#000000";
  const shadowSpread = Math.max(2, Math.round(4 * previewScale));
  const shadowBlur = Math.max(4, Math.round(12 * previewScale));
  const textShadow = strokePx > 0
    ? `-${strokePx}px -${strokePx}px 0 ${strokeColor}, ${strokePx}px -${strokePx}px 0 ${strokeColor}, -${strokePx}px ${strokePx}px 0 ${strokeColor}, ${strokePx}px ${strokePx}px 0 ${strokeColor}, 0 ${shadowSpread}px ${shadowBlur}px rgba(0,0,0,0.85)`
    : `0 ${shadowSpread}px ${shadowBlur}px rgba(0,0,0,0.85)`;

  // Font size mathematically scaled: (style.fontSize / 1920) * containerHeight
  const scaledFontSize = Math.max(8, (style.fontSize || 48) * previewScale);
  const scaledLetterSpacing = `${((style.letterSpacing ?? 0) * previewScale).toFixed(2)}px`;
  const lineHeight = style.lineHeight ?? 1.25;

  return (
    <div
      style={{
        bottom: `${100 - (style.positionY ?? 80)}%`,
        zIndex: 50,
      }}
      className="absolute left-0 right-0 px-4 flex justify-center items-end pointer-events-none z-50 text-center"
    >
      <div
        style={{
          lineHeight,
          letterSpacing: scaledLetterSpacing,
          fontSize: `${scaledFontSize.toFixed(2)}px`,
        }}
        className="flex flex-wrap items-center justify-center gap-x-[0.25em] gap-y-1 max-w-[92%] drop-shadow-md"
      >
        {currentChunk.map((w: WordTiming) => {
          const isHighlighted = currentTime >= w.start && currentTime < w.end;

          return (
            <span
              key={`${w.word}-${w.start}`}
              style={{
                fontFamily: style.fontFamily || "Inter",
                color: isHighlighted ? (style.highlightColor || "#FFE600") : (style.textColor || "#FFFFFF"),
                textShadow,
              }}
              className={`font-black uppercase tracking-tight transition-transform duration-75 inline-block ${
                isHighlighted ? "scale-[1.12]" : "scale-100"
              }`}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
