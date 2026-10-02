import React, { useState, useRef, useEffect } from "react";
import { useSfxStore } from "../../stores/sfxStore";
import { useEditorStore } from "../../stores/editorStore";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  X,
  Volume2,
  VolumeX,
  Play,
  Square,
  Upload,
  Trash2,
  Plus,
  Search,
  Mic,
  Disc3,
  Sparkles,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { SfxItem, SfxCategory } from "../../types/sfx";

interface SfxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: SfxCategory | "all"; label: string }[] = [
  { id: "all", label: "All Sounds" },
  { id: "whoosh", label: "Whooshes & Risers" },
  { id: "pop", label: "Pops & Clicks" },
  { id: "impact", label: "Hits & Impacts" },
  { id: "chime", label: "Chimes & Bells" },
  { id: "voice", label: "Voice Accents & FX" },
  { id: "custom", label: "Custom Uploads" },
];

export const SfxModal: React.FC<SfxModalProps> = ({ isOpen, onClose }) => {
  const {
    sfxList,
    selectedCategory,
    search,
    isLoading,
    previewingSfxId,
    setSelectedCategory,
    setSearch,
    fetchSfx,
    playPreview,
    stopPreview,
    uploadSfx,
    deleteSfx,
  } = useSfxStore();

  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const addSoundEffectToTimeline = useEditorStore((s) => s.addSoundEffectToTimeline);

  // Upload modal state
  const [isUploadingOpen, setIsUploadingOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<SfxCategory>("whoosh");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSfx();
    }
    return () => {
      stopPreview();
    };
  }, [isOpen, fetchSfx, stopPreview]);

  if (!isOpen) return null;

  const filteredSfx = sfxList.filter((s) => {
    const matchesCat = selectedCategory === "all" || s.category === selectedCategory;
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    if (!uploadName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setUploadName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select an audio file (.mp3, .wav, .ogg, etc.)");
      return;
    }
    if (!uploadName.trim()) {
      setUploadError("Please provide a name for the sound effect");
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    try {
      await uploadSfx(uploadName.trim(), uploadCategory, uploadFile);
      setIsUploadingOpen(false);
      setUploadFile(null);
      setUploadName("");
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload sound effect");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToTimeline = (item: SfxItem) => {
    const start = Math.max(0, Math.min(currentTime, Math.max(0, (duration || 10) - 0.2)));
    addSoundEffectToTimeline({
      sfxId: item.id,
      url: item.url,
      name: item.name,
      start,
      duration: item.duration || 1.0,
      volume: 0.85,
    });

    onClose();
  };

  const handleDelete = async (item: SfxItem) => {
    if (!window.confirm(`Delete sound effect "${item.name}"?`)) return;
    try {
      await deleteSfx(item.id);
    } catch (err: any) {
      alert(`Failed to delete sound effect: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[84vh] bg-surface rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Sound & Voice Effects Library</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Global
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Audition and add whooshes, bubble pops, bell dings, hits, and voice accents to your secondary timeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadingOpen(true)}
              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload SFX</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories & Search */}
        <div className="px-6 py-3 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 bg-surface/50">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sound effects..."
              className="pl-8 text-xs py-1 h-8 bg-surface-elevated/70 border-border/80"
            />
          </div>
        </div>

        {/* Sounds List / Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && sfxList.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Loading sound effects library...
            </div>
          ) : filteredSfx.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-muted-foreground mb-3">
                <VolumeX className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">No sound effects found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                {search ? `No sounds match "${search}".` : "No sounds in this category yet."}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsUploadingOpen(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Sound File</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredSfx.map((item) => {
                const isPlaying = previewingSfxId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`group relative p-3.5 rounded-xl border transition-all flex flex-col justify-between bg-surface-elevated/40 hover:bg-surface-elevated ${
                      isPlaying
                        ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-surface-elevated shadow-md"
                        : "border-border/70 hover:border-emerald-500/40"
                    }`}
                  >
                    {/* Top Row: Play button & Waveform animation & Duration */}
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (isPlaying) {
                              stopPreview();
                            } else {
                              playPreview(item.url, item.id);
                            }
                          }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isPlaying
                              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 animate-pulse"
                              : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black"
                          }`}
                          title={isPlaying ? "Stop audition" : "Audition sound effect"}
                        >
                          {isPlaying ? (
                            <Square className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div>
                          <h4 className="text-xs font-bold text-foreground group-hover:text-emerald-300 transition-colors">
                            {item.name}
                          </h4>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-black/50 text-muted-foreground">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {/* Duration */}
                      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.duration.toFixed(2)}s</span>
                      </span>
                    </div>

                    {/* Audio wave decorative visualizer */}
                    <div className="w-full h-5 px-1 flex items-center gap-1 opacity-60 overflow-hidden my-1">
                      {Array.from({ length: 24 }).map((_, i) => {
                        const h = 20 + ((i * 19) % 65);
                        return (
                          <div
                            key={i}
                            className={`w-1 rounded-full transition-all ${
                              isPlaying ? "bg-emerald-400 animate-pulse" : "bg-border"
                            }`}
                            style={{
                              height: `${h}%`,
                              animationDelay: `${(i % 6) * 120}ms`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Bottom Row Actions */}
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                      {!item.isPreset ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Delete sound effect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground/60">Preset</span>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddToTimeline(item)}
                        className="gap-1 h-7 text-xs bg-emerald-500/15 hover:bg-emerald-500 hover:text-black text-emerald-300 border border-emerald-500/30 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to Timeline</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal Drawer */}
      {isUploadingOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-surface rounded-xl border border-border shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Upload Sound Effect (.mp3, .wav, .ogg)</span>
              </h3>
              <button
                onClick={() => setIsUploadingOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              {uploadError && (
                <div className="p-2.5 rounded bg-danger/15 border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Select Audio File
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".mp3,.wav,.ogg,.m4a,.webm"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 rounded-lg border-2 border-dashed border-border hover:border-emerald-500/60 bg-surface-elevated/50 flex flex-col items-center justify-center p-3 cursor-pointer transition-all hover:bg-surface-elevated"
                >
                  <Volume2 className="w-6 h-6 text-emerald-400 mb-1.5" />
                  <span className="text-xs font-medium text-foreground">
                    {uploadFile ? uploadFile.name : "Click to select audio file"}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Supports MP3, WAV, OGG, M4A, WEBM
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Sound Effect Name
                </label>
                <Input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Cartoon Squeak, Dramatic Boom"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as SfxCategory)}
                  className="w-full px-3 py-2 rounded-md bg-surface-elevated border border-border text-foreground text-xs"
                >
                  <option value="whoosh">Whooshes & Risers</option>
                  <option value="pop">Pops & Clicks</option>
                  <option value="impact">Hits & Impacts</option>
                  <option value="chime">Chimes & Bells</option>
                  <option value="voice">Voice Accents & FX</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsUploadingOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !uploadFile}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                >
                  {isSubmitting ? "Uploading..." : "Save to Global Library"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
