import React from "react";
import { cn } from "../../lib/utils";
import { useEditorStore } from "../../stores/editorStore";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  valueDisplay?: React.ReactNode;
  onChange: (val: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  valueDisplay,
  onChange,
  onDragStart,
  onDragEnd,
  className,
}) => {
  const handlePointerDown = () => {
    useEditorStore.getState().beginBatch();
    onDragStart?.();
  };

  const handlePointerUp = () => {
    useEditorStore.getState().endBatch();
    onDragEnd?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(e.key)) {
      useEditorStore.getState().beginBatch();
    }
  };

  const handleKeyUp = () => {
    useEditorStore.getState().endBatch();
  };

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-mono text-foreground font-semibold">
          {valueDisplay !== undefined ? valueDisplay : `${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
      />
    </div>
  );
};
