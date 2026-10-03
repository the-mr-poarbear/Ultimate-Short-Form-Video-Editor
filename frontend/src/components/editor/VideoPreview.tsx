import React, { useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useCharacterStore } from "../../stores/characterStore";
import { getMediaUrl } from "../../services/api";
import { CaptionPreview } from "../captions/CaptionPreview";
import { Move, Maximize2, RotateCw } from "lucide-react";
import type { Slice, TimelineOverlay } from "../../types/project";
import type { MediaAsset } from "../../types/media";

interface VideoPreviewProps {
  currentTime: number;
  isPlaying: boolean;
}

type ResizeHandle = "right" | "left" | "top" | "bottom" | "br" | "bl" | "tr" | "tl";

interface SliceVisualItemProps {
  slice: Slice;
  asset: MediaAsset;
  currentTime: number;
  isPlaying: boolean;
  zIndex: number;
  isInteractive: boolean;
  isSliceSettingsOpen?: boolean;
  effectiveDuration: number;
  onWindowMouseDown?: (e: React.MouseEvent) => void;
  onResizeMouseDown?: (e: React.MouseEvent, handle: ResizeHandle) => void;
  onRotateMouseDown?: (e: React.MouseEvent) => void;
  onFullscreenMouseDown?: (e: React.MouseEvent) => void;
  onWheelZoom?: (e: React.WheelEvent) => void;
}

