import { create } from "zustand";
import type { Project, Slice, ProjectSettings, SliceVisual, SliceCharacter, BackgroundMusic, TimelineOverlay, TimelineSoundEffect } from "../types/project";
import type { MediaAsset } from "../types/media";
import type { Job } from "../types/jobs";
import { DEFAULT_PIXELS_PER_SECOND } from "../lib/timeline";
import { projectService } from "../services/projectService";

interface EditorState {
  project: Project | null;
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  zoom: number;
  waveformPeaks: number[];

  selectedSliceId: string | null;
  selectedAssetId: string | null;
  selectedOverlayId: string | null;
  selectedSoundEffectId: string | null;
  activeJob: Job | null;

  isOverlaysModalOpen: boolean;
  isSfxModalOpen: boolean;

  // History & Persistence
  past: Project[];
  future: Project[];
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;

  undo: () => void;
  redo: () => void;
  beginBatch: () => void;
  endBatch: () => void;
  cancelBatch: () => void;
  saveProject: () => Promise<void>;
  markSaved: () => void;

  setProject: (project: Project | null, clearHistory?: boolean) => void;
  updateProjectTitle: (title: string) => void;
  updateProjectSettings: (settings: Partial<ProjectSettings>) => void;
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  setWaveformPeaks: (peaks: number[]) => void;

  selectSlice: (id: string | null) => void;
  selectAsset: (id: string | null) => void;

  addMediaAsset: (asset: MediaAsset) => void;
  removeMediaAsset: (assetId: string) => void;
  updateMediaAssetDuration: (assetId: string, duration: number) => void;
  assignVisualToSlice: (sliceId: string, assetId: string, type: "image" | "video") => void;
  removeVisualFromSlice: (sliceId: string) => void;
  updateSliceVisual: (sliceId: string, visualPatch: Partial<SliceVisual>) => void;

  assignCharacterToSlice: (sliceId: string, characterId: string, poseId: string) => void;
  removeCharacterFromSlice: (sliceId: string) => void;
  updateSliceCharacter: (sliceId: string, patch: Partial<SliceCharacter>) => void;

  setBackgroundVideo: (assetUrl: string | undefined) => void;

  setBackgroundMusic: (bgm: BackgroundMusic | undefined) => void;
  updateBackgroundMusicVolume: (volume: number) => void;
  updateBackgroundMusicSettings: (settings: Partial<BackgroundMusic>) => void;
  isBackgroundMusicModalOpen: boolean;
  setBackgroundMusicModalOpen: (open: boolean) => void;

  selectOverlay: (id: string | null) => void;
  selectSoundEffect: (id: string | null) => void;
  setOverlaysModalOpen: (open: boolean) => void;
  setSfxModalOpen: (open: boolean) => void;

  addOverlayToTimeline: (overlay: Omit<TimelineOverlay, "id">) => string;
  updateTimelineOverlay: (id: string, patch: Partial<TimelineOverlay>, isContinuous?: boolean) => void;
  removeTimelineOverlay: (id: string) => void;

  addSoundEffectToTimeline: (sfx: Omit<TimelineSoundEffect, "id">) => string;
  updateTimelineSoundEffect: (id: string, patch: Partial<TimelineSoundEffect>, isContinuous?: boolean) => void;
  removeTimelineSoundEffect: (id: string) => void;

  setSlices: (slices: Slice[]) => void;
  splitSlice: (sliceId: string, time: number) => void;
  splitSliceAtTime: (splitTime: number) => void;
  mergeSlices: (firstId: string, secondId: string) => void;
  deleteSlice: (sliceId: string) => void;
  canJoinTranscriptions: (segmentIds: string[]) => { canJoin: boolean; reason?: string };
  joinTranscriptions: (segmentIds: string[]) => { success: boolean; error?: string };

  isCaptionSettingsOpen: boolean;
  setCaptionSettingsOpen: (open: boolean) => void;

  isSliceMode: boolean;
  setSliceMode: (active: boolean) => void;

  isEmphasizeMode: boolean;
  setEmphasizeMode: (active: boolean) => void;
  toggleWordEmphasis: (segmentId: string, wordIndex: number) => void;
  setWordEmphasis: (segmentId: string, wordIndex: number, emphasized: boolean) => void;
  clearSectionEmphasis: (segmentId: string) => void;
  clearAllEmphasis: () => void;

  isSliceSettingsOpen: boolean;
  setSliceSettingsOpen: (open: boolean) => void;

  setActiveJob: (job: Job | null) => void;
}

const cloneProject = (p: Project): Project => JSON.parse(JSON.stringify(p));
const MAX_HISTORY = 50;
let batchSnapshot: Project | null = null;
let lastSettingsSnapshotTime = 0;

