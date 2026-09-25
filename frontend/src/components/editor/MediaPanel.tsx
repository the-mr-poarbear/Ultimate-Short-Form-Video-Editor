import React, { useState } from "react";
import { MediaLibrary } from "./MediaLibrary";
import { MediaUploader } from "../upload/MediaUploader";
import { useEditorStore } from "../../stores/editorStore";
import { apiFetch } from "../../services/api";
import { Film } from "lucide-react";

export const MediaPanel: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const addMediaAsset = useEditorStore((s) => s.addMediaAsset);
  const removeMediaAsset = useEditorStore((s) => s.removeMediaAsset);
  const [isUploading, setIsUploading] = useState(false);

  const handleMediaUploaded = async (file: File) => {
    if (!project) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const asset = await apiFetch<any>(`/api/projects/${project.id}/media`, {
        method: "POST",
        body: formData,
      });
      addMediaAsset(asset);
    } catch (err: any) {
      alert(`Failed to upload media: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!project) return;
    try {
      await apiFetch(`/api/projects/${project.id}/media/${assetId}`, {
        method: "DELETE",
      });
      removeMediaAsset(assetId);
    } catch (err: any) {
      alert(`Failed to delete asset: ${err.message}`);
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span>Media Assets</span>
        </div>
      </div>

      <div className="p-3 border-b border-border/60 bg-surface-elevated/20">
        <MediaUploader onMediaUploaded={handleMediaUploaded} isUploading={isUploading} />
      </div>

      <div className="panel-content flex-1">
        <MediaLibrary onDeleteAsset={handleDeleteAsset} />
      </div>
    </div>
  );
};
