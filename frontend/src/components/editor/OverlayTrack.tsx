import React, { useRef, useMemo } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { getMediaUrl } from "../../services/api";
import { Sparkles, Plus, Trash2, Move, Layers } from "lucide-react";
import type { TimelineOverlay } from "../../types/overlay";

interface OverlayTrackProps {
  zoom: number; // pixelsPerSecond
  totalWidth: number;
  onOpenOverlaysModal: () => void;
}

const LANE_START_TOP = 28;
const LANE_HEIGHT = 36;
const LANE_GAP = 4;
const LANE_PITCH = LANE_HEIGHT + LANE_GAP; // 40px

/**
 * Computes non-overlapping lane assignments for overlays.
 * Honors preferred `item.lane` when possible, resolving any overlap collisions onto higher lanes.
 */
function computeOverlayLanes(overlays: TimelineOverlay[]): {
  laneMap: Record<string, number>;
  totalLanes: number;
} {
  if (overlays.length === 0) return { laneMap: {}, totalLanes: 1 };

  // Sort by start time, breaking ties by id
  const sorted = [...overlays].sort((a, b) => {
    if (Math.abs(a.start - b.start) > 0.001) return a.start - b.start;
    return a.id.localeCompare(b.id);
  });

  const laneMap: Record<string, number> = {};
  const laneIntervals: Array<Array<{ start: number; end: number }>> = [];

  for (const item of sorted) {
    const prefLane = typeof item.lane === "number" && item.lane >= 0 ? item.lane : null;
    let chosenLane = -1;

    // Check if preferred lane is free of time overlap
    if (prefLane !== null) {
      const intervals = laneIntervals[prefLane] || [];
      const hasCollision = intervals.some(
        (iv) => !(item.end <= iv.start + 0.05 || item.start >= iv.end - 0.05)
      );
      if (!hasCollision) {
        chosenLane = prefLane;
      }
    }

    // If preferred lane was taken or not set, find lowest available lane
    if (chosenLane === -1) {
      let l = 0;
      while (true) {
        const intervals = laneIntervals[l] || [];
        const hasCollision = intervals.some(
          (iv) => !(item.end <= iv.start + 0.05 || item.start >= iv.end - 0.05)
        );
        if (!hasCollision) {
          chosenLane = l;
          break;
        }
        l++;
      }
    }

    while (laneIntervals.length <= chosenLane) {
      laneIntervals.push([]);
    }
    laneIntervals[chosenLane].push({ start: item.start, end: item.end });
    laneMap[item.id] = chosenLane;
  }

  const maxLane = Math.max(0, ...Object.values(laneMap));
  return { laneMap, totalLanes: Math.max(1, maxLane + 1) };
}

