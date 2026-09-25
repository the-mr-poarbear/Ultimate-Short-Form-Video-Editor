import React from "react";
import { formatTime } from "../../lib/formatting";
import { Play, Pause, ZoomIn, ZoomOut, RotateCcw, Scissors } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { useEditorStore } from "../../stores/editorStore";

interface TimelineHeaderProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const splitSliceAtTime = useEditorStore((s) => s.splitSliceAtTime);

  return (
    <div className="h-10 px-4 bg-surface-elevated/40 border-b border-border flex items-center justify-between">
      {/* Left: Playback controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={onTogglePlay}
          icon={isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        >
          {isPlaying ? "Pause" : "Play"}
        </Button>

        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="text-foreground font-semibold">{formatTime(currentTime)}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{formatTime(duration)}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => splitSliceAtTime(currentTime)}
          icon={<Scissors className="w-3 h-3 text-warning" />}
          title="Split slice at current playhead position"
        >
          Split Slice
        </Button>
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground uppercase font-mono mr-1">Zoom</span>
        <IconButton size="sm" onClick={onZoomOut} title="Zoom Out">
          <ZoomOut className="w-3.5 h-3.5" />
        </IconButton>
        <IconButton size="sm" onClick={onResetZoom} title="Reset Zoom">
          <RotateCcw className="w-3.5 h-3.5" />
        </IconButton>
        <IconButton size="sm" onClick={onZoomIn} title="Zoom In">
          <ZoomIn className="w-3.5 h-3.5" />
        </IconButton>
      </div>
    </div>
  );
};
