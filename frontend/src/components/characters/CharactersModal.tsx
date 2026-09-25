import React, { useState, useRef, useEffect } from "react";
import { useCharacterStore } from "../../stores/characterStore";
import { getMediaUrl } from "../../services/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  X,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  Upload,
  Image as ImageIcon,
  Star,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  Layers,
} from "lucide-react";

interface CharactersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CharactersModal: React.FC<CharactersModalProps> = ({ isOpen, onClose }) => {
  const {
    characters,
    selectedCharacterId,
    isLoading,
    setSelectedCharacterId,
    fetchCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    addPose,
    deletePose,
  } = useCharacterStore();

  const [search, setSearch] = useState("");
  const [isCreatingChar, setIsCreatingChar] = useState(false);
  const [newCharName, setNewCharName] = useState("");

  const [editingCharName, setEditingCharName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const [isAddingPose, setIsAddingPose] = useState(false);
  const [newPoseName, setNewPoseName] = useState("");
  const [selectedPoseFile, setSelectedPoseFile] = useState<File | null>(null);
  const [posePreviewUrl, setPosePreviewUrl] = useState<string | null>(null);
  const [isUploadingPose, setIsUploadingPose] = useState(false);
  const [poseError, setPoseError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCharacters();
    }
  }, [isOpen, fetchCharacters]);

  const selectedChar = characters.find((c) => c.id === selectedCharacterId) || characters[0];

  useEffect(() => {
    if (selectedChar) {
      setEditedName(selectedChar.name);
    }
  }, [selectedChar?.id, selectedChar?.name]);

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCharSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;
    try {
      const created = await createCharacter(newCharName.trim());
      setNewCharName("");
      setIsCreatingChar(false);
      setSelectedCharacterId(created.id);
    } catch (err: any) {
      alert(`Failed to create character: ${err.message}`);
    }
  };

  const handleSaveCharName = async () => {
    if (!selectedChar || !editedName.trim()) return;
    try {
      await updateCharacter(selectedChar.id, editedName.trim());
      setEditingCharName(false);
    } catch (err: any) {
      alert(`Failed to update character name: ${err.message}`);
    }
  };

  const handleDeleteChar = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete character "${name}" and all their poses?`)) {
      return;
    }
    try {
      await deleteCharacter(id);
    } catch (err: any) {
      alert(`Failed to delete character: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedPoseFile(file);
    const url = URL.createObjectURL(file);
    setPosePreviewUrl(url);
    if (!newPoseName.trim()) {
      // Suggest pose name from filename
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setNewPoseName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
  };

  const handlePoseUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar || !selectedPoseFile || !newPoseName.trim()) return;

    setIsUploadingPose(true);
    setPoseError(null);
    try {
      await addPose(selectedChar.id, newPoseName.trim(), selectedPoseFile);
      setIsAddingPose(false);
      setNewPoseName("");
      setSelectedPoseFile(null);
      if (posePreviewUrl) {
        URL.revokeObjectURL(posePreviewUrl);
        setPosePreviewUrl(null);
      }
    } catch (err: any) {
      setPoseError(err.message || "Failed to upload pose");
    } finally {
      setIsUploadingPose(false);
    }
  };

  const handleDeletePose = async (poseId: string, poseName: string) => {
    if (!selectedChar) return;
    if (!window.confirm(`Delete pose "${poseName}"?`)) return;
    try {
      await deletePose(selectedChar.id, poseId);
    } catch (err: any) {
      alert(`Failed to delete pose: ${err.message}`);
    }
  };

  const handleSetDefaultPose = async (poseId: string) => {
    if (!selectedChar) return;
    try {
      await updateCharacter(selectedChar.id, selectedChar.name, poseId);
    } catch (err: any) {
      alert(`Failed to set default pose: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[680px] flex flex-col overflow-hidden text-foreground">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Configure Characters</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                  Global Library
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Create reusable characters and upload emotion/action poses to place across slices in any project.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar + Main workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Character List */}
          <div className="w-72 border-r border-border/80 flex flex-col bg-surface-elevated/20">
            {/* Search and Add Character Button */}
            <div className="p-3 border-b border-border/80 flex flex-col gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search characters..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md bg-surface text-xs text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {!isCreatingChar ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreatingChar(true)}
                  className="w-full justify-center"
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  New Character
                </Button>
              ) : (
                <form onSubmit={handleCreateCharSubmit} className="flex flex-col gap-1.5 bg-surface p-2 rounded-md border border-primary/40">
                  <span className="text-[10px] font-semibold text-primary uppercase">Character Name</span>
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Detective Fox"
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-surface-elevated text-xs border border-border text-foreground focus:outline-none focus:border-primary"
                  />
                  <div className="flex items-center gap-1.5 mt-1 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingChar(false);
                        setNewCharName("");
                      }}
                      className="px-2 py-1 text-[11px] rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newCharName.trim()}
                      className="px-2.5 py-1 text-[11px] rounded bg-primary text-primary-foreground font-medium disabled:opacity-50 cursor-pointer"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {isLoading && characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs">Loading characters...</span>
                </div>
              ) : filteredCharacters.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {search ? "No matching characters" : "No characters yet. Click 'New Character' to start!"}
                </div>
              ) : (
                filteredCharacters.map((c) => {
                  const isSelected = selectedChar?.id === c.id;
                  const defaultPose = c.poses.find((p) => p.id === c.defaultPoseId) || c.poses[0];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCharacterId(c.id)}
                      className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2.5 cursor-pointer border ${
                        isSelected
                          ? "bg-primary/15 border-primary/40 text-foreground shadow-xs"
                          : "bg-surface hover:bg-surface-hover border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {/* Character Avatar */}
                      <div className="w-9 h-9 rounded-md bg-black/40 border border-border/80 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                        {defaultPose ? (
                          <img
                            src={getMediaUrl(defaultPose.imageUrl)}
                            alt={c.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 opacity-40 text-muted-foreground" />
                        )}
                      </div>

                      {/* Character Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate text-foreground">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span>
                            {c.poses.length} {c.poses.length === 1 ? "pose" : "poses"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Character Details & Poses */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {selectedChar ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Character Name & Quick Actions Bar */}
                <div className="p-4 border-b border-border/80 flex items-center justify-between bg-surface/40">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    {editingCharName ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          autoFocus
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveCharName();
                            if (e.key === "Escape") setEditingCharName(false);
                          }}
                          className="px-2.5 py-1 text-sm font-bold rounded bg-surface border border-primary text-foreground focus:outline-none flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCharName}
                          className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                          title="Save Name"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCharName(false)}
                          className="p-1.5 rounded hover:bg-surface-hover text-muted-foreground cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <h3 className="text-base font-bold text-foreground tracking-tight">{selectedChar.name}</h3>
                        <button
                          type="button"
                          onClick={() => setEditingCharName(true)}
                          className="opacity-60 group-hover:opacity-100 p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground cursor-pointer transition-opacity"
                          title="Rename character"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setIsAddingPose(true);
                        setPoseError(null);
                        setNewPoseName("");
                        setSelectedPoseFile(null);
                        setPosePreviewUrl(null);
                      }}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Pose
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteChar(selectedChar.id, selectedChar.name)}
                      className="p-2 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
                      title="Delete character"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Poses Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Add Pose Modal / Form Card if triggered */}
                  {isAddingPose && (
                    <div className="mb-6 p-4 rounded-xl border border-primary/50 bg-surface-elevated/70 shadow-lg animate-in fade-in-50 duration-150">
                      <div className="flex items-center justify-between pb-3 border-b border-border/80">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Plus className="w-4 h-4 text-primary" />
                          <span>Add New Pose for {selectedChar.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingPose(false)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handlePoseUpload} className="mt-3 flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                          {/* Pose Name */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-foreground/90">
                              Pose Name <span className="text-primary">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Happy, Surprised, Pointing, Talking..."
                              value={newPoseName}
                              onChange={(e) => setNewPoseName(e.target.value)}
                              className="px-3 py-2 rounded-md bg-surface text-xs text-foreground border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-[11px] text-muted-foreground">
                              A descriptive title for this emotion or posture.
                            </span>

                            {poseError && (
                              <div className="mt-2 text-xs text-red-400 flex items-center gap-1.5 bg-red-500/10 p-2 rounded border border-red-500/30">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{poseError}</span>
                              </div>
                            )}
                          </div>

                          {/* File Dropzone */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-foreground/90">
                              Pose Image (PNG with transparency recommended) <span className="text-primary">*</span>
                            </label>

                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-surface/50 hover:bg-surface transition-all min-h-[140px]"
                            >
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={handleFileChange}
                                className="hidden"
                              />

                              {posePreviewUrl ? (
                                <div className="flex items-center gap-4">
                                  <div className="w-20 h-20 rounded-lg bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:8px_8px] bg-black/40 border border-border p-1 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={posePreviewUrl}
                                      alt="Preview"
                                      className="max-w-full max-h-full object-contain"
                                    />
                                  </div>
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                                      {selectedPoseFile?.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {selectedPoseFile ? `${(selectedPoseFile.size / 1024).toFixed(1)} KB` : ""}
                                    </span>
                                    <span className="text-[10px] text-primary mt-1">Click to change file</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                    <Upload className="w-5 h-5" />
                                  </div>
                                  <div className="text-center">
                                    <span className="text-xs font-semibold text-foreground">Click to upload pose</span>
                                    <span className="block text-[10px] text-muted-foreground">
                                      PNG, JPG, or WEBP (transparent cutout)
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Submit button */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => setIsAddingPose(false)}
                            disabled={isUploadingPose}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            type="submit"
                            disabled={!selectedPoseFile || !newPoseName.trim() || isUploadingPose}
                            icon={isUploadingPose ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          >
                            {isUploadingPose ? "Uploading Pose..." : "Upload & Save Pose"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Poses Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Available Poses
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-foreground border border-border">
                          {selectedChar.poses.length}
                        </span>
                      </div>
                    </div>

                    {selectedChar.poses.length === 0 ? (
                      <div className="border border-dashed border-border/80 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 bg-surface/30">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="w-6 h-6 opacity-60" />
                        </div>
                        <div className="flex flex-col gap-1 max-w-sm">
                          <h4 className="text-xs font-semibold text-foreground">No poses added for this character yet</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Upload multiple expressions or poses (e.g. Happy, Pointing, Talking) to use throughout your video timeline slices.
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setIsAddingPose(true)}
                          icon={<Plus className="w-3.5 h-3.5" />}
                        >
                          Add First Pose
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {selectedChar.poses.map((pose) => {
                          const isDefault = selectedChar.defaultPoseId === pose.id;
                          return (
                            <div
                              key={pose.id}
                              className={`group relative rounded-xl border bg-surface flex flex-col overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg ${
                                isDefault ? "border-primary/60 ring-1 ring-primary/40" : "border-border/80"
                              }`}
                            >
                              {/* Image Preview Canvas with transparency grid */}
                              <div className="relative w-full aspect-square bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:10px_10px] bg-black/60 flex items-center justify-center p-3 overflow-hidden">
                                <img
                                  src={getMediaUrl(pose.imageUrl)}
                                  alt={pose.name}
                                  className="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform"
                                />

                                {/* Default Pose Star Badge */}
                                {isDefault && (
                                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-bold flex items-center gap-1 shadow-md">
                                    <Star className="w-2.5 h-2.5 fill-black" />
                                    <span>Default</span>
                                  </div>
                                )}

                                {/* Hover actions */}
                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-xs p-1 rounded-md">
                                  {!isDefault && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetDefaultPose(pose.id)}
                                      className="p-1 rounded text-muted-foreground hover:text-amber-400 cursor-pointer"
                                      title="Set as default pose"
                                    >
                                      <Star className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePose(pose.id, pose.name)}
                                    className="p-1 rounded text-muted-foreground hover:text-red-400 cursor-pointer"
                                    title="Delete pose"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Footer Name Info */}
                              <div className="p-2.5 border-t border-border/80 bg-surface-elevated/40 flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground truncate" title={pose.name}>
                                  {pose.name}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3 text-muted-foreground">
                <Users className="w-12 h-12 opacity-30 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Select or create a character</h3>
                <p className="text-xs max-w-sm">
                  Characters created here are saved globally and can be added to any slice across all your video projects.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreatingChar(true)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Create New Character
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
