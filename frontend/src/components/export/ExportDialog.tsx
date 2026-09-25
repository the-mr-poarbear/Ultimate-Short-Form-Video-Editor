import React from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { RenderProgress } from "./RenderProgress";
import { useRenderJob } from "../../hooks/useRenderJob";
import { useEditorStore } from "../../stores/editorStore";
import { Film, Download } from "lucide-react";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const project = useEditorStore((s) => s.project);
  const { isRendering, renderJob, downloadUrl, error, startRender } = useRenderJob();

  const handleStartExport = () => {
    startRender();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Export Book Bite Video"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isRendering}>
            {downloadUrl ? "Done" : "Cancel"}
          </Button>
          {!downloadUrl && !isRendering && (
            <Button
              variant="primary"
              onClick={handleStartExport}
              icon={<Film className="w-3.5 h-3.5" />}
            >
              Start Render
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!isRendering && !downloadUrl && !error && (
          <div className="flex flex-col gap-3 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Export your Book Bite short as a high-quality vertical MP4 ready for YouTube Shorts,
              Instagram Reels, or TikTok.
            </p>

            <div className="p-3 bg-surface-elevated/50 border border-border rounded-md flex flex-col gap-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Resolution:</span>
                <span className="text-foreground font-semibold">1080 × 1920 (9:16)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framerate:</span>
                <span className="text-foreground">30 FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Codec:</span>
                <span className="text-foreground">H.264 / AAC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Narration Slices:</span>
                <span className="text-primary font-semibold">{project?.slices.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visuals Attached:</span>
                <span className="text-success font-semibold">
                  {project?.slices.filter((s) => s.visual).length || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {(isRendering || downloadUrl || error) && (
          <RenderProgress
            job={renderJob}
            downloadUrl={downloadUrl}
            isRendering={isRendering}
            error={error}
            onClose={onClose}
          />
        )}
      </div>
    </Dialog>
  );
};
