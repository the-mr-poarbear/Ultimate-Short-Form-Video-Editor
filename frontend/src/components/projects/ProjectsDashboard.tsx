import React, { useState, useEffect, useMemo } from "react";
import { ProjectCard } from "./ProjectCard";
import { CreateProjectModal } from "./CreateProjectModal";
import { CharactersModal } from "../characters/CharactersModal";
import type { Project } from "../../types/project";
import { projectService } from "../../services/projectService";
import { useCharacterStore } from "../../stores/characterStore";
import { Button } from "../ui/Button";
import {
  BookOpen,
  Plus,
  Search,
  ArrowUpDown,
  Sparkles,
  Layers,
  Clock,
  Music,
  FolderOpen,
  Play,
  RefreshCw,
  Loader2,
  Video,
  Users,
} from "lucide-react";
import { formatTime } from "../../lib/timeline";

interface ProjectsDashboardProps {
  onOpenProject: (projectId: string) => void;
  onCreateProject: (title: string, preset?: string) => Promise<void>;
}

type SortOption = "updated-desc" | "updated-asc" | "title-asc" | "duration-desc" | "slices-desc";
type FilterOption = "all" | "audio" | "transcript" | "no-audio";

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  onOpenProject,
  onCreateProject,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCharactersModalOpen = useCharacterStore((s) => s.isCharactersModalOpen);
  const setCharactersModalOpen = useCharacterStore((s) => s.setCharactersModalOpen);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await projectService.listProjects();
      setProjects(list);
    } catch (err: any) {
      setError(err.message || "Failed to load projects. Ensure backend server is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    useCharacterStore.getState().fetchCharacters().catch(() => {});
  }, []);

  const handleDuplicate = async (id: string) => {
    try {
      await projectService.duplicateProject(id);
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
    await onCreateProject(title, preset);
  };

  // Stats calculation
  const totalDuration = useMemo(
    () => projects.reduce((acc, p) => acc + (p.duration || 0), 0),
    [projects]
  );
  const totalSlices = useMemo(
    () => projects.reduce((acc, p) => acc + (p.slices?.length || 0), 0),
    [projects]
  );
  const projectsWithAudio = useMemo(
    () => projects.filter((p) => p.processedAudio || p.originalAudio).length,
    [projects]
  );

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchId = p.id.toLowerCase().includes(q);
          if (!matchTitle && !matchId) return false;
        }

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

  const mostRecentProject = projects.length > 0 ? projects[0] : null;

  return (
    <div className="min-h-screen w-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* Top Navbar */}
      <header className="h-14 px-6 border-b border-border/80 bg-surface/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <span>Book</span>
              <span className="text-primary">Bite</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-elevated text-muted-foreground border border-border">
                Video Studio
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCharactersModalOpen(true)}
            icon={<Users className="w-3.5 h-3.5 text-amber-400" />}
          >
            Configure Characters
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Create New Project
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-surface via-surface-elevated/70 to-surface p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl flex flex-col gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 w-fit">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Voiceover-Driven 9:16 Shorts Engine</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Browse & Create <span className="text-primary">Book Bite</span> Shorts
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Automated cadence optimization, WhisperX word-level forced alignment, and narrative
                timeline slicing for TikTok, Reels, and YouTube Shorts.
              </p>
            </div>

            {/* Quick Actions & Resume */}
            <div className="flex items-center gap-3">
              {mostRecentProject && (
                <button
                  type="button"
                  onClick={() => onOpenProject(mostRecentProject.id)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
                      Resume Recent
                    </span>
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors max-w-[140px] truncate">
                      {mostRecentProject.title}
                    </span>
                  </div>
                </button>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsCreateOpen(true)}
                className="py-3 px-5 text-sm font-semibold shadow-lg shadow-primary/20"
                icon={<Plus className="w-4 h-4" />}
              >
                New Project
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-foreground">{projects.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-mono">Projects</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-foreground">{projectsWithAudio}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-mono">Voiceovers</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-foreground">{totalSlices}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-mono">Total Slices</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-foreground">
                  {totalDuration > 0 ? formatTime(totalDuration) : "00:00"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-mono">Total Duration</div>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Explorer Toolbar */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by name or ID..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-surface-elevated/70 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-foreground placeholder:text-muted-foreground/60 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs & Sort */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center bg-surface-elevated/70 p-1 rounded-xl border border-border/80 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterBy("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
                  className="appearance-none bg-surface-elevated/80 border border-border rounded-xl pl-3 pr-8 py-1.5 text-xs text-foreground/90 focus:outline-none focus:border-primary cursor-pointer shadow-xs"
                >
                  <option value="updated-desc">Recently Updated</option>
                  <option value="updated-asc">Oldest First</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="duration-desc">Duration (Longest)</option>
                  <option value="slices-desc">Slice Count</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={fetchProjects}
                disabled={isLoading}
                className="p-2 rounded-xl bg-surface-elevated/80 border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Refresh projects list"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs">
              {error}
            </div>
          )}

          {/* Projects Grid */}
          {isLoading && projects.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Scanning project directory...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-border/80 rounded-2xl p-12 bg-surface/20 min-h-[320px]">
              <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-muted-foreground shadow-inner">
                <FolderOpen className="w-7 h-7 text-primary/70" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-semibold text-foreground">
                  {searchQuery ? "No matching projects" : "No projects found"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {searchQuery
                    ? `No project matched "${searchQuery}". Clear your search or change the filter.`
                    : "Ready to make your first short? Create a new project to upload voiceover narration, slice scenes, and export."}
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
                  size="md"
                  onClick={() => setIsCreateOpen(true)}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Create New Project
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={onOpenProject}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateNew}
      />

      {/* Global Characters Modal */}
      <CharactersModal
        isOpen={isCharactersModalOpen}
        onClose={() => setCharactersModalOpen(false)}
      />
    </div>
  );
};
