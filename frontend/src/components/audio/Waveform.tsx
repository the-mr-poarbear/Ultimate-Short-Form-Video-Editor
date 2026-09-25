import React, { useRef, useEffect, useCallback } from "react";
import { timeToPixels, pixelsToTime } from "../../lib/timeline";

interface SilenceRegion {
  start: number;
  end: number;
}

interface WaveformProps {
  peaks: number[];
  duration: number;
  currentTime: number;
  zoom: number; // pixelsPerSecond
  height?: number;
  silenceRegions?: SilenceRegion[];
  onSeek?: (time: number) => void;
  className?: string;
}

export const Waveform: React.FC<WaveformProps> = ({
  peaks,
  duration,
  currentTime,
  zoom,
  height = 56,
  silenceRegions = [],
  onSeek,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalWidth = Math.max(800, timeToPixels(duration || 10, zoom));

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, totalWidth, height);

    // Background
    ctx.fillStyle = "#121824";
    ctx.fillRect(0, 0, totalWidth, height);

    // Draw silence zones
    if (duration > 0 && silenceRegions.length > 0) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
      for (const region of silenceRegions) {
        const x1 = timeToPixels(region.start, zoom);
        const x2 = timeToPixels(region.end, zoom);
        ctx.fillRect(x1, 0, Math.max(x2 - x1, 2), height);
      }
    }

    // Midline
    const midY = height / 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(totalWidth, midY);
    ctx.stroke();

    // Draw audio peaks
    if (peaks && peaks.length > 0 && duration > 0) {
      const currentPx = timeToPixels(currentTime, zoom);
      const barWidth = 2;
      const barGap = 1;
      const totalBars = Math.floor(totalWidth / (barWidth + barGap));

      for (let i = 0; i < totalBars; i++) {
        const x = i * (barWidth + barGap);
        // Map bar x position to peak index
        const peakIdx = Math.floor((i / totalBars) * peaks.length);
        const peakVal = peaks[peakIdx] || 0.05;
        const barHeight = Math.max(2, peakVal * (height - 10));

        // Color bars played vs unplayed
        if (x <= currentPx) {
          ctx.fillStyle = "#3b82f6"; // Primary blue for played portion
        } else {
          ctx.fillStyle = "#3e4c63"; // Muted slate for unplayed portion
        }

        ctx.fillRect(x, midY - barHeight / 2, barWidth, barHeight);
      }
    } else {
      // Placeholder gentle wave if peaks not yet calculated
      ctx.fillStyle = "#2d3748";
      for (let x = 0; x < totalWidth; x += 4) {
        const dummyPeak = 0.2 + 0.15 * Math.sin(x / 20);
        const bh = dummyPeak * (height - 12);
        ctx.fillRect(x, midY - bh / 2, 2, bh);
      }
    }
  }, [peaks, duration, currentTime, zoom, totalWidth, height, silenceRegions]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetTime = pixelsToTime(clickX, zoom);
    onSeek(Math.max(0, Math.min(targetTime, duration)));
  };

  return (
    <div className={className} style={{ width: totalWidth, height }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ width: totalWidth, height }}
        className="cursor-pointer block rounded"
      />
    </div>
  );
};
