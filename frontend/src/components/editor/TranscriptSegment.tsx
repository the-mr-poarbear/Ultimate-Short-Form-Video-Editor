import React from "react";
import type { TranscriptSegment as SegmentType } from "../../types/transcript";
import { TranscriptWord } from "./TranscriptWord";
import { formatTime } from "../../lib/formatting";
import { Play } from "lucide-react";

interface TranscriptSegmentProps {
  segment: SegmentType;
  currentTime: number;
  isSliceMode?: boolean;
  onSeek: (time: number) => void;
  onSliceWord?: (time: number) => void;
}

export const TranscriptSegment: React.FC<TranscriptSegmentProps> = ({
  segment,
  currentTime,
  isSliceMode = false,
  onSeek,
  onSliceWord,
}) => {
  const isSegmentActive =
    currentTime >= segment.start && currentTime < segment.end;

  return (
    <div
      className={`p-2.5 rounded-lg border transition-all ${
        isSegmentActive
          ? "bg-surface-elevated border-primary/40 ring-1 ring-primary/20"
          : "bg-surface border-border/40 hover:border-border"
      }`}
    >
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/30 text-[10px]">
        <button
          type="button"
          onClick={() => onSeek(segment.start)}
          className="flex items-center gap-1 font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>{formatTime(segment.start)}</span>
          <span>→</span>
          <span>{formatTime(segment.end)}</span>
        </button>
        <span className="font-mono text-muted-foreground/60">{segment.id}</span>
      </div>

      <div className="flex flex-wrap gap-x-1 gap-y-1.5 text-xs leading-relaxed">
        {segment.words && segment.words.length > 0 ? (
          segment.words.map((w, idx) => (
            <TranscriptWord
              key={`${segment.id}-${idx}-${w.word}`}
              word={w}
              currentTime={currentTime}
              isSliceMode={isSliceMode}
              onClick={() => onSeek(w.start)}
              onSlice={() => onSliceWord?.(w.start)}
            />
          ))
        ) : (
          <span
            onClick={() => onSeek(segment.start)}
            className="cursor-pointer hover:text-primary"
          >
            {segment.text}
          </span>
        )}
      </div>
    </div>
  );
};
