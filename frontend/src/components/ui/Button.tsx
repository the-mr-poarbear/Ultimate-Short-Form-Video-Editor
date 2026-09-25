import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = "secondary",
  size = "md",
  icon,
  ...props
}) => {
  const variantClass = {
    primary: "editor-btn-primary",
    secondary: "editor-btn-secondary",
    ghost: "editor-btn-ghost",
    danger: "editor-btn-danger",
  }[variant];

  const sizeClass = {
    sm: "px-2 py-1 text-[11px]",
    md: "px-3 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  }[size];

  return (
    <button className={cn(variantClass, sizeClass, className)} {...props}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
