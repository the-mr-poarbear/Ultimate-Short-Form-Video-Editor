import { apiFetch } from "./api";
import type { TranscriptSegment } from "../types/transcript";
import type { Slice } from "../types/project";
import type { Job } from "../types/jobs";

export const transcriptionService = {
  startTranscription: (projectId: string) =>
    apiFetch<{ jobId: string }>(`/api/projects/${projectId}/transcribe`, {
      method: "POST",
    }),

  getTranscript: (projectId: string) =>
    apiFetch<{ transcript: TranscriptSegment[] }>(`/api/projects/${projectId}/transcript`),

  generateSlices: (
    projectId: string,
    options?: { minDuration?: number; maxDuration?: number }
  ) =>
    apiFetch<{ slices: Slice[]; count: number }>(
      `/api/projects/${projectId}/generate-slices`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options || {}),
      }
    ),

  splitSlice: (projectId: string, sliceId: string, splitTime: number) =>
    apiFetch<{ slices: Slice[] }>(`/api/projects/${projectId}/split-slice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sliceId, splitTime }),
    }),

  mergeSlices: (projectId: string, firstId: string, secondId: string) =>
    apiFetch<{ slices: Slice[] }>(`/api/projects/${projectId}/merge-slices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstId, secondId }),
    }),

  updateSlices: (projectId: string, slices: Slice[]) =>
    apiFetch<{ slices: Slice[] }>(`/api/projects/${projectId}/slices`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slices),
    }),

  getJobStatus: (jobId: string) =>
    apiFetch<Job>(`/api/jobs/${jobId}`),
};
