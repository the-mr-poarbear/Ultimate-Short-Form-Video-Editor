import React, { useState } from "react";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineRuler } from "./TimelineRuler";
import { SliceTrack } from "./SliceTrack";
import { AudioTrack } from "./AudioTrack";
import { BgmTrack } from "./BgmTrack";
import { OverlayTrack } from "./OverlayTrack";
import { SfxTrack } from "./SfxTrack";
import { OverlayInspector } from "./OverlayInspector";
import { SfxInspector } from "./SfxInspector";
import { Playhead } from "./Playhead";
import { useTimeline } from "../../hooks/useTimeline";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { useEditorStore } from "../../stores/editorStore";

export const Timeline: React.FC = () => {
  const { zoom, totalWidth, zoomIn, zoomOut, resetZoom } = useTimeline();
  const { isPlaying, currentTime, seek, togglePlay } = useAudioPlayer();
  const duration = useEditorStore((s) => s.duration);
  const setBackgroundMusicModalOpen = useEditorStore((s) => s.setBackgroundMusicModalOpen);
  const setOverlaysModalOpen = useEditorStore((s) => s.setOverlaysModalOpen);
  const setSfxModalOpen = useEditorStore((s) => s.setSfxModalOpen);

  const [trackView, setTrackView] = useState<"all" | "primary" | "secondary">("all");

  const showPrimary = trackView === "all" || trackView === "primary";
  const showSecondary = trackView === "all" || trackView === "secondary";

  return (
    <div className="panel flex flex-col h-full overflow-hidden relative">
      <TimelineHeader
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onTogglePlay={togglePlay}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        trackView={trackView}
        onChangeTrackView={setTrackView}
        onOpenOverlaysModal={() => setOverlaysModalOpen(true)}
        onOpenSfxModal={() => setSfxModalOpen(true)}
      />

      <div
        id="timeline-scroll-container"
        className="flex-1 overflow-x-auto overflow-y-auto p-3 relative bg-background/50 scroll-smooth"
        style={{ scrollbarGutter: "stable" }}
      >
        <div className="relative pb-36" style={{ width: totalWidth, minWidth: "100%" }}>
          <TimelineRuler
            duration={duration}
            zoom={zoom}
            totalWidth={totalWidth}
            onSeek={seek}
          />

          <Playhead
            currentTime={currentTime}
            zoom={zoom}
            duration={duration}
            onSeek={seek}
          />

          {/* Primary Narration & Master Voiceover Tracks */}
          {showPrimary && (
            <>
              <SliceTrack
                zoom={zoom}
                totalWidth={totalWidth}
                onSeek={seek}
              />

              <AudioTrack
                zoom={zoom}
                totalWidth={totalWidth}
                onSeek={seek}
              />

              <BgmTrack
                zoom={zoom}
                totalWidth={totalWidth}
                onOpenBgmModal={() => setBackgroundMusicModalOpen(true)}
              />
            </>
          )}

          {/* Secondary Timeline: Overlays & Sound Effects */}
          {showSecondary && (
            <div className={`space-y-1 ${showPrimary ? "mt-2 pt-2 border-t border-border/60" : ""}`}>
              {showPrimary && (
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 font-bold">
                    Secondary Timeline • Visual FX & Audio Accents
                  </span>
                </div>
              )}

              <OverlayTrack
                zoom={zoom}
                totalWidth={totalWidth}
                onOpenOverlaysModal={() => setOverlaysModalOpen(true)}
              />

              <SfxTrack
                zoom={zoom}
                totalWidth={totalWidth}
                onOpenSfxModal={() => setSfxModalOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Property Inspectors when items are selected */}
      <OverlayInspector />
      <SfxInspector />
    </div>
  );
};
