import React, { useState, useEffect } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { RenderProgress } from "./RenderProgress";
import { useRenderJob } from "../../hooks/useRenderJob";
import { useEditorStore } from "../../stores/editorStore";
import { Film, Clock, Monitor, Settings2, Scissors, Check, Sparkles } from "lucide-react";
import type { RenderOptions } from "../../services/renderService";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ResolutionPreset = "720p" | "1080p" | "4k" | "custom";
type RangeMode = "full" | "custom";

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const { isRendering, renderJob, downloadUrl, error, startRender } = useRenderJob();

  const totalDuration = project?.duration || 10;

  const [resolution, setResolution] = useState<ResolutionPreset>("1080p");
  const [customWidth, setCustomWidth] = useState<number>(1080);
  const [customHeight, setCustomHeight] = useState<number>(1920);

  const [rangeMode, setRangeMode] = useState<RangeMode>("full");
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(totalDuration);

  // Sync initial end time when project duration is loaded
  useEffect(() => {
    if (project?.duration && (endTime === 10 || endTime > project.duration)) {
      setEndTime(Number(project.duration.toFixed(2)));
    }
  }, [project?.duration]);

  const effectiveStart = rangeMode === "full" ? 0 : Math.max(0, startTime);
  const effectiveEnd = rangeMode === "full" ? totalDuration : Math.min(totalDuration, Math.max(0, endTime));
  const exportDuration = Math.max(0, effectiveEnd - effectiveStart);
  const isTimeValid = rangeMode === "full" || exportDuration >= 0.2;

  const handleStartExport = () => {
    if (!isTimeValid) return;

    const options: RenderOptions = {
      resolution,
      fps: 30,
    };

    if (resolution === "custom") {
      options.customWidth = customWidth;
      options.customHeight = customHeight;
    }

    if (rangeMode === "custom") {
      options.startTime = effectiveStart;
      options.endTime = effectiveEnd;
    }

    startRender(options);
  };

  const getResolutionDisplay = () => {
    switch (resolution) {
      case "720p":
        return "720 × 1280 (HD)";
      case "1080p":
        return "1080 × 1920 (FHD)";
      case "4k":
        return "2160 × 3840 (4K UHD)";
      case "custom":
        return `${customWidth || 0} × ${customHeight || 0} (Custom)`;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Export Video"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isRendering}>
            {downloadUrl ? "Done" : "Cancel"}
          </Button>
          {!downloadUrl && !isRendering && (
            <Button
              variant="primary"
              onClick={handleStartExport}
              disabled={!isTimeValid}
              icon={<Film className="w-3.5 h-3.5" />}
            >
              Start Render
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4 text-xs">
        {!isRendering && !downloadUrl && !error && (
          <>
            {/* Resolution Section */}
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-primary" />
                Resolution
              </label>

              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { id: "1080p", label: "1080p", desc: "1080 × 1920", badge: "Default" },
                    { id: "720p", label: "720p", desc: "720 × 1280", badge: "Fast" },
                    { id: "4k", label: "4K", desc: "2160 × 3840", badge: "UHD" },
                    { id: "custom", label: "Custom", desc: "Manual W×H", badge: "" },
                  ] as const
                ).map((item) => {
                  const isSelected = resolution === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setResolution(item.id)}
                      className={`relative flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/40"
                          : "bg-surface-elevated/40 border-border hover:bg-surface-elevated hover:border-border/80 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`font-semibold text-xs ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface-elevated text-muted-foreground border border-border"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{item.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Resolution Inputs */}
              {resolution === "custom" && (
                <div className="flex items-center gap-2 p-2.5 bg-surface-elevated/40 border border-border rounded-lg animate-in fade-in">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground block mb-1">Width (px)</label>
                    <input
                      type="number"
                      step={2}
                      min={360}
                      max={4320}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Math.max(2, parseInt(e.target.value) || 0))}
                      className="w-full bg-surface border border-border rounded px-2.5 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <span className="text-muted-foreground pt-4 font-mono">×</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground block mb-1">Height (px)</label>
                    <input
                      type="number"
                      step={2}
                      min={360}
                      max={4320}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Math.max(2, parseInt(e.target.value) || 0))}
                      className="w-full bg-surface border border-border rounded px-2.5 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Time Range Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-primary" />
                  Render Range
                </label>
                <div className="flex rounded-md p-0.5 bg-surface-elevated border border-border">
                  <button
                    type="button"
                    onClick={() => setRangeMode("full")}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      rangeMode === "full"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Full Video ({totalDuration.toFixed(1)}s)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRangeMode("custom");
                      if (endTime <= startTime || endTime > totalDuration) {
                        setEndTime(Number(totalDuration.toFixed(2)));
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      rangeMode === "custom"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Trim Clip
                  </button>
                </div>
              </div>

              {rangeMode === "custom" && (
                <div className="flex flex-col gap-2 p-3 bg-surface-elevated/40 border border-border rounded-lg animate-in fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Start Time */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-muted-foreground font-medium">Start Time</label>
                        <button
                          type="button"
                          onClick={() => setStartTime(Number(currentTime.toFixed(2)))}
                          title="Set to current timeline playhead"
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                        >
                          <Clock className="w-2.5 h-2.5" />
                          Set {currentTime.toFixed(1)}s
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={totalDuration}
                          value={startTime}
                          onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                        />
                        <span className="text-[11px] text-muted-foreground font-mono">s</span>
                      </div>
                    </div>

                    {/* End Time */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-muted-foreground font-medium">End Time</label>
                        <button
                          type="button"
                          onClick={() => setEndTime(Number(Math.min(totalDuration, currentTime).toFixed(2)))}
                          title="Set to current timeline playhead"
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                        >
                          <Clock className="w-2.5 h-2.5" />
                          Set {currentTime.toFixed(1)}s
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={totalDuration}
                          value={endTime}
                          onChange={(e) => setEndTime(Math.min(totalDuration, parseFloat(e.target.value) || 0))}
                          className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                        />
                        <span className="text-[11px] text-muted-foreground font-mono">s</span>
                      </div>
                    </div>
                  </div>

                  {/* Range preview badge */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                    <span className="text-muted-foreground">Clip Duration:</span>
                    <span
                      className={`font-mono font-medium ${
                        isTimeValid ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {exportDuration.toFixed(2)} seconds
                    </span>
                  </div>

                  {!isTimeValid && (
                    <span className="text-[10px] text-destructive">
                      End time must be at least 0.2s after start time.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Export Summary Card */}
            <div className="p-3 bg-surface-elevated/50 border border-border rounded-lg flex flex-col gap-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Resolution:</span>
                <span className="text-foreground font-semibold">{getResolutionDisplay()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Export Range:</span>
                <span className="text-foreground font-semibold">
                  {effectiveStart.toFixed(1)}s – {effectiveEnd.toFixed(1)}s ({exportDuration.toFixed(1)}s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framerate:</span>
                <span className="text-foreground">30 FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audio Master:</span>
                <span className="text-foreground">44.1 kHz Stereo • 256k AAC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attached Slices:</span>
                <span className="text-primary font-semibold">{project?.slices.length || 0} slices</span>
              </div>
            </div>
          </>
        )}

        {(isRendering || downloadUrl || error) && (
          <RenderProgress
            job={renderJob}
            downloadUrl={downloadUrl}
            isRendering={isRendering}
            error={error}
            onClose={onClose}
          />
        )}
      </div>
    </Dialog>
  );
};
