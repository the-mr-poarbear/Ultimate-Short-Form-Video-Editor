import React from "react";
import { Progress } from "../ui/Progress";
import { Button } from "../ui/Button";
import type { Job } from "../../types/jobs";
import { getMediaUrl } from "../../services/api";
import { Download, AlertCircle, CheckCircle2, Film } from "lucide-react";

interface RenderProgressProps {
  job: Job | null;
  downloadUrl: string | null;
  isRendering: boolean;
  error: string | null;
  onClose: () => void;
}

export const RenderProgress: React.FC<RenderProgressProps> = ({
  job,
  downloadUrl,
  isRendering,
  error,
  onClose,
}) => {
  return (
    <div className="flex flex-col gap-4 py-2">
      {isRendering && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-primary font-medium animate-pulse">
            <Film className="w-4 h-4 animate-spin" />
            <span>Rendering Book Bite Short (1080×1920)...</span>
          </div>

          <Progress
            value={job?.progress || 10}
            label={job?.message || "Running FFmpeg composition..."}
            subLabel={`${job?.progress || 10}%`}
          />
        </div>
      )}

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-md flex items-start gap-2 text-danger text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Render Failed</span>
            <span className="text-[11px] leading-relaxed">{error}</span>
          </div>
        </div>
      )}

      {downloadUrl && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-md flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="w-8 h-8 text-success" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">Video Ready for Export</span>
            <span className="text-xs text-muted-foreground">
              Full 1080×1920 MP4 rendered with voiceover, slice visuals, and animated captions.
            </span>
          </div>

          <a
            href={getMediaUrl(downloadUrl)}
            download="book-bite-short.mp4"
            className="editor-btn-primary w-full py-2 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download 1080x1920 MP4
          </a>
        </div>
      )}
    </div>
  );
};
