import React from "react";
import type { WordTiming } from "../../types/transcript";
import { cn } from "../../lib/utils";
import { Scissors } from "lucide-react";

interface TranscriptWordProps {
  word: WordTiming;
  currentTime: number;
  isSliceMode?: boolean;
  onClick: () => void;
  onSlice?: () => void;
}

export const TranscriptWord: React.FC<TranscriptWordProps> = React.memo(
  ({ word, currentTime, isSliceMode = false, onClick, onSlice }) => {
    const isCurrent = currentTime >= word.start && currentTime < word.end;

    const handleClick = (e: React.MouseEvent) => {
      if (isSliceMode && onSlice) {
        e.stopPropagation();
        onSlice();
      } else {
        onClick();
      }
    };

    const handleSliceDirect = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSlice) {
        onSlice();
      }
    };

    return (
      <span
        onClick={handleClick}
        title={
          isSliceMode
            ? `Click to split timeline slice at "${word.word}" (${word.start.toFixed(2)}s)`
            : `${word.word} (${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s)`
        }
        className={cn(
          "group relative inline-flex items-center px-1 py-0.5 rounded transition-all duration-100 font-medium select-none",
          isSliceMode
            ? "cursor-crosshair border-l-2 border-warning/60 hover:border-warning hover:bg-warning/20 hover:text-warning"
            : "cursor-pointer hover:bg-surface-hover hover:text-foreground text-foreground/80",
          isCurrent && !isSliceMode
            ? "bg-primary text-primary-foreground font-bold scale-105 shadow-sm ring-1 ring-primary-hover"
            : ""
        )}
      >
        {/* Quick Slice action button on hover in normal mode */}
        {!isSliceMode && onSlice && (
          <span
            onClick={handleSliceDirect}
            title={`Split timeline at "${word.word}"`}
            className="absolute -left-1 -top-2.5 hidden group-hover:flex items-center justify-center w-3.5 h-3.5 rounded bg-warning text-black shadow-xs z-30 cursor-pointer hover:scale-125 transition-transform"
          >
            <Scissors className="w-2.5 h-2.5" />
          </span>
        )}

        {/* Slice mode left cut line */}
        {isSliceMode && (
          <Scissors className="w-2.5 h-2.5 mr-0.5 text-warning opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all" />
        )}

        <span>{word.word}</span>
      </span>
    );
  }
);
