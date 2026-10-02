import React from "react";
import { useEditorStore } from "../../stores/editorStore";
import { audioPlayer } from "../../services/audioPlayer";
import { X, Volume2, Trash2, Play } from "lucide-react";

export const SfxInspector: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const selectedSoundEffectId = useEditorStore((s) => s.selectedSoundEffectId);
  const selectSoundEffect = useEditorStore((s) => s.selectSoundEffect);
  const updateTimelineSoundEffect = useEditorStore((s) => s.updateTimelineSoundEffect);
  const removeTimelineSoundEffect = useEditorStore((s) => s.removeTimelineSoundEffect);

  if (!selectedSoundEffectId || !project) return null;

  const sfx = project.soundEffects?.find((s) => s.id === selectedSoundEffectId);
  if (!sfx) return null;

  const volPct = Math.round((sfx.volume ?? 0.8) * 100);

  return (
    <div className="fixed bottom-20 right-6 z-40 w-72 bg-surface/95 backdrop-blur-md rounded-xl border border-emerald-500/40 shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <h4 className="text-xs font-bold text-foreground truncate">{sfx.name}</h4>
            <span className="text-[10px] font-mono text-emerald-400">Sound Effect</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => selectSoundEffect(null)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Start Time */}
      <div>
        <label className="text-[10px] font-mono text-muted-foreground mb-1 block">Start Time (s)</label>
        <input
          type="number"
          step="0.05"
          min="0"
          value={sfx.start}
          onChange={(e) => updateTimelineSoundEffect(sfx.id, { start: Math.max(0, parseFloat(e.target.value) || 0) }, false)}
          className="w-full px-2 py-1 rounded bg-surface-elevated border border-border text-xs text-foreground font-mono"
        />
      </div>

      {/* Volume Slider */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
          <span>Volume</span>
          <span className="text-emerald-400">{volPct}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={sfx.volume ?? 0.8}
          onChange={(e) => updateTimelineSoundEffect(sfx.id, { volume: parseFloat(e.target.value) })}
          className="w-full accent-emerald-500 cursor-pointer h-1.5"
        />
      </div>

      {/* Audition & Delete */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <button
          type="button"
          onClick={() => audioPlayer.playSfx(sfx.url, sfx.volume ?? 0.8)}
          className="px-3 py-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Play Audition</span>
        </button>

        <button
          type="button"
          onClick={() => removeTimelineSoundEffect(sfx.id)}
          className="p-1.5 rounded text-danger hover:bg-danger/15 transition-colors cursor-pointer"
          title="Delete sound effect"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
