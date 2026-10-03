import React, { useState, useEffect } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useCharacterStore } from "../../stores/characterStore";
import { getMediaUrl } from "../../services/api";
import { Slider } from "../ui/Slider";
import { Button } from "../ui/Button";
import { formatTime } from "../../lib/formatting";
import type { VisualTransition, SliceLayoutStyle } from "../../types/project";
import {
  Layers,
  Move,
  Maximize2,
  ZoomIn,
  Video,
  Image as ImageIcon,
  Sparkles,
  Eye,
  Minimize2,
  AlignCenter,
  AlignVerticalJustifyCenter,
  Clock,
  Palette,
  Square,
  Sparkle,
  Users,
  FlipHorizontal,
  Trash2,
  Plus,
  Check,
  Settings,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  RotateCcw,
  Gauge,
} from "lucide-react";

const TRANSITIONS: { value: VisualTransition; label: string; desc: string }[] = [
  { value: "none", label: "Cut (None)", desc: "Standard instant cut" },
  { value: "fade", label: "Fade In/Out", desc: "Smooth opacity cross-fade" },
  { value: "pan-right", label: "Pan Right →", desc: "Cinematic pan from left to right" },
  { value: "pan-left", label: "← Pan Left", desc: "Cinematic pan from right to left" },
  { value: "pan-down", label: "Pan Down ↓", desc: "Cinematic pan from top to bottom" },
  { value: "pan-up", label: "↑ Pan Up", desc: "Cinematic pan from bottom to top" },
  { value: "zoom-in", label: "Zoom In", desc: "Ken Burns slow push in" },
  { value: "zoom-out", label: "Zoom Out", desc: "Ken Burns slow pull out" },
];

const videoDurationCache = new Map<string, number>();

