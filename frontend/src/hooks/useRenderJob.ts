import { useState, useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import { renderService, type RenderOptions } from "../services/renderService";
import type { Job } from "../types/jobs";

export function useRenderJob() {
  const [isRendering, setIsRendering] = useState(false);
  const [renderJob, setRenderJob] = useState<Job | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const project = useEditorStore((s) => s.project);

  const startRender = useCallback(async (options?: RenderOptions) => {
    if (!project) return;
    setIsRendering(true);
    setError(null);
    setDownloadUrl(null);

    try {
      const { jobId } = await renderService.startRender(project.id, options);

      const interval = setInterval(async () => {
        try {
          const job = await renderService.getJobStatus(jobId);
          setRenderJob(job);

          if (job.status === "completed") {
            clearInterval(interval);
            setIsRendering(false);
            if (job.result && job.result.videoUrl) {
              setDownloadUrl(job.result.videoUrl);
            }
          } else if (job.status === "failed") {
            clearInterval(interval);
            setIsRendering(false);
            setError(job.error || "Rendering failed");
          }
        } catch (err: any) {
          clearInterval(interval);
          setIsRendering(false);
          setError(err.message || "Failed to poll render status");
        }
      }, 1500);
    } catch (err: any) {
      setIsRendering(false);
      setError(err.message || "Failed to trigger video render");
    }
  }, [project]);

  return {
    isRendering,
    renderJob,
    downloadUrl,
    error,
    startRender,
  };
}