function pushHistory(
  state: EditorState,
  isSettings = false
): { past: Project[]; future: Project[]; isDirty: boolean } {
  if (!state.project) {
    return { past: state.past, future: state.future, isDirty: state.isDirty };
  }

  // If in an active batch (e.g. continuous dragging, resizing, or slider scrub):
  // do not record intermediate history steps! The start-state is preserved in batchSnapshot.
  if (batchSnapshot !== null) {
    return { past: state.past, future: [], isDirty: true };
  }

  const now = Date.now();
  if (isSettings && now - lastSettingsSnapshotTime < 600) {
    return { past: state.past, future: [], isDirty: true };
  }
  if (isSettings) {
    lastSettingsSnapshotTime = now;
  }

  const snapshot = cloneProject(state.project);
  const newPast = [...state.past, snapshot].slice(-MAX_HISTORY);
  return {
    past: newPast,
    future: [],
    isDirty: true,
  };
}

export function healSliceBoundaries(slices: Slice[] | undefined, totalDuration?: number): Slice[] {
  if (!slices || slices.length === 0) return [];
  const sorted = slices.map((s) => ({ ...s })).sort((a, b) => a.start - b.start);

  // Ensure first slice starts at 0.0
  if (sorted[0].start > 0.05) {
    sorted[0].start = 0;
  }

  // Ensure every slice touches the next slice without gaps
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const nxt = sorted[i + 1];
    if (Math.abs(curr.end - nxt.start) > 0.001) {
      curr.end = nxt.start;
    }
  }

  // Ensure last slice covers up to totalDuration
  if (totalDuration && totalDuration > 0) {
    const last = sorted[sorted.length - 1];
    if (last.end < totalDuration - 0.1) {
      last.end = Math.round(totalDuration * 100) / 100;
    }
  }

  return sorted;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  currentTime: 0,
  isPlaying: false,
  duration: 0,
  zoom: DEFAULT_PIXELS_PER_SECOND,
  waveformPeaks: [],

  selectedSliceId: null,
  selectedAssetId: null,
  selectedOverlayId: null,
  selectedSoundEffectId: null,
  activeJob: null,
  isCaptionSettingsOpen: false,
  isSliceMode: false,
  isEmphasizeMode: false,
  isSliceSettingsOpen: false,
  isBackgroundMusicModalOpen: false,
  isOverlaysModalOpen: false,
  isSfxModalOpen: false,

  past: [],
  future: [],
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  saveError: null,

  beginBatch: () => {
    const { project } = get();
    if (!project) return;
    if (batchSnapshot === null) {
      batchSnapshot = cloneProject(project);
    }
  },

  endBatch: () => {
    if (batchSnapshot === null) return;
    const { project, past } = get();
    const snapshot = batchSnapshot;
    batchSnapshot = null;

    if (!project) return;

    // Only commit to history if the project was actually modified during the gesture
    if (JSON.stringify(snapshot) === JSON.stringify(project)) {
      return;
    }

    const newPast = [...past, snapshot].slice(-MAX_HISTORY);
    set({
      past: newPast,
      future: [],
      isDirty: true,
    });
  },

  cancelBatch: () => {
    if (batchSnapshot === null) return;
    const snapshot = batchSnapshot;
    batchSnapshot = null;
    set({
      project: snapshot,
    });
  },

  undo: () => {
    batchSnapshot = null;
    const { past, future, project } = get();
    if (past.length === 0 || !project) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    set({
      project: previous,
      past: newPast,
      future: [cloneProject(project), ...future],
      duration: previous.duration || 0,
      isDirty: true,
    });
  },

  redo: () => {
    batchSnapshot = null;
    const { past, future, project } = get();
    if (future.length === 0 || !project) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      project: next,
      past: [...past, cloneProject(project)],
      future: newFuture,
      duration: next.duration || 0,
      isDirty: true,
    });
  },

  saveProject: async () => {
    const { project, isSaving } = get();
    if (!project || isSaving) return;
    set({ isSaving: true, saveError: null });
    try {
      const saved = await projectService.updateProject(project);
      set({
        project: saved,
        isSaving: false,
        isDirty: false,
        lastSavedAt: new Date(),
        saveError: null,
      });
    } catch (err: any) {
      console.error("Failed to save project:", err);
      set({
        isSaving: false,
        saveError: err?.message || "Failed to save project",
      });
    }
  },

  markSaved: () => set({ isDirty: false, lastSavedAt: new Date(), saveError: null }),

  setCaptionSettingsOpen: (open) => set({ isCaptionSettingsOpen: open }),
  setSliceMode: (active) => set({ isSliceMode: active, ...(active ? { isEmphasizeMode: false } : {}) }),
  setEmphasizeMode: (active) => set({ isEmphasizeMode: active, ...(active ? { isSliceMode: false } : {}) }),
  setSliceSettingsOpen: (open) => set({ isSliceSettingsOpen: open }),

  setProject: (project, clearHistory = false) => {
    batchSnapshot = null;
    set((state) => {
      const isNewProj = !state.project || (project && project.id !== state.project.id);
      const healedProject = project
        ? {
            ...project,
            slices: healSliceBoundaries(project.slices, project.duration),
          }
        : null;
      return {
        project: healedProject,
        duration: healedProject?.duration || 0,
        past: clearHistory || isNewProj ? [] : state.past,
        future: clearHistory || isNewProj ? [] : state.future,
        isDirty: clearHistory || isNewProj ? false : state.isDirty,
        lastSavedAt: clearHistory || isNewProj ? new Date() : state.lastSavedAt,
      };
    });
  },

  updateProjectTitle: (title) =>
    set((state) => {
      if (!state.project || state.project.title === title) return state;
      const hist = pushHistory(state, true);
      return {
        ...hist,
        project: {
          ...state.project,
          title,
        },
      };
    }),

  updateProjectSettings: (newSettings) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state, true);
      return {
        ...hist,
        project: {
          ...state.project,
          settings: {
            ...state.project.settings,
            ...newSettings,
          },
        },
      };
    }),

  setCurrentTime: (time) =>
    set((state) => ({
      currentTime: Math.max(0, Math.min(time, state.duration || 99999)),
    })),

  setPlaying: (isPlaying) => set({ isPlaying }),
  setDuration: (duration) => set({ duration }),
  setZoom: (zoom) => set({ zoom }),
  setWaveformPeaks: (waveformPeaks) => set({ waveformPeaks }),

  selectSlice: (selectedSliceId) => set({ selectedSliceId }),
  selectAsset: (selectedAssetId) => set({ selectedAssetId }),

  addMediaAsset: (asset) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          mediaAssets: [...state.project.mediaAssets, asset],
        },
      };
    }),

  removeMediaAsset: (assetId) =>
    set((state) => {
      if (!state.project) return state;
      const targetAsset = state.project.mediaAssets.find((a) => a.id === assetId);
      const isBg = targetAsset && state.project.backgroundVideo === targetAsset.url;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          backgroundVideo: isBg ? undefined : state.project.backgroundVideo,
          mediaAssets: state.project.mediaAssets.filter((a) => a.id !== assetId),
          slices: state.project.slices.map((s) =>
            s.visual?.assetId === assetId ? { ...s, visual: undefined } : s
          ),
        },
      };
    }),

  updateMediaAssetDuration: (assetId, duration) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          mediaAssets: state.project.mediaAssets.map((a) =>
            a.id === assetId ? { ...a, duration } : a
          ),
        },
      };
    }),

  assignVisualToSlice: (sliceId, assetId, type) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          slices: state.project.slices.map((s) =>
            s.id === sliceId
              ? {
                  ...s,
                  visual: {
                    assetId,
                    type,
                    fit: "cover",
                    transition: s.visual?.transition || "none",
                    rotation: s.visual?.rotation ?? 0,
                    speed: s.visual?.speed ?? 1.0,
                  },
                }
              : s
          ),
        },
      };
    }),

  removeVisualFromSlice: (sliceId) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          slices: state.project.slices.map((s) =>
            s.id === sliceId ? { ...s, visual: undefined } : s
          ),
        },
      };
    }),

  updateSliceVisual: (sliceId, visualPatch) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state, true);
      return {
        ...hist,
        project: {
          ...state.project,
          slices: state.project.slices.map((s) => {
            if (s.id !== sliceId || !s.visual) return s;
            return {
              ...s,
              visual: {
                ...s.visual,
                ...visualPatch,
              },
            };
          }),
        },
      };
    }),

  assignCharacterToSlice: (sliceId, characterId, poseId) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          slices: state.project.slices.map((s) =>
            s.id === sliceId
              ? {
                  ...s,
                  character: {
                    characterId,
                    poseId,
                    positionX: s.character?.positionX ?? 75,
                    positionY: s.character?.positionY ?? 75,
                    width: s.character?.width ?? 35,
                    height: s.character?.height ?? 40,
                    scale: s.character?.scale ?? 1.0,
                    flipX: s.character?.flipX ?? false,
                    visible: true,
                  },
                }
              : s
          ),
        },
      };
    }),

  removeCharacterFromSlice: (sliceId) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          slices: state.project.slices.map((s) =>
            s.id === sliceId ? { ...s, character: undefined } : s
          ),
        },
      };
    }),

  updateSliceCharacter: (sliceId, patch) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state, true);
      return {
        ...hist,
        project: {
          ...state.project,
          slices: state.project.slices.map((s) => {
            if (s.id !== sliceId || !s.character) return s;
            return {
              ...s,
              character: {
                ...s.character,
                ...patch,
              },
            };
          }),
        },
      };
    }),

  setBackgroundVideo: (backgroundVideo) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          backgroundVideo,
        },
      };
    }),

  setBackgroundMusic: (backgroundMusic) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          backgroundMusic,
        },
      };
    }),

  updateBackgroundMusicVolume: (volume) =>
    set((state) => {
      if (!state.project || !state.project.backgroundMusic) return state;
      const hist = pushHistory(state, true);
      return {
        ...hist,
        project: {
          ...state.project,
          backgroundMusic: {
            ...state.project.backgroundMusic,
            volume,
          },
        },
      };
    }),

  updateBackgroundMusicSettings: (bgmPatch) =>
    set((state) => {
      if (!state.project || !state.project.backgroundMusic) return state;
      const hist = pushHistory(state, true);
      return {
        ...hist,
        project: {
          ...state.project,
          backgroundMusic: {
            ...state.project.backgroundMusic,
            ...bgmPatch,
          },
        },
      };
    }),

  setBackgroundMusicModalOpen: (isBackgroundMusicModalOpen) =>
    set({ isBackgroundMusicModalOpen }),

  selectOverlay: (id) =>
    set({
      selectedOverlayId: id,
      selectedSliceId: id ? null : get().selectedSliceId,
      selectedSoundEffectId: null,
    }),

  selectSoundEffect: (id) =>
    set({
      selectedSoundEffectId: id,
      selectedSliceId: id ? null : get().selectedSliceId,
      selectedOverlayId: null,
    }),

  setOverlaysModalOpen: (isOverlaysModalOpen) => set({ isOverlaysModalOpen }),
  setSfxModalOpen: (isSfxModalOpen) => set({ isSfxModalOpen }),

  addOverlayToTimeline: (overlayData) => {
    const id = `ov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newOverlay: TimelineOverlay = { ...overlayData, id };
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const existing = state.project.overlays || [];
      return {
        ...hist,
        project: {
          ...state.project,
          overlays: [...existing, newOverlay].sort((a, b) => a.start - b.start),
        },
        selectedOverlayId: id,
      };
    });
    return id;
  },

  updateTimelineOverlay: (id, patch, isContinuous = false) => {
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state, isContinuous);
      const existing = state.project.overlays || [];
      return {
        ...hist,
        project: {
          ...state.project,
          overlays: existing.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        },
      };
    });
  },

  removeTimelineOverlay: (id) => {
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const existing = state.project.overlays || [];
      return {
        ...hist,
        project: {
          ...state.project,
          overlays: existing.filter((o) => o.id !== id),
        },
        selectedOverlayId: state.selectedOverlayId === id ? null : state.selectedOverlayId,
      };
    });
  },

  addSoundEffectToTimeline: (sfxData) => {
    const id = `sfx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSfx: TimelineSoundEffect = { ...sfxData, id };
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const existing = state.project.soundEffects || [];
      return {
        ...hist,
        project: {
          ...state.project,
          soundEffects: [...existing, newSfx].sort((a, b) => a.start - b.start),
        },
        selectedSoundEffectId: id,
      };
    });
    return id;
  },

  updateTimelineSoundEffect: (id, patch, isContinuous = false) => {
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state, isContinuous);
      const existing = state.project.soundEffects || [];
      return {
        ...hist,
        project: {
          ...state.project,
          soundEffects: existing.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        },
      };
    });
  },

  removeTimelineSoundEffect: (id) => {
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const existing = state.project.soundEffects || [];
      return {
        ...hist,
        project: {
          ...state.project,
          soundEffects: existing.filter((s) => s.id !== id),
        },
        selectedSoundEffectId: state.selectedSoundEffectId === id ? null : state.selectedSoundEffectId,
      };
    });
  },

  setSlices: (slices) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      return {
        ...hist,
        project: {
          ...state.project,
          slices,
        },
      };
    }),

  splitSlice: (_sliceId, splitTime) => {
    get().splitSliceAtTime(splitTime);
  },

  splitSliceAtTime: (splitTime) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const targetInputTime = Math.max(0, splitTime);
      const slices = state.project.slices;

      // Extract and sort all words from transcript for word-aware text partitioning
      const allWords = (state.project.transcript || [])
        .flatMap((t) => t.words || [])
        .sort((a, b) => a.start - b.start);

      // 1. Identify target word to start the new slice/section
      let targetWord: import("../types/transcript").WordTiming | null = null;
      let targetWordIdx = -1;

      // A) Direct/close match with word start (e.g. word clicked in transcript)
      const directMatchIdx = allWords.findIndex(
        (w) => Math.abs(w.start - targetInputTime) < 0.05
      );
      if (directMatchIdx !== -1) {
        targetWordIdx = directMatchIdx;
        targetWord = allWords[directMatchIdx];
      } else {
        // B) Playhead or time inside a word
        const containingWordIdx = allWords.findIndex(
          (w) => w.start <= targetInputTime && targetInputTime <= w.end
        );
        if (containingWordIdx !== -1) {
          const w = allWords[containingWordIdx];
          const dur = Math.max(0.01, w.end - w.start);
          const progress = (targetInputTime - w.start) / dur;
          // If within the first 45% of the word, start new section with this word
          if (progress < 0.45) {
            targetWordIdx = containingWordIdx;
            targetWord = w;
          } else if (containingWordIdx < allWords.length - 1) {
            // Otherwise start new section with the next word
            targetWordIdx = containingWordIdx + 1;
            targetWord = allWords[containingWordIdx + 1];
          }
        } else {
          // C) In pause between words
          const nextWordIdx = allWords.findIndex((w) => w.start > targetInputTime);
          if (nextWordIdx !== -1) {
            targetWordIdx = nextWordIdx;
            targetWord = allWords[nextWordIdx];
          }
        }
      }

      // 2. Calculate exact acoustic cut time with natural lead-in in the acoustic pause
      let exactCutTime = Math.round(targetInputTime * 100) / 100;

      if (targetWord) {
        const prevWord = targetWordIdx > 0 ? allWords[targetWordIdx - 1] : null;
        if (prevWord) {
          const pause = Math.max(0, targetWord.start - prevWord.end);
          // Lead-in into natural pause before word (up to 80ms, but at most half the pause)
          const leadIn = Math.min(pause * 0.5, 0.08);
          exactCutTime = Math.max(
            Math.round(prevWord.end * 100) / 100,
            Math.round((targetWord.start - leadIn) * 100) / 100
          );
        } else {
          exactCutTime = Math.max(0, Math.round((targetWord.start - 0.08) * 100) / 100);
        }
      }

      const totalDur = state.project.duration || 10;

      // Handle case where no slices exist yet
      if (slices.length === 0) {
        if (exactCutTime <= 0.05 || exactCutTime >= totalDur - 0.05) return state;
        const wordsA = allWords.filter((w) => w.start < exactCutTime).map((w) => w.word).join(" ");
        const wordsB = allWords.filter((w) => w.start >= exactCutTime).map((w) => w.word).join(" ");

        const s1: Slice = {
          id: `slice-${Date.now()}-1`,
          start: 0,
          end: exactCutTime,
          text: wordsA || "Section 1",
        };
        const s2: Slice = {
          id: `slice-${Date.now()}-2`,
          start: exactCutTime,
          end: Math.round(totalDur * 100) / 100,
          text: wordsB || "Section 2",
        };
        return {
          ...hist,
          project: {
            ...state.project,
            slices: healSliceBoundaries([s1, s2], totalDur),
          },
          currentTime: exactCutTime,
          selectedSliceId: s2.id,
        };
      }

      // 3. Find slice containing exactCutTime
      const sortedSlices = [...slices].sort((a, b) => a.start - b.start);
      let targetSlice = sortedSlices.find(
        (s) => s.start <= exactCutTime + 0.01 && exactCutTime <= s.end - 0.01
      );
      if (!targetSlice) {
        targetSlice = sortedSlices.find((s) => s.start <= exactCutTime) || sortedSlices[0];
      }

      let newSlices: Slice[] = [];
      let selectedId = "";

      // Check if exactCutTime is right near an existing slice boundary (within 150ms)
      const nearStart = Math.abs(exactCutTime - targetSlice.start) < 0.15;
      const nearEnd = Math.abs(targetSlice.end - exactCutTime) < 0.15;

      if (nearStart && targetSlice.start > 0.05) {
        // Boundary adjustment: snap boundary to exactCutTime
        const targetIdx = sortedSlices.findIndex((s) => s.id === targetSlice!.id);
        newSlices = sortedSlices.map((s, idx) => {
          if (idx === targetIdx - 1) {
            return { ...s, end: exactCutTime };
          }
          if (idx === targetIdx) {
            return { ...s, start: exactCutTime };
          }
          return s;
        });
        selectedId = targetSlice.id;
      } else if (nearEnd && targetSlice.end < totalDur - 0.05) {
        const targetIdx = sortedSlices.findIndex((s) => s.id === targetSlice!.id);
        const nextSlice = targetIdx < sortedSlices.length - 1 ? sortedSlices[targetIdx + 1] : null;
        newSlices = sortedSlices.map((s, idx) => {
          if (idx === targetIdx) {
            return { ...s, end: exactCutTime };
          }
          if (idx === targetIdx + 1) {
            return { ...s, start: exactCutTime };
          }
          return s;
        });
        selectedId = nextSlice ? nextSlice.id : targetSlice.id;
      } else {
        // Standard split of targetSlice into sliceA and sliceB
        const sliceWords = allWords.filter(
          (w) => w.start >= targetSlice!.start - 0.05 && w.end <= targetSlice!.end + 0.05
        );

        let textA = targetSlice.text;
        let textB = targetSlice.text;

        if (sliceWords.length > 0) {
          const wordsBefore = sliceWords.filter((w) => w.start < exactCutTime).map((w) => w.word).join(" ");
          const wordsAfter = sliceWords.filter((w) => w.start >= exactCutTime).map((w) => w.word).join(" ");
          if (wordsBefore && wordsAfter) {
            textA = wordsBefore;
            textB = wordsAfter;
          } else if (wordsBefore && !wordsAfter) {
            textA = wordsBefore;
            textB = targetSlice.text ? `${targetSlice.text} (Break)` : "(Break)";
          } else if (!wordsBefore && wordsAfter) {
            textA = targetSlice.text ? `${targetSlice.text} (Intro)` : "(Intro)";
            textB = wordsAfter;
          }
        }

        const idA = `${targetSlice.id}-a`;
        const idB = `${targetSlice.id}-b`;
        selectedId = idB;

        for (const s of sortedSlices) {
          if (s.id === targetSlice.id) {
            newSlices.push({
              id: idA,
              start: s.start,
              end: exactCutTime,
              text: textA,
              visual: s.visual,
            });
            newSlices.push({
              id: idB,
              start: exactCutTime,
              end: s.end,
              text: textB,
              visual: s.visual ? { ...s.visual } : undefined,
            });
          } else {
            newSlices.push(s);
          }
        }
      }

      // Always heal slices so they are strictly contiguous with zero gaps
      const healedSlices = healSliceBoundaries(newSlices, totalDur);

      // 4. Partition or align transcript segments
      const currentTranscript = state.project.transcript || [];
      const newTranscript: import("../types/transcript").TranscriptSegment[] = [];
      let didHandleTranscript = false;

      // Locate target segment and word in transcript
      if (targetWord) {
        let segIdx = -1;
        let wordIdxInSeg = -1;

        for (let i = 0; i < currentTranscript.length; i++) {
          const seg = currentTranscript[i];
          const wIdx = (seg.words || []).findIndex(
            (w) => w === targetWord || (w.word === targetWord!.word && Math.abs(w.start - targetWord!.start) < 0.01)
          );
          if (wIdx !== -1) {
            segIdx = i;
            wordIdxInSeg = wIdx;
            break;
          }
        }

        if (segIdx !== -1) {
          const targetSeg = currentTranscript[segIdx];
          const segWords = targetSeg.words || [];

          if (wordIdxInSeg > 0 && wordIdxInSeg < segWords.length) {
            // Split segment into segA and segB
            const wordsBefore = segWords.slice(0, wordIdxInSeg);
            const wordsAfter = segWords.slice(wordIdxInSeg);

            const segA: import("../types/transcript").TranscriptSegment = {
              id: `${targetSeg.id}-a`,
              start: targetSeg.start,
              end: exactCutTime,
              text: wordsBefore.map((w) => w.word).join(" "),
              words: wordsBefore,
            };

            const segB: import("../types/transcript").TranscriptSegment = {
              id: `${targetSeg.id}-b`,
              start: exactCutTime,
              end: targetSeg.end,
              text: wordsAfter.map((w) => w.word).join(" "),
              words: wordsAfter,
            };

            for (let i = 0; i < currentTranscript.length; i++) {
              if (i === segIdx) {
                newTranscript.push(segA, segB);
              } else {
                newTranscript.push(currentTranscript[i]);
              }
            }
            didHandleTranscript = true;
          } else if (wordIdxInSeg === 0) {
            // Target word is already the first word of targetSeg.
            // Synchronize boundary with previous segment so there is no gap!
            for (let i = 0; i < currentTranscript.length; i++) {
              if (i === segIdx - 1) {
                newTranscript.push({
                  ...currentTranscript[i],
                  end: exactCutTime,
                });
              } else if (i === segIdx) {
                newTranscript.push({
                  ...targetSeg,
                  start: exactCutTime,
                });
              } else {
                newTranscript.push(currentTranscript[i]);
              }
            }
            didHandleTranscript = true;
          }
        }
      }

      // Fallback: If not handled by word, check by exactCutTime
      if (!didHandleTranscript) {
        for (const seg of currentTranscript) {
          if (!didHandleTranscript && seg.start < exactCutTime && exactCutTime < seg.end) {
            const segWords = seg.words || [];
            const cutWordIdx = segWords.findIndex((w) => w.start >= exactCutTime);

            if (cutWordIdx > 0 && cutWordIdx < segWords.length) {
              const wordsBefore = segWords.slice(0, cutWordIdx);
              const wordsAfter = segWords.slice(cutWordIdx);

              const segA: import("../types/transcript").TranscriptSegment = {
                id: `${seg.id}-a`,
                start: seg.start,
                end: exactCutTime,
                text: wordsBefore.map((w) => w.word).join(" "),
                words: wordsBefore,
              };
              const segB: import("../types/transcript").TranscriptSegment = {
                id: `${seg.id}-b`,
                start: exactCutTime,
                end: seg.end,
                text: wordsAfter.map((w) => w.word).join(" "),
                words: wordsAfter,
              };
              newTranscript.push(segA, segB);
              didHandleTranscript = true;
            } else {
              newTranscript.push(seg);
            }
          } else {
            newTranscript.push(seg);
          }
        }
      }

      return {
        ...hist,
        project: {
          ...state.project,
          slices: healedSlices,
          transcript: didHandleTranscript ? newTranscript : currentTranscript,
        },
        currentTime: exactCutTime,
        selectedSliceId: selectedId || state.selectedSliceId,
      };
    }),

  mergeSlices: (firstId, secondId) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const s1 = state.project.slices.find((s) => s.id === firstId);
      const s2 = state.project.slices.find((s) => s.id === secondId);
      if (!s1 || !s2) return state;

      const merged: Slice = {
        id: s1.id,
        start: Math.min(s1.start, s2.start),
        end: Math.max(s1.end, s2.end),
        text: `${s1.text} ${s2.text}`.trim(),
        visual: s1.visual || s2.visual,
      };

      const newSlices = state.project.slices
        .filter((s) => s.id !== secondId)
        .map((s) => (s.id === firstId ? merged : s));

      const healedSlices = healSliceBoundaries(newSlices, state.project.duration);

      return {
        ...hist,
        project: {
          ...state.project,
          slices: healedSlices,
        },
      };
    }),

  deleteSlice: (sliceId) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const slices = [...state.project.slices].sort((a, b) => a.start - b.start);
      const targetIndex = slices.findIndex((s) => s.id === sliceId);
      if (targetIndex === -1) return state;

      const targetSlice = slices[targetIndex];
      const newSlices = slices.filter((s) => s.id !== sliceId);

      if (newSlices.length > 0) {
        if (targetIndex > 0) {
          // Seamlessly expand previous slice to cover the deleted slice's time
          const prevSlice = newSlices[targetIndex - 1];
          prevSlice.end = targetSlice.end;
          if (targetSlice.text && !prevSlice.text.includes(targetSlice.text)) {
            prevSlice.text = `${prevSlice.text} ${targetSlice.text}`.trim();
          }
        } else {
          // If first slice was deleted, expand new first slice backwards to start
          newSlices[0].start = targetSlice.start;
        }
      }

      const healedSlices = healSliceBoundaries(newSlices, state.project.duration);

      return {
        ...hist,
        project: {
          ...state.project,
          slices: healedSlices,
        },
        selectedSliceId: state.selectedSliceId === sliceId ? null : state.selectedSliceId,
      };
    }),

  canJoinTranscriptions: (segmentIds) => {
    const state = get();
    if (!state.project) return { canJoin: false, reason: "No active project" };
    const targetSegments = state.project.transcript
      .filter((s) => segmentIds.includes(s.id))
      .sort((a, b) => a.start - b.start);

    if (targetSegments.length < 2) {
      return { canJoin: false, reason: "Select at least 2 transcript segments to join." };
    }

    const firstSeg = targetSegments[0];
    const lastSeg = targetSegments[targetSegments.length - 1];
    const joinStart = firstSeg.start;
    const joinEnd = lastSeg.end;

    // Associated slices
    const assocSlices = state.project.slices
      .filter((s) => s.start < joinEnd - 0.05 && s.end > joinStart + 0.05)
      .sort((a, b) => a.start - b.start);

    if (assocSlices.length > 1) {
      const otherSlices = assocSlices.slice(1);
      const nonEmptySlices = otherSlices.filter((s) => {
        const hasVisual = Boolean(s.visual && s.visual.assetId);
        const hasChar = Boolean(s.character && s.character.characterId);
        return hasVisual || hasChar;
      });

      if (nonEmptySlices.length > 0) {
        return {
          canJoin: false,
          reason: `Every slice of those transcriptions except the first one must be empty. Slice "${nonEmptySlices[0].id}" has media or character assigned.`,
        };
      }
    }

    return { canJoin: true };
  },

  joinTranscriptions: (segmentIds) => {
    let outcome: { success: boolean; error?: string } = { success: false };
    set((state) => {
      if (!state.project) {
        outcome = { success: false, error: "No active project" };
        return state;
      }
      const targetSegments = state.project.transcript
        .filter((s) => segmentIds.includes(s.id))
        .sort((a, b) => a.start - b.start);

      if (targetSegments.length < 2) {
        outcome = { success: false, error: "Select at least 2 transcript segments to join." };
        return state;
      }

      const firstSeg = targetSegments[0];
      const lastSeg = targetSegments[targetSegments.length - 1];
      const joinStart = firstSeg.start;
      const joinEnd = lastSeg.end;

      const assocSlices = state.project.slices
        .filter((s) => s.start < joinEnd - 0.05 && s.end > joinStart + 0.05)
        .sort((a, b) => a.start - b.start);

      // Check condition: Every slice of those transcriptions except the first one MUST be empty!
      if (assocSlices.length > 1) {
        const otherSlices = assocSlices.slice(1);
        const nonEmptySlices = otherSlices.filter((s) => {
          const hasVisual = Boolean(s.visual && s.visual.assetId);
          const hasChar = Boolean(s.character && s.character.characterId);
          return hasVisual || hasChar;
        });

        if (nonEmptySlices.length > 0) {
          outcome = {
            success: false,
            error: `Every slice of those transcriptions except the first one must be empty. Slice "${nonEmptySlices[0].id}" has media or a character assigned. Please remove its content or delete the slice first.`,
          };
          return state;
        }
      }

      const hist = pushHistory(state);

      // 1. Merge transcript segments
      const allWords = targetSegments.flatMap((s) => s.words || []);
      const mergedText = targetSegments.map((s) => s.text).join(" ").trim();
      const mergedSegment: import("../types/transcript").TranscriptSegment = {
        id: firstSeg.id,
        start: joinStart,
        end: joinEnd,
        text: mergedText,
        words: allWords,
      };

      const newTranscript: import("../types/transcript").TranscriptSegment[] = [];
      let inserted = false;
      for (const seg of state.project.transcript) {
        if (segmentIds.includes(seg.id)) {
          if (!inserted) {
            newTranscript.push(mergedSegment);
            inserted = true;
          }
        } else {
          newTranscript.push(seg);
        }
      }

      // 2. Slices: All occupy one slice
      let newSlices: Slice[];
      let targetSliceId = "";

      if (assocSlices.length > 0) {
        const firstSlice = assocSlices[0];
        targetSliceId = firstSlice.id;
        const mergedSlice: Slice = {
          ...firstSlice,
          start: Math.min(firstSlice.start, joinStart),
          end: Math.max(firstSlice.end, joinEnd, ...assocSlices.map((s) => s.end)),
          text: mergedText,
        };

        const otherSliceIds = new Set(assocSlices.slice(1).map((s) => s.id));
        newSlices = state.project.slices
          .filter((s) => !otherSliceIds.has(s.id))
          .map((s) => (s.id === firstSlice.id ? mergedSlice : s));
      } else {
        const newSlice: Slice = {
          id: `slice-${Date.now()}`,
          start: joinStart,
          end: joinEnd,
          text: mergedText,
        };
        targetSliceId = newSlice.id;
        newSlices = [...state.project.slices, newSlice].sort((a, b) => a.start - b.start);
      }

      outcome = { success: true };

      return {
        ...hist,
        project: {
          ...state.project,
          transcript: newTranscript,
          slices: healSliceBoundaries(newSlices, state.project.duration),
        },
        selectedSliceId: targetSliceId || state.selectedSliceId,
      };
    });
    return outcome;
  },

  toggleWordEmphasis: (segmentId, wordIndex) => {
    set((state) => {
      if (!state.project || !state.project.transcript) return state;
      const hist = pushHistory(state);
      const newTranscript = state.project.transcript.map((seg) => {
        if (seg.id !== segmentId) return seg;
        const newWords = (seg.words || []).map((w, idx) => {
          if (idx !== wordIndex) return w;
          return {
            ...w,
            emphasized: !w.emphasized,
          };
        });
        return {
          ...seg,
          words: newWords,
        };
      });
      return {
        ...hist,
        project: {
          ...state.project,
          transcript: newTranscript,
        },
      };
    });
  },

  setWordEmphasis: (segmentId, wordIndex, emphasized) => {
    set((state) => {
      if (!state.project || !state.project.transcript) return state;
      const hist = pushHistory(state);
      const newTranscript = state.project.transcript.map((seg) => {
        if (seg.id !== segmentId) return seg;
        const newWords = (seg.words || []).map((w, idx) => {
          if (idx !== wordIndex) return w;
          return {
            ...w,
            emphasized,
          };
        });
        return {
          ...seg,
          words: newWords,
        };
      });
      return {
        ...hist,
        project: {
          ...state.project,
          transcript: newTranscript,
        },
      };
    });
  },

  clearSectionEmphasis: (segmentId) => {
    set((state) => {
      if (!state.project || !state.project.transcript) return state;
      const hist = pushHistory(state);
      const newTranscript = state.project.transcript.map((seg) => {
        if (seg.id !== segmentId) return seg;
        return {
          ...seg,
          words: (seg.words || []).map((w) => ({ ...w, emphasized: false })),
        };
      });
      return {
        ...hist,
        project: {
          ...state.project,
          transcript: newTranscript,
        },
      };
    });
  },

  clearAllEmphasis: () => {
    set((state) => {
      if (!state.project || !state.project.transcript) return state;
      const hist = pushHistory(state);
      const newTranscript = state.project.transcript.map((seg) => ({
        ...seg,
        words: (seg.words || []).map((w) => ({ ...w, emphasized: false })),
      }));
      return {
        ...hist,
        project: {
          ...state.project,
          transcript: newTranscript,
        },
      };
    });
  },

  setActiveJob: (activeJob) => set({ activeJob }),
}));
