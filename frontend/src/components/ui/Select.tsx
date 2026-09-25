import React from "react";
import { cn } from "../../lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  className,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-[11px] font-medium text-muted-foreground">{label}</label>}
      <select className={cn("select-field w-full", className)} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface text-foreground">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
