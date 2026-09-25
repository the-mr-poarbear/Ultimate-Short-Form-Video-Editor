import React from "react";
import { TimelineHeader } from "./TimelineHeader";
import { TimelineRuler } from "./TimelineRuler";
import { SliceTrack } from "./SliceTrack";
import { AudioTrack } from "./AudioTrack";
import { BgmTrack } from "./BgmTrack";
import { Playhead } from "./Playhead";
import { useTimeline } from "../../hooks/useTimeline";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { useEditorStore } from "../../stores/editorStore";

export const Timeline: React.FC = () => {
  const { zoom, totalWidth, zoomIn, zoomOut, resetZoom } = useTimeline();
  const { isPlaying, currentTime, seek, togglePlay } = useAudioPlayer();
  const duration = useEditorStore((s) => s.duration);
  const setBackgroundMusicModalOpen = useEditorStore((s) => s.setBackgroundMusicModalOpen);

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <TimelineHeader
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onTogglePlay={togglePlay}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
      />

      <div
        id="timeline-scroll-container"
        className="flex-1 overflow-x-auto overflow-y-hidden p-3 relative bg-background/50"
      >
        <div className="relative" style={{ width: totalWidth, minWidth: "100%" }}>
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
        </div>
      </div>
    </div>
  );
};
