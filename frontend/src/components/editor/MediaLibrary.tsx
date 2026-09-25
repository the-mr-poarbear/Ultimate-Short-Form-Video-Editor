import React from "react";
import { useEditorStore } from "../../stores/editorStore";
import type { MediaAsset } from "../../types/media";
import { getMediaUrl } from "../../services/api";
import { formatDuration } from "../../lib/formatting";
import { Image as ImageIcon, Video, Trash2, Layers } from "lucide-react";
import { IconButton } from "../ui/IconButton";

interface MediaLibraryProps {
  onDeleteAsset?: (assetId: string) => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({ onDeleteAsset }) => {
  const project = useEditorStore((s) => s.project);
  const selectedAssetId = useEditorStore((s) => s.selectedAssetId);
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const setBackgroundVideo = useEditorStore((s) => s.setBackgroundVideo);

  const assets = project?.mediaAssets || [];
  const images = assets.filter((a) => a.type === "image");
  const videos = assets.filter((a) => a.type === "video");

  const handleDragStart = (e: React.DragEvent, asset: MediaAsset) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        assetId: asset.id,
        type: asset.type,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const renderAssetCard = (asset: MediaAsset) => {
    const isSelected = selectedAssetId === asset.id;
    const isBackground = project?.backgroundVideo === asset.url;

    return (
      <div
        key={asset.id}
        draggable
        onDragStart={(e) => handleDragStart(e, asset)}
        onClick={() => selectAsset(asset.id)}
        className={`group relative flex flex-col p-1.5 rounded-md border transition-all cursor-grab active:cursor-grabbing ${isSelected
            ? "border-primary bg-surface-hover ring-1 ring-primary/40"
            : "border-border bg-surface-elevated hover:border-border/80"
          }`}
      >
        <div className="relative w-full aspect-video rounded overflow-hidden bg-black/40 flex items-center justify-center">
          {asset.type === "image" ? (
            <img
              src={getMediaUrl(asset.url)}
              alt={asset.name}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <img
              src={getMediaUrl(asset.thumbnailUrl || asset.url)}
              alt={asset.name}
              className="w-full h-full object-cover pointer-events-none"
            />
          )}

          <div className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-mono bg-black/60 backdrop-blur-xs text-foreground flex items-center gap-1">
            {asset.type === "image" ? (
              <ImageIcon className="w-2.5 h-2.5 text-accent" />
            ) : (
              <Video className="w-2.5 h-2.5 text-primary" />
            )}
            {asset.duration ? formatDuration(asset.duration) : "IMG"}
          </div>

          {isBackground && (
            <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-[9px] font-medium bg-primary text-primary-foreground flex items-center gap-0.5">
              <Layers className="w-2.5 h-2.5" /> BG
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-1 px-0.5">
          <span className="text-[11px] text-foreground truncate max-w-[100px]" title={asset.name}>
            {asset.name}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {asset.type === "video" && (
              <button
                type="button"
                title={isBackground ? "Remove as background video" : "Set as global background video"}
                onClick={(e) => {
                  e.stopPropagation();
                  setBackgroundVideo(isBackground ? undefined : asset.url);
                }}
                className={`p-1 rounded text-[10px] ${isBackground ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Layers className="w-3 h-3" />
              </button>
            )}
            {onDeleteAsset && (
              <button
                type="button"
                title="Delete asset"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAsset(asset.id);
                }}
                className="p-1 rounded text-muted-foreground hover:text-danger"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-1">
      {assets.length === 0 ? (
        <div className="p-6 border border-dashed border-border rounded-md text-center flex flex-col items-center gap-1.5 text-muted-foreground">
          <Layers className="w-6 h-6 stroke-[1.5] text-muted-foreground/60" />
          <span className="text-xs font-medium">No media uploaded</span>
          <span className="text-[11px]">Import images or B-roll video clips to attach to slices</span>
        </div>
      ) : (
        <>
          {images.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Images ({images.length})
              </span>
              <div className="grid grid-cols-2 gap-2">{images.map(renderAssetCard)}</div>
            </div>
          )}

          {videos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Videos ({videos.length})
              </span>
              <div className="grid grid-cols-2 gap-2">{videos.map(renderAssetCard)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
