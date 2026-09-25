import { useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";

/**
 * Automatically saves the current project 2.5 seconds after changes stop,
 * and warns user if navigating away with unsaved changes.
 */
export function useAutoSave() {
  const project = useEditorStore((s) => s.project);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const saveProject = useEditorStore((s) => s.saveProject);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save effect
  useEffect(() => {
    if (!project || !isDirty || isSaving) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      saveProject();
    }, 2500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [project, isDirty, isSaving, saveProject]);

  // Window unload warning if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
}
