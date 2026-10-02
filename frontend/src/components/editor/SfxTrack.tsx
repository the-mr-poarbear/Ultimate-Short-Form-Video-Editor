import React, { useRef } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { audioPlayer } from "../../services/audioPlayer";
import { Volume2, Plus, Trash2, Play, Move } from "lucide-react";
import type { TimelineSoundEffect } from "../../types/sfx";

interface SfxTrackProps {
  zoom: number; // pixelsPerSecond
  totalWidth: number;
  onOpenSfxModal: () => void;
}

export const SfxTrack: React.FC<SfxTrackProps> = ({
  zoom,
  totalWidth,
  onOpenSfxModal,
}) => {
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const selectedSoundEffectId = useEditorStore((s) => s.selectedSoundEffectId);
  const selectSoundEffect = useEditorStore((s) => s.selectSoundEffect);
  const updateTimelineSoundEffect = useEditorStore((s) => s.updateTimelineSoundEffect);
  const removeTimelineSoundEffect = useEditorStore((s) => s.removeTimelineSoundEffect);
  const beginBatch = useEditorStore((s) => s.beginBatch);
  const endBatch = useEditorStore((s) => s.endBatch);

  const sfxList = project?.soundEffects || [];

  const draggingRef = useRef<{
    id: string;
    startX: number;
    initialStart: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, item: TimelineSoundEffect) => {
    e.stopPropagation();
    selectSoundEffect(item.id);
    beginBatch();

    draggingRef.current = {
      id: item.id,
      startX: e.clientX,
      initialStart: item.start,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingRef.current) return;
      const { id, startX, initialStart } = draggingRef.current;
      const deltaSeconds = (moveEvent.clientX - startX) / zoom;
      const maxTime = Math.max(0, (duration || 9999) - (item.duration || 0.5));
      const newStart = Math.max(0, Math.min(initialStart + deltaSeconds, maxTime));

      updateTimelineSoundEffect(id, {
        start: Math.round(newStart * 100) / 100,
      }, true);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      draggingRef.current = null;
      endBatch();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleAudition = (e: React.MouseEvent, item: TimelineSoundEffect) => {
    e.stopPropagation();
    audioPlayer.playSfx(item.url, item.volume ?? 0.8);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectSoundEffect(null);
        }
      }}
      className="relative w-full h-11 my-1 rounded-md border border-emerald-500/25 bg-gradient-to-r from-emerald-950/20 via-surface-elevated/40 to-emerald-950/10 flex items-center select-none overflow-hidden group/track"
    >
      {/* Track Label Badge & Add Button */}
      <div className="absolute top-1.5 left-2 z-20 flex items-center gap-1.5 pointer-events-auto">
        <div className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
          <Volume2 className="w-2.5 h-2.5" />
          <span>SOUND EFFECTS ({sfxList.length})</span>
        </div>

        <button
          type="button"
          onClick={onOpenSfxModal}
          className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer border border-emerald-500/30"
          title="Open global sound effects library"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Add Sound</span>
        </button>
      </div>

      {/* Empty State Banner if 0 SFX */}
      {sfxList.length === 0 && (
        <div
          onClick={onOpenSfxModal}
          className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-emerald-500/5 transition-colors z-10"
        >
          <span className="text-[11px] font-medium text-muted-foreground/60 flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
            <Plus className="w-3 h-3" />
            <span>Click to add whooshes, pops, impacts or voice effects to timeline</span>
          </span>
        </div>
      )}

      {/* SFX track timeline canvas */}
      <div
        className="relative h-full"
        style={{ width: totalWidth }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            selectSoundEffect(null);
          }
        }}
      >
        {sfxList.map((item) => {
          const left = item.start * zoom;
          const width = Math.max(38, (item.duration || 1.0) * zoom);
          const isSelected = selectedSoundEffectId === item.id;
          const isActive =
            currentTime >= item.start && currentTime <= item.start + (item.duration || 1.0);
          const volPct = Math.round((item.volume ?? 0.8) * 100);

          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                selectSoundEffect(item.id);
              }}
              onMouseDown={(e) => handleMouseDown(e, item)}
              style={{
                left: `${left}px`,
                width: `${width}px`,
              }}
              className={`absolute top-1 bottom-1 rounded-md border flex items-center justify-between px-1.5 cursor-grab active:cursor-grabbing transition-all select-none z-15 ${
                isSelected
                  ? "bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-500/50 shadow-md"
                  : isActive
                  ? "bg-emerald-900/40 border-emerald-500/60 shadow-xs"
                  : "bg-surface-elevated/90 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-surface-elevated"
              }`}
            >
              {/* Play Audition Button */}
              <button
                type="button"
                onClick={(e) => handleAudition(e, item)}
                className="w-4 h-4 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                title="Audition sound effect"
              >
                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
              </button>

              {/* Title & Volume info */}
              <div className="flex flex-col overflow-hidden px-1 pointer-events-none">
                <span className="text-[10px] font-semibold text-foreground truncate">
                  {item.name}
                </span>
                <span className="text-[8px] font-mono text-emerald-300">
                  {volPct}% vol • {(item.duration || 1.0).toFixed(1)}s
                </span>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTimelineSoundEffect(item.id);
                }}
                className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger/20 transition-colors cursor-pointer pointer-events-auto opacity-0 group-hover/track:opacity-100"
                title="Remove sound effect from timeline"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
