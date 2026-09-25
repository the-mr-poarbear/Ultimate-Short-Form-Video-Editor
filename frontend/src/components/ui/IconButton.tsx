import React from "react";
import { cn } from "../../lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  title?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  className,
  variant = "ghost",
  size = "md",
  title,
  ...props
}) => {
  const variantClass = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
    secondary: "bg-surface-elevated hover:bg-surface-hover text-foreground border border-border",
    ghost: "hover:bg-surface-hover text-muted-foreground hover:text-foreground",
    danger: "hover:bg-danger/20 text-danger",
  }[variant];

  const sizeClass = {
    sm: "p-1 rounded text-xs",
    md: "p-1.5 rounded-md text-sm",
    lg: "p-2 rounded-md text-base",
  }[size];

  return (
    <button
      title={title}
      className={cn(
        "inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:pointer-events-none",
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
