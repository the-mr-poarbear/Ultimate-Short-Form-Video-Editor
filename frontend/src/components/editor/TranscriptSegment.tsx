import React from "react";
import type { TranscriptSegment as SegmentType } from "../../types/transcript";
import { TranscriptWord } from "./TranscriptWord";
import { formatTime } from "../../lib/formatting";
import { Play, Merge, CheckSquare, Square, AlertCircle, Sparkles } from "lucide-react";

interface TranscriptSegmentProps {
  segment: SegmentType;
  currentTime: number;
  isSliceMode?: boolean;
  isEmphasizeMode?: boolean;
  onSeek: (time: number) => void;
  onSliceWord?: (time: number) => void;
  onToggleWordEmphasis?: (wordIndex: number) => void;
  onJoinWithNext?: () => void;
  canJoinWithNext?: boolean;
  joinDisabledReason?: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export const TranscriptSegment: React.FC<TranscriptSegmentProps> = ({
  segment,
  currentTime,
  isSliceMode = false,
  isEmphasizeMode = false,
  onSeek,
  onSliceWord,
  onToggleWordEmphasis,
  onJoinWithNext,
  canJoinWithNext = true,
  joinDisabledReason,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const isSegmentActive =
    currentTime >= segment.start && currentTime < segment.end;

  const emphasizedWordsCount = (segment.words || []).filter((w) => w.emphasized).length;

  return (
    <div
      className={`p-2.5 rounded-lg border transition-all ${
        isSelected
          ? "bg-primary/10 border-primary ring-1 ring-primary/40"
          : isSegmentActive
          ? "bg-surface-elevated border-primary/40 ring-1 ring-primary/20"
          : "bg-surface border-border/40 hover:border-border"
      }`}
    >
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/30 text-[10px]">
        <div className="flex items-center gap-1.5">
          {isSelectMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className="text-primary hover:text-primary/80 cursor-pointer"
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Square className="w-3.5 h-3.5 text-muted-foreground/60" />
              )}
            </button>
          )}
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
        </div>

        <div className="flex items-center gap-2">
          {emphasizedWordsCount > 0 && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-400/15 border border-amber-400/30 text-amber-300"
              title={`${emphasizedWordsCount} word(s) in this section appear bold, big and centered on screen`}
            >
              <Sparkles className="w-2 h-2 text-amber-400 fill-current" />
              <span>{emphasizedWordsCount} centered</span>
            </div>
          )}

          {onJoinWithNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJoinWithNext();
              }}
              title={
                canJoinWithNext
                  ? "Join with next transcription segment (all occupy 1 slice)"
                  : joinDisabledReason || "Every slice except the first one must be empty"
              }
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                canJoinWithNext
                  ? "bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30"
                  : "bg-warning/10 hover:bg-warning/20 text-warning border border-warning/30"
              }`}
            >
              {canJoinWithNext ? (
                <Merge className="w-2.5 h-2.5" />
              ) : (
                <AlertCircle className="w-2.5 h-2.5" />
              )}
              <span>Join Next</span>
            </button>
          )}
          <span className="font-mono text-muted-foreground/60">{segment.id}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-1 gap-y-1.5 text-xs leading-relaxed">
        {segment.words && segment.words.length > 0 ? (
          segment.words.map((w, idx) => (
            <TranscriptWord
              key={`${segment.id}-${idx}-${w.word}`}
              word={w}
              wordIndex={idx}
              segmentId={segment.id}
              currentTime={currentTime}
              isSliceMode={isSliceMode}
              isEmphasizeMode={isEmphasizeMode}
              onClick={() => onSeek(w.start)}
              onSlice={() => onSliceWord?.(w.start)}
              onToggleEmphasis={() => onToggleWordEmphasis?.(idx)}
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

