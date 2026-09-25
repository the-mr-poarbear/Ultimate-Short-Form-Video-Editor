import { create } from "zustand";
import type { Character, CharacterPose } from "../types/character";
import { characterService } from "../services/characterService";

interface CharacterState {
  characters: Character[];
  selectedCharacterId: string | null;
  isLoading: boolean;
  isCharactersModalOpen: boolean;

  setCharactersModalOpen: (open: boolean) => void;
  setSelectedCharacterId: (id: string | null) => void;

  fetchCharacters: () => Promise<void>;
  createCharacter: (name: string) => Promise<Character>;
  updateCharacter: (id: string, name: string, defaultPoseId?: string) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  addPose: (characterId: string, poseName: string, file: File) => Promise<CharacterPose>;
  deletePose: (characterId: string, poseId: string) => Promise<void>;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  selectedCharacterId: null,
  isLoading: false,
  isCharactersModalOpen: false,

  setCharactersModalOpen: (open) => {
    set({ isCharactersModalOpen: open });
    if (open) {
      get().fetchCharacters();
    }
  },

  setSelectedCharacterId: (id) => set({ selectedCharacterId: id }),

  fetchCharacters: async () => {
    set({ isLoading: true });
    try {
      const list = await characterService.listCharacters();
      set({
        characters: list,
        selectedCharacterId:
          get().selectedCharacterId && list.some((c) => c.id === get().selectedCharacterId)
            ? get().selectedCharacterId
            : list[0]?.id || null,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to fetch characters:", err);
      set({ isLoading: false });
    }
  },

  createCharacter: async (name: string) => {
    set({ isLoading: true });
    try {
      const created = await characterService.createCharacter(name);
      const updated = [created, ...get().characters];
      set({
        characters: updated,
        selectedCharacterId: created.id,
        isLoading: false,
      });
      return created;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  updateCharacter: async (id: string, name: string, defaultPoseId?: string) => {
    try {
      const updatedChar = await characterService.updateCharacter(id, name, defaultPoseId);
      set({
        characters: get().characters.map((c) => (c.id === id ? updatedChar : c)),
      });
    } catch (err) {
      console.error("Failed to update character:", err);
      throw err;
    }
  },

  deleteCharacter: async (id: string) => {
    set({ isLoading: true });
    try {
      await characterService.deleteCharacter(id);
      const remaining = get().characters.filter((c) => c.id !== id);
      set({
        characters: remaining,
        selectedCharacterId: remaining[0]?.id || null,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  addPose: async (characterId: string, poseName: string, file: File) => {
    try {
      const pose = await characterService.addPose(characterId, poseName, file);
      set({
        characters: get().characters.map((c) => {
          if (c.id !== characterId) return c;
          const defaultPose = c.defaultPoseId || pose.id;
          return {
            ...c,
            defaultPoseId: defaultPose,
            poses: [...c.poses, pose],
          };
        }),
      });
      return pose;
    } catch (err) {
      console.error("Failed to add pose:", err);
      throw err;
    }
  },

  deletePose: async (characterId: string, poseId: string) => {
    try {
      await characterService.deletePose(characterId, poseId);
      set({
        characters: get().characters.map((c) => {
          if (c.id !== characterId) return c;
          const remainingPoses = c.poses.filter((p) => p.id !== poseId);
          return {
            ...c,
            defaultPoseId: c.defaultPoseId === poseId ? remainingPoses[0]?.id : c.defaultPoseId,
            poses: remainingPoses,
          };
        }),
      });
    } catch (err) {
      console.error("Failed to delete pose:", err);
      throw err;
    }
  },
}));