export const SliceSettingsPanel: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const selectedSliceId = useEditorStore((s) => s.selectedSliceId);
  const selectSlice = useEditorStore((s) => s.selectSlice);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const updateSliceVisual = useEditorStore((s) => s.updateSliceVisual);
  const assignVisualToSlice = useEditorStore((s) => s.assignVisualToSlice);

  const assignCharacterToSlice = useEditorStore((s) => s.assignCharacterToSlice);
  const removeCharacterFromSlice = useEditorStore((s) => s.removeCharacterFromSlice);
  const updateSliceCharacter = useEditorStore((s) => s.updateSliceCharacter);
  const deleteSlice = useEditorStore((s) => s.deleteSlice);

  const characters = useCharacterStore((s) => s.characters);
  const setCharactersModalOpen = useCharacterStore((s) => s.setCharactersModalOpen);
  const [activeTab, setActiveTab] = useState<"visual" | "character">("visual");

  useEffect(() => {
    if (characters.length === 0) {
      useCharacterStore.getState().fetchCharacters().catch(() => {});
    }
  }, [characters.length]);

  if (!project) return null;

  if (project.slices.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 h-40">
        <Layers className="w-8 h-8 opacity-40 text-primary" />
        <p className="font-semibold text-foreground">No slices in this project.</p>
        <p className="text-[10px]">Create slices using the Slice Tool in the transcript panel.</p>
      </div>
    );
  }

  // Prioritize specifically selected slice first, then current playhead slice, then first slice
  const selectedSlice = selectedSliceId
    ? project.slices.find((s) => s.id === selectedSliceId)
    : null;

  const sortedSlices = React.useMemo(() => {
    return [...project.slices].sort((a, b) => a.start - b.start);
  }, [project.slices]);

  const currentPlayheadSlice = React.useMemo(() => {
    if (!sortedSlices || sortedSlices.length === 0) return null;
    if (currentTime < sortedSlices[0].start) return sortedSlices[0];
    for (let i = 0; i < sortedSlices.length; i++) {
      const slice = sortedSlices[i];
      const nextSlice = sortedSlices[i + 1];
      const sliceBoundaryEnd = nextSlice
        ? nextSlice.start
        : Math.max(slice.end, project.duration || slice.end);
      if (currentTime >= slice.start && currentTime < sliceBoundaryEnd) {
        return slice;
      }
    }
    return sortedSlices[sortedSlices.length - 1];
  }, [sortedSlices, currentTime, project.duration]);

  const activeSlice = selectedSlice || currentPlayheadSlice || sortedSlices[0];
  const activeIndex = activeSlice ? project.slices.findIndex((s) => s.id === activeSlice.id) : -1;

  const handleDeleteSlice = () => {
    if (!activeSlice) return;
    const currentIdx = activeIndex;
    const remaining = project.slices.filter((s) => s.id !== activeSlice.id);
    deleteSlice(activeSlice.id);

    if (remaining.length > 0) {
      const nextTarget = remaining[Math.min(currentIdx, remaining.length - 1)];
      selectSlice(nextTarget.id);
      setCurrentTime(nextTarget.start);
    } else {
      selectSlice(null);
    }
  };

  if (!activeSlice) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 h-40">
        <Layers className="w-6 h-6 opacity-40" />
        <p>No active or selected slice.</p>
        <p className="text-[10px]">Move the playhead or select a slice in the timeline.</p>
      </div>
    );
  }

  const visual = activeSlice.visual;
  const assignedAsset = visual
    ? project.mediaAssets.find((a) => a.id === visual.assetId)
    : null;

  const patchVisual = (patch: Partial<import("../../types/project").SliceVisual>) => {
    updateSliceVisual(activeSlice.id, patch);
  };

  const sliceChar = activeSlice.character;
  const assignedChar = sliceChar ? characters.find((c) => c.id === sliceChar.characterId) : null;
  const assignedPose = assignedChar?.poses.find((p) => p.id === sliceChar?.poseId) || assignedChar?.poses[0];

  const patchCharacter = (patch: Partial<import("../../types/character").SliceCharacter>) => {
    updateSliceCharacter(activeSlice.id, patch);
  };

  const layoutStyle: SliceLayoutStyle = visual?.layoutStyle || "fullscreen";
  const positionX = visual?.positionX ?? 50;
  const positionY = visual?.positionY ?? 50;
  const scale = visual?.scale ?? 1.0;
  const rotation = visual?.rotation ?? 0;
  const speed = visual?.speed ?? 1.0;
  const width = visual?.width ?? 75;
  const height = visual?.height ?? (assignedAsset?.type === "video" ? 25 : 39);
  const zoom = visual?.zoom ?? 1.0;
  const cropX = visual?.cropX ?? 0;
  const cropY = visual?.cropY ?? 0;
  const panCoverage = visual?.panCoverage ?? 100;
  const mediaStart = visual?.mediaStart ?? 0.0;
  const borderRadius = visual?.borderRadius ?? 16;
  const borderWidth = visual?.borderWidth ?? 0;
  const borderColor = visual?.borderColor ?? "#ffffff";
  const shadow = visual?.shadow ?? true;
  const transition = visual?.transition ?? "none";
  const isPan = transition.startsWith("pan-");

  // Determine source video duration across all lengths
  const [loadedVideoDuration, setLoadedVideoDuration] = useState<number | null>(() => {
    if (assignedAsset?.id && videoDurationCache.has(assignedAsset.id)) {
      return videoDurationCache.get(assignedAsset.id)!;
    }
    return assignedAsset?.duration ?? null;
  });

  useEffect(() => {
    if (!assignedAsset || assignedAsset.type !== "video") {
      setLoadedVideoDuration(null);
      return;
    }

    if (assignedAsset.duration && assignedAsset.duration > 0) {
      videoDurationCache.set(assignedAsset.id, assignedAsset.duration);
      setLoadedVideoDuration(assignedAsset.duration);
      return;
    }

    if (videoDurationCache.has(assignedAsset.id)) {
      const cached = videoDurationCache.get(assignedAsset.id)!;
      setLoadedVideoDuration(cached);
      return;
    }

    let isMounted = true;
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.src = getMediaUrl(assignedAsset.url);

    const onLoadedMetadata = () => {
      if (isMounted && vid.duration && isFinite(vid.duration) && vid.duration > 0) {
        videoDurationCache.set(assignedAsset.id, vid.duration);
        setLoadedVideoDuration(vid.duration);
        useEditorStore.getState().updateMediaAssetDuration(assignedAsset.id, vid.duration);
      }
    };

    vid.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      isMounted = false;
      vid.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [assignedAsset?.id, assignedAsset?.url, assignedAsset?.duration]);

  const effectiveVideoDuration =
    assignedAsset?.duration && assignedAsset.duration > 0
      ? assignedAsset.duration
      : (assignedAsset?.id && videoDurationCache.get(assignedAsset.id)) || loadedVideoDuration;

  const sliderMax = Math.max(
    mediaStart,
    effectiveVideoDuration && effectiveVideoDuration > 0
      ? Math.round(effectiveVideoDuration * 10) / 10
      : 60
  );

  const throttleSliderTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOffsetRef = React.useRef<number | null>(null);

  const handleSliderChange = React.useCallback(
    (val: number) => {
      const clamped = Math.min(sliderMax, Math.max(0, val));
      pendingOffsetRef.current = clamped;

      if (!throttleSliderTimerRef.current) {
        patchVisual({ mediaStart: clamped });
        throttleSliderTimerRef.current = setTimeout(() => {
          throttleSliderTimerRef.current = null;
          if (pendingOffsetRef.current !== null) {
            patchVisual({ mediaStart: pendingOffsetRef.current });
          }
        }, 40);
      }
    },
    [sliderMax, patchVisual]
  );

  React.useEffect(() => {
    return () => {
      if (throttleSliderTimerRef.current) clearTimeout(throttleSliderTimerRef.current);
    };
  }, []);

  const formatButtonLabel = (t: number) => {
    if (t === 0) return "0s";
    if (t < 60) return `${Math.round(t)}s`;
    const m = Math.floor(t / 60);
    const s = Math.round(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const quickJumpPoints = React.useMemo(() => {
    if (sliderMax <= 30) {
      const raw = [0, 5, 10, 15, 20, Math.floor(sliderMax)];
      return Array.from(new Set(raw.filter((t) => t <= sliderMax))).sort((a, b) => a - b);
    }
    const points = [
      0,
      Math.round(sliderMax * 0.25 * 10) / 10,
      Math.round(sliderMax * 0.5 * 10) / 10,
      Math.round(sliderMax * 0.75 * 10) / 10,
      Math.round(sliderMax * 10) / 10,
    ];
    return Array.from(new Set(points)).sort((a, b) => a - b);
  }, [sliderMax]);

  return (
    <div className="flex flex-col gap-3.5 text-xs select-none pb-6">
      {/* Target Slice Switcher & Direct Delete Toolbar */}
      <div className="p-2.5 rounded-lg bg-surface-elevated/90 border border-border/80 flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Target Slice</span>
          </div>
          <button
            type="button"
            onClick={handleDeleteSlice}
            title={`Delete SLICE ${activeIndex + 1}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-danger/15 hover:bg-danger text-danger hover:text-white border border-danger/30 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Slice</span>
          </button>
        </div>

        {/* Dropdown & Prev/Next Arrows */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => {
              if (activeIndex > 0) {
                const prev = project.slices[activeIndex - 1];
                selectSlice(prev.id);
                setCurrentTime(prev.start);
              }
            }}
            title="Previous slice"
            className="p-1.5 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-border/50"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <select
            value={activeSlice.id}
            onChange={(e) => {
              const chosen = project.slices.find((s) => s.id === e.target.value);
              if (chosen) {
                selectSlice(chosen.id);
                setCurrentTime(chosen.start);
              }
            }}
            className="bg-surface font-mono text-[11px] font-semibold text-foreground rounded px-2 py-1.5 border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-0 cursor-pointer truncate"
          >
            {project.slices.map((s, idx) => (
              <option key={s.id} value={s.id}>
                SLICE {String(idx + 1).padStart(2, "0")} ({s.start.toFixed(1)}s - {s.end.toFixed(1)}s)
                {s.text ? ` - "${s.text.slice(0, 18)}..."` : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={activeIndex >= project.slices.length - 1}
            onClick={() => {
              if (activeIndex < project.slices.length - 1) {
                const next = project.slices[activeIndex + 1];
                selectSlice(next.id);
                setCurrentTime(next.start);
              }
            }}
            title="Next slice"
            className="p-1.5 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-border/50"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slice Timing and Text summary */}
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/40">
          <span>
            {activeSlice.start.toFixed(2)}s → {activeSlice.end.toFixed(2)}s ({(activeSlice.end - activeSlice.start).toFixed(2)}s)
          </span>
          {activeSlice.text && (
            <span className="truncate max-w-[130px] text-foreground/80 font-sans italic" title={activeSlice.text}>
              "{activeSlice.text}"
            </span>
          )}
        </div>
      </div>

      {/* Asset Header */}
      <div className="p-2.5 rounded-lg bg-surface-elevated/60 border border-border/80 flex flex-col gap-1.5">

        {assignedAsset ? (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-foreground/90">
            {assignedAsset.type === "video" ? (
              <Video className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="truncate flex-1 font-mono text-[10px]">{assignedAsset.name}</span>
            <span className="text-[9px] uppercase font-bold text-muted-foreground px-1 bg-surface-hover rounded">
              {assignedAsset.type}
            </span>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            <span className="text-[11px] text-amber-400">No visual media assigned to this slice</span>
            {project.mediaAssets.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {project.mediaAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => assignVisualToSlice(activeSlice.id, asset.id, asset.type)}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-surface hover:bg-surface-hover border border-border text-foreground truncate max-w-[120px] cursor-pointer"
                    title={`Assign ${asset.name}`}
                  >
                    + {asset.name}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">Upload assets in Media Library to assign visuals.</span>
            )}
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-surface-elevated/70 p-1 rounded-lg border border-border/80">
        <button
          type="button"
          onClick={() => setActiveTab("visual")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
            activeTab === "visual"
              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Visual Media</span>
          {visual && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("character")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
            activeTab === "character"
              ? "bg-amber-400 text-black shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Character</span>
          {sliceChar && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>
      </div>

      {activeTab === "visual" && visual && (
        <>
          {/* Section 1: Layout Style (Full Screen vs Window PIP) */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              Layout Style
            </span>
            <div className="grid grid-cols-2 gap-1.5 bg-surface-elevated p-1 rounded-lg border border-border/80">
              <button
                type="button"
                onClick={() => patchVisual({ layoutStyle: "fullscreen" })}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
                  layoutStyle === "fullscreen"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Screen</span>
              </button>
              <button
                type="button"
                onClick={() => patchVisual({ layoutStyle: "window" })}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer ${
                  layoutStyle === "window"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Window (PIP)</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {layoutStyle === "fullscreen"
                ? "Visual fills the 9:16 background."
                : "Visual floats as an interactive window on top of background video."}
            </p>
          </div>

          {/* Section 2: Position & Scale (especially in Window PIP mode) */}
          {layoutStyle === "window" && (
            <div className="flex flex-col gap-3 p-2.5 rounded-lg bg-surface-elevated/40 border border-border/80">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-primary" />
                  <span>Window Position & Size</span>
                </span>
                {/* Quick alignment shortcuts */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => patchVisual({ positionX: 50, positionY: 25 })}
                    className="p-1 rounded bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground text-[10px]"
                    title="Align Top Center"
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ positionX: 50, positionY: 50 })}
                    className="p-1 rounded bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground text-[10px]"
                    title="Center Window"
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ positionX: 50, positionY: 75 })}
                    className="p-1 rounded bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground text-[10px]"
                    title="Align Bottom Center"
                  >
                    Bottom
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-primary/90 bg-primary/10 px-2 py-1 rounded">
                💡 Tip: You can also drag the window directly on the preview screen!
              </p>

              {/* Aspect Ratio Presets */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Aspect Ratio</span>
                  <span className="font-mono text-[10px] text-primary font-bold">
                    {((width / height) * (1080 / 1920)).toFixed(2)}:1
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => patchVisual({ width: 80, height: 25.3 })}
                    className="py-1 rounded bg-surface hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border/60 cursor-pointer"
                    title="16:9 Landscape Video"
                  >
                    16:9
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ width: 70, height: 39.4 })}
                    className="py-1 rounded bg-surface hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border/60 cursor-pointer"
                    title="1:1 Square"
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ width: 55, height: 55 })}
                    className="py-1 rounded bg-surface hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border/60 cursor-pointer"
                    title="9:16 Vertical Story"
                  >
                    9:16
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ width: 75, height: 31.6 })}
                    className="py-1 rounded bg-surface hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border/60 cursor-pointer"
                    title="4:3 Standard"
                  >
                    4:3
                  </button>
                </div>
              </div>

              <Slider
                label="Width (Side Handles)"
                value={Math.round(width)}
                min={15}
                max={95}
                step={1}
                unit="%"
                onChange={(val) => patchVisual({ width: val })}
              />

              <Slider
                label="Height (Top/Bottom Handles)"
                value={Math.round(height)}
                min={10}
                max={95}
                step={1}
                unit="%"
                onChange={(val) => patchVisual({ height: val })}
              />

              <Slider
                label="Horizontal Position (X)"
                value={Math.round(positionX)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(val) => patchVisual({ positionX: val })}
              />

              <Slider
                label="Vertical Position (Y)"
                value={Math.round(positionY)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(val) => patchVisual({ positionY: val })}
              />

              {/* Window Rotation */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Rotation Angle</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-cyan-400 font-bold">
                      {Math.round(rotation)}°
                    </span>
                    {Math.round(rotation) !== 0 && (
                      <button
                        type="button"
                        onClick={() => patchVisual({ rotation: 0 })}
                        className="text-[9px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <Slider
                  label="Rotation Angle"
                  value={Math.round(rotation)}
                  min={-180}
                  max={180}
                  step={1}
                  unit="°"
                  onChange={(val) => patchVisual({ rotation: val })}
                />

                <div className="grid grid-cols-6 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      let next = Math.round(rotation) - 90;
                      while (next < -180) next += 360;
                      patchVisual({ rotation: next });
                    }}
                    className="py-1 rounded bg-surface hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border/60 cursor-pointer flex items-center justify-center gap-0.5"
                    title="Rotate 90° CCW"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-cyan-400" />
                    <span>-90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ rotation: -15 })}
                    className={`py-1 rounded font-mono text-[10px] border border-border/60 cursor-pointer ${
                      Math.round(rotation) === -15 ? "bg-cyan-500 text-black font-bold" : "bg-surface hover:bg-surface-hover text-foreground"
                    }`}
                    title="Tilt -15°"
                  >
                    -15°
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ rotation: 0 })}
                    className={`py-1 rounded font-mono text-[10px] border border-border/60 cursor-pointer ${
                      Math.round(rotation) === 0 ? "bg-cyan-500 text-black font-bold" : "bg-surface hover:bg-surface-hover text-foreground"
                    }`}
                    title="Reset 0° Level"
                  >
                    0°
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ rotation: 15 })}
                    className={`py-1 rounded font-mono text-[10px] border border-border/60 cursor-pointer ${
                      Math.round(rotation) === 15 ? "bg-cyan-500 text-black font-bold" : "bg-surface hover:bg-surface-hover text-foreground"
                    }`}
                    title="Tilt +15°"
                  >
                    +15°
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      let next = Math.round(rotation) + 90;
                      while (next > 180) next -= 360;
                      patchVisual({ rotation: next });
                    }}
                    className="py-1 rounded bg-surface hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border/60 cursor-pointer flex items-center justify-center gap-0.5"
                    title="Rotate 90° CW"
                  >
                    <RotateCw className="w-2.5 h-2.5 text-cyan-400" />
                    <span>+90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ rotation: 180 })}
                    className={`py-1 rounded font-mono text-[10px] border border-border/60 cursor-pointer ${
                      Math.abs(Math.round(rotation)) === 180 ? "bg-cyan-500 text-black font-bold" : "bg-surface hover:bg-surface-hover text-foreground"
                    }`}
                    title="Invert 180°"
                  >
                    180°
                  </button>
                </div>
              </div>

              {/* Window Borders & Corner Radius */}
              <div className="h-[1px] bg-border/60 my-0.5" />

              <Slider
                label="Corner Radius"
                value={borderRadius}
                min={0}
                max={36}
                step={2}
                unit="px"
                onChange={(val) => patchVisual({ borderRadius: val })}
              />

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Border Width</span>
                <div className="flex items-center gap-1">
                  {[0, 2, 4].map((bw) => (
                    <button
                      key={bw}
                      type="button"
                      onClick={() => patchVisual({ borderWidth: bw })}
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        borderWidth === bw
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-surface text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {bw === 0 ? "None" : `${bw}px`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Drop Shadow</span>
                <input
                  type="checkbox"
                  checked={shadow}
                  onChange={(e) => patchVisual({ shadow: e.target.checked })}
                  className="rounded accent-primary cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Section 3: Zoom & Framing */}
          <div className="flex flex-col gap-3 p-2.5 rounded-lg bg-surface-elevated/40 border border-border/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-primary" />
                <span>Media Pan & Framing Offset</span>
              </span>
              <button
                type="button"
                onClick={() => patchVisual({ zoom: 1.0, cropX: 0, cropY: 0 })}
                className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Reset Framing
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Adjust horizontal & vertical framing to center off-center subjects in the 9:16 frame.
            </p>

            <Slider
              label="Horizontal Framing (X Offset)"
              value={Math.round(cropX)}
              min={-50}
              max={50}
              step={2}
              unit="%"
              onChange={(val) => patchVisual({ cropX: val })}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground -mt-1.5 px-0.5">
              <span>← Left (-50%)</span>
              <button
                type="button"
                onClick={() => patchVisual({ cropX: 0 })}
                className="text-primary hover:underline font-mono"
              >
                Center (0%)
              </button>
              <span>Right (+50%) →</span>
            </div>

            <Slider
              label="Vertical Framing (Y Offset)"
              value={Math.round(cropY)}
              min={-50}
              max={50}
              step={2}
              unit="%"
              onChange={(val) => patchVisual({ cropY: val })}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground -mt-1.5 px-0.5">
              <span>↑ Top (-50%)</span>
              <button
                type="button"
                onClick={() => patchVisual({ cropY: 0 })}
                className="text-primary hover:underline font-mono"
              >
                Center (0%)
              </button>
              <span>Bottom (+50%) ↓</span>
            </div>

            <Slider
              label="Content Zoom"
              value={Math.round(zoom * 100)}
              min={100}
              max={300}
              step={5}
              unit="%"
              onChange={(val) => patchVisual({ zoom: val / 100 })}
            />

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">Aspect Fit</span>
              <div className="flex items-center gap-1">
                {(["cover", "contain"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => patchVisual({ fit: f })}
                    className={`px-2 py-0.5 rounded text-[10px] capitalize ${
                      visual.fit === f || (!visual.fit && f === "cover")
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-surface text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Fullscreen Media Rotation & Orientation */}
            {layoutStyle === "fullscreen" && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-primary" />
                    <span>Media Orientation & Rotation</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-primary font-bold">
                      {Math.round(rotation)}°
                    </span>
                    {Math.round(rotation) !== 0 && (
                      <button
                        type="button"
                        onClick={() => patchVisual({ rotation: 0 })}
                        className="text-[9px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <Slider
                  label="Rotation Angle"
                  value={Math.round(rotation)}
                  min={-180}
                  max={180}
                  step={1}
                  unit="°"
                  onChange={(val) => patchVisual({ rotation: val })}
                />

                {/* Quick 90 deg turn buttons */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      let next = Math.round(rotation) - 90;
                      while (next < -180) next += 360;
                      patchVisual({ rotation: next });
                    }}
                    className="py-1 rounded bg-surface hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border/60 cursor-pointer flex items-center justify-center gap-1"
                    title="Rotate 90° CCW"
                  >
                    <RotateCcw className="w-3 h-3 text-primary" />
                    <span>-90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ rotation: 0 })}
                    className={`py-1 rounded font-mono text-[10px] border border-border/60 cursor-pointer ${
                      Math.round(rotation) === 0 ? "bg-primary text-primary-foreground font-bold" : "bg-surface hover:bg-surface-hover text-foreground"
                    }`}
                    title="Reset 0° Level"
                  >
                    0°
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      let next = Math.round(rotation) + 90;
                      while (next > 180) next -= 360;
                      patchVisual({ rotation: next });
                    }}
                    className="py-1 rounded bg-surface hover:bg-surface-hover text-foreground font-mono text-[10px] border border-border/60 cursor-pointer flex items-center justify-center gap-1"
                    title="Rotate 90° CW"
                  >
                    <RotateCw className="w-3 h-3 text-primary" />
                    <span>+90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => patchVisual({ rotation: 180 })}
                    className={`py-1 rounded font-mono text-[10px] border border-border/60 cursor-pointer ${
                      Math.abs(Math.round(rotation)) === 180 ? "bg-primary text-primary-foreground font-bold" : "bg-surface hover:bg-surface-hover text-foreground"
                    }`}
                    title="Invert 180°"
                  >
                    180°
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Video Start Time Offset (Only for Video assets) */}
          {assignedAsset?.type === "video" && (
            <div className="flex flex-col gap-3 p-2.5 rounded-lg bg-surface-elevated/40 border border-border/80">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Video Clip Start Offset</span>
                </span>
                <span className="font-mono text-xs text-indigo-400 font-bold">
                  {formatTime(mediaStart, true)}
                  {sliderMax > 0 && (
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                      / {formatTime(sliderMax, false)}
                    </span>
                  )}
                </span>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Set which second of the source video this slice starts playing from (covers entire video duration).
              </p>

              <Slider
                label="Start Offset (In-Point)"
                value={Math.round(mediaStart * 10) / 10}
                min={0}
                max={sliderMax}
                step={sliderMax > 300 ? 1 : 0.5}
                unit="s"
                valueDisplay={
                  mediaStart >= 60
                    ? `${formatButtonLabel(mediaStart)} (${mediaStart.toFixed(1)}s)`
                    : `${mediaStart.toFixed(1)}s`
                }
                onChange={handleSliderChange}
              />

              {/* Length indicator & Direct Second Input */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {sliderMax > 0 ? `Total: ${formatTime(sliderMax, false)} (${sliderMax.toFixed(1)}s)` : "Detecting length..."}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Sec:</span>
                  <input
                    type="number"
                    min={0}
                    max={sliderMax}
                    step={0.1}
                    value={Math.round(mediaStart * 10) / 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        patchVisual({ mediaStart: Math.max(0, Math.min(sliderMax, Math.round(val * 100) / 100)) });
                      }
                    }}
                    className="w-16 bg-surface px-1.5 py-0.5 rounded border border-border/80 text-[11px] font-mono text-foreground text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* Quick Jump Milestones across entire video */}
              <div className="flex items-center gap-1.5">
                {quickJumpPoints.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patchVisual({ mediaStart: t })}
                    title={`Jump to ${formatTime(t, true)} (${t.toFixed(1)}s)`}
                    className={`flex-1 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      Math.abs(mediaStart - t) < 0.3
                        ? "bg-indigo-500 text-white font-bold"
                        : "bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border/50"
                    }`}
                  >
                    {formatButtonLabel(t)}
                  </button>
                ))}
              </div>

              {/* Playback Speed Modifier */}
              <div className="h-[1px] bg-border/60 my-1" />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Playback Speed Modifier</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-indigo-400 font-bold">
                      {speed.toFixed(2)}x
                    </span>
                    {Math.abs(speed - 1.0) > 0.01 && (
                      <button
                        type="button"
                        onClick={() => patchVisual({ speed: 1.0 })}
                        className="text-[9px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        Reset 1.0x
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Slow-down or speed-up video playback for this slice (0.25x slow-mo to 4.0x fast-forward).
                </p>

                <Slider
                  label="Speed Rate"
                  value={Math.round(speed * 100) / 100}
                  min={0.25}
                  max={4.0}
                  step={0.05}
                  unit="x"
                  valueDisplay={`${speed.toFixed(2)}x`}
                  onChange={(val) => patchVisual({ speed: Math.max(0.2, Math.min(5.0, Math.round(val * 100) / 100)) })}
                />

                {/* Speed Presets */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { label: "0.25x", val: 0.25, title: "0.25x Slow Motion" },
                    { label: "0.5x", val: 0.5, title: "0.5x Half Speed" },
                    { label: "0.75x", val: 0.75, title: "0.75x Gentle Slow-Mo" },
                    { label: "1.0x", val: 1.0, title: "1.0x Normal Speed" },
                    { label: "1.25x", val: 1.25, title: "1.25x Brisk" },
                    { label: "1.5x", val: 1.5, title: "1.5x Fast" },
                    { label: "2.0x", val: 2.0, title: "2.0x Double Speed" },
                    { label: "3.0x", val: 3.0, title: "3.0x Triple Speed" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => patchVisual({ speed: p.val })}
                      title={p.title}
                      className={`py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                        Math.abs(speed - p.val) < 0.02
                          ? "bg-indigo-500 text-white font-bold"
                          : "bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Transition & Motion */}
          <div className="flex flex-col gap-2.5 p-2.5 rounded-lg bg-surface-elevated/40 border border-border/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-warning" />
                <span>Slice Visual Transition & Pan</span>
              </span>
              {isPan && (
                <span className="text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                  Active Pan Motion
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {TRANSITIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => patchVisual({ transition: t.value })}
                  title={t.desc}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium text-left truncate cursor-pointer transition-colors ${
                    transition === t.value
                      ? "bg-warning text-black font-bold shadow-xs"
                      : "bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Dedicated Pan Distance / Coverage Slider */}
            {isPan && (
              <div className="flex flex-col gap-2 p-2 rounded-lg bg-surface border border-warning/30 mt-1 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-warning">
                    <Move className="w-3 h-3" />
                    <span>Pan Distance / Image Reveal</span>
                  </div>
                  <span className="font-mono text-xs text-warning font-bold">
                    {panCoverage}%
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Determine how much of the image width or height is traversed during the slice duration.
                </p>

                <Slider
                  label="Pan Reveal Amount"
                  value={panCoverage}
                  min={20}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(val) => patchVisual({ panCoverage: val })}
                />

                <div className="flex items-center gap-1">
                  {[
                    { label: "50% Subtle", val: 50 },
                    { label: "75% Medium", val: 75 },
                    { label: "100% Full Image", val: 100 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => patchVisual({ panCoverage: p.val })}
                      className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border ${
                        panCoverage === p.val
                          ? "bg-warning text-black border-warning font-bold shadow-xs"
                          : "bg-surface-elevated text-muted-foreground hover:text-foreground border-border/60 hover:bg-surface-hover"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="text-[10px] text-emerald-400/90 bg-emerald-950/30 border border-emerald-500/20 px-2 py-1 rounded flex items-center gap-1">
                  <Sparkles className="w-3 h-3 flex-shrink-0" />
                  <span>
                    {transition === "pan-right" && "Starts from left-most edge and smoothly pans across to the right."}
                    {transition === "pan-left" && "Starts from right-most edge and smoothly pans across to the left."}
                    {transition === "pan-down" && "Starts from top and smoothly pans downward."}
                    {transition === "pan-up" && "Starts from bottom and smoothly pans upward."}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Character Overlay Settings Tab */}
      {activeTab === "character" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-100">
          {/* Global Character Library Button Bar */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/40 border border-border/80">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-foreground">Global Characters</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface text-muted-foreground border border-border">
                {characters.length} in library
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCharactersModalOpen(true)}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
              title="Open Global Characters Library"
            >
              <Plus className="w-3 h-3" />
              <span>Library</span>
            </button>
          </div>

          {sliceChar && assignedChar ? (
            <>
              {/* Active Character Card */}
              <div className="p-3 rounded-xl bg-surface-elevated/70 border border-amber-500/40 shadow-sm flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-black/50 border border-border overflow-hidden flex items-center justify-center p-1 relative">
                      {assignedPose ? (
                        <img
                          src={getMediaUrl(assignedPose.imageUrl)}
                          alt={assignedChar.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">{assignedChar.name}</span>
                      <span className="text-[10px] text-amber-400 font-medium">
                        Pose: {assignedPose?.name || "Default"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCharactersModalOpen(true)}
                      className="p-1.5 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Manage character and poses in Library"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCharacterFromSlice(activeSlice.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove character from this slice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Switch Character Dropdown if multiple exist */}
                {characters.length > 1 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Switch Char:</span>
                    <select
                      value={sliceChar.characterId}
                      onChange={(e) => {
                        const newChar = characters.find((c) => c.id === e.target.value);
                        if (newChar) {
                          assignCharacterToSlice(
                            activeSlice.id,
                            newChar.id,
                            newChar.defaultPoseId || newChar.poses[0]?.id || ""
                          );
                        }
                      }}
                      className="flex-1 px-2 py-1 rounded bg-surface text-[11px] text-foreground border border-border focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.poses.length} poses)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Pose Selection Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                    Pose Expression
                  </span>
                  <button
                    type="button"
                    onClick={() => setCharactersModalOpen(true)}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Add Pose</span>
                  </button>
                </div>

                {assignedChar.poses.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-border text-center flex flex-col items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">No poses uploaded for this character.</span>
                    <button
                      type="button"
                      onClick={() => setCharactersModalOpen(true)}
                      className="text-[10px] text-amber-400 underline cursor-pointer"
                    >
                      + Add poses in Characters Library
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {assignedChar.poses.map((pose) => {
                      const isActive = sliceChar.poseId === pose.id;
                      return (
                        <button
                          key={pose.id}
                          type="button"
                          onClick={() => patchCharacter({ poseId: pose.id })}
                          className={`p-1.5 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer group ${
                            isActive
                              ? "bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400/40 shadow-xs"
                              : "bg-surface hover:bg-surface-hover border-border/80 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="w-full aspect-square rounded bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:6px_6px] bg-black/40 flex items-center justify-center overflow-hidden p-1">
                            <img
                              src={getMediaUrl(pose.imageUrl)}
                              alt={pose.name}
                              className="max-w-full max-h-full object-contain filter drop-shadow-xs group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <span className="text-[10px] font-medium truncate w-full text-center">
                            {pose.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Staging Quick Presets */}
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                  Position Presets
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Bottom Right (Standard)", x: 75, y: 75 },
                    { label: "Bottom Left", x: 25, y: 75 },
                    { label: "Bottom Center", x: 50, y: 75 },
                    { label: "Center Screen", x: 50, y: 50 },
                  ].map((preset) => {
                    const isMatch =
                      Math.round(sliceChar.positionX ?? 75) === preset.x &&
                      Math.round(sliceChar.positionY ?? 75) === preset.y;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => patchCharacter({ positionX: preset.x, positionY: preset.y })}
                        className={`py-1.5 px-2 rounded text-[10px] font-medium transition-colors cursor-pointer border ${
                          isMatch
                            ? "bg-amber-400 text-black border-amber-400 font-bold shadow-xs"
                            : "bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border-border/80"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position and Size Sliders */}
              <div className="flex flex-col gap-3 p-3 rounded-lg bg-surface border border-border/80">
                <Slider
                  label="Horizontal Position (X)"
                  value={Math.round(sliceChar.positionX ?? 75)}
                  min={5}
                  max={95}
                  step={1}
                  unit="%"
                  onChange={(val) => patchCharacter({ positionX: val })}
                />

                <Slider
                  label="Vertical Position (Y)"
                  value={Math.round(sliceChar.positionY ?? 75)}
                  min={5}
                  max={95}
                  step={1}
                  unit="%"
                  onChange={(val) => patchCharacter({ positionY: val })}
                />

                <Slider
                  label="Character Width"
                  value={Math.round(sliceChar.width ?? 35)}
                  min={15}
                  max={90}
                  step={1}
                  unit="%"
                  onChange={(val) => patchCharacter({ width: val })}
                />

                <Slider
                  label="Character Height"
                  value={Math.round(sliceChar.height ?? 40)}
                  min={15}
                  max={90}
                  step={1}
                  unit="%"
                  onChange={(val) => patchCharacter({ height: val })}
                />
              </div>

              {/* Flip Orientation */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border/80">
                <div className="flex items-center gap-2">
                  <FlipHorizontal className="w-4 h-4 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">Flip Facing Direction</span>
                    <span className="text-[10px] text-muted-foreground">
                      Mirror character horizontally
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => patchCharacter({ flipX: !sliceChar.flipX })}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                    sliceChar.flipX
                      ? "bg-amber-400 text-black border-amber-400 shadow-xs"
                      : "bg-surface-elevated hover:bg-surface-hover text-foreground border-border"
                  }`}
                >
                  {sliceChar.flipX ? "Flipped" : "Normal"}
                </button>
              </div>

              {/* Canvas Drag Hint */}
              <div className="text-[10px] text-amber-300/90 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg flex items-start gap-2">
                <Move className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Interactive Canvas:</strong> Drag the character in the video preview to reposition, or drag its yellow edge & corner handles to resize!
                </span>
              </div>
            </>
          ) : (
            /* If no character is currently on this slice */
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-xl border border-dashed border-border text-center flex flex-col items-center gap-3 bg-surface/40">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-foreground">No Character on this Slice</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Add a character to react, talk, or narrate alongside this slice.
                  </p>
                </div>

                {characters.length > 0 ? (
                  <div className="w-full flex flex-col gap-2 mt-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground text-left">
                      Choose a Character to Add:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {characters.map((char) => {
                        const defaultPose = char.poses.find((p) => p.id === char.defaultPoseId) || char.poses[0];
                        return (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() =>
                              assignCharacterToSlice(
                                activeSlice.id,
                                char.id,
                                char.defaultPoseId || char.poses[0]?.id || ""
                              )
                            }
                            className="p-2 rounded-lg border border-border hover:border-amber-400/60 bg-surface hover:bg-surface-hover flex items-center gap-2 transition-all cursor-pointer text-left group"
                          >
                            <div className="w-8 h-8 rounded bg-black/40 border border-border/60 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {defaultPose ? (
                                <img
                                  src={getMediaUrl(defaultPose.imageUrl)}
                                  alt={char.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Users className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-foreground truncate group-hover:text-amber-300">
                                {char.name}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {char.poses.length} poses
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      You haven't created any characters in your global library yet.
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setCharactersModalOpen(true)}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Create Global Character
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Slice Action */}
      <div className="pt-2 border-t border-border/40 mt-1">
        <button
          type="button"
          onClick={handleDeleteSlice}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete This Slice</span>
        </button>
      </div>
    </div>
  );
};
