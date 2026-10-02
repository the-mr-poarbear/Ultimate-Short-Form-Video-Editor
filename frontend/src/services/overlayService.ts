import { apiFetch } from "./api";
import type { OverlayItem } from "../types/overlay";

export const overlayService = {
  async listOverlays(category?: string): Promise<OverlayItem[]> {
    const q = category && category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
    return apiFetch<OverlayItem[]>(`/api/overlays${q}`);
  },

  async getOverlay(id: string): Promise<OverlayItem> {
    return apiFetch<OverlayItem>(`/api/overlays/${id}`);
  },

  async uploadOverlay(
    name: string,
    category: string,
    defaultAnimation: string,
    file: File
  ): Promise<OverlayItem> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("defaultAnimation", defaultAnimation);
    formData.append("file", file);

    const API_BASE = "http://localhost:8000";
    const res = await fetch(`${API_BASE}/api/overlays`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let errText = `Failed to upload overlay: ${res.statusText}`;
      try {
        const json = await res.json();
        if (json.detail) errText = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
      } catch {}
      throw new Error(errText);
    }

    return res.json();
  },

  async deleteOverlay(id: string): Promise<void> {
    await apiFetch<{ status: string }>(`/api/overlays/${id}`, {
      method: "DELETE",
    });
  },
};
