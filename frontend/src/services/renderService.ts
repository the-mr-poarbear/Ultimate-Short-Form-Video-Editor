import { apiFetch } from "./api";
import type { Job } from "../types/jobs";

export const renderService = {
  startRender: (projectId: string) =>
    apiFetch<{ jobId: string }>(`/api/projects/${projectId}/render`, {
      method: "POST",
    }),

  getJobStatus: (jobId: string) =>
    apiFetch<Job>(`/api/jobs/${jobId}`),
};
