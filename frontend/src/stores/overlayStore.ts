import { create } from "zustand";
import type { OverlayItem, OverlayCategory } from "../types/overlay";
import { overlayService } from "../services/overlayService";

interface OverlayState {
  overlays: OverlayItem[];
  selectedCategory: OverlayCategory | "all";
  search: string;
  isLoading: boolean;
  hasFetched: boolean;

  setSelectedCategory: (category: OverlayCategory | "all") => void;
  setSearch: (search: string) => void;

  fetchOverlays: () => Promise<void>;
  uploadOverlay: (
    name: string,
    category: string,
    defaultAnimation: string,
    file: File
  ) => Promise<OverlayItem>;
  deleteOverlay: (id: string) => Promise<void>;
}

export const useOverlayStore = create<OverlayState>((set, get) => ({
  overlays: [],
  selectedCategory: "all",
  search: "",
  isLoading: false,
  hasFetched: false,

  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setSearch: (search) => set({ search }),

  fetchOverlays: async () => {
    set({ isLoading: true });
    try {
      const list = await overlayService.listOverlays();
      set({
        overlays: list,
        isLoading: false,
        hasFetched: true,
      });
    } catch (err) {
      console.error("[OverlayStore] Failed to fetch overlays:", err);
      set({ isLoading: false, hasFetched: true });
    }
  },

  uploadOverlay: async (name, category, defaultAnimation, file) => {
    set({ isLoading: true });
    try {
      const created = await overlayService.uploadOverlay(name, category, defaultAnimation, file);
      set({
        overlays: [created, ...get().overlays],
        isLoading: false,
      });
      return created;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  deleteOverlay: async (id: string) => {
    set({ isLoading: true });
    try {
      await overlayService.deleteOverlay(id);
      set({
        overlays: get().overlays.filter((o) => o.id !== id),
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
  useOverlayStore.getState().fetchOverlays().catch(() => {});
}
