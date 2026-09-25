import React, { useState } from "react";
import type { Slice } from "../../types/project";
import { useEditorStore } from "../../stores/editorStore";
import { formatTime, formatDuration } from "../../lib/formatting";
import { getMediaUrl } from "../../services/api";
import { timeToPixels } from "../../lib/timeline";
import { Image as ImageIcon, Video, Scissors, Merge, Trash2, Plus, Sparkles } from "lucide-react";
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
  onRemoveVisual,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const assignVisualToSlice = useEditorStore((s) => s.assignVisualToSlice);
  const updateSliceVisual = useEditorStore((s) => s.updateSliceVisual);

  const duration = Math.max(slice.end - slice.start, 0.1);
  const widthPx = Math.max(160, timeToPixels(duration, zoom));
  const leftPx = timeToPixels(slice.start, zoom);

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

  return (
    <div
      onClick={onSelect}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: widthPx,
        left: leftPx,
      }}
      className={cn(
        "slice-card absolute top-0 bottom-0 select-none transition-all",
        isActive && "slice-card-active shadow-md ring-1 ring-primary",
        isSelected && "slice-card-selected",
        isDragOver && "border-primary bg-primary/10 scale-[1.01]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/40 text-[10px]">
        <span className="font-mono font-bold text-foreground">
          SLICE {String(index + 1).padStart(2, "0")}
        </span>
        <span className="font-mono text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Timing */}
      <div className="text-[9px] font-mono text-muted-foreground pt-0.5">
        {formatTime(slice.start, false)} → {formatTime(slice.end, false)}
      </div>

      {/* Text snippet */}
      <p className="text-[11px] text-foreground/90 font-medium line-clamp-2 my-1 leading-snug">
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
            ) : (
              <img
                src={getMediaUrl(assignedAsset.thumbnailUrl || assignedAsset.url)}
                alt={assignedAsset.name}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
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
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-0.5 p-1 text-center">
            <Plus className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-[9px] font-medium leading-none">Drop Media</span>
          </div>
        )}
      </div>

      {/* Transition Selector if visual is assigned */}
      {assignedAsset && (
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
            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
          >
            <Scissors className="w-2.5 h-2.5" />
            <span>Split</span>
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
            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
          >
            <Merge className="w-2.5 h-2.5" />
            <span>Merge</span>
          </button>
        )}
      </div>
    </div>
  );
};
