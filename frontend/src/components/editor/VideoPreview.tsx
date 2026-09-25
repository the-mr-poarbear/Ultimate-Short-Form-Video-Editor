import React, { useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useCharacterStore } from "../../stores/characterStore";
import { getMediaUrl } from "../../services/api";
import { CaptionPreview } from "../captions/CaptionPreview";
import { Move, Maximize2 } from "lucide-react";

interface VideoPreviewProps {
  currentTime: number;
  isPlaying: boolean;
}

type ResizeHandle = "right" | "left" | "top" | "bottom" | "br" | "bl" | "tr" | "tl";

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
  const characters = useCharacterStore((s) => s.characters);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const sliceVideoRef = useRef<HTMLVideoElement | null>(null);

  // Dynamic preview scale factor matching the 1080x1920 canvas
  const [previewScale, setPreviewScale] = React.useState<number>(0.28);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        setPreviewScale(rect.height / 1920);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const backgroundVideoUrl = project?.backgroundVideo;

  // 1. Find slice at current playhead time
  const currentPlayheadSlice = project?.slices.find(
    (s, idx, arr) =>
      currentTime >= s.start &&
      (currentTime < s.end || (idx === arr.length - 1 && currentTime <= s.end))
  );

  // 2. Resolve active slice:
  // - During playback, ALWAYS display the slice at the current playhead time.
  // - When paused, if the playhead is within a slice, display that slice.
  // - If the playhead is outside all slices (e.g. gaps/silence), fall back to selected slice (if any) or the first slice.
  const activeSlice = isPlaying
    ? currentPlayheadSlice
    : currentPlayheadSlice ||
      (selectedSliceId ? project?.slices.find((s) => s.id === selectedSliceId) : null) ||
      project?.slices[0];

  const visual = activeSlice?.visual;
  const assignedAsset = visual?.assetId
    ? project?.mediaAssets.find((a) => a.id === visual.assetId)
    : null;

  // Character overlay data for active slice
  const sliceChar = activeSlice?.character;
  const charData = sliceChar ? characters.find((c) => c.id === sliceChar.characterId) : null;
  const charPose = charData?.poses.find((p) => p.id === sliceChar?.poseId) || charData?.poses[0];
  const charPosX = sliceChar?.positionX ?? 75;
  const charPosY = sliceChar?.positionY ?? 75;
  const charWidth = sliceChar?.width ?? 35;
  const charHeight = sliceChar?.height ?? 40;
  const charFlipX = sliceChar?.flipX ?? false;

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

  // Sync slice video when loaded/playable
  const handleSliceVideoLoaded = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const vid = e.currentTarget;
      if (!vid || !vid.duration || !isFinite(vid.duration) || !activeSlice) return;
      vid.muted = true;
      vid.defaultMuted = true;
      const mediaStart = visual?.mediaStart || 0.0;
      const sliceOffset = Math.max(0, currentTime - activeSlice.start);
      const targetTime = (mediaStart + sliceOffset) % vid.duration;
      if (isFinite(targetTime) && !isNaN(targetTime) && !vid.seeking) {
        try {
          vid.currentTime = targetTime;
        } catch {}
      }
      if (isPlaying && vid.paused) {
        vid.play().catch(() => {});
      }
    },
    [activeSlice, visual?.mediaStart, currentTime, isPlaying]
  );

  // Ensure videos are always strictly muted
  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.muted = true;
      bgVideoRef.current.defaultMuted = true;
    }
  }, [backgroundVideoUrl]);

  useEffect(() => {
    if (sliceVideoRef.current) {
      sliceVideoRef.current.muted = true;
      sliceVideoRef.current.defaultMuted = true;
    }
  }, [assignedAsset?.id, activeSlice?.id]);

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
    }
  }, [currentTime, isPlaying]);

  // Sync slice video play/pause
  useEffect(() => {
    const sliceVideo = sliceVideoRef.current;
    if (!sliceVideo || assignedAsset?.type !== "video") return;

    if (isPlaying) {
      if (sliceVideo.paused) {
        sliceVideo.play().catch(() => {});
      }
    } else {
      if (!sliceVideo.paused) {
        sliceVideo.pause();
      }
    }
  }, [isPlaying, assignedAsset?.id, activeSlice?.id]);

  // Sync slice video time including mediaStart offset
  useEffect(() => {
    const sliceVideo = sliceVideoRef.current;
    if (!sliceVideo || !activeSlice || assignedAsset?.type !== "video" || !sliceVideo.duration || !isFinite(sliceVideo.duration)) return;

    const mediaStart = visual?.mediaStart || 0.0;
    const sliceOffset = Math.max(0, currentTime - activeSlice.start);
    const targetTime = (mediaStart + sliceOffset) % sliceVideo.duration;

    if (!isFinite(targetTime) || isNaN(targetTime)) return;

    if (!isPlaying) {
      if (Math.abs(sliceVideo.currentTime - targetTime) > 0.05 && !sliceVideo.seeking) {
        try {
          sliceVideo.currentTime = targetTime;
        } catch {}
      }
    } else {
      if (Math.abs(sliceVideo.currentTime - targetTime) > 0.8 && !sliceVideo.seeking) {
        try {
          sliceVideo.currentTime = targetTime;
        } catch {}
      }
    }
  }, [currentTime, isPlaying, activeSlice?.id, assignedAsset?.id, visual?.mediaStart]);

  // Transition & Animation calculation
  // Transition & Animation calculation
  const transition = visual?.transition || "none";
  const sliceDur = activeSlice ? Math.max(activeSlice.end - activeSlice.start, 0.5) : 3;
  const sliceOffset = activeSlice ? Math.max(0, currentTime - activeSlice.start) : 0;
  const progress = Math.max(0, Math.min(1, sliceOffset / sliceDur));

  // Visual layout parameters
  const layoutStyle = visual?.layoutStyle || "fullscreen";
  const positionX = visual?.positionX ?? 50;
  const positionY = visual?.positionY ?? 50;
  const width = visual?.width ?? 75;
  const height = visual?.height ?? (assignedAsset?.type === "video" ? 25 : 39);
  const zoom = visual?.zoom ?? 1.0;
  const cropX = visual?.cropX ?? 0;
  const cropY = visual?.cropY ?? 0;
  const panCoverage = (visual?.panCoverage ?? 100) / 100.0;
  const borderRadius = visual?.borderRadius ?? 16;
  const borderWidth = visual?.borderWidth ?? 0;
  const borderColor = visual?.borderColor ?? "#ffffff";
  const shadow = visual?.shadow ?? true;

  // Compute dynamic pan / crop focal position inside media
  let currentObjX = 50 + cropX;
  let currentObjY = 50 + cropY;
  const isPan =
    transition === "pan-right" ||
    transition === "pan-left" ||
    transition === "pan-down" ||
    transition === "pan-up";

  if (transition === "pan-right") {
    // Starts at left-most edge (0%) and pans to right up to coverage
    const startX = 0;
    const endX = 100 * panCoverage;
    currentObjX = startX + progress * (endX - startX);
  } else if (transition === "pan-left") {
    // Starts at right edge (100%) and pans left
    const startX = 100;
    const endX = 100 - 100 * panCoverage;
    currentObjX = startX - progress * (startX - endX);
  } else if (transition === "pan-down") {
    // Starts at top (0%) and pans down
    const startY = 0;
    const endY = 100 * panCoverage;
    currentObjY = startY + progress * (endY - startY);
  } else if (transition === "pan-up") {
    // Starts at bottom (100%) and pans up
    const startY = 100;
    const endY = 100 - 100 * panCoverage;
    currentObjY = startY - progress * (startY - endY);
  }

  currentObjX = Math.max(0, Math.min(100, currentObjX));
  currentObjY = Math.max(0, Math.min(100, currentObjY));

  // Effective zoom (pan transitions guarantee at least 1.25x so there is room to pan across)
  const effectiveZoom = isPan ? Math.max(1.25, zoom) : zoom;

  let transitionStyle: React.CSSProperties = {};
  if (transition === "zoom-in") {
    transitionStyle = {
      animation: `kenBurnsZoomIn ${sliceDur}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
      animationPlayState: isPlaying ? "running" : "paused",
      animationDelay: `-${sliceOffset.toFixed(2)}s`,
      willChange: "transform",
    };
  } else if (transition === "zoom-out") {
    transitionStyle = {
      animation: `kenBurnsZoomOut ${sliceDur}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
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

  // Center move handler (reposition X and Y)
  const handleWindowMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isSliceSettingsOpen || !activeSlice || layoutStyle !== "window") return;
      e.preventDefault();
      e.stopPropagation();

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
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [isSliceSettingsOpen, activeSlice, layoutStyle, width, height, positionX, positionY, updateSliceVisual]
  );

  // Direct canvas pan/crop handler for Fullscreen mode
  const handleFullscreenMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isSliceSettingsOpen || !activeSlice || layoutStyle !== "fullscreen") return;
      e.preventDefault();
      e.stopPropagation();

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
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [isSliceSettingsOpen, activeSlice, layoutStyle, cropX, cropY, updateSliceVisual]
  );

  // Mouse wheel zoom handler inside preview
  const handleWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      if (!isSliceSettingsOpen || !activeSlice) return;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const newZoom = Math.max(1.0, Math.min(3.0, Math.round((zoom + delta) * 100) / 100));

      updateSliceVisual(activeSlice.id, { zoom: newZoom });
    },
    [isSliceSettingsOpen, activeSlice, zoom, updateSliceVisual]
  );

  // Character Center Move handler (reposition X and Y)
  const handleCharacterMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!activeSlice || !activeSlice.character) return;
      e.preventDefault();
      e.stopPropagation();

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
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [activeSlice, updateSliceCharacter]
  );

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/80 p-2 select-none overflow-hidden">
      {/* 9:16 Aspect Ratio Frame */}
      <div
        ref={containerRef}
        className="relative h-full aspect-[9/16] max-w-full bg-[#0a0c10] rounded-md overflow-hidden shadow-2xl border border-border/80 flex items-center justify-center"
      >
        {/* Layer 1: Background Video */}
        {backgroundVideoUrl ? (
          <video
            ref={bgVideoRef}
            src={getMediaUrl(backgroundVideoUrl)}
            muted
            loop
            playsInline
            onLoadedMetadata={handleBgVideoLoaded}
            onCanPlay={handleBgVideoLoaded}
            onError={(err) => console.warn("[VideoPreview] Background video error:", err)}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#111622] via-[#0b0e14] to-[#08090d] z-0" />
        )}

        {/* Layer 2: Slice Visual (Image or Video) */}
        {assignedAsset ? (
          layoutStyle === "window" ? (
            /* --- Window (PIP) Mode with Resizable Sides & Corners --- */
            <div
              key={`${activeSlice?.id}-${assignedAsset.id}`}
              onWheel={handleWheelZoom}
              style={{
                position: "absolute",
                left: `${positionX}%`,
                top: `${positionY}%`,
                width: `${width}%`,
                height: `${height}%`,
                transform: "translate(-50%, -50%)",
                borderRadius: `${borderRadius}px`,
                border:
                  borderWidth > 0
                    ? `${borderWidth}px solid ${borderColor}`
                    : isSliceSettingsOpen
                    ? "2px solid #00f0ff"
                    : "none",
                boxShadow: shadow
                  ? "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.15)"
                  : "none",
                ...transitionStyle,
              }}
              className={`z-10 overflow-visible group select-none ${
                isSliceSettingsOpen ? "ring-2 ring-cyan-400/50 shadow-cyan-400/20" : ""
              }`}
            >
              {/* Inner content wrapper with rounded clipping, Zoom and Pan/Crop applied directly to media */}
              <div
                onMouseDown={handleWindowMouseDown}
                style={{
                  borderRadius: `${Math.max(0, borderRadius - borderWidth)}px`,
                  overflow: "hidden",
                  cursor: isSliceSettingsOpen ? "move" : "default",
                }}
                className="w-full h-full relative"
              >
                {assignedAsset.type === "image" ? (
                  <img
                    src={getMediaUrl(assignedAsset.url)}
                    alt={assignedAsset.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: visual?.fit === "contain" ? "contain" : "cover",
                      objectPosition: `${currentObjX}% ${currentObjY}%`,
                      transform: `scale(${effectiveZoom})`,
                      transformOrigin: `${currentObjX}% ${currentObjY}%`,
                    }}
                    className="pointer-events-none transition-transform duration-75 select-none"
                  />
                ) : (
                  <video
                    ref={sliceVideoRef}
                    src={getMediaUrl(assignedAsset.url)}
                    muted
                    loop
                    playsInline
                    onLoadedMetadata={handleSliceVideoLoaded}
                    onCanPlay={handleSliceVideoLoaded}
                    onError={(err) => console.warn("[VideoPreview] Slice video error:", err)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: visual?.fit === "contain" ? "contain" : "cover",
                      objectPosition: `${currentObjX}% ${currentObjY}%`,
                      transform: `scale(${effectiveZoom})`,
                      transformOrigin: `${currentObjX}% ${currentObjY}%`,
                    }}
                    className="pointer-events-none transition-transform duration-75 select-none"
                  />
                )}

                {/* Move Hint HUD */}
                {isSliceSettingsOpen && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-2 py-1 rounded bg-black/80 text-[10px] text-white font-medium flex items-center gap-1 shadow-lg">
                      <Move className="w-3 h-3 text-cyan-400" />
                      <span>Drag to move • Scroll to zoom</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Aspect Ratio HUD Badge */}
              {isSliceSettingsOpen && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 text-cyan-400 border border-cyan-400/40 text-[9px] font-mono px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-30">
                  {Math.round(width)}% × {Math.round(height)}% • {((width / height) * (1080 / 1920)).toFixed(2)}:1
                </div>
              )}

              {/* Side Drag Handles for Changing Aspect Ratio */}
              {isSliceSettingsOpen && (
                <>
                  {/* Right Edge (Width) */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, "right")}
                    className="absolute -right-2 top-2 bottom-2 w-4 cursor-ew-resize flex items-center justify-center z-30 group/edge"
                    title="Drag side to change width / aspect ratio"
                  >
                    <div className="w-1.5 h-7 rounded-full bg-cyan-400 shadow-md group-hover/edge:scale-125 transition-transform" />
                  </div>

                  {/* Left Edge (Width) */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, "left")}
                    className="absolute -left-2 top-2 bottom-2 w-4 cursor-ew-resize flex items-center justify-center z-30 group/edge"
                    title="Drag side to change width / aspect ratio"
                  >
                    <div className="w-1.5 h-7 rounded-full bg-cyan-400 shadow-md group-hover/edge:scale-125 transition-transform" />
                  </div>

                  {/* Top Edge (Height) */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, "top")}
                    className="absolute -top-2 left-2 right-2 h-4 cursor-ns-resize flex items-center justify-center z-30 group/edge"
                    title="Drag edge to change height / aspect ratio"
                  >
                    <div className="h-1.5 w-7 rounded-full bg-cyan-400 shadow-md group-hover/edge:scale-125 transition-transform" />
                  </div>

                  {/* Bottom Edge (Height) */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}
                    className="absolute -bottom-2 left-2 right-2 h-4 cursor-ns-resize flex items-center justify-center z-30 group/edge"
                    title="Drag edge to change height / aspect ratio"
                  >
                    <div className="h-1.5 w-7 rounded-full bg-cyan-400 shadow-md group-hover/edge:scale-125 transition-transform" />
                  </div>

                  {/* 4 Corner Handles (Both Width & Height) */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, "tl")}
                    className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full cursor-nwse-resize z-40 shadow-lg hover:scale-125 transition-transform"
                    title="Resize corner"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, "tr")}
                    className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full cursor-nesw-resize z-40 shadow-lg hover:scale-125 transition-transform"
                    title="Resize corner"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, "bl")}
                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full cursor-nesw-resize z-40 shadow-lg hover:scale-125 transition-transform"
                    title="Resize corner"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, "br")}
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full cursor-nwse-resize z-40 shadow-lg hover:scale-125 transition-transform"
                    title="Resize corner"
                  />
                </>
              )}
            </div>
          ) : (
            /* --- Full Screen Mode: Pan/Crop and Zoom applied directly to media object-position --- */
            <div
              key={`${activeSlice?.id}-${assignedAsset.id}`}
              onMouseDown={handleFullscreenMouseDown}
              onWheel={handleWheelZoom}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                ...transitionStyle,
              }}
              className={`z-10 flex items-center justify-center ${
                isSliceSettingsOpen ? "cursor-move" : ""
              }`}
            >
              {assignedAsset.type === "image" ? (
                <img
                  src={getMediaUrl(assignedAsset.url)}
                  alt={assignedAsset.name}
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
                  ref={sliceVideoRef}
                  src={getMediaUrl(assignedAsset.url)}
                  muted
                  loop
                  playsInline
                  onLoadedMetadata={handleSliceVideoLoaded}
                  onCanPlay={handleSliceVideoLoaded}
                  onError={(err) => console.warn("[VideoPreview] Slice video error:", err)}
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

              {/* Fullscreen Edit Mode hint */}
              {isSliceSettingsOpen && (
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs border border-primary/40 px-2.5 py-1 rounded text-[10px] text-primary flex items-center gap-1.5 pointer-events-none shadow-lg z-20">
                  <Maximize2 className="w-3 h-3 text-cyan-400" />
                  <span>
                    Full Screen • Drag to pan subject ({Math.round(cropX)}%, {Math.round(cropY)}%) • Scroll to zoom
                  </span>
                </div>
              )}
            </div>
          )
        ) : (
          // Placeholder guidance if slice has no visual
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center text-muted-foreground/60 pointer-events-none">
            <span className="text-[11px] font-mono tracking-widest uppercase">
              {activeSlice ? `Slice ${activeSlice.id}` : "No Active Slice"}
            </span>
          </div>
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

        {/* Layer 4: Word-Highlighted Captions */}
        <CaptionPreview currentTime={currentTime} previewScale={previewScale} />

        {/* Subtle 9:16 Guide Marks & Safe Area Border */}
        <div className="absolute inset-x-4 top-8 bottom-8 border border-white/5 rounded pointer-events-none z-30" />
      </div>
    </div>
  );
};
