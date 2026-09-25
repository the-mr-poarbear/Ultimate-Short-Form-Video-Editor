import { apiFetch } from "./api";
import type { Character, CharacterPose } from "../types/character";

export const characterService = {
  async listCharacters(): Promise<Character[]> {
    return apiFetch<Character[]>("/api/characters");
  },

  async createCharacter(name: string): Promise<Character> {
    return apiFetch<Character>("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  },

  async getCharacter(id: string): Promise<Character> {
    return apiFetch<Character>(`/api/characters/${id}`);
  },

  async updateCharacter(id: string, name: string, defaultPoseId?: string): Promise<Character> {
    return apiFetch<Character>(`/api/characters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, defaultPoseId }),
    });
  },

  async deleteCharacter(id: string): Promise<void> {
    await apiFetch<{ status: string }>(`/api/characters/${id}`, {
      method: "DELETE",
    });
  },

  async addPose(characterId: string, poseName: string, file: File): Promise<CharacterPose> {
    const formData = new FormData();
    formData.append("poseName", poseName);
    formData.append("file", file);

    const API_BASE = "http://localhost:8000";
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/poses`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let errText = `Failed to add pose: ${res.statusText}`;
      try {
        const json = await res.json();
        if (json.detail) errText = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
      } catch {}
      throw new Error(errText);
    }

    return res.json();
  },

  async deletePose(characterId: string, poseId: string): Promise<void> {
    await apiFetch<{ status: string }>(`/api/characters/${characterId}/poses/${poseId}`, {
      method: "DELETE",
    });
  },

  async updatePose(characterId: string, poseId: string, name: string): Promise<CharacterPose> {
    return apiFetch<CharacterPose>(`/api/characters/${characterId}/poses/${poseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  },
};
