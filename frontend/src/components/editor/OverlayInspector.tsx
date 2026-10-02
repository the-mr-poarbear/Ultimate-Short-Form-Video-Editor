import React, { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useOverlayStore } from "../../stores/overlayStore";
import { getMediaUrl } from "../../services/api";
import { formatTime } from "../../lib/formatting";
import {
  X,
  Sparkles,
  Trash2,
  RotateCw,
  Move,
  Maximize2,
  FlipHorizontal,
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Check,
  Layers,
} from "lucide-react";
import type { OverlayAnimation, OverlayCategory, OverlayItem } from "../../types/overlay";

const ANIMATION_OPTIONS: { id: OverlayAnimation; label: string }[] = [
  { id: "bounce", label: "Bounce" },
  { id: "pulse", label: "Pulse / Glow" },
  { id: "spin", label: "Spin" },
  { id: "wiggle", label: "Wiggle" },
  { id: "pop", label: "Pop In" },
  { id: "fade", label: "Fade" },
  { id: "slide-up", label: "Slide Up" },
  { id: "slide-down", label: "Slide Down" },
  { id: "slide-left", label: "Slide Left" },
  { id: "slide-right", label: "Slide Right" },
  { id: "glow", label: "Neon Glow" },
  { id: "none", label: "None (Static)" },
];

