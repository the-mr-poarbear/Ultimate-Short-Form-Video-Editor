import React from "react";
import { formatTime } from "../../lib/formatting";
import { timeToPixels, pixelsToTime } from "../../lib/timeline";

interface TimelineRulerProps {
  duration: number;
  zoom: number;
  totalWidth: number;
  onSeek: (time: number) => void;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  duration,
  zoom,
  totalWidth,
  onSeek,
}) => {
  const maxTime = Math.max(duration, 10);
  const totalSeconds = Math.ceil(maxTime);

  // Interval between ticks based on zoom
  const step = zoom > 120 ? 1 : zoom > 50 ? 2 : 5;

  const ticks = [];
  for (let sec = 0; sec <= totalSeconds; sec += step) {
    const x = timeToPixels(sec, zoom);
    ticks.push({
      sec,
      x,
      label: formatTime(sec, false),
    });
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetTime = pixelsToTime(clickX, zoom);
    onSeek(Math.max(0, Math.min(targetTime, maxTime)));
  };

  return (
    <div
      onClick={handleClick}
      style={{ width: totalWidth }}
      className="relative h-6 bg-surface border-b border-border select-none cursor-pointer flex items-end"
    >
      {ticks.map((tick) => (
        <div
          key={tick.sec}
          style={{ left: tick.x }}
          className="absolute bottom-0 flex flex-col items-start pointer-events-none"
        >
          <span className="text-[9px] font-mono text-muted-foreground/80 pl-1 leading-none mb-1">
            {tick.label}
          </span>
          <div className="w-[1px] h-2 bg-border-subtle" />
        </div>
      ))}
    </div>
  );
};
