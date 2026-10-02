import { create } from "zustand";
import type { SfxItem, SfxCategory } from "../types/sfx";
import { sfxService } from "../services/sfxService";
import { getMediaUrl } from "../services/api";

interface SfxState {
  sfxList: SfxItem[];
  selectedCategory: SfxCategory | "all";
  search: string;
  isLoading: boolean;
  hasFetched: boolean;
  previewingSfxId: string | null;

  setSelectedCategory: (category: SfxCategory | "all") => void;
  setSearch: (search: string) => void;

  fetchSfx: () => Promise<void>;
  playPreview: (url: string, id: string) => void;
  stopPreview: () => void;
  uploadSfx: (name: string, category: string, file: File) => Promise<SfxItem>;
  deleteSfx: (id: string) => Promise<void>;
}

let previewAudio: HTMLAudioElement | null = null;

export const useSfxStore = create<SfxState>((set, get) => ({
  sfxList: [],
  selectedCategory: "all",
  search: "",
  isLoading: false,
  hasFetched: false,
  previewingSfxId: null,

  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setSearch: (search) => set({ search }),

  fetchSfx: async () => {
    set({ isLoading: true });
    try {
      const list = await sfxService.listSfx();
      set({
        sfxList: list,
        isLoading: false,
        hasFetched: true,
      });
    } catch (err) {
      console.error("[SfxStore] Failed to fetch sfx:", err);
      set({ isLoading: false, hasFetched: true });
    }
  },

  playPreview: (url: string, id: string) => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }

    const fullUrl = getMediaUrl(url);
    const audio = new Audio(fullUrl);
    previewAudio = audio;
    set({ previewingSfxId: id });

    audio.onended = () => {
      if (get().previewingSfxId === id) {
        set({ previewingSfxId: null });
      }
    };

    audio.onerror = () => {
      console.warn("[SfxStore] Preview playback error for", fullUrl);
      if (get().previewingSfxId === id) {
        set({ previewingSfxId: null });
      }
    };

    audio.play().catch((err) => {
      console.warn("[SfxStore] Audio play error:", err);
      set({ previewingSfxId: null });
    });
  },

  stopPreview: () => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
      previewAudio = null;
    }
    set({ previewingSfxId: null });
  },

  uploadSfx: async (name, category, file) => {
    set({ isLoading: true });
    try {
      const created = await sfxService.uploadSfx(name, category, file);
      set({
        sfxList: [created, ...get().sfxList],
        isLoading: false,
      });
      return created;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  deleteSfx: async (id: string) => {
    if (get().previewingSfxId === id) {
      get().stopPreview();
    }
    set({ isLoading: true });
    try {
      await sfxService.deleteSfx(id);
      set({
        sfxList: get().sfxList.filter((s) => s.id !== id),
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
}));

// Fetch on initialization
if (typeof window !== "undefined") {
  useSfxStore.getState().fetchSfx().catch(() => {});
}
