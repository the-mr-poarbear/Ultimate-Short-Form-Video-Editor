import React, { useState } from "react";
import type { Project } from "../../types/project";
import {
  Clock,
  Layers,
  Music,
  Film,
  Sparkles,
  Copy,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  ArrowRight,
  MoreVertical,
} from "lucide-react";
import { formatTime } from "../../lib/timeline";

interface ProjectCardProps {
  project: Project;
  isActive?: boolean;
  onOpen: (projectId: string) => void;
  onDuplicate: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onRename: (projectId: string, newTitle: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isActive = false,
  onOpen,
  onDuplicate,
  onDelete,
  onRename,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(project.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Determine preview asset thumbnail or background
  const previewThumbnail =
    project.mediaAssets?.find((a) => a.thumbnailUrl || a.url)?.thumbnailUrl ||
    project.mediaAssets?.find((a) => a.thumbnailUrl || a.url)?.url;

  const hasAudio = Boolean(project.processedAudio || project.originalAudio);
  const hasTranscript = Boolean(project.transcript && project.transcript.length > 0);
  const sliceCount = project.slices?.length || 0;
  const mediaCount = project.mediaAssets?.length || 0;

  const handleSaveRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newTitle.trim() && newTitle.trim() !== project.title) {
      onRename(project.id, newTitle.trim());
    }
    setIsRenaming(false);
  };

  const formattedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={`group relative flex flex-col rounded-xl border transition-all duration-200 overflow-hidden bg-surface hover:bg-surface-elevated/70 ${
        isActive
          ? "border-primary/60 shadow-lg shadow-primary/10 ring-1 ring-primary/40"
          : "border-border hover:border-border/90 hover:shadow-md"
      }`}
    >
      {/* Top Banner / 9:16 Aspect Mini Preview */}
      <div className="relative h-36 w-full bg-gradient-to-br from-slate-900 via-surface-elevated to-slate-950 overflow-hidden flex items-center justify-center border-b border-border/60">
        {/* Background visual or gradient mesh */}
        {previewThumbnail ? (
          <img
            src={previewThumbnail}
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity group-hover:scale-105 duration-300"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
        )}

        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

        {/* 9:16 Badge Indicator in center if no image */}
        {!previewThumbnail && (
          <div className="relative flex flex-col items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="w-9 h-16 rounded border border-primary/40 bg-primary/10 flex items-center justify-center shadow-inner">
              <span className="text-[10px] font-mono text-primary font-bold">9:16</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">Shorts Format</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Active
              </span>
            )}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/60 text-foreground/80 backdrop-blur-md border border-white/10">
              ID: {project.id}
            </span>
          </div>

          {/* Quick Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="w-7 h-7 rounded-md bg-black/50 hover:bg-black/80 text-foreground/80 hover:text-foreground flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
              title="Project options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 bg-surface-elevated/95 backdrop-blur-md border border-border shadow-2xl rounded-lg p-1 z-30 flex flex-col gap-0.5 animate-in fade-in-0 zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpen(project.id);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-surface-hover rounded text-left transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-primary" />
                  <span>Open Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsRenaming(true);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-surface-hover rounded text-left transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Rename</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDuplicate(project.id);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-surface-hover rounded text-left transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Duplicate</span>
                </button>
                <div className="h-[1px] bg-border/60 my-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsConfirmingDelete(true);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 rounded text-left transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Project</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Duration Chip on Bottom Right of preview */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-black/75 text-foreground backdrop-blur-md border border-white/10">
          <Clock className="w-3 h-3 text-primary" />
          <span>{project.duration > 0 ? formatTime(project.duration) : "00:00"}</span>
        </div>
      </div>

      {/* Project Card Content Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Title or Inline Edit Form */}
          {isRenaming ? (
            <form onSubmit={handleSaveRename} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="flex-1 px-2 py-1 text-xs bg-surface-elevated border border-primary/50 rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
              <button
                type="submit"
                className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer"
                title="Save"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTitle(project.title);
                  setIsRenaming(false);
                }}
                className="p-1 rounded bg-surface-elevated text-muted-foreground hover:text-foreground cursor-pointer"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <h3
                onClick={() => onOpen(project.id)}
                className="font-semibold text-sm text-foreground/95 group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                title={project.title}
              >
                {project.title}
              </h3>
            </div>
          )}

          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Audio Status */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                hasAudio
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-surface-elevated text-muted-foreground border-border/50"
              }`}
            >
              <Music className="w-2.5 h-2.5" />
              {hasAudio ? "Voiceover" : "No Audio"}
            </span>

            {/* Transcript Status */}
            {hasTranscript && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                Transcribed
              </span>
            )}

            {/* Slices count */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-elevated text-foreground/80 border border-border/60">
              <Layers className="w-2.5 h-2.5 text-muted-foreground" />
              {sliceCount} {sliceCount === 1 ? "slice" : "slices"}
            </span>

            {/* Media assets count */}
            {mediaCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-elevated text-foreground/80 border border-border/60">
                <Film className="w-2.5 h-2.5 text-muted-foreground" />
                {mediaCount} {mediaCount === 1 ? "asset" : "assets"}
              </span>
            )}
          </div>
        </div>

        {/* Footer: Date & Open Button */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
          <span className="text-muted-foreground text-[10px]">
            {formattedDate ? `Updated ${formattedDate}` : "Recently created"}
          </span>

          <button
            type="button"
            onClick={() => onOpen(project.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 transition-all cursor-pointer shadow-xs group-hover:border-primary"
          >
            <span>Open</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      {isConfirmingDelete && (
        <div
          className="absolute inset-0 bg-background/95 backdrop-blur-sm z-40 p-4 flex flex-col justify-center items-center text-center gap-2.5 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-9 h-9 rounded-full bg-danger/10 text-danger flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs text-foreground">Delete this project?</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px] truncate">
              "{project.title}"
            </div>
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
              This action cannot be undone.
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="px-2.5 py-1 text-xs rounded bg-surface-elevated hover:bg-surface-hover text-foreground/90 border border-border cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirmingDelete(false);
                onDelete(project.id);
              }}
              className="px-2.5 py-1 text-xs rounded bg-danger hover:bg-danger/90 text-white font-medium cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
