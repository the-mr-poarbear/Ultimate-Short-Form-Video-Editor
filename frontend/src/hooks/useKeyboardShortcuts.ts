import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";

/**
 * Handles global hotkeys:
 * - Ctrl+Z / Cmd+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z: Redo
 * - Ctrl+S / Cmd+S: Save Project
 */
export function useKeyboardShortcuts() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const saveProject = useEditorStore((s) => s.saveProject);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Save: Ctrl+S / Cmd+S (Always intercepted anywhere)
      if (key === "s") {
        e.preventDefault();
        saveProject();
        return;
      }

      // Redo: Ctrl+Y OR Ctrl+Shift+Z
      if (key === "y" || (key === "z" && e.shiftKey)) {
        if (!isTextInput) {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Undo: Ctrl+Z (without Shift)
      if (key === "z" && !e.shiftKey) {
        if (!isTextInput) {
          e.preventDefault();
          undo();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo, saveProject]);
}
