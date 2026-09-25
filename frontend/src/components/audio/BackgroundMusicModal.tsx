import React, { useState, useRef, useEffect } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { useEditorStore } from "../../stores/editorStore";
import { audioService } from "../../services/audioService";
import { audioPlayer } from "../../services/audioPlayer";
import { getMediaUrl } from "../../services/api";
import type { BackgroundMusic } from "../../types/project";
import {
  Music,
  Upload,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Repeat,
  Trash2,
  Sparkles,
  Check,
  Disc3,
  Sliders,
  AudioWaveform,
  Loader2,
} from "lucide-react";

interface BgmPreset {
  id: string;
  title: string;
  artist: string;
  category: string;
  description: string;
  previewUrl: string;
}

// Built-in curated royalty-free tracks for Book Bite Shorts
// Uses high-quality public domain / creative commons audio stems with instant previews
const BGM_PRESETS: BgmPreset[] = [
  {
    id: "lofi-focus",
    title: "Lofi Focus & Clarity",
    artist: "BookBite Audio",
    category: "Lofi / Study",
    description: "Gentle rhythmic vinyl warmth. Perfect for self-improvement and non-fiction summaries.",
    // Royalty-free ambient music sample
    previewUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
  },
  {
    id: "cinematic-reflection",
    title: "Cinematic Reflection",
    artist: "BookBite Audio",
    category: "Ambient",
    description: "Subtle evolving pads that elevate narrative depth without competing with dialogue.",
    previewUrl: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
  },
  {
    id: "inspirational-pulse",
    title: "Inspirational Story",
    artist: "BookBite Audio",
    category: "Storytelling",
    description: "Uplifting modern acoustic tones that create momentum and emotional hooks.",
    previewUrl: "https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg",
  },
  {
    id: "subtle-suspense",
    title: "Curiosity & Wonder",
    artist: "BookBite Audio",
    category: "Suspense",
    description: "Soft investigative pulse ideal for historical hooks, science, and psychology insights.",
    previewUrl: "https://actions.google.com/sounds/v1/ambiences/meadow_morning.ogg",
  },
];

