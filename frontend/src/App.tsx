import React, { useEffect, useState } from "react";
import { EditorShell } from "./components/editor/EditorShell";
import { ProjectsDashboard } from "./components/projects/ProjectsDashboard";
import { useProject } from "./hooks/useProject";
import { projectService } from "./services/projectService";
import { useCharacterStore } from "./stores/characterStore";
import { Loader2 } from "lucide-react";

export const App = () => {
  const { project, createNewProject, loadProject } = useProject();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        // Pre-fetch global characters immediately on startup
        useCharacterStore.getState().fetchCharacters().catch((err) => {
          console.warn("Could not fetch characters on init:", err);
        });

        const list = await projectService.listProjects();
        const savedActiveId = localStorage.getItem("bookbite_active_project_id");
        if (savedActiveId && list.some((p) => p.id === savedActiveId)) {
          await loadProject(savedActiveId);
        }
      } catch (err: any) {
        console.warn("Could not connect to backend immediately:", err);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, [loadProject]);

  // Keep track of active project in localStorage
  useEffect(() => {
    if (project?.id) {
      localStorage.setItem("bookbite_active_project_id", project.id);
    } else {
      localStorage.removeItem("bookbite_active_project_id");
    }
  }, [project?.id]);

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-background text-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-mono">
          Initializing Book Bite Video Editor...
        </span>
      </div>
    );
  }

  if (project) {
    return <EditorShell />;
  }

  return (
    <ProjectsDashboard
      onOpenProject={async (id) => {
        await loadProject(id);
      }}
      onCreateProject={async (title, preset) => {
        await createNewProject(title);
      }}
    />
  );
};

export default App;