const SliceVisualItem: React.FC<SliceVisualItemProps> = ({
  slice,
  asset,
  currentTime,
  isPlaying,
  zIndex,
  isInteractive,
  isSliceSettingsOpen,
  effectiveDuration,
  onWindowMouseDown,
  onResizeMouseDown,
  onRotateMouseDown,
  onFullscreenMouseDown,
  onWheelZoom,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const visual = slice.visual;
  const rotation = visual?.rotation ?? 0;
  const speed = visual?.speed && visual.speed > 0 ? visual.speed : 1.0;
  const isSeekingRef = useRef<boolean>(false);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safe seek executor: ensures at most ONE seek is in-flight at any time
  const requestSeek = useCallback((targetTime: number) => {
    const vid = videoRef.current;
    if (!vid || !vid.duration || !isFinite(vid.duration) || vid.duration <= 0) return;
    if (!isFinite(targetTime) || isNaN(targetTime)) return;

    // Clamp within valid boundaries (keep small safety margin before end)
    const clampedTime = Math.max(0, Math.min(Math.max(0, vid.duration - 0.05), targetTime));

    if (isSeekingRef.current || vid.seeking) {
      pendingSeekTimeRef.current = clampedTime;
      return;
    }

    if (Math.abs(vid.currentTime - clampedTime) < 0.03) {
      return;
    }

    isSeekingRef.current = true;
    try {
      vid.currentTime = clampedTime;
    } catch {
      isSeekingRef.current = false;
    }

    // Safety watchdog: in case browser doesn't fire seeked event within 250ms
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
      if (pendingSeekTimeRef.current !== null) {
        const next = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
        requestSeek(next);
      }
    }, 250);
  }, []);

  const handleSeeked = useCallback(() => {
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    isSeekingRef.current = false;
    const vid = videoRef.current;

    if (pendingSeekTimeRef.current !== null) {
      const nextTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      requestSeek(nextTime);
    } else if (isPlaying && vid && vid.paused) {
      vid.play().catch(() => {});
    }
  }, [isPlaying, requestSeek]);

  // Ensure video is strictly muted
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
    }
  }, [asset?.id]);

  // Sync playback rate with speed modifier
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || asset?.type !== "video") return;
    try {
      if (vid.playbackRate !== speed) {
        vid.playbackRate = speed;
      }
    } catch {}
  }, [speed, asset?.id]);

  // Initial sync if video metadata is already loaded from cache on mount
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || asset?.type !== "video") return;
    vid.muted = true;
    vid.defaultMuted = true;
    try {
      if (vid.playbackRate !== speed) {
        vid.playbackRate = speed;
      }
    } catch {}
    if (vid.readyState >= 1 && vid.duration && isFinite(vid.duration)) {
      if (asset?.id && (!asset.duration || asset.duration <= 0)) {
        useEditorStore.getState().updateMediaAssetDuration(asset.id, vid.duration);
      }
      const mediaStart = visual?.mediaStart || 0.0;
      const sliceOffset = Math.max(0, currentTime - slice.start);
      const targetTime = (mediaStart + sliceOffset * speed) % vid.duration;
      requestSeek(targetTime);
      if (isPlaying && vid.paused) {
        vid.play().catch(() => {});
      }
    }
  }, [asset?.id, isPlaying, slice.start, visual?.mediaStart, speed, requestSeek]);

  // Sync play / pause
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || asset?.type !== "video") return;
    if (isPlaying) {
      if (vid.paused && !isSeekingRef.current && !vid.seeking) {
        vid.play().catch(() => {});
      }
    } else {
      if (!vid.paused) vid.pause();
    }
  }, [isPlaying, asset?.id, slice.id]);

  // Sync video time offset
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || asset?.type !== "video" || !vid.duration || !isFinite(vid.duration)) return;

    try {
      if (vid.playbackRate !== speed) {
        vid.playbackRate = speed;
      }
    } catch {}

    const mediaStart = visual?.mediaStart || 0.0;
    const sliceOffset = Math.max(0, currentTime - slice.start);
    const targetTime = (mediaStart + sliceOffset * speed) % vid.duration;

    if (!isFinite(targetTime) || isNaN(targetTime)) return;

    if (!isPlaying) {
      requestSeek(targetTime);
    } else {
      if (Math.abs(vid.currentTime - targetTime) > 0.8) {
        requestSeek(targetTime);
      }
      if (vid.paused && !vid.seeking && !isSeekingRef.current) {
        vid.play().catch(() => {});
      }
    }
  }, [currentTime, isPlaying, slice.id, asset?.id, visual?.mediaStart, speed, requestSeek]);

  const handleLoaded = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const vid = e.currentTarget;
      if (!vid || !vid.duration || !isFinite(vid.duration)) return;
      vid.muted = true;
      vid.defaultMuted = true;
      try {
        if (vid.playbackRate !== speed) {
          vid.playbackRate = speed;
        }
      } catch {}
      if (asset?.id && (!asset.duration || asset.duration <= 0)) {
        useEditorStore.getState().updateMediaAssetDuration(asset.id, vid.duration);
      }
      const mediaStart = visual?.mediaStart || 0.0;
      const sliceOffset = Math.max(0, currentTime - slice.start);
      const targetTime = (mediaStart + sliceOffset * speed) % vid.duration;
      requestSeek(targetTime);
      if (isPlaying && vid.paused) {
        vid.play().catch(() => {});
      }
    },
    [asset?.id, asset?.duration, slice.start, visual?.mediaStart, speed, currentTime, isPlaying, requestSeek]
  );

  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    };
  }, []);

  const transition = visual?.transition || "none";
  const sliceOffset = Math.max(0, currentTime - slice.start);
  const progress = Math.max(0, Math.min(1, sliceOffset / effectiveDuration));

  const layoutStyle = visual?.layoutStyle || "fullscreen";
  const positionX = visual?.positionX ?? 50;
  const positionY = visual?.positionY ?? 50;
  const width = visual?.width ?? 75;
  const height = visual?.height ?? (asset?.type === "video" ? 25 : 39);
  const zoom = visual?.zoom ?? 1.0;
  const cropX = visual?.cropX ?? 0;
  const cropY = visual?.cropY ?? 0;
  const panCoverage = (visual?.panCoverage ?? 100) / 100.0;
  const borderRadius = visual?.borderRadius ?? 16;
  const borderWidth = visual?.borderWidth ?? 0;
  const borderColor = visual?.borderColor ?? "#ffffff";
  const shadow = visual?.shadow ?? true;

  let currentObjX = 50 + cropX;
  let currentObjY = 50 + cropY;
  const isPan =
    transition === "pan-right" ||
    transition === "pan-left" ||
    transition === "pan-down" ||
    transition === "pan-up";

  if (transition === "pan-right") {
    currentObjX = 0 + progress * (100 * panCoverage);
  } else if (transition === "pan-left") {
    currentObjX = 100 - progress * (100 * panCoverage);
  } else if (transition === "pan-down") {
    currentObjY = 0 + progress * (100 * panCoverage);
  } else if (transition === "pan-up") {
    currentObjY = 100 - progress * (100 * panCoverage);
  }
  currentObjX = Math.max(0, Math.min(100, currentObjX));
  currentObjY = Math.max(0, Math.min(100, currentObjY));

  const effectiveZoom = isPan ? Math.max(1.25, zoom) : zoom;

  let transitionStyle: React.CSSProperties = {};
  if (transition === "zoom-in") {
    transitionStyle = {
      animation: `kenBurnsZoomIn ${effectiveDuration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
      animationPlayState: isPlaying ? "running" : "paused",
      animationDelay: `-${sliceOffset.toFixed(2)}s`,
      willChange: "transform",
    };
  } else if (transition === "zoom-out") {
    transitionStyle = {
      animation: `kenBurnsZoomOut ${effectiveDuration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
      animationPlayState: isPlaying ? "running" : "paused",
      animationDelay: `-${sliceOffset.toFixed(2)}s`,
      willChange: "transform",
    };
  } else if (transition === "fade") {
    transitionStyle = {
      animation: "sliceFadeIn 0.35s ease-out forwards",
      willChange: "opacity",
    };
  }

  if (layoutStyle === "window") {
    const isFade = transition === "fade";
    const isZoom = transition === "zoom-in" || transition === "zoom-out";

    return (
      <div
        onWheel={isInteractive ? onWheelZoom : undefined}
        style={{
          position: "absolute",
          left: `${positionX}%`,
          top: `${positionY}%`,
          width: `${width}%`,
          height: `${height}%`,
          transform: rotation ? `translate(-50%, -50%) rotate(${rotation}deg)` : "translate(-50%, -50%)",
          transformOrigin: "center center",
          borderRadius: `${borderRadius}px`,
          border:
            borderWidth > 0
              ? `${borderWidth}px solid ${borderColor}`
              : isInteractive && isSliceSettingsOpen
              ? "2px solid #00f0ff"
              : "none",
          boxShadow: shadow
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.15)"
            : "none",
          zIndex,
          ...(isFade ? transitionStyle : {}),
        }}
        className={`overflow-visible select-none ${
          !isInteractive ? "pointer-events-none" : ""
        } ${isInteractive && isSliceSettingsOpen ? "ring-2 ring-cyan-400/50 shadow-cyan-400/20 group" : ""}`}
      >
        <div
          onMouseDown={isInteractive ? onWindowMouseDown : undefined}
          style={{
            borderRadius: `${Math.max(0, borderRadius - borderWidth)}px`,
            overflow: "hidden",
            cursor: isInteractive && isSliceSettingsOpen ? "move" : "default",
            ...(isZoom ? transitionStyle : {}),
          }}
          className="w-full h-full relative"
        >
          {asset.type === "image" ? (
            <img
              src={getMediaUrl(asset.url)}
              alt={asset.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: visual?.fit === "contain" ? "contain" : "cover",
                objectPosition: `${currentObjX}% ${currentObjY}%`,
                transform: `scale(${effectiveZoom})`,
                transformOrigin: `${currentObjX}% ${currentObjY}%`,
              }}
              className="pointer-events-none select-none transition-transform duration-75"
            />
          ) : (
            <video
              ref={videoRef}
              src={getMediaUrl(asset.url)}
              muted
              loop
              playsInline
              autoPlay={isPlaying}
              preload="metadata"
              onLoadedMetadata={handleLoaded}
              onCanPlay={handleLoaded}
              onLoadedData={handleLoaded}
              onSeeked={handleSeeked}
              onError={() => {
                const vid = videoRef.current;
                if (vid) { try { vid.load(); } catch {} }
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: visual?.fit === "contain" ? "contain" : "cover",
                objectPosition: `${currentObjX}% ${currentObjY}%`,
                transform: `scale(${effectiveZoom})`,
                transformOrigin: `${currentObjX}% ${currentObjY}%`,
              }}
              className="pointer-events-none select-none transition-transform duration-75"
            />
          )}

          {isInteractive && isSliceSettingsOpen && (
            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="px-2 py-1 rounded bg-black/80 text-[10px] text-white font-medium flex items-center gap-1 shadow-lg">
                <Move className="w-3 h-3 text-cyan-400" />
                <span>Drag to move • Scroll to zoom</span>
              </div>
            </div>
          )}
        </div>

        {isInteractive && isSliceSettingsOpen && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 text-cyan-400 border border-cyan-400/40 text-[9px] font-mono px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-30 flex items-center gap-1">
            <span>{Math.round(width)}% × {Math.round(height)}%</span>
            <span className="text-muted-foreground">•</span>
            <span>{((width / height) * (1080 / 1920)).toFixed(2)}:1</span>
            {Math.round(rotation) !== 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-cyan-300 font-bold">{Math.round(rotation)}°</span>
              </>
            )}
            {asset.type === "video" && Math.abs(speed - 1.0) > 0.01 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-indigo-300 font-bold">{speed.toFixed(2)}x</span>
              </>
            )}
          </div>
        )}

        {isInteractive && isSliceSettingsOpen && (
          <div
            onMouseDown={onRotateMouseDown}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-40 group/rot select-none"
            title="Drag to rotate slice window (Hold Shift to snap to 15°)"
          >
            <div className="w-5 h-5 rounded-full bg-cyan-500 border border-white text-black shadow-lg flex items-center justify-center hover:scale-125 transition-transform">
              <RotateCw className="w-3 h-3 group-hover/rot:rotate-45 transition-transform" />
            </div>
            <div className="w-0.5 h-6 bg-cyan-400/80" />
          </div>
        )}

        {isInteractive && isSliceSettingsOpen && (
          <>
            <div
              onMouseDown={(e) => onResizeMouseDown?.(e, "right")}
              className="absolute -right-2 top-2 bottom-2 w-4 cursor-ew-resize flex items-center justify-center z-30 group/edge"
              title="Drag side to change width / aspect ratio"
            >
              <div className="w-1.5 h-7 rounded-full bg-cyan-400 shadow-md group-hover/edge:scale-125 transition-transform" />
            </div>
            <div
              onMouseDown={(e) => onResizeMouseDown?.(e, "left")}
              className="absolute -left-2 top-2 bottom-2 w-4 cursor-ew-resize flex items-center justify-center z-30 group/edge"
              title="Drag side to change width / aspect ratio"
            >
              <div className="w-1.5 h-7 rounded-full bg-cyan-400 shadow-md group-hover/edge:scale-125 transition-transform" />
            </div>
            <div
              onMouseDown={(e) => onResizeMouseDown?.(e, "top")}
              className="absolute -top-2 left-2 right-2 h-4 cursor-ns-resize flex items-center justify-center z-30 group/edge"
              title="Drag edge to change height / aspect ratio"
            >
              <div className="h-1.5 w-7 rounded-full bg-cyan-400 shadow-md group-hover/edge:scale-125 transition-transform" />
            </div>
            <div
              onMouseDown={(e) => onResizeMouseDown?.(e, "bottom")}
              className="absolute -bottom-2 left-2 right-2 h-4 cursor-ns-resize flex items-center justify-center z-30 group/edge"
              title="Drag edge to change height / aspect ratio"
            >
              <div className="h-1.5 w-7 rounded-full bg-cyan-400 shadow-md group-hover/edge:scale-125 transition-transform" />
            </div>
            <div
              onMouseDown={(e) => onResizeMouseDown?.(e, "tl")}
              className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full cursor-nwse-resize z-40 shadow-lg hover:scale-125 transition-transform"
              title="Resize corner"
            />
            <div
              onMouseDown={(e) => onResizeMouseDown?.(e, "tr")}
              className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full cursor-nesw-resize z-40 shadow-lg hover:scale-125 transition-transform"
              title="Resize corner"
            />
            <div
              onMouseDown={(e) => onResizeMouseDown?.(e, "bl")}
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full cursor-nesw-resize z-40 shadow-lg hover:scale-125 transition-transform"
              title="Resize corner"
            />
            <div
              onMouseDown={(e) => onResizeMouseDown?.(e, "br")}
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full cursor-nwse-resize z-40 shadow-lg hover:scale-125 transition-transform"
              title="Resize corner"
            />
          </>
        )}
      </div>
    );
  }

  // Fullscreen layout
  const isFade = transition === "fade";
  const isZoom = transition === "zoom-in" || transition === "zoom-out";

  return (
    <div
      onMouseDown={isInteractive ? onFullscreenMouseDown : undefined}
      onWheel={isInteractive ? onWheelZoom : undefined}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex,
        ...(isFade ? transitionStyle : {}),
      }}
      className={`flex items-center justify-center select-none ${
        !isInteractive ? "pointer-events-none" : ""
      } ${isInteractive && isSliceSettingsOpen ? "cursor-move" : ""}`}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: "center center",
          ...(isZoom ? transitionStyle : {}),
        }}
        className="w-full h-full flex items-center justify-center"
      >
        {asset.type === "image" ? (
          <img
            src={getMediaUrl(asset.url)}
            alt={asset.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: visual?.fit === "contain" ? "contain" : "cover",
              objectPosition: `${currentObjX}% ${currentObjY}%`,
              transform: `scale(${effectiveZoom})`,
              transformOrigin: `${currentObjX}% ${currentObjY}%`,
            }}
            className="pointer-events-none select-none transition-transform duration-75"
          />
        ) : (
          <video
            ref={videoRef}
            src={getMediaUrl(asset.url)}
            muted
            loop
            playsInline
            autoPlay={isPlaying}
            preload="metadata"
            onLoadedMetadata={handleLoaded}
            onCanPlay={handleLoaded}
            onLoadedData={handleLoaded}
            onSeeked={handleSeeked}
            onError={() => {
              const vid = videoRef.current;
              if (vid) { try { vid.load(); } catch {} }
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: visual?.fit === "contain" ? "contain" : "cover",
              objectPosition: `${currentObjX}% ${currentObjY}%`,
              transform: `scale(${effectiveZoom})`,
              transformOrigin: `${currentObjX}% ${currentObjY}%`,
            }}
            className="pointer-events-none select-none transition-transform duration-75"
          />
        )}
      </div>

      {isInteractive && isSliceSettingsOpen && (
        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs border border-primary/40 px-2.5 py-1 rounded text-[10px] text-primary flex items-center gap-1.5 pointer-events-none shadow-lg z-20">
          <Maximize2 className="w-3 h-3 text-cyan-400" />
          <span>
            Full Screen • Drag to pan subject ({Math.round(cropX)}%, {Math.round(cropY)}%) • Scroll to zoom
            {Math.round(rotation) !== 0 && ` • Rotation: ${Math.round(rotation)}°`}
            {asset.type === "video" && Math.abs(speed - 1.0) > 0.01 && ` • Speed: ${speed.toFixed(2)}x`}
          </span>
        </div>
      )}
    </div>
  );
};

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  currentTime,
  isPlaying,
}) => {
  const project = useEditorStore((s) => s.project);
  const selectedSliceId = useEditorStore((s) => s.selectedSliceId);
  const isSliceSettingsOpen = useEditorStore((s) => s.isSliceSettingsOpen);
  const updateSliceVisual = useEditorStore((s) => s.updateSliceVisual);
  const updateSliceCharacter = useEditorStore((s) => s.updateSliceCharacter);
  const selectSlice = useEditorStore((s) => s.selectSlice);
  const setSliceSettingsOpen = useEditorStore((s) => s.setSliceSettingsOpen);
  const selectedOverlayId = useEditorStore((s) => s.selectedOverlayId);
  const selectOverlay = useEditorStore((s) => s.selectOverlay);
  const updateTimelineOverlay = useEditorStore((s) => s.updateTimelineOverlay);
  const characters = useCharacterStore((s) => s.characters);

  const outerContainerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  const [frameDimensions, setFrameDimensions] = React.useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  // Dynamic preview scale factor matching the 1080x1920 canvas
  const [previewScale, setPreviewScale] = React.useState<number>(0.28);

  useEffect(() => {
    const outerEl = outerContainerRef.current;
    if (!outerEl) return;

    const updateScaleAndSize = () => {
      const rect = outerEl.getBoundingClientRect();
      // Outer div has p-2 (8px on each side = 16px total)
      const availableW = Math.max(10, rect.width - 16);
      const availableH = Math.max(10, rect.height - 16);

      let targetW: number;
      let targetH: number;

      if (availableW / availableH > 9 / 16) {
        targetH = availableH;
        targetW = targetH * (9 / 16);
      } else {
        targetW = availableW;
        targetH = targetW * (16 / 9);
      }

      const w = Math.round(targetW);
      const h = Math.round(targetH);

      setFrameDimensions({ width: w, height: h });
      if (h > 0) {
        setPreviewScale(h / 1920);
      }
    };

    updateScaleAndSize();
    const observer = new ResizeObserver(updateScaleAndSize);
    observer.observe(outerEl);
    return () => observer.disconnect();
  }, []);

  const backgroundVideoUrl = project?.backgroundVideo;
  const bgAsset = project?.mediaAssets?.find((a) => a.url === backgroundVideoUrl);
  const isBgImage =
    bgAsset?.type === "image" ||
    /\.(jpe?g|png|webp|bmp|gif|svg)(\?.*)?$/i.test(backgroundVideoUrl || "");

  // Sort slices chronologically
  const sortedSlices = React.useMemo(() => {
    return [...(project?.slices || [])].sort((a, b) => a.start - b.start);
  }, [project?.slices]);

  // 1. Find slice at current playhead time
  const currentPlayheadSlice = React.useMemo(() => {
    if (!sortedSlices || sortedSlices.length === 0) return null;
    return (
      sortedSlices.find((s) => currentTime >= s.start && currentTime <= s.end) ||
      null
    );
  }, [sortedSlices, currentTime]);

  // 2. Resolve active slice:
  // - During playback, display the slice at the current playhead time.
  // - When paused, prioritize selected slice (if any) or playhead slice.
  const activeSlice = isPlaying
    ? currentPlayheadSlice
    : (selectedSliceId ? project?.slices.find((s) => s.id === selectedSliceId) : null) ||
      currentPlayheadSlice ||
      null;

  const visual = activeSlice?.visual;
  const assignedAsset = visual?.assetId
    ? project?.mediaAssets.find((a) => a.id === visual.assetId) || null
    : null;

  const activeSliceIndex = activeSlice
    ? sortedSlices.findIndex((s) => s.id === activeSlice.id)
    : -1;
  const nextSlice =
    activeSliceIndex >= 0 && activeSliceIndex < sortedSlices.length - 1
      ? sortedSlices[activeSliceIndex + 1]
      : null;
  const nextAsset = nextSlice?.visual?.assetId
    ? project?.mediaAssets.find((a) => a.id === nextSlice.visual?.assetId)
    : null;

  const sliceDur = activeSlice ? Math.max(activeSlice.end - activeSlice.start, 0.5) : 3;

  // Character overlay data for active slice
  const sliceChar = activeSlice?.character;
  const charData = sliceChar ? characters.find((c) => c.id === sliceChar.characterId) : null;
  const charPose = charData?.poses.find((p) => p.id === sliceChar?.poseId) || charData?.poses[0];
  const charPosX = sliceChar?.positionX ?? 75;
  const charPosY = sliceChar?.positionY ?? 75;
  const charWidth = sliceChar?.width ?? 35;
  const charHeight = sliceChar?.height ?? 40;
  const charFlipX = sliceChar?.flipX ?? false;

  // Ensure characters are loaded if active slice has character assigned
  useEffect(() => {
    if (sliceChar && characters.length === 0) {
      useCharacterStore.getState().fetchCharacters().catch(() => {});
    }
  }, [sliceChar, characters.length]);

  // Sync background video when loaded/playable
  const handleBgVideoLoaded = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const vid = e.currentTarget;
      if (!vid || !vid.duration || !isFinite(vid.duration)) return;
      vid.muted = true;
      vid.defaultMuted = true;
      const targetTime = currentTime % vid.duration;
      if (isFinite(targetTime) && !isNaN(targetTime) && !vid.seeking) {
        try {
          vid.currentTime = targetTime;
        } catch {}
      }
      if (isPlaying && vid.paused) {
        vid.play().catch(() => {});
      }
    },
    [currentTime, isPlaying]
  );

  // Ensure background video is always strictly muted
  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.muted = true;
      bgVideoRef.current.defaultMuted = true;
    }
  }, [backgroundVideoUrl]);

  // Sync background video play/pause
  useEffect(() => {
    const bgVideo = bgVideoRef.current;
    if (!bgVideo) return;

    if (isPlaying) {
      if (bgVideo.paused) {
        bgVideo.play().catch(() => {});
      }
    } else {
      if (!bgVideo.paused) {
        bgVideo.pause();
      }
    }
  }, [isPlaying, backgroundVideoUrl]);

  // Sync background video time
  useEffect(() => {
    const bgVideo = bgVideoRef.current;
    if (!bgVideo || !bgVideo.duration || !isFinite(bgVideo.duration)) return;

    const targetTime = currentTime % bgVideo.duration;
    if (!isFinite(targetTime) || isNaN(targetTime)) return;

    if (!isPlaying) {
      if (Math.abs(bgVideo.currentTime - targetTime) > 0.05 && !bgVideo.seeking) {
        try {
          bgVideo.currentTime = targetTime;
        } catch {}
      }
    } else {
      if (Math.abs(bgVideo.currentTime - targetTime) > 1.2 && !bgVideo.seeking) {
        try {
          bgVideo.currentTime = targetTime;
        } catch {}
      }
      if (bgVideo.paused && !bgVideo.seeking) {
        bgVideo.play().catch(() => {});
      }
    }
  }, [currentTime, isPlaying]);

  // Visual layout parameters for active slice
  const layoutStyle = visual?.layoutStyle || "fullscreen";
  const positionX = visual?.positionX ?? 50;
  const positionY = visual?.positionY ?? 50;
  const width = visual?.width ?? 75;
  const height = visual?.height ?? (assignedAsset?.type === "video" ? 25 : 39);
  const zoom = visual?.zoom ?? 1.0;
  const cropX = visual?.cropX ?? 0;
  const cropY = visual?.cropY ?? 0;

  // Center move handler (reposition X and Y)
  const handleWindowMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isSliceSettingsOpen || !activeSlice || layoutStyle !== "window") return;
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startPosX = positionX;
      const startPosY = positionY;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
        const deltaY = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

        const newX = Math.max(5, Math.min(95, Math.round(startPosX + deltaX)));
        const newY = Math.max(5, Math.min(95, Math.round(startPosY + deltaY)));

        updateSliceVisual(activeSlice.id, {
          positionX: newX,
          positionY: newY,
        });
      };

      const onMouseUp = () => {
        useEditorStore.getState().endBatch();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [isSliceSettingsOpen, activeSlice, layoutStyle, positionX, positionY, updateSliceVisual]
  );

  // Resize handler for all 4 sides and 4 corners
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (!isSliceSettingsOpen || !activeSlice || layoutStyle !== "window") return;
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startW = width;
      const startH = height;
      const startX = positionX;
      const startY = positionY;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
        const deltaY = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

        let newW = startW;
        let newH = startH;
        let newX = startX;
        let newY = startY;

        // Horizontal resizing (right edge vs left edge)
        if (handle === "right" || handle === "br" || handle === "tr") {
          newW = Math.max(15, Math.min(95, Math.round(startW + deltaX)));
          newX = Math.max(5, Math.min(95, Math.round(startX + deltaX / 2)));
        } else if (handle === "left" || handle === "bl" || handle === "tl") {
          newW = Math.max(15, Math.min(95, Math.round(startW - deltaX)));
          newX = Math.max(5, Math.min(95, Math.round(startX + deltaX / 2)));
        }

        // Vertical resizing (bottom edge vs top edge)
        if (handle === "bottom" || handle === "br" || handle === "bl") {
          newH = Math.max(10, Math.min(95, Math.round(startH + deltaY)));
          newY = Math.max(5, Math.min(95, Math.round(startY + deltaY / 2)));
        } else if (handle === "top" || handle === "tr" || handle === "tl") {
          newH = Math.max(10, Math.min(95, Math.round(startH - deltaY)));
          newY = Math.max(5, Math.min(95, Math.round(startY + deltaY / 2)));
        }

        updateSliceVisual(activeSlice.id, {
          width: newW,
          height: newH,
          positionX: newX,
          positionY: newY,
        });
      };

      const onMouseUp = () => {
        useEditorStore.getState().endBatch();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [isSliceSettingsOpen, activeSlice, layoutStyle, width, height, positionX, positionY, updateSliceVisual]
  );

  // Interactive slice rotation handle
  const handleRotateMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isSliceSettingsOpen || !activeSlice) return;
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + (rect.width * positionX) / 100;
      const centerY = rect.top + (rect.height * positionY) / 100;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - centerX;
        const dy = moveEvent.clientY - centerY;
        let angle = Math.round(Math.atan2(dy, dx) * (180 / Math.PI)) + 90;
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;

        if (moveEvent.shiftKey) {
          angle = Math.round(angle / 15) * 15;
        }

        updateSliceVisual(activeSlice.id, {
          rotation: angle,
        });
      };

      const onMouseUp = () => {
        useEditorStore.getState().endBatch();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [isSliceSettingsOpen, activeSlice, positionX, positionY, updateSliceVisual]
  );

  // Direct canvas pan/crop handler for Fullscreen mode
  const handleFullscreenMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isSliceSettingsOpen || !activeSlice || layoutStyle !== "fullscreen") return;
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startCropX = cropX;
      const startCropY = cropY;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
        const deltaY = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

        // Invert delta so dragging mouse left pulls right side into view
        const newCropX = Math.max(-50, Math.min(50, Math.round(startCropX - deltaX)));
        const newCropY = Math.max(-50, Math.min(50, Math.round(startCropY - deltaY)));

        updateSliceVisual(activeSlice.id, {
          cropX: newCropX,
          cropY: newCropY,
        });
      };

      const onMouseUp = () => {
        useEditorStore.getState().endBatch();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [isSliceSettingsOpen, activeSlice, layoutStyle, cropX, cropY, updateSliceVisual]
  );

  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mouse wheel zoom handler inside preview
  const handleWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      if (!isSliceSettingsOpen || !activeSlice) return;
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();

      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const newZoom = Math.max(1.0, Math.min(3.0, Math.round((zoom + delta) * 100) / 100));

      updateSliceVisual(activeSlice.id, { zoom: newZoom });

      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        useEditorStore.getState().endBatch();
      }, 350);
    },
    [isSliceSettingsOpen, activeSlice, zoom, updateSliceVisual]
  );

  // Character Center Move handler (reposition X and Y)
  const handleCharacterMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!activeSlice || !activeSlice.character) return;
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();

      selectSlice(activeSlice.id);
      setSliceSettingsOpen(true);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startPosX = activeSlice.character.positionX ?? 75;
      const startPosY = activeSlice.character.positionY ?? 75;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
        const deltaY = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

        const newX = Math.max(5, Math.min(95, Math.round(startPosX + deltaX)));
        const newY = Math.max(5, Math.min(95, Math.round(startPosY + deltaY)));

        updateSliceCharacter(activeSlice.id, {
          positionX: newX,
          positionY: newY,
        });
      };

      const onMouseUp = () => {
        useEditorStore.getState().endBatch();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [activeSlice, selectSlice, setSliceSettingsOpen, updateSliceCharacter]
  );

  // Character Resize handler (4 sides and 4 corners)
  const handleCharResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (!activeSlice || !activeSlice.character) return;
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startW = activeSlice.character.width ?? 35;
      const startH = activeSlice.character.height ?? 40;
      const startX = activeSlice.character.positionX ?? 75;
      const startY = activeSlice.character.positionY ?? 75;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
        const deltaY = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

        let newW = startW;
        let newH = startH;
        let newX = startX;
        let newY = startY;

        // Horizontal resizing (right edge vs left edge)
        if (handle === "right" || handle === "br" || handle === "tr") {
          newW = Math.max(10, Math.min(95, Math.round(startW + deltaX)));
          newX = Math.max(5, Math.min(95, Math.round(startX + deltaX / 2)));
        } else if (handle === "left" || handle === "bl" || handle === "tl") {
          newW = Math.max(10, Math.min(95, Math.round(startW - deltaX)));
          newX = Math.max(5, Math.min(95, Math.round(startX + deltaX / 2)));
        }

        // Vertical resizing (bottom edge vs top edge)
        if (handle === "bottom" || handle === "br" || handle === "bl") {
          newH = Math.max(10, Math.min(95, Math.round(startH + deltaY)));
          newY = Math.max(5, Math.min(95, Math.round(startY + deltaY / 2)));
        } else if (handle === "top" || handle === "tr" || handle === "tl") {
          newH = Math.max(10, Math.min(95, Math.round(startH - deltaY)));
          newY = Math.max(5, Math.min(95, Math.round(startY + deltaY / 2)));
        }

        updateSliceCharacter(activeSlice.id, {
          width: newW,
          height: newH,
          positionX: newX,
          positionY: newY,
        });
      };

      const onMouseUp = () => {
        useEditorStore.getState().endBatch();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [activeSlice, updateSliceCharacter]
  );

  // Overlay move handler (drag on canvas to reposition X and Y)
  const handleOverlayMouseDown = useCallback(
    (e: React.MouseEvent, overlay: TimelineOverlay) => {
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();
      selectOverlay(overlay.id);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startPosX = overlay.positionX ?? 50;
      const startPosY = overlay.positionY ?? 50;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
        const deltaY = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

        const newX = Math.max(5, Math.min(95, Math.round(startPosX + deltaX)));
        const newY = Math.max(5, Math.min(95, Math.round(startPosY + deltaY)));

        updateTimelineOverlay(
          overlay.id,
          {
            positionX: newX,
            positionY: newY,
          },
          true
        );
      };

      const onMouseUp = () => {
        useEditorStore.getState().endBatch();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [selectOverlay, updateTimelineOverlay]
  );

  // Overlay corner scale handler
  const handleOverlayResizeMouseDown = useCallback(
    (e: React.MouseEvent, overlay: TimelineOverlay) => {
      e.preventDefault();
      e.stopPropagation();

      useEditorStore.getState().beginBatch();
      selectOverlay(overlay.id);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startScale = overlay.scale ?? 1.0;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = (moveEvent.clientX - startMouseX) / (rect.width * 0.35);
        const newScale = Math.max(0.2, Math.min(2.5, Math.round((startScale + delta) * 100) / 100));

        updateTimelineOverlay(
          overlay.id,
          {
            scale: newScale,
          },
          true
        );
      };

      const onMouseUp = () => {
        useEditorStore.getState().endBatch();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [selectOverlay, updateTimelineOverlay]
  );

  return (
    <div
      ref={outerContainerRef}
      className="relative w-full h-full flex items-center justify-center bg-black/80 p-2 select-none overflow-hidden"
    >
      {/* 9:16 Aspect Ratio Frame */}
      <div
        ref={containerRef}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/json")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData("application/json");
          if (!raw) return;
          try {
            const data = JSON.parse(raw);
            if (data.url) {
              e.preventDefault();
              useEditorStore.getState().setBackgroundVideo(data.url);
            } else if (data.assetId) {
              const asset = project?.mediaAssets?.find((a) => a.id === data.assetId);
              if (asset) {
                e.preventDefault();
                useEditorStore.getState().setBackgroundVideo(asset.url);
              }
            }
          } catch {}
        }}
        style={{
          width: frameDimensions.width > 0 ? `${frameDimensions.width}px` : "auto",
          height: frameDimensions.height > 0 ? `${frameDimensions.height}px` : "100%",
          aspectRatio: "9 / 16",
        }}
        className="relative max-h-full max-w-full bg-[#0a0c10] rounded-md overflow-hidden shadow-2xl border border-border/80 flex items-center justify-center flex-shrink-0"
      >
        {/* Layer 1: Background Media (Image or Video) */}
        {backgroundVideoUrl ? (
          isBgImage ? (
            <img
              src={getMediaUrl(backgroundVideoUrl)}
              alt="Background Media"
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            />
          ) : (
            <video
              ref={bgVideoRef}
              src={getMediaUrl(backgroundVideoUrl)}
              muted
              loop
              playsInline
              onLoadedMetadata={handleBgVideoLoaded}
              onCanPlay={handleBgVideoLoaded}
              onError={(err) => console.warn("[VideoPreview] Background video error:", err)}
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            />
          )
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#111622] via-[#0b0e14] to-[#08090d] z-0" />
        )}

        {/* Layer 2: Slice Visual (Image or Video) */}
        {activeSlice && assignedAsset ? (
          <SliceVisualItem
            key={`slice-${activeSlice.id}-${assignedAsset.id}`}
            slice={activeSlice}
            asset={assignedAsset}
            currentTime={currentTime}
            isPlaying={isPlaying}
            zIndex={12}
            isInteractive={true}
            isSliceSettingsOpen={isSliceSettingsOpen}
            effectiveDuration={sliceDur}
            onWindowMouseDown={handleWindowMouseDown}
            onResizeMouseDown={handleResizeMouseDown}
            onRotateMouseDown={handleRotateMouseDown}
            onFullscreenMouseDown={handleFullscreenMouseDown}
            onWheelZoom={handleWheelZoom}
          />
        ) : (
          /* Placeholder guidance if slice has no visual */
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center text-muted-foreground/60 pointer-events-none">
            <span className="text-[11px] font-mono tracking-widest uppercase">
              {activeSlice ? `Slice ${activeSlice.id}` : "No Active Slice"}
            </span>
          </div>
        )}

        {/* Preload upcoming slice media asset into browser cache if image */}
        {nextAsset && nextAsset.type === "image" && (
          <img
            key={`preload-${nextAsset.id}`}
            src={getMediaUrl(nextAsset.url)}
            className="hidden pointer-events-none"
            alt=""
          />
        )}

        {/* Layer 3: Character Overlay */}
        {activeSlice?.character && charPose && (
          <div
            onMouseDown={handleCharacterMouseDown}
            style={{
              position: "absolute",
              left: `${charPosX}%`,
              top: `${charPosY}%`,
              width: `${charWidth}%`,
              height: `${charHeight}%`,
              transform: `translate(-50%, -50%)`,
              zIndex: 25,
            }}
            className="group select-none cursor-move"
          >
            {/* Character Pose Image (with flipX applied) */}
            <div
              style={{
                width: "100%",
                height: "100%",
                transform: charFlipX ? "scaleX(-1)" : "none",
              }}
              className="w-full h-full relative flex items-center justify-center pointer-events-none"
            >
              <img
                src={getMediaUrl(charPose.imageUrl)}
                alt={charData?.name || "Character"}
                className="w-full h-full object-contain filter drop-shadow-2xl select-none"
              />
            </div>

            {/* Editing Handles and Bounding Outline (when slice settings open) */}
            {isSliceSettingsOpen && (
              <>
                {/* Bounding dashed border */}
                <div className="absolute inset-0 border-2 border-dashed border-amber-400/90 pointer-events-none rounded-lg ring-1 ring-amber-400/30" />

                {/* Character Name & Pose HUD Badge */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-amber-400 border border-amber-400/50 text-[10px] font-mono px-2 py-0.5 rounded shadow-xl whitespace-nowrap pointer-events-none z-30 flex items-center gap-1">
                  <span>{charData?.name || "Character"}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{charPose.name}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{Math.round(charWidth)}% × {Math.round(charHeight)}%</span>
                </div>

                {/* Move Hint HUD on Hover */}
                <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <div className="px-2 py-1 rounded bg-black/85 text-[10px] text-amber-300 font-medium flex items-center gap-1 shadow-lg">
                    <Move className="w-3 h-3 text-amber-400" />
                    <span>Drag to move • Drag edges to resize</span>
                  </div>
                </div>

                {/* 4 Side Drag Handles for Width / Height */}
                {/* Right Edge */}
                <div
                  onMouseDown={(e) => handleCharResizeMouseDown(e, "right")}
                  className="absolute -right-2 top-2 bottom-2 w-4 cursor-ew-resize flex items-center justify-center z-30 group/edge"
                  title="Drag side to resize width"
                >
                  <div className="w-1.5 h-7 rounded-full bg-amber-400 shadow-md group-hover/edge:scale-125 transition-transform" />
                </div>

                {/* Left Edge */}
                <div
                  onMouseDown={(e) => handleCharResizeMouseDown(e, "left")}
                  className="absolute -left-2 top-2 bottom-2 w-4 cursor-ew-resize flex items-center justify-center z-30 group/edge"
                  title="Drag side to resize width"
                >
                  <div className="w-1.5 h-7 rounded-full bg-amber-400 shadow-md group-hover/edge:scale-125 transition-transform" />
                </div>

                {/* Top Edge */}
                <div
                  onMouseDown={(e) => handleCharResizeMouseDown(e, "top")}
                  className="absolute -top-2 left-2 right-2 h-4 cursor-ns-resize flex items-center justify-center z-30 group/edge"
                  title="Drag edge to resize height"
                >
                  <div className="h-1.5 w-7 rounded-full bg-amber-400 shadow-md group-hover/edge:scale-125 transition-transform" />
                </div>

                {/* Bottom Edge */}
                <div
                  onMouseDown={(e) => handleCharResizeMouseDown(e, "bottom")}
                  className="absolute -bottom-2 left-2 right-2 h-4 cursor-ns-resize flex items-center justify-center z-30 group/edge"
                  title="Drag edge to resize height"
                >
                  <div className="h-1.5 w-7 rounded-full bg-amber-400 shadow-md group-hover/edge:scale-125 transition-transform" />
                </div>

                {/* 4 Corner Drag Handles */}
                {/* Bottom-Right Corner */}
                <div
                  onMouseDown={(e) => handleCharResizeMouseDown(e, "br")}
                  className="absolute -bottom-2 -right-2 w-5 h-5 cursor-nwse-resize flex items-center justify-center z-30"
                  title="Drag corner to resize"
                >
                  <div className="w-2.5 h-2.5 rounded-xs bg-amber-400 border border-black shadow-md hover:scale-125 transition-transform" />
                </div>

                {/* Bottom-Left Corner */}
                <div
                  onMouseDown={(e) => handleCharResizeMouseDown(e, "bl")}
                  className="absolute -bottom-2 -left-2 w-5 h-5 cursor-nesw-resize flex items-center justify-center z-30"
                  title="Drag corner to resize"
                >
                  <div className="w-2.5 h-2.5 rounded-xs bg-amber-400 border border-black shadow-md hover:scale-125 transition-transform" />
                </div>

                {/* Top-Right Corner */}
                <div
                  onMouseDown={(e) => handleCharResizeMouseDown(e, "tr")}
                  className="absolute -top-2 -right-2 w-5 h-5 cursor-nesw-resize flex items-center justify-center z-30"
                  title="Drag corner to resize"
                >
                  <div className="w-2.5 h-2.5 rounded-xs bg-amber-400 border border-black shadow-md hover:scale-125 transition-transform" />
                </div>

                {/* Top-Left Corner */}
                <div
                  onMouseDown={(e) => handleCharResizeMouseDown(e, "tl")}
                  className="absolute -top-2 -left-2 w-5 h-5 cursor-nwse-resize flex items-center justify-center z-30"
                  title="Drag corner to resize"
                >
                  <div className="w-2.5 h-2.5 rounded-xs bg-amber-400 border border-black shadow-md hover:scale-125 transition-transform" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Layer 3.5: Timeline Overlays & Visual Animations */}
        {project?.overlays &&
          [...project.overlays]
            .sort((a, b) => ((a.lane ?? 0) - (b.lane ?? 0)) || (a.start - b.start))
            .map((ov) => {
              const isVisible = currentTime >= ov.start && currentTime <= ov.end;
              if (!isVisible) return null;

              const isSelected = selectedOverlayId === ov.id;
              const ovW = (ov.width ?? 30) * (ov.scale ?? 1.0);
              const ovH = (ov.height ?? 30) * (ov.scale ?? 1.0);
              const posX = ov.positionX ?? 50;
              const posY = ov.positionY ?? 50;
              const rot = ov.rotation ?? 0;
              const flip = ov.flipX ? "scaleX(-1)" : "";
              const animClass =
                ov.animation && ov.animation !== "none" ? `anim-${ov.animation}` : "";

              return (
                <div
                  key={ov.id}
                  onMouseDown={(e) => handleOverlayMouseDown(e, ov)}
                  style={{
                    position: "absolute",
                    left: `${posX}%`,
                    top: `${posY}%`,
                    width: `${ovW}%`,
                    height: `${ovH}%`,
                    transform: `translate(-50%, -50%) rotate(${rot}deg) ${flip}`,
                    opacity: ov.opacity ?? 1.0,
                    zIndex: 25 + ((ov.lane ?? 0) * 2) + (isSelected ? 5 : 0),
                  }}
                  className={`group cursor-grab active:cursor-grabbing select-none flex items-center justify-center ${
                    isSelected ? "ring-2 ring-pink-500 rounded-lg" : ""
                  }`}
                >
                <img
                  src={getMediaUrl(ov.url)}
                  alt={ov.name}
                  className={`w-full h-full object-contain filter drop-shadow-xl pointer-events-none select-none ${animClass}`}
                />

                {isSelected && (
                  <>
                    <div className="absolute inset-0 border-2 border-dashed border-pink-400/90 pointer-events-none rounded-lg ring-1 ring-pink-400/30" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 text-pink-300 border border-pink-500/50 text-[10px] font-mono px-2 py-0.5 rounded shadow-xl whitespace-nowrap pointer-events-none z-30 flex items-center gap-1">
                      <span>{ov.name}</span>
                      {ov.animation && ov.animation !== "none" && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="uppercase">{ov.animation}</span>
                        </>
                      )}
                    </div>

                    {/* Scale corner handle */}
                    <div
                      onMouseDown={(e) => handleOverlayResizeMouseDown(e, ov)}
                      className="absolute -bottom-2 -right-2 w-5 h-5 cursor-nwse-resize flex items-center justify-center z-30"
                      title="Drag to resize overlay scale"
                    >
                      <div className="w-2.5 h-2.5 rounded-xs bg-pink-400 border border-black shadow-md hover:scale-125 transition-transform" />
                    </div>
                  </>
                )}
              </div>
            );
          })}

        {/* Layer 4: Word-Highlighted Captions */}
        <CaptionPreview currentTime={currentTime} previewScale={previewScale} />

        {/* Subtle 9:16 Guide Marks & Safe Area Border */}
        <div className="absolute inset-x-4 top-8 bottom-8 border border-white/5 rounded pointer-events-none z-30" />
      </div>
    </div>
  );
};
