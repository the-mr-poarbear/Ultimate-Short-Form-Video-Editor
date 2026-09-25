import { apiFetch } from "./api";
import type { BackgroundMusic } from "../types/project";

export interface AudioAnalysisResult {
  originalDuration: number;
  originalSilence: number;
  removedSilence: number;
  remainingSilence: number;
  processedDuration: number;
  silenceIntervals: Array<{ start: number; end: number; duration: number }>;
}

export interface AnalyzeAudioResponse {
  status: string;
  analysis: AudioAnalysisResult;
  processedAudio: string;
  duration: number;
  waveform: number[];
}

export const audioService = {
  uploadAudio: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ status: string; originalAudio: string; duration: number }>(
      `/api/projects/${projectId}/audio`,
      {
        method: "POST",
        body: formData,
      }
    );
  },

  analyzeAudio: (
    projectId: string,
    settings: {
      silenceThresholdDb?: number;
      minimumSilenceMs?: number;
      silenceRetentionPercent?: number;
    }
  ) =>
    apiFetch<AnalyzeAudioResponse>(`/api/projects/${projectId}/analyze-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),

  getWaveform: (projectId: string) =>
    apiFetch<{ peaks: number[] }>(`/api/projects/${projectId}/waveform`),

  uploadBackgroundMusic: (projectId: string, file: File, volume = 0.15) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("volume", volume.toString());
    return apiFetch<{ status: string; backgroundMusic: BackgroundMusic }>(
      `/api/projects/${projectId}/background-music/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
  },

  setBackgroundMusic: (
    projectId: string,
    data: {
      url: string;
      filename?: string;
      volume?: number;
      loop?: boolean;
      fadeInDuration?: number;
      fadeOutDuration?: number;
    }
  ) =>
    apiFetch<{ status: string; backgroundMusic: BackgroundMusic }>(
      `/api/projects/${projectId}/background-music`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    ),

  updateBackgroundMusic: (
    projectId: string,
    data: {
      volume?: number;
      loop?: boolean;
      fadeInDuration?: number;
      fadeOutDuration?: number;
    }
  ) =>
    apiFetch<{ status: string; backgroundMusic: BackgroundMusic }>(
      `/api/projects/${projectId}/background-music`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    ),

  deleteBackgroundMusic: (projectId: string) =>
    apiFetch<{ status: string }>(`/api/projects/${projectId}/background-music`, {
      method: "DELETE",
    }),
};
