import { useState, useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useCharacterStore } from "../stores/characterStore";
import { projectService } from "../services/projectService";
import { audioService } from "../services/audioService";
import type { Project } from "../types/project";

export function useProject() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const setWaveformPeaks = useEditorStore((s) => s.setWaveformPeaks);

  const createNewProject = useCallback(async (title?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure characters are available
      useCharacterStore.getState().fetchCharacters().catch(() => {});
      const newProj = await projectService.createProject(title || "New Book Bite");
      setProject(newProj, true);
      return newProj;
    } catch (err: any) {
      setError(err.message || "Failed to create project");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setProject]);

  const loadProject = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure characters are loaded whenever a project is loaded
      useCharacterStore.getState().fetchCharacters().catch((err) => {
        console.warn("Could not load characters with project:", err);
      });

      const proj = await projectService.getProject(projectId);
      setProject(proj, true);

      // Load waveform peaks if processed audio exists
      if (proj.processedAudio || proj.originalAudio) {
        try {
          const wf = await audioService.getWaveform(projectId);
          if (wf.peaks) {
            setWaveformPeaks(wf.peaks);
          }
        } catch {
          // non-critical
        }
      }
      return proj;
    } catch (err: any) {
      setError(err.message || "Failed to load project");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setProject, setWaveformPeaks]);

  const saveProject = useCallback(async () => {
    await useEditorStore.getState().saveProject();
  }, []);

  const duplicateProject = useCallback(async (projectId: string, title?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const dup = await projectService.duplicateProject(projectId, title);
      return dup;
    } catch (err: any) {
      setError(err.message || "Failed to duplicate project");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await projectService.deleteProject(projectId);
      if (project?.id === projectId) {
        setProject(null, true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete project");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [project?.id, setProject]);

  const closeProject = useCallback(() => {
    setProject(null, true);
  }, [setProject]);

  return {
    project,
    isLoading,
    error,
    createNewProject,
    loadProject,
    saveProject,
    duplicateProject,
    deleteProject,
    closeProject,
  };
}
