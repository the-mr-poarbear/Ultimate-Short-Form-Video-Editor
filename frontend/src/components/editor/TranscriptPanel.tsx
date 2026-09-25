import React, { useRef, useEffect, useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { TranscriptSegment } from "./TranscriptSegment";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { FileText, Sparkles, Scissors, Check, Type } from "lucide-react";

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
  const { seek } = useAudioPlayer();

  const [sliceFeedback, setSliceFeedback] = useState<string | null>(null);

  const transcript = project?.transcript || [];
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleSliceWord = (time: number) => {
    splitSliceAtTime(time);
    seek(time);
    setSliceFeedback(`New timeline slice created at ${time.toFixed(2)}s`);
    setTimeout(() => setSliceFeedback(null), 2500);
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
          transcript.map((seg) => (
            <TranscriptSegment
              key={seg.id}
              segment={seg}
              currentTime={currentTime}
              isSliceMode={isSliceMode}
              onSeek={seek}
              onSliceWord={handleSliceWord}
            />
          ))
        )}
      </div>
    </div>
  );
};