export const OverlayTrack: React.FC<OverlayTrackProps> = ({
  zoom,
  totalWidth,
  onOpenOverlaysModal,
}) => {
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const selectedOverlayId = useEditorStore((s) => s.selectedOverlayId);
  const selectOverlay = useEditorStore((s) => s.selectOverlay);
  const updateTimelineOverlay = useEditorStore((s) => s.updateTimelineOverlay);
  const removeTimelineOverlay = useEditorStore((s) => s.removeTimelineOverlay);
  const beginBatch = useEditorStore((s) => s.beginBatch);
  const endBatch = useEditorStore((s) => s.endBatch);

  const overlays = project?.overlays || [];

  // Compute lane assignments and total lanes dynamically
  const { laneMap, totalLanes } = useMemo(() => {
    return computeOverlayLanes(overlays);
  }, [overlays]);

  const trackRef = useRef<HTMLDivElement | null>(null);

  // Dragging state
  const draggingRef = useRef<{
    id: string;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    startY: number;
    initialStart: number;
    initialEnd: number;
    initialLane: number;
  } | null>(null);

  const handleMouseDown = (
    e: React.MouseEvent,
    overlay: TimelineOverlay,
    type: "move" | "resize-left" | "resize-right"
  ) => {
    e.stopPropagation();
    selectOverlay(overlay.id);
    beginBatch();

    draggingRef.current = {
      id: overlay.id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialStart: overlay.start,
      initialEnd: overlay.end,
      initialLane: laneMap[overlay.id] ?? overlay.lane ?? 0,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingRef.current) return;
      const { id, type: dragType, startX, startY, initialStart, initialEnd, initialLane } =
        draggingRef.current;
      const deltaSeconds = (moveEvent.clientX - startX) / zoom;
      const minDur = 0.2;
      const maxDur = duration || 9999;

      if (dragType === "move") {
        const clipDur = initialEnd - initialStart;
        let newStart = Math.max(0, initialStart + deltaSeconds);
        if (newStart + clipDur > maxDur) {
          newStart = Math.max(0, maxDur - clipDur);
        }

        // Support vertical drag to switch/expand lanes
        const deltaY = moveEvent.clientY - startY;
        const laneStep = Math.round(deltaY / LANE_PITCH);
        const targetLane = Math.max(0, initialLane + laneStep);

        updateTimelineOverlay(
          id,
          {
            start: Math.round(newStart * 100) / 100,
            end: Math.round((newStart + clipDur) * 100) / 100,
            lane: targetLane,
          },
          true
        );
      } else if (dragType === "resize-left") {
        let newStart = Math.max(0, Math.min(initialStart + deltaSeconds, initialEnd - minDur));
        updateTimelineOverlay(
          id,
          {
            start: Math.round(newStart * 100) / 100,
          },
          true
        );
      } else if (dragType === "resize-right") {
        let newEnd = Math.max(initialStart + minDur, Math.min(initialEnd + deltaSeconds, maxDur));
        updateTimelineOverlay(
          id,
          {
            end: Math.round(newEnd * 100) / 100,
          },
          true
        );
      }
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

  // Dynamic track height based on number of active lanes
  const trackHeight = Math.max(68, LANE_START_TOP + totalLanes * LANE_PITCH + 6);

  return (
    <div
      ref={trackRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectOverlay(null);
        }
      }}
      style={{
        minHeight: `${trackHeight}px`,
        height: `${trackHeight}px`,
        transition: "height 0.15s ease-out, min-height 0.15s ease-out",
      }}
      className="relative w-full my-1 rounded-md border border-pink-500/25 bg-gradient-to-r from-pink-950/20 via-surface-elevated/40 to-pink-950/10 select-none overflow-hidden group/track"
    >
      {/* Track Label Badge & Add Button */}
      <div className="absolute top-1.5 left-2 z-30 flex items-center gap-1.5 pointer-events-auto">
        <div className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-pink-400 border border-pink-500/30 flex items-center gap-1 shadow-xs">
          <Sparkles className="w-2.5 h-2.5" />
          <span>OVERLAYS & ANIMATIONS ({overlays.length})</span>
          {totalLanes > 1 && (
            <span className="ml-1 px-1 rounded bg-pink-500/20 text-pink-300 text-[9px]">
              {totalLanes} LANES
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenOverlaysModal}
          className="px-1.5 py-0.5 rounded bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer border border-pink-500/30"
          title="Open global overlays library to place visual elements"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Add Overlay</span>
        </button>
      </div>

      {/* Empty State Banner if 0 overlays */}
      {overlays.length === 0 && (
        <div
          onClick={onOpenOverlaysModal}
          className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-pink-500/5 transition-colors z-10"
        >
          <span className="text-[11px] font-medium text-muted-foreground/60 flex items-center gap-1.5 hover:text-pink-400 transition-colors">
            <Plus className="w-3 h-3" />
            <span>Click to add animating arrows, lines, callouts or GIFs to secondary timeline</span>
          </span>
        </div>
      )}

      {/* Horizontal Lane Background Guides (shows lanes clearly when stacked) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: totalLanes }).map((_, laneIdx) => {
          const laneTop = LANE_START_TOP + laneIdx * LANE_PITCH;
          return (
            <div
              key={laneIdx}
              style={{
                top: `${laneTop}px`,
                height: `${LANE_HEIGHT}px`,
              }}
              className="absolute inset-x-0 border-b border-pink-500/10 flex items-center px-2"
            >
              {totalLanes > 1 && (
                <span className="text-[8px] font-mono text-pink-400/40 select-none">
                  L{laneIdx + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Overlays track timeline canvas */}
      <div
        className="relative h-full"
        style={{ width: totalWidth }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            selectOverlay(null);
          }
        }}
      >
        {overlays.map((item) => {
          const left = item.start * zoom;
          const width = Math.max(30, (item.end - item.start) * zoom);
          const isSelected = selectedOverlayId === item.id;
          const isActive = currentTime >= item.start && currentTime <= item.end;
          const isGif = item.url.toLowerCase().endsWith(".gif");
          const lane = laneMap[item.id] ?? item.lane ?? 0;
          const clipTop = LANE_START_TOP + lane * LANE_PITCH;

          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                selectOverlay(item.id);
              }}
              onMouseDown={(e) => handleMouseDown(e, item, "move")}
              style={{
                left: `${left}px`,
                width: `${width}px`,
                top: `${clipTop}px`,
                height: `${LANE_HEIGHT}px`,
                zIndex: isSelected ? 25 : 15 + lane,
              }}
              className={`absolute rounded-md border flex items-center justify-between px-2 cursor-grab active:cursor-grabbing transition-all select-none ${
                isSelected
                  ? "bg-pink-500/35 border-pink-400 ring-2 ring-pink-500/60 shadow-md"
                  : isActive
                  ? "bg-pink-900/45 border-pink-500/60 shadow-xs"
                  : "bg-surface-elevated/95 border-pink-500/35 hover:border-pink-500/60 hover:bg-surface-elevated"
              }`}
            >
              {/* Left Resize Handle */}
              <div
                onMouseDown={(e) => handleMouseDown(e, item, "resize-left")}
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-pink-400/50 rounded-l flex items-center justify-center z-20 group/handle"
                title="Drag to trim start time"
              >
                <div className="w-0.5 h-3 rounded-full bg-pink-400/60 group-hover/handle:bg-pink-400" />
              </div>

              {/* Clip Content: Thumbnail + Title + Animation badge */}
              <div className="flex items-center gap-1.5 overflow-hidden pl-1 pr-1 pointer-events-none">
                <div className="w-6 h-6 rounded bg-black/60 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden p-0.5">
                  <img
                    src={getMediaUrl(item.url)}
                    alt=""
                    className="max-w-full max-h-full object-contain filter drop-shadow-xs"
                  />
                </div>

                <div className="flex flex-col overflow-hidden">
                  <span className="text-[10px] font-semibold text-foreground truncate">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-mono text-pink-300">
                      {(item.end - item.start).toFixed(1)}s
                    </span>
                    {totalLanes > 1 && (
                      <span className="text-[8px] font-mono text-pink-400 font-semibold px-0.5 rounded bg-pink-500/20">
                        L{lane + 1}
                      </span>
                    )}
                    {item.animation && item.animation !== "none" && (
                      <span className="text-[8px] font-mono text-muted-foreground uppercase px-1 rounded bg-black/40">
                        {item.animation}
                      </span>
                    )}
                    {isGif && (
                      <span className="text-[8px] font-mono text-amber-400 font-bold">GIF</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Delete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTimelineOverlay(item.id);
                }}
                className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger/20 transition-colors cursor-pointer pointer-events-auto opacity-0 group-hover/track:opacity-100"
                title="Remove overlay from timeline"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              {/* Right Resize Handle */}
              <div
                onMouseDown={(e) => handleMouseDown(e, item, "resize-right")}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-pink-400/50 rounded-r flex items-center justify-center z-20 group/handle"
                title="Drag to trim duration / end time"
              >
                <div className="w-0.5 h-3 rounded-full bg-pink-400/60 group-hover/handle:bg-pink-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
