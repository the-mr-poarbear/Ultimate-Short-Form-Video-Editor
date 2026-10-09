import React, { useRef, useEffect, useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { TranscriptSegment } from "./TranscriptSegment";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { FileText, Sparkles, Scissors, Check, Type, Merge, AlertCircle, CheckSquare } from "lucide-react";

interface TranscriptPanelProps {
  onTranscribeClick?: () => void;
  isTranscribing?: boolean;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  onTranscribeClick,
  isTranscribing = false,
}) => {
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const splitSliceAtTime = useEditorStore((s) => s.splitSliceAtTime);
  const isCaptionSettingsOpen = useEditorStore((s) => s.isCaptionSettingsOpen);
  const setCaptionSettingsOpen = useEditorStore((s) => s.setCaptionSettingsOpen);
  const isSliceMode = useEditorStore((s) => s.isSliceMode);
  const setSliceMode = useEditorStore((s) => s.setSliceMode);
  const isEmphasizeMode = useEditorStore((s) => s.isEmphasizeMode);
  const setEmphasizeMode = useEditorStore((s) => s.setEmphasizeMode);
  const toggleWordEmphasis = useEditorStore((s) => s.toggleWordEmphasis);
  const clearAllEmphasis = useEditorStore((s) => s.clearAllEmphasis);
  const joinTranscriptions = useEditorStore((s) => s.joinTranscriptions);
  const canJoinTranscriptions = useEditorStore((s) => s.canJoinTranscriptions);
  const { seek } = useAudioPlayer();

  const [sliceFeedback, setSliceFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const transcript = project?.transcript || [];
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalEmphasizedWords = transcript.reduce(
    (acc, seg) => acc + (seg.words || []).filter((w) => w.emphasized).length,
    0
  );

  const handleSliceWord = (time: number) => {
    splitSliceAtTime(time);
    const state = useEditorStore.getState();
    const newSlice = state.project?.slices.find((s) => s.id === state.selectedSliceId);
    const targetSeek = newSlice ? newSlice.start : time;
    seek(targetSeek);
    setSliceFeedback(`New timeline slice created at ${targetSeek.toFixed(2)}s`);
    setTimeout(() => setSliceFeedback(null), 2500);
  };

  const handleJoin = (ids: string[]) => {
    const res = joinTranscriptions(ids);
    if (res.success) {
      setSliceFeedback(`Joined ${ids.length} transcriptions so they now occupy 1 slice.`);
      setErrorFeedback(null);
      setSelectedIds([]);
      setTimeout(() => setSliceFeedback(null), 3000);
    } else {
      setErrorFeedback(res.error || "Cannot join transcriptions.");
      setTimeout(() => setErrorFeedback(null), 6000);
    }
  };

  const toggleSelectSegment = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Auto-scroll active segment into view gently during playback
  useEffect(() => {
    if (!containerRef.current || transcript.length === 0 || isSliceMode) return;
    const activeEl = containerRef.current.querySelector(".ring-primary\\/20");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentTime, transcript.length, isSliceMode]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span>Synchronized Transcript</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Caption Style Studio Button */}
          <button
            type="button"
            onClick={() => setCaptionSettingsOpen(!isCaptionSettingsOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              isCaptionSettingsOpen
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "bg-surface-elevated hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border/50"
            }`}
            title="Open Caption Styling & Typography Studio"
          >
            <Type className="w-2.5 h-2.5 text-primary" />
            <span>Caption Style</span>
          </button>

          {/* Emphasize Tool Button */}
          <button
            type="button"
            onClick={() => setEmphasizeMode(!isEmphasizeMode)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              isEmphasizeMode
                ? "bg-amber-400 text-black font-bold shadow-xs ring-1 ring-amber-300"
                : "bg-surface-elevated hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border/50"
            }`}
            title="Toggle Center Emphasis Mode: click any word in transcript to display bold, big and centered on screen"
          >
            <Sparkles className={`w-2.5 h-2.5 ${isEmphasizeMode ? "text-black fill-current" : "text-amber-400"}`} />
            <span>{isEmphasizeMode ? "Emphasize [ON]" : "Emphasize Tool"}</span>
          </button>

          {/* Join Tool Button */}
          <button
            type="button"
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedIds([]);
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              isSelectMode
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "bg-surface-elevated hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border/50"
            }`}
            title="Select multiple transcript segments to join them into 1 slice"
          >
            <Merge className="w-2.5 h-2.5" />
            <span>{isSelectMode ? "Cancel Select" : "Join Tool"}</span>
          </button>

          {/* Slice Tool Button */}
          <button
            type="button"
            onClick={() => setSliceMode(!isSliceMode)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              isSliceMode
                ? "bg-warning text-black font-bold shadow-xs"
                : "bg-surface-elevated hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border/50"
            }`}
            title="Click any word in transcript to split/create a new timeline slice section"
          >
            <Scissors className="w-2.5 h-2.5" />
            <span>{isSliceMode ? "Slice Mode [ON]" : "Slice Tool"}</span>
          </button>

          {onTranscribeClick && (
            <button
              type="button"
              onClick={onTranscribeClick}
              disabled={isTranscribing || (!project?.processedAudio && !project?.originalAudio)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5" />
              {isTranscribing ? "Transcribing..." : "Transcribe"}
            </button>
          )}
        </div>
      </div>

      {/* Emphasize Mode Guidance Banner */}
      {isEmphasizeMode && (
        <div className="px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-[10px] text-amber-300 flex items-center justify-between animate-in fade-in select-none">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>Click any word to toggle Center-Screen Emphasis (bold, big & centered on screen).</span>
          </div>
          <div className="flex items-center gap-2">
            {totalEmphasizedWords > 0 && (
              <>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {totalEmphasizedWords} centered
                </span>
                <button
                  type="button"
                  onClick={clearAllEmphasis}
                  className="text-[9px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  title="Clear emphasis from all words"
                >
                  Clear all
                </button>
              </>
            )}
            <button
              onClick={() => setEmphasizeMode(false)}
              className="underline hover:text-white text-[9px] font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Slice Mode Guidance Banner */}
      {isSliceMode && (
        <div className="px-3 py-1.5 bg-warning/15 border-b border-warning/30 text-[10px] text-warning flex items-center justify-between animate-in fade-in select-none">
          <div className="flex items-center gap-1.5">
            <Scissors className="w-3 h-3 animate-pulse" />
            <span>Click any word to slice the timeline at that point.</span>
          </div>
          <button
            onClick={() => setSliceMode(false)}
            className="underline hover:text-white text-[9px] cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Select Mode Bar */}
      {isSelectMode && (
        <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/25 text-[10px] text-foreground flex items-center justify-between animate-in fade-in select-none">
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-3 h-3 text-primary" />
            <span className="font-medium text-primary">
              {selectedIds.length === 0
                ? "Select 2 or more segments to join into 1 slice."
                : `${selectedIds.length} segment(s) selected.`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length >= 2 && (
              <button
                type="button"
                onClick={() => handleJoin(selectedIds)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                <Merge className="w-2.5 h-2.5" />
                <span>Join Selected into 1 Slice</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds([]);
              }}
              className="text-[9px] text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Feedback Toast */}
      {errorFeedback && (
        <div className="px-3 py-1.5 bg-danger/15 text-danger border-b border-danger/30 text-[10px] animate-in fade-in flex items-center justify-between gap-1.5 select-none">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorFeedback}</span>
          </div>
          <button
            onClick={() => setErrorFeedback(null)}
            className="text-xs hover:text-white font-bold px-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Slice Feedback Toast */}
      {sliceFeedback && (
        <div className="px-3 py-1 bg-primary/20 text-primary border-b border-primary/30 text-[10px] font-mono text-center animate-in fade-in flex items-center justify-center gap-1">
          <Check className="w-3 h-3" />
          <span>{sliceFeedback}</span>
        </div>
      )}

      <div ref={containerRef} className="panel-content flex-1 flex flex-col gap-2">
        {transcript.length === 0 ? (
          <div className="p-6 border border-dashed border-border rounded-md text-center flex flex-col items-center gap-2 text-muted-foreground my-auto">
            <FileText className="w-6 h-6 stroke-[1.5] text-muted-foreground/60" />
            <span className="text-xs font-medium">No transcript available</span>
            <span className="text-[11px] max-w-xs">
              Upload voiceover audio and run WhisperX transcription to generate word timestamps.
            </span>
          </div>
        ) : (
          transcript.map((seg, idx) => {
            const nextSeg = idx < transcript.length - 1 ? transcript[idx + 1] : null;
            const joinCheck = nextSeg ? canJoinTranscriptions([seg.id, nextSeg.id]) : null;

            return (
              <TranscriptSegment
                key={seg.id}
                segment={seg}
                currentTime={currentTime}
                isSliceMode={isSliceMode}
                isEmphasizeMode={isEmphasizeMode}
                onSeek={seek}
                onSliceWord={handleSliceWord}
                onToggleWordEmphasis={(wordIndex) => {
                  toggleWordEmphasis(seg.id, wordIndex);
                  const targetWord = seg.words?.[wordIndex];
                  if (targetWord) {
                    seek(targetWord.start);
                  }
                }}
                onJoinWithNext={nextSeg ? () => handleJoin([seg.id, nextSeg.id]) : undefined}
                canJoinWithNext={joinCheck?.canJoin}
                joinDisabledReason={joinCheck?.reason}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.includes(seg.id)}
                onToggleSelect={() => toggleSelectSegment(seg.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
