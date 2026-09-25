import React from "react";
import { Waveform } from "../audio/Waveform";
import { useEditorStore } from "../../stores/editorStore";
import { Mic } from "lucide-react";

interface AudioTrackProps {
  zoom: number;
  totalWidth: number;
  onSeek: (time: number) => void;
}

export const AudioTrack: React.FC<AudioTrackProps> = ({
  zoom,
  totalWidth,
  onSeek,
}) => {
  const duration = useEditorStore((s) => s.duration);
  const currentTime = useEditorStore((s) => s.currentTime);
  const waveformPeaks = useEditorStore((s) => s.waveformPeaks);

  return (
    <div className="relative w-full h-16 bg-timeline-audio/50 border border-border/60 rounded-md overflow-hidden flex items-center my-1">
      <div className="absolute top-1.5 left-2 z-10 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-primary flex items-center gap-1">
        <Mic className="w-2.5 h-2.5" />
        <span>MASTER VOICEOVER</span>
      </div>

      <Waveform
        peaks={waveformPeaks}
        duration={duration}
        currentTime={currentTime}
        zoom={zoom}
        height={64}
        onSeek={onSeek}
        className="h-full"
      />
    </div>
  );
};