export const OverlayInspector: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const selectedOverlayId = useEditorStore((s) => s.selectedOverlayId);
  const selectOverlay = useEditorStore((s) => s.selectOverlay);
  const updateTimelineOverlay = useEditorStore((s) => s.updateTimelineOverlay);
  const removeTimelineOverlay = useEditorStore((s) => s.removeTimelineOverlay);

  const globalOverlays = useOverlayStore((s) => s.overlays);

  const [isSwitchingAsset, setIsSwitchingAsset] = useState(false);
  const [switchCategory, setSwitchCategory] = useState<OverlayCategory | "all">("all");
  const [switchSearch, setSwitchSearch] = useState("");

  if (!selectedOverlayId || !project) return null;

  const overlay = project.overlays?.find((o) => o.id === selectedOverlayId);
  if (!overlay) return null;

  const handleUpdate = (patch: Partial<typeof overlay>, isContinuous = true) => {
    updateTimelineOverlay(overlay.id, patch, isContinuous);
  };

  // Find relevant section / narration slice
  const slices = project.slices || [];
  let sliceIndex = slices.findIndex(
    (s) => overlay.start >= s.start && overlay.start < s.end
  );
  if (sliceIndex === -1) {
    sliceIndex = slices.findIndex(
      (s) => overlay.end > s.start && overlay.end <= s.end
    );
  }
  if (sliceIndex === -1 && slices.length > 0) {
    // Find closest slice
    sliceIndex = 0;
    let minDiff = 999999;
    slices.forEach((s, idx) => {
      const diff = Math.min(Math.abs(s.start - overlay.start), Math.abs(s.end - overlay.end));
      if (diff < minDiff) {
        minDiff = diff;
        sliceIndex = idx;
      }
    });
  }

  const currentSlice = sliceIndex !== -1 ? slices[sliceIndex] : null;

  // Sticking actions
  const handleStickToStart = (targetSlice = currentSlice) => {
    if (!targetSlice) return;
    const dur = Math.max(0.2, overlay.end - overlay.start);
    handleUpdate(
      {
        start: Math.round(targetSlice.start * 100) / 100,
        end: Math.round((targetSlice.start + dur) * 100) / 100,
      },
      false
    );
  };

  const handleStickToEnd = (targetSlice = currentSlice) => {
    if (!targetSlice) return;
    const dur = Math.max(0.2, overlay.end - overlay.start);
    handleUpdate(
      {
        start: Math.max(0, Math.round((targetSlice.end - dur) * 100) / 100),
        end: Math.round(targetSlice.end * 100) / 100,
      },
      false
    );
  };

  const handleFitEntireSection = (targetSlice = currentSlice) => {
    if (!targetSlice) return;
    handleUpdate(
      {
        start: Math.round(targetSlice.start * 100) / 100,
        end: Math.round(targetSlice.end * 100) / 100,
      },
      false
    );
  };

  // Asset switcher selection
  const handleSelectAsset = (item: OverlayItem) => {
    handleUpdate(
      {
        url: item.url,
        name: item.name,
        overlayId: item.id,
        animation: overlay.animation || item.defaultAnimation || "bounce",
      },
      false
    );
    setIsSwitchingAsset(false);
  };

  const filteredAssets = globalOverlays.filter((item) => {
    const matchesCat = switchCategory === "all" || item.category === switchCategory;
    const matchesSearch =
      !switchSearch ||
      item.name.toLowerCase().includes(switchSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(switchSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed bottom-24 right-6 z-40 w-84 bg-surface/95 backdrop-blur-md rounded-xl border border-pink-500/40 shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 max-h-[82vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h4 className="text-xs font-bold text-foreground truncate">{overlay.name}</h4>
            <span className="text-[10px] font-mono text-pink-400">Overlay Properties</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => selectOverlay(null)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Switch Asset / Current Graphic Card */}
      <div className="rounded-lg bg-surface-elevated/70 border border-border/70 p-2.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-10 h-10 rounded-md bg-black/60 border border-border flex items-center justify-center p-1 flex-shrink-0 overflow-hidden">
            <img
              src={getMediaUrl(overlay.url)}
              alt=""
              className="max-w-full max-h-full object-contain filter drop-shadow-sm"
            />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-foreground truncate">{overlay.name}</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {(overlay.end - overlay.start).toFixed(1)}s duration
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSwitchingAsset(!isSwitchingAsset)}
          className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            isSwitchingAsset
              ? "bg-pink-500 text-white shadow-xs"
              : "bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30"
          }`}
          title="Switch to a different overlay graphic"
        >
          <RefreshCw className={`w-3 h-3 ${isSwitchingAsset ? "animate-spin" : ""}`} />
          <span>Switch</span>
        </button>
      </div>

      {/* Asset Switcher Drawer / Grid (when opened) */}
      {isSwitchingAsset && (
        <div className="p-2.5 rounded-lg bg-black/60 border border-pink-500/40 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-pink-300 font-bold">
              Choose New Graphic
            </span>
            <button
              type="button"
              onClick={() => setIsSwitchingAsset(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Close
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={switchSearch}
              onChange={(e) => setSwitchSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-6 pr-2 py-1 rounded bg-surface border border-border text-[11px] text-foreground"
            />
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
            {(["all", "arrows", "lines", "callouts", "stickers", "custom"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSwitchCategory(cat)}
                className={`px-1.5 py-0.5 rounded capitalize whitespace-nowrap cursor-pointer ${
                  switchCategory === cat
                    ? "bg-pink-500 text-white font-semibold"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid of overlays to switch to */}
          <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {filteredAssets.map((item) => {
              const isCurrent = overlay.overlayId === item.id || overlay.url === item.url;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectAsset(item)}
                  className={`relative p-1.5 rounded border flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                    isCurrent
                      ? "border-pink-500 bg-pink-500/20 ring-1 ring-pink-500"
                      : "border-border/60 bg-surface hover:border-pink-400"
                  }`}
                  title={`${item.name} (${item.category})`}
                >
                  <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                    <img
                      src={getMediaUrl(item.url)}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  {isCurrent && (
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-pink-500 text-white flex items-center justify-center">
                      <Check className="w-2 h-2" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section Sticking / Snapping Controls */}
      {currentSlice && (
        <div className="rounded-lg bg-surface-elevated/70 border border-border/70 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
            <span className="flex items-center gap-1.5 text-pink-400">
              <Layers className="w-3.5 h-3.5" />
              <span>Section Sticking (Slice #{sliceIndex + 1})</span>
            </span>

            {/* Prev / Next Slice Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={sliceIndex <= 0}
                onClick={() => {
                  if (sliceIndex > 0) handleStickToStart(slices[sliceIndex - 1]);
                }}
                className="p-0.5 rounded hover:bg-surface text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Stick to previous section"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={sliceIndex >= slices.length - 1}
                onClick={() => {
                  if (sliceIndex < slices.length - 1) handleStickToStart(slices[sliceIndex + 1]);
                }}
                className="p-0.5 rounded hover:bg-surface text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Stick to next section"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="text-[10px] font-mono text-muted-foreground truncate bg-black/40 px-2 py-0.5 rounded">
            [{formatTime(currentSlice.start)} - {formatTime(currentSlice.end)}]{" "}
            {currentSlice.text || "Narration section"}
          </div>

          {/* 3 Sticking Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleStickToStart()}
              className="px-2 py-1.5 rounded-md bg-surface hover:bg-surface-elevated border border-border hover:border-pink-500/50 text-[10px] font-semibold text-foreground flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
              title="Align start of overlay to start of current section"
            >
              <ArrowLeftToLine className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
              <span>Stick Start</span>
            </button>

            <button
              type="button"
              onClick={() => handleStickToEnd()}
              className="px-2 py-1.5 rounded-md bg-surface hover:bg-surface-elevated border border-border hover:border-pink-500/50 text-[10px] font-semibold text-foreground flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
              title="Align end of overlay to end of current section"
            >
              <ArrowRightToLine className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
              <span>Stick End</span>
            </button>

            <button
              type="button"
              onClick={() => handleFitEntireSection()}
              className="px-2 py-1.5 rounded-md bg-surface hover:bg-surface-elevated border border-border hover:border-pink-500/50 text-[10px] font-semibold text-foreground flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
              title="Fit overlay to cover entire section"
            >
              <Maximize2 className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
              <span>Fit Section</span>
            </button>
          </div>
        </div>
      )}

      {/* Track Lane / Layer Stacking */}
      <div className="rounded-lg bg-surface-elevated/70 border border-border/70 p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-foreground">
          <Layers className="w-3.5 h-3.5 text-pink-400" />
          <span className="font-semibold">Track Lane</span>
          <span className="text-[10px] font-mono text-pink-400 bg-pink-500/15 px-1.5 py-0.5 rounded border border-pink-500/30">
            Lane {(overlay.lane ?? 0) + 1}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleUpdate({ lane: Math.max(0, (overlay.lane ?? 0) - 1) }, false)}
            disabled={(overlay.lane ?? 0) <= 0}
            className="px-2 py-1 rounded bg-surface hover:bg-surface-elevated border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Move to lower lane (Lane Down)"
          >
            Lane -
          </button>
          <button
            type="button"
            onClick={() => handleUpdate({ lane: (overlay.lane ?? 0) + 1 }, false)}
            className="px-2 py-1 rounded bg-surface hover:bg-surface-elevated border border-border text-[10px] font-medium text-pink-300 hover:text-pink-200 cursor-pointer transition-colors"
            title="Move to upper lane (Lane Up)"
          >
            Lane +
          </button>
        </div>
      </div>

      {/* Animation Style Selector */}
      <div>
        <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
          <RotateCw className="w-3 h-3 text-pink-400" />
          <span>Animation Style</span>
        </label>
        <select
          value={overlay.animation || "bounce"}
          onChange={(e) => handleUpdate({ animation: e.target.value as OverlayAnimation }, false)}
          className="w-full px-2.5 py-1.5 rounded-md bg-surface-elevated border border-border text-foreground text-xs cursor-pointer focus:border-pink-500"
        >
          {ANIMATION_OPTIONS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Timing manual inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono text-muted-foreground">Start Time (s)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={overlay.start}
            onChange={(e) =>
              handleUpdate({ start: Math.max(0, parseFloat(e.target.value) || 0) }, false)
            }
            className="w-full px-2 py-1 rounded bg-surface-elevated border border-border text-xs text-foreground font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground">End Time (s)</label>
          <input
            type="number"
            step="0.1"
            min={overlay.start + 0.1}
            value={overlay.end}
            onChange={(e) =>
              handleUpdate(
                { end: Math.max(overlay.start + 0.1, parseFloat(e.target.value) || overlay.start + 1) },
                false
              )
            }
            className="w-full px-2 py-1 rounded bg-surface-elevated border border-border text-xs text-foreground font-mono"
          />
        </div>
      </div>

      {/* Position X & Y Sliders */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
            <span>Position X (Center)</span>
            <span>{Math.round(overlay.positionX ?? 50)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={overlay.positionX ?? 50}
            onChange={(e) => handleUpdate({ positionX: parseFloat(e.target.value) })}
            className="w-full accent-pink-500 cursor-pointer h-1.5"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
            <span>Position Y (Center)</span>
            <span>{Math.round(overlay.positionY ?? 50)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={overlay.positionY ?? 50}
            onChange={(e) => handleUpdate({ positionY: parseFloat(e.target.value) })}
            className="w-full accent-pink-500 cursor-pointer h-1.5"
          />
        </div>
      </div>

      {/* Scale & Rotation Sliders */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
            <span>Scale</span>
            <span>{(overlay.scale ?? 1.0).toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.05"
            value={overlay.scale ?? 1.0}
            onChange={(e) => handleUpdate({ scale: parseFloat(e.target.value) })}
            className="w-full accent-pink-500 cursor-pointer h-1.5"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
            <span>Rotation</span>
            <span>{Math.round(overlay.rotation ?? 0)}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={overlay.rotation ?? 0}
            onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value, 10) })}
            className="w-full accent-pink-500 cursor-pointer h-1.5"
          />
        </div>
      </div>

      {/* Flip Horizontal & Delete */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <button
          type="button"
          onClick={() => handleUpdate({ flipX: !overlay.flipX }, false)}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            overlay.flipX
              ? "bg-pink-500 text-white"
              : "bg-surface-elevated text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          <span>Flip Horizontal</span>
        </button>

        <button
          type="button"
          onClick={() => removeTimelineOverlay(overlay.id)}
          className="p-1.5 rounded text-danger hover:bg-danger/15 transition-colors cursor-pointer"
          title="Delete overlay"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
