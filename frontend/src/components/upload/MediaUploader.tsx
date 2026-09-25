import React, { useRef } from "react";
import { Plus, Image, Video } from "lucide-react";
import { Button } from "../ui/Button";

interface MediaUploaderProps {
  onMediaUploaded: (file: File) => void;
  isUploading?: boolean;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  onMediaUploaded,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => onMediaUploaded(file));
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        icon={<Plus className="w-3.5 h-3.5 text-primary" />}
        className="w-full justify-center"
      >
        {isUploading ? "Importing..." : "Import Media"}
      </Button>
    </div>
  );
};
