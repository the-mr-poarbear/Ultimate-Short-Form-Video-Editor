import React, { useState, useRef, useEffect } from "react";
import { useOverlayStore } from "../../stores/overlayStore";
import { useEditorStore } from "../../stores/editorStore";
import { getMediaUrl } from "../../services/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  X,
  Sparkles,
  Upload,
  Trash2,
  Plus,
  Search,
  Layers,
  ArrowRight,
  Maximize2,
  Film,
  Check,
  AlertCircle,
  Play,
  RotateCw,
} from "lucide-react";
import type { OverlayItem, OverlayCategory, OverlayAnimation } from "../../types/overlay";

interface OverlaysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: OverlayCategory | "all"; label: string }[] = [
  { id: "all", label: "All Assets" },
  { id: "arrows", label: "Arrows" },
  { id: "lines", label: "Lines & Accents" },
  { id: "callouts", label: "Callouts" },
  { id: "stickers", label: "Stickers & FX" },
  { id: "custom", label: "Custom Uploads" },
];

const ANIMATION_PRESETS: { id: OverlayAnimation; label: string }[] = [
  { id: "bounce", label: "Bounce" },
  { id: "pulse", label: "Pulse / Glow" },
  { id: "spin", label: "Spin" },
  { id: "wiggle", label: "Wiggle" },
  { id: "pop", label: "Pop In" },
  { id: "fade", label: "Fade" },
  { id: "slide-up", label: "Slide Up" },
  { id: "slide-down", label: "Slide Down" },
  { id: "slide-left", label: "Slide Left" },
  { id: "slide-right", label: "Slide Right" },
  { id: "glow", label: "Neon Glow" },
  { id: "none", label: "Static (None)" },
];

