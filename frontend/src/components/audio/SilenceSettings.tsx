import React from "react";
import { Slider } from "../ui/Slider";

interface SilenceSettingsProps {
  thresholdDb: number;
  minSilenceMs: number;
  retentionPercent: number;
  onChangeThreshold: (val: number) => void;
  onChangeMinSilence: (val: number) => void;
  onChangeRetention: (val: number) => void;
  disabled?: boolean;
}

export const SilenceSettings: React.FC<SilenceSettingsProps> = ({
  thresholdDb,
  minSilenceMs,
  retentionPercent,
  onChangeThreshold,
  onChangeMinSilence,
  onChangeRetention,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-4 p-3 bg-surface-elevated/40 border border-border rounded-lg">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Silence Reduction
        </span>
        <span className="text-[10px] text-muted-foreground">FFmpeg Smart Gate</span>
      </div>

      <div className="flex flex-col gap-3">
        <Slider
          label="Silence Threshold"
          value={thresholdDb}
          min={-60}
          max={-15}
          step={1}
          unit=" dB"
          onChange={onChangeThreshold}
          className={disabled ? "opacity-50 pointer-events-none" : ""}
        />

        <Slider
          label="Minimum Silence"
          value={minSilenceMs}
          min={100}
          max={1000}
          step={50}
          unit=" ms"
          onChange={onChangeMinSilence}
          className={disabled ? "opacity-50 pointer-events-none" : ""}
        />

        <Slider
          label="Silence Retention"
          value={retentionPercent}
          min={0}
          max={50}
          step={5}
          unit="%"
          onChange={onChangeRetention}
          className={disabled ? "opacity-50 pointer-events-none" : ""}
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Preserves natural speech cadence by shortening pauses rather than abruptly cutting every silence.
      </p>
    </div>
  );
};
