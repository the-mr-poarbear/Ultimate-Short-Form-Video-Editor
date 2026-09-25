import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import {
  BookOpen,
  Sparkles,
  Download,
  Music,
  Volume2,
  Type,
  Undo2,
  Redo2,
  Save,
  Check,
  Loader2,
  ChevronDown,
  Scissors,
  Sliders,
  FolderOpen,
  Plus,
  Home,
  FileAudio,
  Users,
} from "lucide-react";

interface EditorHeaderProps {
  onOpenAudioUpload: () => void;
  onOpenSilenceSettings: () => void;
  onTranscribe: () => void;
  onOpenExport: () => void;
  onOpenProjectBrowser: () => void;
  onOpenCreateProject: () => void;
  onCloseToDashboard: () => void;
  onOpenBackgroundMusic: () => void;
  onOpenCharacters?: () => void;
  isTranscribing?: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onOpenAudioUpload,
  onOpenSilenceSettings,
  onTranscribe,
  onOpenExport,
  onOpenProjectBrowser,
  onOpenCreateProject,
  onCloseToDashboard,
  onOpenBackgroundMusic,
  onOpenCharacters,
  isTranscribing = false,
}) => {
  const project = useEditorStore((s) => s.project);
  const updateProjectTitle = useEditorStore((s) => s.updateProjectTitle);
  const isCaptionSettingsOpen = useEditorStore((s) => s.isCaptionSettingsOpen);
  const setCaptionSettingsOpen = useEditorStore((s) => s.setCaptionSettingsOpen);
  const isSliceMode = useEditorStore((s) => s.isSliceMode);
  const setSliceMode = useEditorStore((s) => s.setSliceMode);

  // History & Save state
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const saveProject = useEditorStore((s) => s.saveProject);

  // Dropdown states
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isCaptionMenuOpen, setIsCaptionMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);

  const voiceMenuRef = useRef<HTMLDivElement | null>(null);
  const captionMenuRef = useRef<HTMLDivElement | null>(null);
  const projectMenuRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(target)) {
        setIsVoiceMenuOpen(false);
      }
      if (captionMenuRef.current && !captionMenuRef.current.contains(target)) {
        setIsCaptionMenuOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setIsProjectMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVoiceMenuOpen(false);
        setIsCaptionMenuOpen(false);
        setIsProjectMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const hasAudio = Boolean(project?.processedAudio || project?.originalAudio);
  const hasTranscript = Boolean(project?.transcript && project.transcript.length > 0);
  const hasBgm = Boolean(project?.backgroundMusic);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateProjectTitle(e.target.value);
  };

  const getSavedTooltip = () => {
    if (!lastSavedAt) return "All changes saved to project";
    return `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  };

  return (
    <header className="h-12 px-4 bg-surface border-b border-border flex items-center justify-between select-none relative z-40">
      {/* Brand, Project Selector & Title, Undo/Redo & Save Status */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 pr-2.5 border-r border-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground hidden sm:inline">
            Book <span className="text-primary">Bite</span>
          </span>
        </div>

        {/* Projects Switcher & Menu */}
        <div className="relative" ref={projectMenuRef}>
          <div className="flex items-center rounded-md bg-surface-elevated/70 border border-border/80 hover:border-border transition-colors">
            <button
              type="button"
              onClick={onOpenProjectBrowser}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-foreground/90 hover:text-foreground hover:bg-surface-hover rounded-l-md transition-colors cursor-pointer"
              title="Browse All Projects (Ctrl+O)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-primary" />
              <span>Projects</span>
            </button>

            <div className="w-[1px] h-3.5 bg-border/80" />

            <button
              type="button"
              onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
              className="px-1.5 py-1 text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-r-md transition-colors cursor-pointer"
              title="Project actions"
            >
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isProjectMenuOpen ? "rotate-180 text-primary" : ""}`} />
            </button>
          </div>

          {/* Project Quick Menu Dropdown */}
          {isProjectMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-surface-elevated/95 backdrop-blur-md border border-border shadow-2xl rounded-lg p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col gap-0.5">
              <div className="px-2.5 py-1.5 border-b border-border/60">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Current Project</div>
                <div className="text-xs font-semibold text-foreground truncate">{project?.title || "Untitled Project"}</div>
                <div className="text-[10px] font-mono text-muted-foreground">ID: {project?.id}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProjectMenuOpen(false);
                  onOpenProjectBrowser();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-foreground font-medium">Browse All Projects</span>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground bg-surface px-1.5 py-0.5 rounded border border-border/60">Ctrl+O</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProjectMenuOpen(false);
                  onOpenCreateProject();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-foreground font-medium">Create New Project</span>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground bg-surface px-1.5 py-0.5 rounded border border-border/60">Ctrl+N</span>
              </button>

              <div className="h-[1px] bg-border/60 my-1" />

              <button
                type="button"
                onClick={() => {
                  setIsProjectMenuOpen(false);
                  onCloseToDashboard();
                }}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Home className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Exit to Projects Hub</span>
              </button>
            </div>
          )}
        </div>

        {/* Project Title Input */}
        <input
          type="text"
          value={project?.title || "Book Bite Short"}
          onChange={handleTitleChange}
          className="bg-transparent text-xs font-semibold text-foreground/90 hover:bg-surface-elevated/40 focus:bg-surface-elevated focus:outline-none px-2 py-1 rounded transition-colors max-w-[170px] truncate"
          title="Click to rename project"
        />

        {/* Undo / Redo buttons */}
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-elevated/40 border border-border/50">
          <IconButton
            size="sm"
            onClick={undo}
            disabled={past.length === 0}
            title={past.length > 0 ? `Undo (${past.length} actions) • Ctrl+Z` : "Nothing to undo"}
            className="disabled:opacity-25 disabled:cursor-not-allowed hover:text-primary transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="sm"
            onClick={redo}
            disabled={future.length === 0}
            title={future.length > 0 ? `Redo (${future.length} actions) • Ctrl+Y` : "Nothing to redo"}
            className="disabled:opacity-25 disabled:cursor-not-allowed hover:text-primary transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>

        {/* Save Status & Button */}
        <button
          type="button"
          onClick={() => saveProject()}
          disabled={isSaving || !project}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
            isSaving
              ? "bg-surface-elevated text-muted-foreground border border-border"
              : isDirty
              ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-xs ring-1 ring-amber-500/30"
              : "bg-surface-elevated/60 hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border/40"
          }`}
          title={isDirty ? "Save project changes now (Ctrl+S)" : getSavedTooltip()}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>Saving...</span>
            </>
          ) : isDirty ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <Save className="w-3 h-3 text-amber-400" />
              <span>Save Changes</span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400/90 font-mono text-[10px]">Saved</span>
            </>
          )}
        </button>
      </div>

      {/* Main Navbar Dropdown Menus & Actions */}
      <div className="flex items-center gap-2">
        {/* Dropdown 1: Voice */}
        <div className="relative" ref={voiceMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsVoiceMenuOpen(!isVoiceMenuOpen);
              setIsCaptionMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isVoiceMenuOpen
                ? "bg-surface-elevated text-foreground border border-primary/50 shadow-xs ring-1 ring-primary/30"
                : "bg-surface-elevated/70 hover:bg-surface-hover text-foreground/90 border border-border/80"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-primary" />
              <span>Voice</span>
              {hasAudio && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </div>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isVoiceMenuOpen ? "rotate-180 text-primary" : ""}`} />
          </button>

          {isVoiceMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-surface-elevated/95 backdrop-blur-md border border-border shadow-2xl rounded-lg p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsVoiceMenuOpen(false);
                  onOpenAudioUpload();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Load Voiceover</div>
                    <div className="text-[10px] text-muted-foreground">Upload MP3, WAV or voice audio</div>
                  </div>
                </div>
                {hasAudio && <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVoiceMenuOpen(false);
                  onOpenSilenceSettings();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Silence Settings</div>
                    <div className="text-[10px] text-muted-foreground">Detection dB & retention percent</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVoiceMenuOpen(false);
                  onOpenSilenceSettings();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Voice Settings</div>
                    <div className="text-[10px] text-muted-foreground">Normalization, threshold & levels</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVoiceMenuOpen(false);
                  onOpenBackgroundMusic();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Background Music (BGM)</div>
                    <div className="text-[10px] text-muted-foreground">
                      {hasBgm ? `${project?.backgroundMusic?.filename || "Attached"} (${Math.round((project?.backgroundMusic?.volume ?? 0.15) * 100)}%)` : "Presets, custom upload & ducking"}
                    </div>
                  </div>
                </div>
                {hasBgm && <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">Active</span>}
              </button>

              <div className="h-[1px] bg-border/60 my-1" />

              <button
                type="button"
                disabled={!hasAudio || isTranscribing}
                onClick={() => {
                  setIsVoiceMenuOpen(false);
                  onTranscribe();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-primary/15 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-primary">Transcribe & Slice</div>
                    <div className="text-[10px] text-muted-foreground">
                      {isTranscribing ? "WhisperX processing..." : "Auto-align text to narration"}
                    </div>
                  </div>
                </div>
                {hasTranscript && <span className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">Synced</span>}
              </button>
            </div>
          )}
        </div>

        {/* Music Button */}
        <button
          type="button"
          onClick={onOpenBackgroundMusic}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            hasBgm
              ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/25 shadow-xs"
              : "bg-surface-elevated/70 hover:bg-surface-hover text-foreground/90 border border-border/80"
          }`}
          title="Configure background music track"
        >
          <Music className={`w-3.5 h-3.5 ${hasBgm ? "text-indigo-400" : "text-muted-foreground"}`} />
          <span>Music</span>
          {hasBgm && (
            <span className="text-[10px] font-mono font-medium text-indigo-300 bg-indigo-500/25 px-1.5 py-0.2 rounded">
              {Math.round((project?.backgroundMusic?.volume ?? 0.15) * 100)}%
            </span>
          )}
        </button>

        {/* Characters Library Button */}
        {onOpenCharacters && (
          <button
            type="button"
            onClick={onOpenCharacters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer bg-surface-elevated/70 hover:bg-surface-hover text-foreground/90 border border-border/80 hover:border-amber-400/50"
            title="Configure character models and poses globally"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Characters</span>
          </button>
        )}

        {/* Dropdown 2: Caption Settings */}
        <div className="relative" ref={captionMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsCaptionMenuOpen(!isCaptionMenuOpen);
              setIsVoiceMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isCaptionMenuOpen || isCaptionSettingsOpen
                ? "bg-surface-elevated text-foreground border border-primary/50 shadow-xs ring-1 ring-primary/30"
                : "bg-surface-elevated/70 hover:bg-surface-hover text-foreground/90 border border-border/80"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-primary" />
              <span>Caption Settings</span>
              {isSliceMode && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </div>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isCaptionMenuOpen ? "rotate-180 text-primary" : ""}`} />
          </button>

          {isCaptionMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-surface-elevated/95 backdrop-blur-md border border-border shadow-2xl rounded-lg p-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsCaptionMenuOpen(false);
                  setCaptionSettingsOpen(!isCaptionSettingsOpen);
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Type className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Caption Style</div>
                    <div className="text-[10px] text-muted-foreground">Colors, typography, stroke & position</div>
                  </div>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isCaptionSettingsOpen ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-muted-foreground"}`}>
                  {isCaptionSettingsOpen ? "Open" : "Edit"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSliceMode(!isSliceMode);
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md hover:bg-surface-hover transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                    <Scissors className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">Slice Tool</div>
                    <div className="text-[10px] text-muted-foreground">Click words in transcript to slice</div>
                  </div>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${isSliceMode ? "bg-warning text-black" : "bg-surface-elevated text-muted-foreground"}`}>
                  {isSliceMode ? "ON" : "OFF"}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Export Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenExport}
          disabled={!hasAudio}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          Export 9:16 Short
        </Button>
      </div>
    </header>
  );
};
