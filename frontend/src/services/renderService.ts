import { apiFetch } from "./api";
import type { Job } from "../types/jobs";

export interface RenderOptions {
  resolution?: "720p" | "1080p" | "4k" | "custom";
  customWidth?: number;
  customHeight?: number;
  startTime?: number;
  endTime?: number;
  fps?: number;
}

export const renderService = {
  startRender: (projectId: string, options?: RenderOptions) =>
    apiFetch<{ jobId: string }>(`/api/projects/${projectId}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options || {}),
    }),

  getJobStatus: (jobId: string) =>
    apiFetch<Job>(`/api/jobs/${jobId}`),
};
