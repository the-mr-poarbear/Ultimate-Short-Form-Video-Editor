import React from "react";
import type { WordTiming } from "../../types/transcript";
import { cn } from "../../lib/utils";
import { Scissors, Sparkles } from "lucide-react";

interface TranscriptWordProps {
  word: WordTiming;
  wordIndex?: number;
  segmentId?: string;
  currentTime: number;
  isSliceMode?: boolean;
  isEmphasizeMode?: boolean;
  onClick: () => void;
  onSlice?: () => void;
  onToggleEmphasis?: () => void;
}

export const TranscriptWord: React.FC<TranscriptWordProps> = React.memo(
  ({
    word,
    currentTime,
    isSliceMode = false,
    isEmphasizeMode = false,
    onClick,
    onSlice,
    onToggleEmphasis,
  }) => {
    const isCurrent = currentTime >= word.start && currentTime < word.end;
    const isEmphasized = Boolean(word.emphasized);

    const handleClick = (e: React.MouseEvent) => {
      if (isSliceMode && onSlice) {
        e.stopPropagation();
        onSlice();
      } else if (isEmphasizeMode && onToggleEmphasis) {
        e.stopPropagation();
        onToggleEmphasis();
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

    const handleEmphasisDirect = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleEmphasis) {
        onToggleEmphasis();
      }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      if (onToggleEmphasis) {
        e.preventDefault();
        e.stopPropagation();
        onToggleEmphasis();
      }
    };

    // Tooltip description
    let tooltip = `${word.word} (${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s)`;
    if (isSliceMode) {
      tooltip = `Click to split timeline slice at "${word.word}" (${word.start.toFixed(2)}s)`;
    } else if (isEmphasizeMode) {
      tooltip = `Click to toggle center emphasis on "${word.word}" (${isEmphasized ? "Currently ON" : "Currently OFF"})`;
    } else if (isEmphasized) {
      tooltip = `"${word.word}" is EMPHASIZED (bold, big & centered on screen). Right-click or click ✨ to toggle.`;
    } else {
      tooltip = `"${word.word}" (${word.start.toFixed(2)}s). Right-click or click ✨ to emphasize.`;
    }

    return (
      <span
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={tooltip}
        className={cn(
          "group relative inline-flex items-center px-1.5 py-0.5 rounded transition-all duration-100 font-medium select-none text-[11px]",
          // Slice Mode styling
          isSliceMode &&
            "cursor-crosshair border-l-2 border-warning/60 hover:border-warning hover:bg-warning/20 hover:text-warning",
          // Emphasize Mode styling
          isEmphasizeMode &&
            "cursor-pointer border border-dashed border-amber-400/40 hover:bg-amber-400/20 hover:border-amber-400 hover:text-amber-200",
          // Default interactive cursor
          !isSliceMode && !isEmphasizeMode && "cursor-pointer hover:bg-surface-hover hover:text-foreground",
          // Emphasized word persistent styling
          isEmphasized && !isCurrent && !isSliceMode &&
            "bg-amber-500/15 text-amber-300 font-bold border border-amber-400/50 shadow-xs ring-1 ring-amber-400/20",
          // Active playhead styling
          isCurrent && !isSliceMode && !isEmphasized &&
            "bg-primary text-primary-foreground font-bold scale-105 shadow-sm ring-1 ring-primary-hover",
          isCurrent && !isSliceMode && isEmphasized &&
            "bg-amber-400 text-black font-black scale-105 shadow-md ring-2 ring-amber-300 ring-offset-1 ring-offset-background",
          // Regular unhighlighted word
          !isCurrent && !isEmphasized && !isSliceMode && !isEmphasizeMode && "text-foreground/80"
        )}
      >
        {/* Quick Slice action button on hover in normal mode */}
        {!isSliceMode && !isEmphasizeMode && onSlice && (
          <span
            onClick={handleSliceDirect}
            title={`Split timeline at "${word.word}"`}
            className="absolute -left-1 -top-2.5 hidden group-hover:flex items-center justify-center w-3.5 h-3.5 rounded bg-warning text-black shadow-xs z-30 cursor-pointer hover:scale-125 transition-transform"
          >
            <Scissors className="w-2 h-2" />
          </span>
        )}

        {/* Quick Emphasize toggle button in normal mode */}
        {!isSliceMode && !isEmphasizeMode && onToggleEmphasis && (
          <span
            onClick={handleEmphasisDirect}
            title={
              isEmphasized
                ? `Remove center emphasis from "${word.word}"`
                : `Emphasize "${word.word}" (bold, big & centered on screen)`
            }
            className={cn(
              "absolute -right-1 -top-2.5 items-center justify-center w-3.5 h-3.5 rounded shadow-xs z-30 cursor-pointer hover:scale-125 transition-transform",
              isEmphasized
                ? "flex bg-amber-400 text-black"
                : "hidden group-hover:flex bg-amber-400 text-black"
            )}
          >
            <Sparkles className="w-2 h-2 fill-current" />
          </span>
        )}

        {/* Slice mode left cut icon */}
        {isSliceMode && (
          <Scissors className="w-2.5 h-2.5 mr-0.5 text-warning opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all" />
        )}

        {/* Emphasize mode indicator icon */}
        {isEmphasizeMode && (
          <Sparkles
            className={cn(
              "w-2.5 h-2.5 mr-0.5 transition-all",
              isEmphasized
                ? "text-amber-400 fill-amber-400"
                : "text-amber-400/50 group-hover:text-amber-300"
            )}
          />
        )}

        {/* Persistent subtle star/sparkle icon inside word tag if emphasized (when not in emphasize mode) */}
        {!isEmphasizeMode && isEmphasized && (
          <Sparkles className="w-2.5 h-2.5 mr-1 text-amber-400 fill-amber-400 shrink-0 inline" />
        )}

        <span>{word.word}</span>
      </span>
    );
  }
);

