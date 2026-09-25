import React, { useRef, useCallback } from "react";
import { timeToPixels, pixelsToTime } from "../../lib/timeline";

interface PlayheadProps {
  currentTime: number;
  zoom: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const Playhead: React.FC<PlayheadProps> = ({
  currentTime,
  zoom,
  duration,
  onSeek,
}) => {
  const isDraggingRef = useRef(false);
  const leftPx = timeToPixels(currentTime, zoom);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const timelineContainer = document.getElementById("timeline-scroll-container");
      if (!timelineContainer) return;
      const rect = timelineContainer.getBoundingClientRect();
      const scrollLeft = timelineContainer.scrollLeft;
      const x = moveEvent.clientX - rect.left + scrollLeft;
      const targetTime = pixelsToTime(x, zoom);
      onSeek(Math.max(0, Math.min(targetTime, duration || 9999)));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      style={{ left: leftPx }}
      className="absolute top-0 bottom-0 z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center"
    >
      {/* Draggable Playhead Scrubber Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="pointer-events-auto cursor-ew-resize w-3.5 h-4 bg-playhead rounded-b-xs shadow-md flex items-center justify-center -translate-y-0.5"
      >
        <div className="w-1 h-2 bg-white/60 rounded-full" />
      </div>

      {/* Vertical Red Line */}
      <div className="w-[1.5px] flex-1 bg-playhead shadow-xs" />
    </div>
  );
};
