import React, { useState, useEffect } from "react";
import type { Slice } from "../../types/project";
import { useEditorStore } from "../../stores/editorStore";
import { useCharacterStore } from "../../stores/characterStore";
import { formatTime, formatDuration } from "../../lib/formatting";
import { getMediaUrl } from "../../services/api";
import { timeToPixels } from "../../lib/timeline";
import { Image as ImageIcon, Video, Scissors, Merge, Trash2, Plus, Sparkles, Users } from "lucide-react";
import { cn } from "../../lib/utils";

interface SliceCardProps {
  slice: Slice;
  index: number;
  zoom: number; // pixelsPerSecond
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onSplit?: (time: number) => void;
  onMerge?: (nextSliceId: string) => void;
  onDelete?: () => void;
  onRemoveVisual?: () => void;
}

export const SliceCard: React.FC<SliceCardProps> = ({
  slice,
  index,
  zoom,
  isActive,
  isSelected,
  onSelect,
  onSplit,
  onMerge,
  onDelete,
  onRemoveVisual,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const assignVisualToSlice = useEditorStore((s) => s.assignVisualToSlice);
  const updateSliceVisual = useEditorStore((s) => s.updateSliceVisual);

  const characters = useCharacterStore((s) => s.characters);
  const sliceChar = slice.character;
  const charData = sliceChar ? characters.find((c) => c.id === sliceChar.characterId) : null;
  const charPose = charData?.poses.find((p) => p.id === sliceChar?.poseId) || charData?.poses[0];

  // Auto-fetch if slice has a character assigned but characters store is empty
  useEffect(() => {
    if (sliceChar && characters.length === 0) {
      useCharacterStore.getState().fetchCharacters().catch(() => {});
    }
  }, [sliceChar, characters.length]);

  const duration = Math.max(slice.end - slice.start, 0.05);
  const widthPx = Math.max(timeToPixels(duration, zoom), 8);
  const leftPx = timeToPixels(slice.start, zoom);

  const isNano = widthPx < 52;
  const isSlim = widthPx >= 52 && widthPx < 96;
  const isMedium = widthPx >= 96 && widthPx < 145;

  // Find assigned asset if any
  const assignedAsset = slice.visual?.assetId
    ? project?.mediaAssets.find((a) => a.id === slice.visual?.assetId)
    : null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data && data.assetId) {
        assignVisualToSlice(slice.id, data.assetId, data.type || "image");
      }
    } catch {
      // ignore
    }
  };

  // Tier 1: Nano Card (< 52px wide)
  if (isNano) {
    return (
      <div
        onClick={onSelect}
        onDoubleClick={() => useEditorStore.getState().setSliceSettingsOpen(true)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: widthPx,
          left: leftPx,
        }}
        title={`SLICE ${String(index + 1).padStart(2, "0")} (${duration.toFixed(2)}s) [${formatTime(slice.start, false)} → ${formatTime(slice.end, false)}]\n"${slice.text}"\nClick to select • Double-click for Slice Settings`}
        className={cn(
          "slice-card absolute top-0 bottom-0 select-none transition-all px-0.5 py-1.5 flex flex-col justify-between items-center text-center overflow-hidden group cursor-pointer",
          isActive && "slice-card-active shadow-md ring-1 ring-primary z-10",
          isSelected && "slice-card-selected z-10",
          isDragOver && "border-primary bg-primary/10 scale-[1.01]"
        )}
      >
        <span className="font-mono text-[9px] font-bold text-foreground truncate w-full">
          #{index + 1}
        </span>

        {/* Visual Slot preview */}
        <div className="flex-1 w-full my-1 rounded overflow-hidden relative border border-border/40 bg-black/40 flex items-center justify-center min-h-[30px]">
          {assignedAsset ? (
            assignedAsset.type === "image" ? (
              <img src={getMediaUrl(assignedAsset.url)} alt="" className="w-full h-full object-cover" />
            ) : (
              <Video className="w-3 h-3 text-indigo-400" />
            )
          ) : charPose ? (
            <img src={getMediaUrl(charPose.imageUrl)} alt="" className="h-full w-full object-contain p-0.5" />
          ) : (
            <span className="text-[8px] text-muted-foreground/40 font-mono">•</span>
          )}
        </div>

        {onDelete ? (
          <button
            type="button"
            title="Delete slice"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-muted-foreground/60 hover:text-danger hover:bg-danger/20 transition-colors cursor-pointer"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        ) : (
          <span className="font-mono text-[8px] text-muted-foreground">
            {duration.toFixed(1)}s
          </span>
        )}
      </div>
    );
  }

  // Tier 2: Slim Card (52px to 95px wide)
  if (isSlim) {
    return (
      <div
        onClick={onSelect}
        onDoubleClick={() => useEditorStore.getState().setSliceSettingsOpen(true)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: widthPx,
          left: leftPx,
        }}
        title={`SLICE ${String(index + 1).padStart(2, "0")} (${duration.toFixed(2)}s) [${formatTime(slice.start, false)} → ${formatTime(slice.end, false)}]\n"${slice.text}"\nClick to select • Double-click for Slice Settings`}
        className={cn(
          "slice-card absolute top-0 bottom-0 select-none transition-all p-1 flex flex-col justify-between overflow-hidden group cursor-pointer",
          isActive && "slice-card-active shadow-md ring-1 ring-primary z-10",
          isSelected && "slice-card-selected z-10",
          isDragOver && "border-primary bg-primary/10 scale-[1.01]"
        )}
      >
        <div className="flex items-center justify-between pb-0.5 border-b border-border/40 text-[9px]">
          <span className="font-mono font-bold text-foreground truncate">
            SL{index + 1}
          </span>
          <span className="font-mono text-muted-foreground text-[8px] shrink-0">
            {duration.toFixed(1)}s
          </span>
        </div>

        {/* Visual Slot */}
        <div className="flex-1 w-full my-0.5 rounded overflow-hidden relative border border-border/50 bg-black/40 flex items-center justify-center min-h-[38px]">
          {assignedAsset ? (
            <div className="relative w-full h-full">
              {assignedAsset.type === "image" ? (
                <img src={getMediaUrl(assignedAsset.url)} alt="" className="w-full h-full object-cover" />
              ) : (
                <Video className="w-3.5 h-3.5 text-indigo-400 m-auto mt-2" />
              )}
            </div>
          ) : charPose ? (
            <img src={getMediaUrl(charPose.imageUrl)} alt="" className="h-full w-full object-contain p-0.5" />
          ) : (
            <Plus className="w-3 h-3 text-muted-foreground/50" />
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between pt-0.5 border-t border-border/40">
          {onSplit && (
            <button
              type="button"
              title="Split slice"
              onClick={(e) => {
                e.stopPropagation();
                onSplit(currentTime);
              }}
              disabled={currentTime <= slice.start || currentTime >= slice.end}
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
            >
              <Scissors className="w-2.5 h-2.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title="Delete slice"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-0.5 text-muted-foreground hover:text-danger cursor-pointer ml-auto"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Tier 3 & 4: Medium (96px - 144px) and Full (>= 145px)
  return (
    <div
      onClick={onSelect}
      onDoubleClick={() => useEditorStore.getState().setSliceSettingsOpen(true)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: widthPx,
        left: leftPx,
      }}
      className={cn(
        "slice-card absolute top-0 bottom-0 select-none transition-all overflow-hidden flex flex-col justify-between cursor-pointer",
        isMedium ? "p-1.5" : "p-2",
        isActive && "slice-card-active shadow-md ring-1 ring-primary z-10",
        isSelected && "slice-card-selected z-10",
        isDragOver && "border-primary bg-primary/10 scale-[1.01]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/40 text-[10px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-foreground">
            SLICE {String(index + 1).padStart(2, "0")}
          </span>
          {!isMedium && sliceChar && (
            <span
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium bg-primary/20 text-primary border border-primary/30 truncate max-w-[80px]"
              title={`Character: ${charData?.name || "Assigned"}`}
            >
              <Users className="w-2 h-2 shrink-0" />
              <span className="truncate">{charData?.name || "Char"}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-muted-foreground">
            {formatDuration(duration)}
          </span>
          {onDelete && (
            <button
              type="button"
              title="Delete slice"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-0.5 rounded text-muted-foreground/60 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Timing */}
      <div className="text-[9px] font-mono text-muted-foreground pt-0.5">
        {formatTime(slice.start, false)} → {formatTime(slice.end, false)}
      </div>

      {/* Text snippet */}
      <p className={cn("text-foreground/90 font-medium my-1 leading-snug", isMedium ? "text-[10px] line-clamp-1" : "text-[11px] line-clamp-2")}>
        "{slice.text}"
      </p>

      {/* Visual Slot */}
      <div className="flex-1 w-full min-h-[52px] rounded overflow-hidden relative border border-border/60 bg-black/40 flex items-center justify-center">
        {assignedAsset ? (
          <div className="relative w-full h-full group">
            {assignedAsset.type === "image" ? (
              <img
                src={getMediaUrl(assignedAsset.url)}
                alt={assignedAsset.name}
                className="w-full h-full object-cover"
              />
            ) : assignedAsset.thumbnailUrl ? (
              <img
                src={getMediaUrl(assignedAsset.thumbnailUrl)}
                alt={assignedAsset.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={`${getMediaUrl(assignedAsset.url)}#t=2.0`}
                preload="metadata"
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-20">
              <span className="text-[10px] text-white font-medium truncate px-1">
                {assignedAsset.name}
              </span>
              {onRemoveVisual && (
                <button
                  type="button"
                  title="Remove visual"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveVisual();
                  }}
                  className="p-1 rounded bg-black/60 text-danger hover:bg-black cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Character Badge Overlay when visual background is present */}
            {charPose && (
              <div
                className="absolute top-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs border border-primary/60 text-[9px] font-semibold text-primary shadow-xs pointer-events-none"
                title={`${charData?.name || "Character"} (${charPose.name})`}
              >
                <img
                  src={getMediaUrl(charPose.imageUrl)}
                  alt={charData?.name || "Character"}
                  className="w-3.5 h-3.5 rounded-full object-cover border border-primary/40 bg-black/60 shrink-0"
                  style={{ transform: sliceChar?.flipX ? "scaleX(-1)" : "none" }}
                />
                <span className="truncate max-w-[65px]">{charData?.name || "Character"}</span>
              </div>
            )}
          </div>
        ) : charPose ? (
          <div className="relative w-full h-full group flex items-center justify-center bg-black/60 overflow-hidden">
            <img
              src={getMediaUrl(charPose.imageUrl)}
              alt={charData?.name || "Character"}
              className="h-full max-w-full object-contain p-0.5"
              style={{ transform: sliceChar?.flipX ? "scaleX(-1)" : "none" }}
            />
            <div
              className="absolute top-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs border border-primary/60 text-[9px] font-semibold text-primary shadow-xs pointer-events-none"
              title={`${charData?.name || "Character"} (${charPose.name})`}
            >
              <img
                src={getMediaUrl(charPose.imageUrl)}
                alt={charData?.name || "Character"}
                className="w-3.5 h-3.5 rounded-full object-cover border border-primary/40 bg-black/60 shrink-0"
                style={{ transform: sliceChar?.flipX ? "scaleX(-1)" : "none" }}
              />
              <span className="truncate max-w-[65px]">{charData?.name || "Character"}</span>
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="text-[9px] text-muted-foreground/90 font-mono">Drop media for bg</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-0.5 p-1 text-center">
            <Plus className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-[9px] font-medium leading-none">Drop Media</span>
          </div>
        )}
      </div>

      {/* Transition Selector if visual is assigned */}
      {!isMedium && assignedAsset && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between px-1.5 py-0.5 bg-black/50 border border-border/40 rounded text-[9px] font-mono my-0.5"
        >
          <span className="text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-primary" />
            Effect:
          </span>
          <select
            value={slice.visual?.transition || "none"}
            onChange={(e) => {
              e.stopPropagation();
              updateSliceVisual(slice.id, { transition: e.target.value as any });
            }}
            className="bg-surface text-primary font-semibold text-[9px] rounded px-1 py-0.5 border border-border/40 focus:outline-none cursor-pointer"
          >
            <option value="none">Cut (None)</option>
            <option value="fade">Fade In/Out</option>
            <option value="zoom-in">Zoom In</option>
            <option value="zoom-out">Zoom Out</option>
          </select>
        </div>
      )}

      {/* Action footer */}
      <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/40 text-[10px]">
        {onSplit && (
          <button
            type="button"
            title="Split slice at current playhead position"
            onClick={(e) => {
              e.stopPropagation();
              onSplit(currentTime);
            }}
            disabled={currentTime <= slice.start || currentTime >= slice.end}
            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <Scissors className="w-2.5 h-2.5" />
            {!isMedium && <span>Split</span>}
          </button>
        )}

        {onMerge && (
          <button
            type="button"
            title="Merge with next slice"
            onClick={(e) => {
              e.stopPropagation();
              onMerge(slice.id);
            }}
            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Merge className="w-2.5 h-2.5" />
            {!isMedium && <span>Merge</span>}
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            title="Delete this slice"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex items-center gap-0.5 text-muted-foreground hover:text-danger cursor-pointer transition-colors"
          >
            <Trash2 className="w-2.5 h-2.5" />
            {!isMedium && <span>Delete</span>}
          </button>
        )}
      </div>
    </div>
  );
};
