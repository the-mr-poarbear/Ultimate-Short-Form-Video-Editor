import { useState, useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import { transcriptionService } from "../services/transcriptionService";
import type { Job } from "../types/jobs";

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [jobProgress, setJobProgress] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);

  const runTranscription = useCallback(async () => {
    if (!project) return;
    setIsTranscribing(true);
    setError(null);

    try {
      const { jobId } = await transcriptionService.startTranscription(project.id);

      // Poll job status
      const pollInterval = setInterval(async () => {
        try {
          const job = await transcriptionService.getJobStatus(jobId);
          setJobProgress(job);

          if (job.status === "completed") {
            clearInterval(pollInterval);
            setIsTranscribing(false);

            // Fetch updated transcript and auto-generate slices
            const { transcript } = await transcriptionService.getTranscript(project.id);
            const { slices } = await transcriptionService.generateSlices(project.id);

            setProject({
              ...project,
              transcript,
              slices,
            });
          } else if (job.status === "failed") {
            clearInterval(pollInterval);
            setIsTranscribing(false);
            setError(job.error || "Transcription failed");
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          setIsTranscribing(false);
          setError(err.message || "Failed to poll transcription status");
        }
      }, 1000);
    } catch (err: any) {
      setIsTranscribing(false);
      setError(err.message || "Failed to start transcription");
    }
  }, [project, setProject]);

  return {
    isTranscribing,
    jobProgress,
    error,
    runTranscription,
  };
}
