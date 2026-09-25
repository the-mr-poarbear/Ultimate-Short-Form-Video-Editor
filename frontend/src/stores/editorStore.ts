import { create } from "zustand";
import type { Project, Slice, ProjectSettings, SliceVisual, SliceCharacter, BackgroundMusic } from "../types/project";
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
  activeJob: Job | null;

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

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  currentTime: 0,
  isPlaying: false,
  duration: 0,
  zoom: DEFAULT_PIXELS_PER_SECOND,
  waveformPeaks: [],

  selectedSliceId: null,
  selectedAssetId: null,
  activeJob: null,
  isCaptionSettingsOpen: false,
  isSliceMode: false,
  isSliceSettingsOpen: false,
  isBackgroundMusicModalOpen: false,

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
  setSliceMode: (active) => set({ isSliceMode: active }),
  setSliceSettingsOpen: (open) => set({ isSliceSettingsOpen: open }),

  setProject: (project, clearHistory = false) => {
    batchSnapshot = null;
    set((state) => {
      const isNewProj = !state.project || (project && project.id !== state.project.id);
      return {
        project,
        duration: project?.duration || 0,
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

  splitSlice: (sliceId, splitTime) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const newSlices: Slice[] = [];
      for (const s of state.project.slices) {
        if (s.id === sliceId && s.start < splitTime && splitTime < s.end) {
          newSlices.push({
            id: `${s.id}-a`,
            start: s.start,
            end: Math.round(splitTime * 100) / 100,
            text: s.text,
            visual: s.visual,
          });
          newSlices.push({
            id: `${s.id}-b`,
            start: Math.round(splitTime * 100) / 100,
            end: s.end,
            text: s.text,
          });
        } else {
          newSlices.push(s);
        }
      }
      return {
        ...hist,
        project: {
          ...state.project,
          slices: newSlices,
        },
      };
    }),

  splitSliceAtTime: (splitTime) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const targetTime = Math.round(splitTime * 100) / 100;
      const slices = state.project.slices;

      // Extract all words from transcript for word-aware text partitioning
      const allWords = state.project.transcript.flatMap((t) => t.words || []);

      // If no slices exist yet, initialize slices around splitTime
      if (slices.length === 0) {
        const totalDur = state.project.duration || 10;
        if (targetTime <= 0.2 || targetTime >= totalDur - 0.2) return state;
        const wordsA = allWords.filter((w) => w.end <= targetTime + 0.05).map((w) => w.word).join(" ");
        const wordsB = allWords.filter((w) => w.start >= targetTime - 0.05).map((w) => w.word).join(" ");

        const s1: Slice = {
          id: `slice-${Date.now()}-1`,
          start: 0,
          end: targetTime,
          text: wordsA || "Section 1",
        };
        const s2: Slice = {
          id: `slice-${Date.now()}-2`,
          start: targetTime,
          end: Math.round(totalDur * 100) / 100,
          text: wordsB || "Section 2",
        };
        return {
          ...hist,
          project: {
            ...state.project,
            slices: [s1, s2],
          },
          selectedSliceId: s2.id,
        };
      }

      // Find slice containing targetTime
      const targetSlice = slices.find((s) => s.start + 0.1 < targetTime && targetTime < s.end - 0.1);
      if (!targetSlice) return state;

      // Partition words
      const sliceWords = allWords.filter((w) => w.start >= targetSlice.start - 0.05 && w.end <= targetSlice.end + 0.05);

      let textA = targetSlice.text;
      let textB = targetSlice.text;

      if (sliceWords.length > 1) {
        const wordsBefore = sliceWords.filter((w) => w.end <= targetTime + 0.02).map((w) => w.word).join(" ");
        const wordsAfter = sliceWords.filter((w) => w.start >= targetTime - 0.02).map((w) => w.word).join(" ");
        if (wordsBefore) textA = wordsBefore;
        if (wordsAfter) textB = wordsAfter;
      }

      const idA = `${targetSlice.id}-a`;
      const idB = `${targetSlice.id}-b`;

      const newSlices: Slice[] = [];
      for (const s of slices) {
        if (s.id === targetSlice.id) {
          newSlices.push({
            id: idA,
            start: s.start,
            end: targetTime,
            text: textA,
            visual: s.visual,
          });
          newSlices.push({
            id: idB,
            start: targetTime,
            end: s.end,
            text: textB,
            visual: s.visual ? { ...s.visual } : undefined,
          });
        } else {
          newSlices.push(s);
        }
      }

      // Also partition the corresponding transcript segment so the synchronized transcription viewer splits it visually
      const newTranscript: import("../types/transcript").TranscriptSegment[] = [];
      let didSplitTranscript = false;

      for (const seg of state.project.transcript) {
        const words = seg.words || [];
        const cutWordIdx = words.findIndex(
          (w) => Math.abs(w.start - targetTime) < 0.08 || (w.start >= targetTime - 0.02 && targetTime < w.end)
        );

        if (!didSplitTranscript && cutWordIdx > 0 && cutWordIdx < words.length) {
          const wordsBefore = words.slice(0, cutWordIdx);
          const wordsAfter = words.slice(cutWordIdx);

          const segA = {
            id: `${seg.id}-a`,
            start: seg.start,
            end: wordsBefore[wordsBefore.length - 1]?.end || targetTime,
            text: wordsBefore.map((w) => w.word).join(" "),
            words: wordsBefore,
          };

          const segB = {
            id: `${seg.id}-b`,
            start: wordsAfter[0]?.start || targetTime,
            end: seg.end,
            text: wordsAfter.map((w) => w.word).join(" "),
            words: wordsAfter,
          };

          newTranscript.push(segA, segB);
          didSplitTranscript = true;
        } else {
          newTranscript.push(seg);
        }
      }

      return {
        ...hist,
        project: {
          ...state.project,
          slices: newSlices,
          transcript: didSplitTranscript ? newTranscript : state.project.transcript,
        },
        selectedSliceId: idB,
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

      return {
        ...hist,
        project: {
          ...state.project,
          slices: newSlices,
        },
      };
    }),

  deleteSlice: (sliceId) =>
    set((state) => {
      if (!state.project) return state;
      const hist = pushHistory(state);
      const newSlices = state.project.slices.filter((s) => s.id !== sliceId);
      return {
        ...hist,
        project: {
          ...state.project,
          slices: newSlices,
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
          slices: newSlices,
        },
        selectedSliceId: targetSliceId || state.selectedSliceId,
      };
    });
    return outcome;
  },

  setActiveJob: (activeJob) => set({ activeJob }),
}));
