import React from "react";
import { formatTime } from "../../lib/formatting";
import { Play, Pause, ZoomIn, ZoomOut, RotateCcw, Scissors, Sparkles, Volume2, Layers } from "lucide-react";
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
  trackView?: "all" | "primary" | "secondary";
  onChangeTrackView?: (view: "all" | "primary" | "secondary") => void;
  onOpenOverlaysModal?: () => void;
  onOpenSfxModal?: () => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  trackView = "all",
  onChangeTrackView,
  onOpenOverlaysModal,
  onOpenSfxModal,
}) => {
  const splitSliceAtTime = useEditorStore((s) => s.splitSliceAtTime);
  const project = useEditorStore((s) => s.project);
  const overlayCount = project?.overlays?.length || 0;
  const sfxCount = project?.soundEffects?.length || 0;

  return (
    <div className="h-10 px-3 bg-surface-elevated/40 border-b border-border flex items-center justify-between gap-2 select-none">
      {/* Left: Playback controls & Time readout */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onTogglePlay}
          icon={isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        >
          {isPlaying ? "Pause" : "Play"}
        </Button>

        <div className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded bg-black/40 border border-border/50">
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

      {/* Middle: Track View Selector & Quick Secondary Actions */}
      <div className="flex items-center gap-1.5">
        {onChangeTrackView && (
          <div className="flex items-center rounded-lg bg-surface border border-border/70 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onChangeTrackView("all")}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                trackView === "all"
                  ? "bg-surface-elevated text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Tracks
            </button>
            <button
              type="button"
              onClick={() => onChangeTrackView("primary")}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                trackView === "primary"
                  ? "bg-surface-elevated text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Narration
            </button>
            <button
              type="button"
              onClick={() => onChangeTrackView("secondary")}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                trackView === "secondary"
                  ? "bg-gradient-to-r from-pink-500/20 to-emerald-500/20 text-foreground border border-pink-500/30 shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>Secondary FX</span>
              {(overlayCount > 0 || sfxCount > 0) && (
                <span className="text-[9px] px-1 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                  {overlayCount + sfxCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Quick Add Overlay & Add SFX buttons */}
        {onOpenOverlaysModal && (
          <button
            type="button"
            onClick={onOpenOverlaysModal}
            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 flex items-center gap-1 transition-colors cursor-pointer"
            title="Add animating overlay from global library"
          >
            <Sparkles className="w-3 h-3 text-pink-400" />
            <span className="hidden sm:inline">+ Overlay</span>
          </button>
        )}

        {onOpenSfxModal && (
          <button
            type="button"
            onClick={onOpenSfxModal}
            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
            title="Add sound effect from global library"
          >
            <Volume2 className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">+ Sound FX</span>
          </button>
        )}
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground uppercase font-mono mr-1 hidden md:inline">Zoom</span>
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