interface BackgroundMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackgroundMusicModal: React.FC<BackgroundMusicModalProps> = ({
  isOpen,
  onClose,
}) => {
  const project = useEditorStore((s) => s.project);
  const setBackgroundMusic = useEditorStore((s) => s.setBackgroundMusic);
  const updateBackgroundMusicVolume = useEditorStore((s) => s.updateBackgroundMusicVolume);
  const updateBackgroundMusicSettings = useEditorStore((s) => s.updateBackgroundMusicSettings);

  const isPlaying = useEditorStore((s) => s.isPlaying);

  const [activeTab, setActiveTab] = useState<"presets" | "upload">("presets");
  const [isUploading, setIsUploading] = useState(false);
  const [playingPresetId, setPlayingPresetId] = useState<string | null>(null);
  const [isSoloPlaying, setIsSoloPlaying] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const presetAudioRef = useRef<HTMLAudioElement | null>(null);
  const soloAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentBgm = project?.backgroundMusic;
  const currentVolume = currentBgm?.volume ?? 0.15;
  const isLoop = currentBgm?.loop ?? true;
  const fadeIn = currentBgm?.fadeInDuration ?? 1.0;
  const fadeOut = currentBgm?.fadeOutDuration ?? 2.0;

  // Sync BGM player when currentBgm changes
  useEffect(() => {
    if (currentBgm?.url) {
      audioPlayer.loadBgm(currentBgm.url, currentBgm.volume, currentBgm.loop);
    } else {
      audioPlayer.teardownBgm();
    }
  }, [currentBgm?.url, currentBgm?.volume, currentBgm?.loop]);

  // Stop preview audio on modal close
  useEffect(() => {
    if (!isOpen) {
      if (presetAudioRef.current) {
        presetAudioRef.current.pause();
        presetAudioRef.current = null;
      }
      if (soloAudioRef.current) {
        soloAudioRef.current.pause();
        soloAudioRef.current = null;
      }
      setIsSoloPlaying(false);
      setPlayingPresetId(null);
    }
  }, [isOpen]);

  const handleToggleSoloBgm = () => {
    if (!currentBgm?.url) return;

    if (isSoloPlaying) {
      if (soloAudioRef.current) {
        soloAudioRef.current.pause();
      }
      setIsSoloPlaying(false);
      return;
    }

    // Stop preset audio & timeline playback if playing
    if (presetAudioRef.current) {
      presetAudioRef.current.pause();
      setPlayingPresetId(null);
    }
    audioPlayer.pause();

    const fullUrl = getMediaUrl(currentBgm.url);
    const audio = new Audio(fullUrl);
    audio.volume = 0.7;
    audio.loop = true;
    audio.play().catch((err) => {
      console.warn("Solo audio play failed:", err);
      alert("Could not play audio track. Please check browser audio permissions.");
    });
    audio.onended = () => setIsSoloPlaying(false);
    soloAudioRef.current = audio;
    setIsSoloPlaying(true);
  };

  const handleTogglePresetPreview = (preset: BgmPreset) => {
    if (playingPresetId === preset.id) {
      if (presetAudioRef.current) {
        presetAudioRef.current.pause();
      }
      setPlayingPresetId(null);
      return;
    }

    if (soloAudioRef.current) {
      soloAudioRef.current.pause();
      setIsSoloPlaying(false);
    }
    audioPlayer.pause();

    if (presetAudioRef.current) {
      presetAudioRef.current.pause();
    }

    const audio = new Audio(preset.previewUrl);
    audio.volume = 0.5;
    audio.play().catch(() => {});
    audio.onended = () => setPlayingPresetId(null);
    presetAudioRef.current = audio;
    setPlayingPresetId(preset.id);
  };

  const handleSelectPreset = async (preset: BgmPreset) => {
    if (!project) return;
    try {
      const res = await audioService.setBackgroundMusic(project.id, {
        url: preset.previewUrl,
        filename: `${preset.title}.mp3`,
        volume: currentVolume,
        loop: true,
        fadeInDuration: 1.0,
        fadeOutDuration: 2.0,
      });
      setBackgroundMusic(res.backgroundMusic);
      audioPlayer.loadBgm(res.backgroundMusic.url, res.backgroundMusic.volume, true);
    } catch (err: any) {
      alert(`Failed to set background music: ${err.message}`);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!project) return;
    setIsUploading(true);
    try {
      const res = await audioService.uploadBackgroundMusic(project.id, file, currentVolume);
      setBackgroundMusic(res.backgroundMusic);
      audioPlayer.loadBgm(res.backgroundMusic.url, res.backgroundMusic.volume, true);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveBgm = async () => {
    if (!project) return;
    try {
      await audioService.deleteBackgroundMusic(project.id);
      setBackgroundMusic(undefined);
      audioPlayer.teardownBgm();
      audioPlayer.pause();
      if (soloAudioRef.current) {
        soloAudioRef.current.pause();
        setIsSoloPlaying(false);
      }
    } catch (err: any) {
      alert(`Failed to remove background music: ${err.message}`);
    }
  };

  const handleVolumeChange = async (newVol: number) => {
    updateBackgroundMusicVolume(newVol);
    audioPlayer.setBgmVolume(newVol);
    if (project && currentBgm) {
      try {
        await audioService.updateBackgroundMusic(project.id, { volume: newVol });
      } catch {
        // non-critical
      }
    }
  };

  const handleLoopChange = async (newLoop: boolean) => {
    updateBackgroundMusicSettings({ loop: newLoop });
    audioPlayer.setBgmLoop(newLoop);
    if (project && currentBgm) {
      try {
        await audioService.updateBackgroundMusic(project.id, { loop: newLoop });
      } catch {
        // non-critical
      }
    }
  };

  const handleTestMixToggle = () => {
    if (soloAudioRef.current) {
      soloAudioRef.current.pause();
      setIsSoloPlaying(false);
    }
    if (presetAudioRef.current) {
      presetAudioRef.current.pause();
      setPlayingPresetId(null);
    }

    if (isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Background Music (BGM)"
      className="max-w-2xl"
    >
      <div className="flex flex-col gap-4 text-xs">
        {/* Active Track Section if configured */}
        {currentBgm ? (
          <div className="p-3.5 rounded-xl border border-primary/40 bg-surface-elevated/70 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                  <Disc3 className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground text-xs">
                    {currentBgm.filename || "Background Music Track"}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active in Timeline & Export
                  </span>
                </div>
              </div>

              {/* Action Buttons: Solo Audition, Test Mix & Remove */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSoloBgm}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                    isSoloPlaying
                      ? "bg-emerald-500 text-black shadow-xs font-bold"
                      : "bg-surface hover:bg-surface-hover text-foreground/90 border border-border/70"
                  }`}
                  title="Audition uploaded background music track alone"
                >
                  {isSoloPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isSoloPlaying ? "Pause Solo" : "Solo Track"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestMixToggle}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                    isPlaying
                      ? "bg-amber-500 text-black shadow-xs font-bold"
                      : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                  }`}
                  title="Preview Voiceover + Background Music together with volume ducking"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isPlaying ? "Stop Mix" : "Test Mix"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveBgm}
                  className="p-1.5 rounded-md text-danger hover:bg-danger/10 border border-danger/20 transition-colors cursor-pointer"
                  title="Remove background music"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Volume Ducking Slider */}
            <div className="p-3 rounded-lg bg-surface border border-border/70 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold text-foreground">Music Volume Ducking</span>
                </div>
                <span className="font-mono text-xs text-primary font-bold">
                  {Math.round(currentVolume * 100)}%
                </span>
              </div>

              <Slider
                label="Background Music Level"
                unit="%"
                min={0}
                max={100}
                step={1}
                value={Math.round(currentVolume * 100)}
                onChange={(val) => handleVolumeChange(val / 100)}
              />

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="text-emerald-400/90 font-mono">
                  Recommended: 12% - 20% for voice clarity
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleVolumeChange(0.12)}
                    className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-hover border border-border/60 transition-colors cursor-pointer"
                  >
                    12%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVolumeChange(0.18)}
                    className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-hover border border-border/60 transition-colors cursor-pointer"
                  >
                    18%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVolumeChange(0.25)}
                    className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-hover border border-border/60 transition-colors cursor-pointer"
                  >
                    25%
                  </button>
                </div>
              </div>
            </div>

            {/* Loop & Fade Options */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isLoop}
                  onChange={(e) => handleLoopChange(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">Loop music throughout entire short</span>
              </label>

              <span className="text-[10px] font-mono text-muted-foreground/80">
                Auto-Fade: 1s In • 2s Out
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-surface/50 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-muted-foreground">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-xs">No Background Music Attached</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Pick a royalty-free preset below or upload your own audio track.
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation: Presets vs Upload */}
        <div className="flex items-center border-b border-border/80 mt-1">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`pb-2 px-3 font-semibold text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "presets"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`pb-2 px-3 font-semibold text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "upload"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Your Music</span>
          </button>
        </div>

        {/* Tab Content: Presets */}
        {activeTab === "presets" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {BGM_PRESETS.map((preset) => {
              const isSelected = currentBgm?.url === preset.previewUrl;
              const isPreviewing = playingPresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-all ${
                    isSelected
                      ? "bg-primary/10 border-primary/60 ring-1 ring-primary/40 shadow-xs"
                      : "bg-surface-elevated/50 border-border hover:bg-surface-elevated hover:border-border/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-xs">{preset.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {preset.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePresetPreview(preset)}
                      className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                        isPreviewing
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-surface hover:bg-surface-hover text-foreground/80 border-border"
                      }`}
                      title={isPreviewing ? "Stop audio preview" : "Listen to preview"}
                    >
                      {isPreviewing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {preset.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="text-[9px] font-mono text-emerald-400">Royalty-Free</span>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      disabled={isSelected}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                          : "bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30"
                      }`}
                    >
                      {isSelected ? "Active" : "Use Track"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content: Upload Custom */}
        {activeTab === "upload" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 transition-colors ${
              dragActive
                ? "border-primary bg-primary/10"
                : "border-border/80 bg-surface/30 hover:border-border"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.aac,.ogg"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-primary shadow-inner">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-foreground">
                {isUploading ? "Uploading audio..." : "Drag & drop your music track here"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Supports MP3, WAV, M4A, OGG up to 50MB
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              Browse Audio File
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-border/60">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
