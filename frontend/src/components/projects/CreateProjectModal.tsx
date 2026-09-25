import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { BookOpen, Sparkles, Zap, Plus, Video, Sliders } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, preset?: string) => Promise<void>;
  isLoading?: boolean;
}

interface PresetOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  defaultTitle: string;
}

const PRESETS: PresetOption[] = [
  {
    id: "book-bite",
    name: "Book Bite Short",
    description: "Standard 9:16 narrative short with automated silence reduction and yellow caption highlights.",
    icon: <BookOpen className="w-4 h-4 text-primary" />,
    badge: "Popular",
    defaultTitle: "Atomic Habits - Chapter Bite",
  },
  {
    id: "fast-hook",
    name: "Fast-Paced Hook",
    description: "High-cadence pacing, aggressive silence threshold (-38dB) optimized for retention on TikTok & Reels.",
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    badge: "Viral",
    defaultTitle: "3 Brutal Truths About Focus",
  },
  {
    id: "wisdom-quote",
    name: "Wisdom & Quotes",
    description: "Cinematic pacing with bold typography and smooth media window overlays.",
    icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
    defaultTitle: "Marcus Aurelius on Resilience",
  },
  {
    id: "blank",
    name: "Blank Canvas",
    description: "Clean project slate ready for voiceover audio upload and custom slicing.",
    icon: <Plus className="w-4 h-4 text-foreground/70" />,
    defaultTitle: "Untitled Bite Short",
  },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("book-bite");
  const [title, setTitle] = useState<string>("Book Bite Short #1");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPreset = (preset: PresetOption) => {
    setSelectedPreset(preset.id);
    if (!title || PRESETS.some((p) => p.defaultTitle === title || title.startsWith("Book Bite Short"))) {
      setTitle(preset.defaultTitle);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a project title");
      return;
    }
    setError(null);
    try {
      await onCreate(title.trim(), selectedPreset);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Project Title Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground/90">
            Project Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Psychology of Money - Bite #1"
            autoFocus
            className="w-full px-3 py-2 text-sm bg-surface-elevated/70 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-foreground transition-all placeholder:text-muted-foreground/60"
          />
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>

        {/* Preset Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-foreground/90">
            Select Format Preset
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`relative p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? "bg-primary/10 border-primary/60 ring-1 ring-primary/40 shadow-xs"
                      : "bg-surface-elevated/40 border-border hover:bg-surface-elevated hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-surface flex items-center justify-center border border-border/60">
                        {preset.icon}
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        {preset.name}
                      </span>
                    </div>
                    {preset.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30">
                        {preset.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {preset.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Specs Summary Card */}
        <div className="p-3 rounded-lg bg-surface-elevated/40 border border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">9:16 Vertical Video (Shorts / Reels)</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                1080x1920 • 30 FPS • Master Voiceover Timeline
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Sliders className="w-3 h-3" />
            <span>{showAdvanced ? "Hide specs" : "Details"}</span>
          </button>
        </div>

        {/* Advanced details if expanded */}
        {showAdvanced && (
          <div className="p-3 rounded-lg bg-black/30 border border-border/40 text-[11px] text-muted-foreground space-y-1.5 font-mono animate-in fade-in-0 duration-150">
            <div className="flex justify-between">
              <span>Resolution:</span>
              <span className="text-foreground">1080 x 1920 px (9:16)</span>
            </div>
            <div className="flex justify-between">
              <span>Framerate:</span>
              <span className="text-foreground">30 FPS</span>
            </div>
            <div className="flex justify-between">
              <span>Silence Removal:</span>
              <span className="text-foreground">-35.0 dB threshold, 300ms</span>
            </div>
            <div className="flex justify-between">
              <span>Word Alignment:</span>
              <span className="text-foreground">WhisperX Forced Alignment</span>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoading || !title.trim()}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {isLoading ? "Creating..." : "Create & Launch Editor"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
