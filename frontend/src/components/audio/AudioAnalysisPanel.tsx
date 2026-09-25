import React from "react";
import { formatTime, formatDuration } from "../../lib/formatting";
import type { AudioAnalysisResult } from "../../services/audioService";
import { CheckCircle2, Scissors, Volume2 } from "lucide-react";

interface AudioAnalysisPanelProps {
  analysis: AudioAnalysisResult | null;
  isAnalyzing: boolean;
}

export const AudioAnalysisPanel: React.FC<AudioAnalysisPanelProps> = ({
  analysis,
  isAnalyzing,
}) => {
  if (isAnalyzing) {
    return (
      <div className="p-4 bg-surface-elevated/40 border border-border rounded-lg flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
        <Volume2 className="w-4 h-4 animate-spin text-primary" />
        Analyzing voiceover cadence & pauses...
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="p-3 bg-surface-elevated/40 border border-border rounded-lg flex flex-col gap-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-semibold text-foreground">Audio Analysis</span>
        </div>
        <span className="text-[11px] font-mono text-primary font-medium">
          {formatTime(analysis.processedDuration)} final
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="p-2 bg-surface/60 rounded border border-border/40 flex flex-col">
          <span className="text-muted-foreground">Original Duration</span>
          <span className="font-mono text-foreground font-medium mt-0.5">
            {formatTime(analysis.originalDuration)}
          </span>
        </div>

        <div className="p-2 bg-surface/60 rounded border border-border/40 flex flex-col">
          <span className="text-muted-foreground">Detected Silence</span>
          <span className="font-mono text-warning font-medium mt-0.5">
            {formatDuration(analysis.originalSilence)}
          </span>
        </div>

        <div className="p-2 bg-surface/60 rounded border border-border/40 flex flex-col">
          <span className="text-muted-foreground flex items-center gap-1">
            <Scissors className="w-3 h-3 text-danger" />
            Removed Silence
          </span>
          <span className="font-mono text-danger font-medium mt-0.5">
            -{formatDuration(analysis.removedSilence)}
          </span>
        </div>

        <div className="p-2 bg-surface/60 rounded border border-border/40 flex flex-col">
          <span className="text-muted-foreground">Retained Silence</span>
          <span className="font-mono text-success font-medium mt-0.5">
            {formatDuration(analysis.remainingSilence)}
          </span>
        </div>
      </div>
    </div>
  );
};
