import React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  subLabel?: string;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  label,
  subLabel,
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      {(label || subLabel) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-foreground">{label}</span>}
          {subLabel && <span className="text-muted-foreground font-mono">{subLabel}</span>}
        </div>
      )}
      <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden border border-border/50">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
