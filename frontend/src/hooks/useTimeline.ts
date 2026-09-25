import { useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import { timeToPixels, pixelsToTime } from "../lib/timeline";

export function useTimeline() {
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const duration = useEditorStore((s) => s.duration);

  const getPixels = useCallback((time: number) => timeToPixels(time, zoom), [zoom]);
  const getTime = useCallback((pixels: number) => pixelsToTime(pixels, zoom), [zoom]);

  const totalWidth = Math.max(800, timeToPixels(duration || 10, zoom) + 120);

  const zoomIn = () => setZoom(Math.min(zoom * 1.25, 300));
  const zoomOut = () => setZoom(Math.max(zoom / 1.25, 20));
  const resetZoom = () => setZoom(80);

  return {
    zoom,
    setZoom,
    getPixels,
    getTime,
    totalWidth,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
