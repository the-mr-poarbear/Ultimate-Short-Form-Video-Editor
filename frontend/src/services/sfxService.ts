import { apiFetch } from "./api";
import type { SfxItem } from "../types/sfx";

export const sfxService = {
  async listSfx(category?: string): Promise<SfxItem[]> {
    const q = category && category !== "all" ? `?category=${encodeURIComponent(category)}` : "";
    return apiFetch<SfxItem[]>(`/api/sfx${q}`);
  },

  async getSfx(id: string): Promise<SfxItem> {
    return apiFetch<SfxItem>(`/api/sfx/${id}`);
  },

  async uploadSfx(
    name: string,
    category: string,
    file: File
  ): Promise<SfxItem> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("file", file);

    const API_BASE = "http://localhost:8000";
    const res = await fetch(`${API_BASE}/api/sfx`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let errText = `Failed to upload sound effect: ${res.statusText}`;
      try {
        const json = await res.json();
        if (json.detail) errText = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
      } catch {}
      throw new Error(errText);
    }

    return res.json();
  },

  async deleteSfx(id: string): Promise<void> {
    await apiFetch<{ status: string }>(`/api/sfx/${id}`, {
      method: "DELETE",
    });
  },
};
