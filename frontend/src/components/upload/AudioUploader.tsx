import React, { useState, useRef } from "react";
import { Upload, Music, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

interface AudioUploaderProps {
  onAudioSelected: (file: File) => void;
  isUploading?: boolean;
  uploadedFileName?: string;
  className?: string;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onAudioSelected,
  isUploading = false,
  uploadedFileName,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSelect(file);
    }
  };

  const validateAndSelect = (file: File) => {
    const validExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (validExtensions.includes(ext)) {
      onAudioSelected(file);
    } else {
      alert("Please upload a valid audio file (.mp3, .wav, .m4a, .aac)");
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "drop-zone p-6 cursor-pointer border-2 transition-all duration-200",
        isDragOver ? "drop-zone-active scale-[1.01]" : "",
        uploadedFileName ? "border-primary/40 bg-primary/5" : "",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center border border-border/80 text-primary">
          {uploadedFileName ? (
            <CheckCircle2 className="w-6 h-6 text-success" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-foreground">
            {uploadedFileName
              ? "Voiceover Loaded"
              : "Drop your voiceover here"}
          </span>
          <span className="text-xs text-muted-foreground">
            {uploadedFileName || "or click to browse files from your computer"}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-elevated text-muted-foreground border border-border/50">
            MP3
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-elevated text-muted-foreground border border-border/50">
            WAV
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-elevated text-muted-foreground border border-border/50">
            M4A
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-elevated text-muted-foreground border border-border/50">
            AAC
          </span>
        </div>

        {isUploading && (
          <div className="flex items-center gap-2 mt-2 text-xs text-primary animate-pulse">
            <Music className="w-3.5 h-3.5 animate-spin" />
            Uploading & analyzing...
          </div>
        )}
      </div>
    </div>
  );
};
