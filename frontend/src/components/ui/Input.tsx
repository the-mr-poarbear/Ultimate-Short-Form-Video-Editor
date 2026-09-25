import React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-[11px] font-medium text-muted-foreground">{label}</label>}
      <input className={cn("input-field w-full", className)} {...props} />
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </div>
  );
};
