import React from "react";
import { useEditorStore } from "../../stores/editorStore";
import { audioPlayer } from "../../services/audioPlayer";
import { Music, Volume2, VolumeX, Plus, Sliders, Disc3 } from "lucide-react";

interface BgmTrackProps {
  zoom: number;
  totalWidth: number;
  onOpenBgmModal: () => void;
}

export const BgmTrack: React.FC<BgmTrackProps> = ({
  zoom,
  totalWidth,
  onOpenBgmModal,
}) => {
  const project = useEditorStore((s) => s.project);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const updateBackgroundMusicVolume = useEditorStore((s) => s.updateBackgroundMusicVolume);

  const bgm = project?.backgroundMusic;
  const isMuted = (bgm?.volume ?? 0.15) === 0;

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bgm) return;
    if (isMuted) {
      updateBackgroundMusicVolume(0.15);
      audioPlayer.setBgmVolume(0.15);
    } else {
      updateBackgroundMusicVolume(0);
      audioPlayer.setBgmVolume(0);
    }
  };

  if (!bgm) {
    return (
      <div
        onClick={onOpenBgmModal}
        className="relative w-full h-9 my-1 rounded-md border border-dashed border-border/80 hover:border-primary/60 bg-surface/30 hover:bg-surface-elevated/50 flex items-center justify-between px-3 cursor-pointer transition-all group select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-surface-elevated flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            <Plus className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Add Background Music (BGM) Track
          </span>
        </div>

        <span className="text-[10px] font-mono text-muted-foreground/60 group-hover:text-primary transition-colors">
          Click to choose preset or upload
        </span>
      </div>
    );
  }

  const volumePct = Math.round((bgm.volume ?? 0.15) * 100);

  return (
    <div
      onClick={onOpenBgmModal}
      className="relative w-full h-10 my-1 rounded-md border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-surface-elevated to-indigo-950/20 hover:border-indigo-500/50 flex items-center justify-between px-3 cursor-pointer transition-all shadow-xs group select-none overflow-hidden"
    >
      {/* Decorative rhythmic audio wave background pattern */}
      <div className="absolute inset-0 opacity-15 flex items-center gap-1 px-4 pointer-events-none overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => {
          const height = 15 + ((i * 17) % 70);
          return (
            <div
              key={i}
              className={`w-1 rounded-full bg-indigo-400 ${isPlaying ? "animate-pulse" : ""}`}
              style={{
                height: `${height}%`,
                animationDelay: `${(i % 10) * 100}ms`,
              }}
            />
          );
        })}
      </div>

      {/* Left label badge */}
      <div className="relative z-10 flex items-center gap-2 max-w-sm truncate">
        <div className="w-6 h-6 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <Music className={`w-3.5 h-3.5 ${isPlaying ? "animate-bounce" : ""}`} />
        </div>

        <div className="flex flex-col truncate">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
              BGM
            </span>
            <span className="text-[11px] font-semibold text-foreground/90 truncate">
              {bgm.filename || "Background Music"}
            </span>
          </div>
        </div>
      </div>

      {/* Right controls: volume & settings */}
      <div className="relative z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Quick Mute Toggle */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={`p-1 rounded hover:bg-surface border transition-colors cursor-pointer ${
            isMuted
              ? "text-danger bg-danger/10 border-danger/30"
              : "text-muted-foreground hover:text-foreground border-border/40"
          }`}
          title={isMuted ? "Unmute BGM" : "Mute BGM"}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Volume badge */}
        <span
          onClick={onOpenBgmModal}
          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors cursor-pointer"
          title="Click to adjust volume ducking"
        >
          {volumePct}% vol
        </span>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenBgmModal}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface border border-border/40 transition-colors cursor-pointer"
          title="Configure background music"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
