import React from "react";
import { useEditorStore } from "../../stores/editorStore";
import { SliceCard } from "./SliceCard";
import type { Slice } from "../../types/project";

interface SliceTrackProps {
  zoom: number; // pixelsPerSecond
  totalWidth: number;
  onSeek: (time: number) => void;
}

export const SliceTrack: React.FC<SliceTrackProps> = ({
  zoom,
  totalWidth,
  onSeek,
}) => {
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const selectedSliceId = useEditorStore((s) => s.selectedSliceId);
  const selectSlice = useEditorStore((s) => s.selectSlice);
  const splitSlice = useEditorStore((s) => s.splitSlice);
  const mergeSlices = useEditorStore((s) => s.mergeSlices);
  const deleteSlice = useEditorStore((s) => s.deleteSlice);
  const removeVisualFromSlice = useEditorStore((s) => s.removeVisualFromSlice);

  const slices = project?.slices || [];

  const handleSplit = (sliceId: string, time: number) => {
    splitSlice(sliceId, time);
  };

  const handleMerge = (firstId: string) => {
    const idx = slices.findIndex((s) => s.id === firstId);
    if (idx !== -1 && idx < slices.length - 1) {
      mergeSlices(firstId, slices[idx + 1].id);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectSlice(null);
        }
      }}
      className="relative w-full h-44 bg-timeline-slice/60 border border-border/60 rounded-md overflow-hidden my-1.5 cursor-default"
    >
      <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-muted-foreground uppercase tracking-wider pointer-events-none">
        Narration Slices ({slices.length})
      </div>

      <div
        className="relative h-full"
        style={{ width: totalWidth }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            selectSlice(null);
          }
        }}
      >
        {slices.map((slice, index) => {
          const isActive = currentTime >= slice.start && currentTime < slice.end;
          const isSelected = selectedSliceId === slice.id;

          return (
            <SliceCard
              key={slice.id}
              slice={slice}
              index={index}
              zoom={zoom}
              isActive={isActive}
              isSelected={isSelected}
              onSelect={() => {
                selectSlice(slice.id);
                onSeek(slice.start);
              }}
              onSplit={(time) => handleSplit(slice.id, time)}
              onMerge={() => handleMerge(slice.id)}
              onDelete={() => deleteSlice(slice.id)}
              onRemoveVisual={() => removeVisualFromSlice(slice.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
