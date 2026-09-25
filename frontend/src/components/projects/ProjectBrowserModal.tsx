import React, { useState, useEffect, useMemo } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { ProjectCard } from "./ProjectCard";
import { CreateProjectModal } from "./CreateProjectModal";
import type { Project } from "../../types/project";
import { projectService } from "../../services/projectService";
import {
  Search,
  Plus,
  ArrowUpDown,
  Filter,
  FolderOpen,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface ProjectBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject?: (title: string, preset?: string) => Promise<void>;
}

type SortOption = "updated-desc" | "updated-asc" | "title-asc" | "duration-desc" | "slices-desc";
type FilterOption = "all" | "audio" | "transcript" | "no-audio";

export const ProjectBrowserModal: React.FC<ProjectBrowserModalProps> = ({
  isOpen,
  onClose,
  activeProjectId,
  onSelectProject,
  onCreateProject,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await projectService.listProjects();
      setProjects(list);
    } catch (err: any) {
      setError(err.message || "Failed to load projects list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleOpenProject = (id: string) => {
    onSelectProject(id);
    onClose();
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await projectService.duplicateProject(id);
      await fetchProjects();
    } catch (err: any) {
      alert(`Failed to duplicate project: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectService.deleteProject(id);
      await fetchProjects();
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const target = projects.find((p) => p.id === id);
      if (!target) return;
      await projectService.updateProject({
        ...target,
        title: newTitle,
      });
      await fetchProjects();
    } catch (err: any) {
      alert(`Failed to rename project: ${err.message}`);
    }
  };

  const handleCreateNew = async (title: string, preset?: string) => {
    if (onCreateProject) {
      await onCreateProject(title, preset);
      onClose();
    } else {
      const created = await projectService.createProject(title);
      await fetchProjects();
      onSelectProject(created.id);
      onClose();
    }
  };

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchId = p.id.toLowerCase().includes(q);
          if (!matchTitle && !matchId) return false;
        }

        // Filter tab
        if (filterBy === "audio") {
          return Boolean(p.processedAudio || p.originalAudio);
        }
        if (filterBy === "no-audio") {
          return !p.processedAudio && !p.originalAudio;
        }
        if (filterBy === "transcript") {
          return Boolean(p.transcript && p.transcript.length > 0);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "updated-desc") {
          return (b.updatedAt || "").localeCompare(a.updatedAt || "");
        }
        if (sortBy === "updated-asc") {
          return (a.updatedAt || "").localeCompare(b.updatedAt || "");
        }
        if (sortBy === "title-asc") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "duration-desc") {
          return (b.duration || 0) - (a.duration || 0);
        }
        if (sortBy === "slices-desc") {
          return (b.slices?.length || 0) - (a.slices?.length || 0);
        }
        return 0;
      });
  }, [projects, searchQuery, filterBy, sortBy]);

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="Project Library"
        className="max-w-4xl max-h-[90vh] flex flex-col"
      >
        <div className="flex flex-col gap-4 overflow-hidden -mx-4 -mb-4 px-4 pb-4">
          {/* Top Bar: Search, Filters, Sort & New Project CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by title or ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-elevated/70 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-foreground placeholder:text-muted-foreground/60 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Controls: Filter chips, Sort & Create Button */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter chips */}
              <div className="flex items-center bg-surface-elevated/60 p-0.5 rounded-lg border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterBy("all")}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    filterBy === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({projects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterBy("audio")}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    filterBy === "audio"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  With Audio
                </button>
                <button
                  type="button"
                  onClick={() => setFilterBy("transcript")}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    filterBy === "transcript"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Transcribed
                </button>
              </div>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-surface-elevated/80 border border-border rounded-lg pl-2.5 pr-7 py-1 text-xs text-foreground/90 focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="updated-desc">Recent</option>
                  <option value="updated-asc">Oldest</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="duration-desc">Duration</option>
                  <option value="slices-desc">Slices Count</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Refresh button */}
              <button
                type="button"
                onClick={fetchProjects}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-surface-elevated/80 border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Refresh projects list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
              </button>

              {/* New Project Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                New Project
              </Button>
            </div>
          </div>

          {/* Project List / Grid Area */}
          <div className="flex-1 overflow-y-auto max-h-[60vh] min-h-[280px] pr-1">
            {isLoading && projects.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Loading projects...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-center border border-dashed border-border/80 rounded-xl p-6 bg-surface/30">
                <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-muted-foreground">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {searchQuery ? "No matching projects found" : "No projects created yet"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {searchQuery
                      ? `No projects matched "${searchQuery}". Try a different search term or clear the filter.`
                      : "Create your first Book Bite Short to begin narrating, slicing, and producing vertical shorts."}
                  </p>
                </div>
                {searchQuery ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterBy("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCreateOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Create New Project
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isActive={p.id === activeProjectId}
                    onOpen={handleOpenProject}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Embedded Create Project Dialog */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateNew}
      />
    </>
  );
};
