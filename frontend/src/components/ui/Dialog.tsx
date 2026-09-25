import React from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = "max-w-md",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className={`bg-surface border border-border rounded-lg shadow-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${className}`}>
        <div className="panel-header">
          <span className="font-semibold text-foreground text-xs uppercase tracking-wider">{title}</span>
          <IconButton size="sm" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 bg-surface-elevated/40 border-t border-border flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