export const OverlaysModal: React.FC<OverlaysModalProps> = ({ isOpen, onClose }) => {
  const {
    overlays,
    selectedCategory,
    search,
    isLoading,
    setSelectedCategory,
    setSearch,
    fetchOverlays,
    uploadOverlay,
    deleteOverlay,
  } = useOverlayStore();

  const currentTime = useEditorStore((s) => s.currentTime);
  const duration = useEditorStore((s) => s.duration);
  const addOverlayToTimeline = useEditorStore((s) => s.addOverlayToTimeline);

  const [selectedOverlay, setSelectedOverlay] = useState<OverlayItem | null>(null);
  const [testAnim, setTestAnim] = useState<OverlayAnimation>("bounce");

  // Upload state
  const [isUploadingOpen, setIsUploadingOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<OverlayCategory>("custom");
  const [uploadAnim, setUploadAnim] = useState<OverlayAnimation>("bounce");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOverlays();
    }
  }, [isOpen, fetchOverlays]);

  useEffect(() => {
    if (overlays.length > 0 && !selectedOverlay) {
      setSelectedOverlay(overlays[0]);
      setTestAnim(overlays[0].defaultAnimation);
    }
  }, [overlays, selectedOverlay]);

  if (!isOpen) return null;

  const filteredOverlays = overlays.filter((o) => {
    const matchesCat = selectedCategory === "all" || o.category === selectedCategory;
    const matchesSearch =
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.category.toLowerCase().includes(search.toLowerCase());
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

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select an image or GIF file");
      return;
    }
    if (!uploadName.trim()) {
      setUploadError("Please enter a name for the overlay");
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    try {
      const created = await uploadOverlay(
        uploadName.trim(),
        uploadCategory,
        uploadAnim,
        uploadFile
      );
      setSelectedOverlay(created);
      setTestAnim(created.defaultAnimation);
      setIsUploadingOpen(false);
      setUploadFile(null);
      setUploadName("");
      setFilePreview(null);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload overlay");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToTimeline = (item: OverlayItem) => {
    const defaultDur = 2.5;
    const start = Math.max(0, Math.min(currentTime, Math.max(0, (duration || 10) - 0.5)));
    const end = Math.min(start + defaultDur, duration || (start + defaultDur));

    addOverlayToTimeline({
      overlayId: item.id,
      url: item.url,
      name: item.name,
      start,
      end: Math.max(start + 0.5, end),
      positionX: 50,
      positionY: 50,
      width: 30,
      height: 30,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
      flipX: false,
      animation: item.defaultAnimation || "bounce",
    });

    onClose();
  };

  const handleDelete = async (item: OverlayItem) => {
    if (!window.confirm(`Delete overlay "${item.name}"?`)) return;
    try {
      await deleteOverlay(item.id);
      if (selectedOverlay?.id === item.id) {
        setSelectedOverlay(null);
      }
    } catch (err: any) {
      alert(`Failed to delete overlay: ${err.message}`);
    }
  };

  const getAnimClass = (anim: OverlayAnimation) => {
    switch (anim) {
      case "bounce":
        return "anim-bounce";
      case "pulse":
        return "anim-pulse";
      case "spin":
        return "anim-spin";
      case "wiggle":
        return "anim-wiggle";
      case "pop":
        return "anim-pop";
      case "fade":
        return "anim-fade";
      case "slide-up":
        return "anim-slide-up";
      case "slide-down":
        return "anim-slide-down";
      case "slide-left":
        return "anim-slide-left";
      case "slide-right":
        return "anim-slide-right";
      case "glow":
        return "anim-glow";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-surface rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Animation Overlays & Graphics Library</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/30">
                  Global
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Animating arrows, glowing lines, callouts, GIFs & custom stickers for your video shorts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadingOpen(true)}
              className="gap-1.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-md cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Overlay</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="px-6 py-3 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 bg-surface/50">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search overlays..."
              className="pl-8 text-xs py-1 h-8 bg-surface-elevated/70 border-border/80"
            />
          </div>
        </div>

        {/* Content Area: Grid + Preview Inspector */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading && overlays.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Loading overlays library...
              </div>
            ) : filteredOverlays.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-muted-foreground mb-3">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">No overlays found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">
                  {search ? `No overlays match "${search}".` : "No assets in this category yet."}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsUploadingOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Image or GIF</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredOverlays.map((item) => {
                  const isSelected = selectedOverlay?.id === item.id;
                  const isGif = item.type === "gif";

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedOverlay(item);
                        setTestAnim(item.defaultAnimation);
                      }}
                      className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border transition-all cursor-pointer bg-surface-elevated/40 hover:bg-surface-elevated ${
                        isSelected
                          ? "border-pink-500 ring-2 ring-pink-500/30 bg-surface-elevated"
                          : "border-border/70 hover:border-pink-500/50"
                      }`}
                    >
                      {/* Badge Tags */}
                      <div className="w-full flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/60 text-muted-foreground">
                          {item.category}
                        </span>

                        {isGif ? (
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            GIF
                          </span>
                        ) : item.type === "svg" ? (
                          <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            SVG
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            IMG
                          </span>
                        )}
                      </div>

                      {/* Visual Graphic with Animation preview */}
                      <div className="w-full h-28 flex items-center justify-center p-2 relative overflow-hidden">
                        <img
                          src={getMediaUrl(item.url)}
                          alt={item.name}
                          className={`max-w-full max-h-full object-contain filter drop-shadow-md transition-transform duration-300 ${
                            isSelected ? getAnimClass(testAnim) : "group-hover:scale-110"
                          }`}
                        />
                      </div>

                      {/* Name & Quick Action */}
                      <div className="w-full mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground/90 truncate">
                          {item.name}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToTimeline(item);
                          }}
                          className="p-1 rounded bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white transition-colors cursor-pointer"
                          title="Add directly to timeline at playhead"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Inspector & Preview Sidebar */}
          {selectedOverlay && (
            <div className="w-80 border-l border-border bg-surface-elevated/30 p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-pink-400 font-semibold">
                    Overlay Preview & Animation
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5">
                    {selectedOverlay.name}
                  </h3>
                </div>

                {/* Big Preview Stage */}
                <div className="w-full h-44 rounded-xl bg-black/60 border border-border/80 flex items-center justify-center p-4 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                  <img
                    src={getMediaUrl(selectedOverlay.url)}
                    alt={selectedOverlay.name}
                    className={`max-w-[70%] max-h-[70%] object-contain filter drop-shadow-xl ${getAnimClass(
                      testAnim
                    )}`}
                  />
                </div>

                {/* Animation Tester */}
                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-pink-400" />
                      <span>Test Animation Style</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Preset: {selectedOverlay.defaultAnimation}
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-1.5">
                    {ANIMATION_PRESETS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setTestAnim(a.id)}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all text-left cursor-pointer ${
                          testAnim === a.id
                            ? "bg-pink-500/20 text-pink-300 border border-pink-500/40"
                            : "bg-surface-elevated hover:bg-surface text-muted-foreground hover:text-foreground border border-border/50"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details list */}
                <div className="p-3 rounded-lg bg-surface border border-border/60 text-xs space-y-1.5 font-mono text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="text-foreground capitalize">{selectedOverlay.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="text-foreground uppercase">{selectedOverlay.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Default Animation:</span>
                    <span className="text-pink-400">{selectedOverlay.defaultAnimation}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border/70 space-y-2">
                <Button
                  variant="primary"
                  className="w-full gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white cursor-pointer"
                  onClick={() => handleAddToTimeline(selectedOverlay)}
                >
                  <Plus className="w-4 h-4" />
                  <span>Place on Secondary Timeline</span>
                </Button>

                {!selectedOverlay.isPreset && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-danger hover:bg-danger/10 hover:text-danger cursor-pointer"
                    onClick={() => handleDelete(selectedOverlay)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Delete Overlay</span>
                  </Button>
                )}
              </div>
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
                <Upload className="w-4 h-4 text-pink-400" />
                <span>Upload Custom Overlay (Image / GIF)</span>
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
                  Select Image or Animated GIF
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".png,.jpg,.jpeg,.webp,.svg,.gif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-pink-500/60 bg-surface-elevated/50 flex flex-col items-center justify-center p-3 cursor-pointer transition-all hover:bg-surface-elevated"
                >
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-pink-400 mb-1.5" />
                      <span className="text-xs font-medium text-foreground">
                        Click to browse file
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        Accepts PNG, SVG, WebP, JPG, or Animated GIF
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Overlay Name */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Overlay Name
                </label>
                <Input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Glowing Down Arrow, Fire Sparkle"
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
                  onChange={(e) => setUploadCategory(e.target.value as OverlayCategory)}
                  className="w-full px-3 py-2 rounded-md bg-surface-elevated border border-border text-foreground text-xs"
                >
                  <option value="arrows">Arrows</option>
                  <option value="lines">Lines & Accents</option>
                  <option value="callouts">Callouts</option>
                  <option value="stickers">Stickers & FX</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Default Animation */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Default Animation
                </label>
                <select
                  value={uploadAnim}
                  onChange={(e) => setUploadAnim(e.target.value as OverlayAnimation)}
                  className="w-full px-3 py-2 rounded-md bg-surface-elevated border border-border text-foreground text-xs"
                >
                  {ANIMATION_PRESETS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
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
                  className="bg-pink-500 hover:bg-pink-600 text-white"
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
