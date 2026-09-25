import React from "react";
import { useEditorStore } from "../../stores/editorStore";
import type { MediaAsset } from "../../types/media";
import { getMediaUrl } from "../../services/api";
import { formatDuration } from "../../lib/formatting";
import { Image as ImageIcon, Video, Trash2, Layers, X } from "lucide-react";

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

  const activeBgAsset = assets.find((a) => a.url === project?.backgroundVideo);

  const handleDragStart = (e: React.DragEvent, asset: MediaAsset) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        assetId: asset.id,
        type: asset.type,
        url: asset.url,
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
        className={`group relative flex flex-col p-1.5 rounded-md border transition-all cursor-grab active:cursor-grabbing ${
          isSelected
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
          ) : asset.thumbnailUrl ? (
            <img
              src={getMediaUrl(asset.thumbnailUrl)}
              alt={asset.name}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <video
              src={`${getMediaUrl(asset.url)}#t=2.0`}
              preload="metadata"
              muted
              playsInline
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
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary text-primary-foreground flex items-center gap-0.5 shadow-sm">
              <Layers className="w-2.5 h-2.5" /> BG
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-1 px-0.5">
          <span className="text-[11px] text-foreground truncate max-w-[95px]" title={asset.name}>
            {asset.name}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              title={isBackground ? `Remove background ${asset.type}` : `Set as background ${asset.type}`}
              onClick={(e) => {
                e.stopPropagation();
                setBackgroundVideo(isBackground ? undefined : asset.url);
              }}
              className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
                isBackground
                  ? "text-primary bg-primary/20 ring-1 ring-primary/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <Layers className="w-3 h-3" />
            </button>
            {onDeleteAsset && (
              <button
                type="button"
                title="Delete asset"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAsset(asset.id);
                }}
                className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
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
    <div className="flex flex-col gap-3.5 overflow-y-auto pr-1">
      {/* Active Background Media Notification Banner */}
      {project?.backgroundVideo && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] truncate">
              BG: <strong className="text-foreground">{activeBgAsset?.name || "Active Media"}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBackgroundVideo(undefined)}
            className="p-0.5 text-muted-foreground hover:text-foreground rounded hover:bg-primary/20 transition-colors cursor-pointer shrink-0 ml-1"
            title="Clear background media"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="p-6 border border-dashed border-border rounded-md text-center flex flex-col items-center gap-1.5 text-muted-foreground">
          <Layers className="w-6 h-6 stroke-[1.5] text-muted-foreground/60" />
          <span className="text-xs font-medium">No media uploaded</span>
          <span className="text-[11px]">Import images or B-roll video clips to attach to slices or set as background</span>
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
