import React from "react";
import { VideoPreview } from "./VideoPreview";
import { SliceSettingsPanel } from "./SliceSettingsPanel";
import { CaptionSettings } from "../captions/CaptionSettings";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { useEditorStore } from "../../stores/editorStore";
import { Layers, MonitorPlay, X, Type, SlidersHorizontal } from "lucide-react";

export const PreviewPanel: React.FC = () => {
  const { currentTime, isPlaying } = useAudioPlayer();
  const isSliceSettingsOpen = useEditorStore((s) => s.isSliceSettingsOpen);
  const setSliceSettingsOpen = useEditorStore((s) => s.setSliceSettingsOpen);
  const isCaptionSettingsOpen = useEditorStore((s) => s.isCaptionSettingsOpen);
  const setCaptionSettingsOpen = useEditorStore((s) => s.setCaptionSettingsOpen);

  const showDrawer = isSliceSettingsOpen || isCaptionSettingsOpen;
  const isShowingSlice = isSliceSettingsOpen;

  return (
    <div className="panel h-full flex flex-col relative overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-1.5">
          <MonitorPlay className="w-3.5 h-3.5 text-primary" />
          <span>9:16 Short Form Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">1080×1920 • 30fps</span>
          
          {/* Slice Settings Button (Replaced Caption Style in preview header) */}
          <button
            type="button"
            onClick={() => {
              if (isSliceSettingsOpen) {
                setSliceSettingsOpen(false);
              } else {
                setSliceSettingsOpen(true);
                setCaptionSettingsOpen(false);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              isSliceSettingsOpen
                ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/50"
                : "bg-surface-elevated hover:bg-surface-hover text-foreground/90 border border-border hover:border-primary/50"
            }`}
            title="Configure slice visual layout, position, video in-point, crop & zoom"
          >
            <SlidersHorizontal className="w-3 h-3 text-primary" />
            <span>Slice Settings</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex overflow-hidden">
        <div className="flex-1 h-full">
          <VideoPreview currentTime={currentTime} isPlaying={isPlaying} />
        </div>

        {/* Drawer for Slice Settings or Caption Settings */}
        {showDrawer && (
          <div className="w-80 border-l border-border bg-surface flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-150 shadow-xl z-20">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/80 bg-surface-elevated/40">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                {isShowingSlice ? (
                  <>
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>Slice Layout & Transform</span>
                  </>
                ) : (
                  <>
                    <Type className="w-3.5 h-3.5 text-primary" />
                    <span>Caption Typography & Style</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSliceSettingsOpen(false);
                  setCaptionSettingsOpen(false);
                }}
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-hover transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              {isShowingSlice ? <SliceSettingsPanel /> : <CaptionSettings />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
