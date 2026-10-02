import { useEditorStore } from "../stores/editorStore";
import { getMediaUrl } from "./api";

class AudioPlayerService {
  private audio: HTMLAudioElement | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private animFrameId: number | null = null;
  private currentUrl: string | null = null;
  private currentBgmUrl: string | null = null;
  private bgmVolume: number = 0.15;
  private bgmLoop: boolean = true;
  private triggeredSfxIds: Set<string> = new Set();
  private lastCheckTime: number = 0;
  private sfxAudioPool: HTMLAudioElement[] = [];

  constructor() {
    // Singleton instance
  }

  public playSfx(url: string, volume: number = 0.8) {
    if (!url) return;
    try {
      const fullUrl = getMediaUrl(url);
      const audio = new Audio(fullUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch(() => {});
    } catch (err) {
      console.warn("[AudioPlayer] Error playing sfx:", err);
    }
  }

  public getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }

  public getBgmAudioElement(): HTMLAudioElement | null {
    return this.bgmAudio;
  }

  public load(url: string | undefined | null, autoPlay: boolean = false) {
    if (!url) {
      this.clear();
      return;
    }

    const fullUrl = getMediaUrl(url);

    // If identical URL is already loaded and valid, don't recreate
    if (this.currentUrl === fullUrl && this.audio) {
      if (autoPlay && this.audio.paused) {
        this.play();
      }
      return;
    }

    // Stop and fully tear down any previous voiceover instance
    this.teardownAudio();

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = fullUrl;
    this.audio = audio;
    this.currentUrl = fullUrl;

    const onLoadedMetadata = () => {
      if (this.audio === audio && audio.duration && !isNaN(audio.duration)) {
        useEditorStore.getState().setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      if (this.audio === audio) {
        this.pause();
        useEditorStore.getState().setCurrentTime(audio.duration || 0);
      }
    };

    const onError = () => {
      if (this.audio === audio) {
        console.warn("[AudioPlayer] Error loading voiceover audio:", audio.error, fullUrl);
        this.pause();
      }
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    if (autoPlay) {
      this.play();
    }
  }

  public loadBgm(url: string | undefined | null, volume: number = 0.15, loop: boolean = true) {
    if (!url) {
      this.teardownBgm();
      return;
    }

    const fullUrl = getMediaUrl(url);
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    this.bgmLoop = loop;

    if (this.currentBgmUrl === fullUrl && this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
      this.bgmAudio.loop = loop;
      return;
    }

    this.teardownBgm();

    const bgm = new Audio();
    bgm.preload = "auto";
    bgm.src = fullUrl;
    bgm.volume = this.bgmVolume;
    bgm.loop = loop;
    this.bgmAudio = bgm;
    this.currentBgmUrl = fullUrl;

    const onLoadedMetadata = () => {
      if (this.bgmAudio !== bgm) return;
      // If no voiceover is loaded, set duration from BGM so playhead and timeline work
      const currentDuration = useEditorStore.getState().duration;
      if ((!this.audio || currentDuration === 0) && bgm.duration && !isNaN(bgm.duration)) {
        useEditorStore.getState().setDuration(bgm.duration);
      }

      // If user is already playing, sync and play BGM now
      if (useEditorStore.getState().isPlaying) {
        const currentTime = useEditorStore.getState().currentTime;
        if (bgm.duration) {
          bgm.currentTime = currentTime % bgm.duration;
        }
        bgm.play().catch((err) => console.warn("[AudioPlayer] BGM play on metadata failed:", err));
      }
    };

    const onError = () => {
      if (this.bgmAudio === bgm) {
        console.error("[AudioPlayer] Error loading background music:", bgm.error, fullUrl);
      }
    };

    bgm.addEventListener("loadedmetadata", onLoadedMetadata);
    bgm.addEventListener("error", onError);

    // If currently playing timeline, trigger BGM playback as soon as data is ready
    if (useEditorStore.getState().isPlaying) {
      const tryPlayBgm = () => {
        if (!this.bgmAudio || this.bgmAudio !== bgm) return;
        const currentTime = useEditorStore.getState().currentTime;
        if (bgm.duration && !isNaN(bgm.duration)) {
          bgm.currentTime = currentTime % bgm.duration;
        }
        bgm.play().catch(() => {});
      };

      if (bgm.readyState >= 2) {
        tryPlayBgm();
      } else {
        bgm.addEventListener("canplay", tryPlayBgm, { once: true });
      }
    }
  }

  public setBgmVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }

  public setBgmLoop(loop: boolean) {
    this.bgmLoop = loop;
    if (this.bgmAudio) {
      this.bgmAudio.loop = loop;
    }
  }

  public play() {
    const hasAudio = !!this.audio;
    const hasBgm = !!this.bgmAudio;

    if (!hasAudio && !hasBgm) {
      console.warn("[AudioPlayer] No audio or background music loaded to play.");
      return;
    }

    const currentMasterTime = useEditorStore.getState().currentTime;

    // 1. If voiceover exists, play voiceover
    if (this.audio) {
      if (
        this.audio.ended ||
        (this.audio.duration > 0 && this.audio.currentTime >= this.audio.duration - 0.05)
      ) {
        this.audio.currentTime = 0;
      }

      this.audio
        .play()
        .then(() => {
          useEditorStore.getState().setPlaying(true);
          this.startSyncLoop();
        })
        .catch((err) => {
          console.warn("[AudioPlayer] Voiceover play error:", err);
          if (!this.bgmAudio) {
            useEditorStore.getState().setPlaying(false);
          }
        });
    }

    // 2. If BGM exists, play BGM (synchronized to voiceover time or independent)
    if (this.bgmAudio) {
      const playBgmInternal = () => {
        if (!this.bgmAudio) return;
        try {
          if (this.bgmAudio.duration && !isNaN(this.bgmAudio.duration)) {
            const targetTime = currentMasterTime % this.bgmAudio.duration;
            // Only update currentTime if significantly drifted
            if (Math.abs(this.bgmAudio.currentTime - targetTime) > 0.3) {
              this.bgmAudio.currentTime = targetTime;
            }
          }
        } catch {
          // Ignore seek during play initialization
        }

        this.bgmAudio.play().catch((err) => {
          console.warn("[AudioPlayer] BGM play error:", err);
        });
      };

      if (this.bgmAudio.readyState >= 2) {
        playBgmInternal();
      } else {
        this.bgmAudio.addEventListener("canplay", playBgmInternal, { once: true });
        this.bgmAudio.load();
      }
    }

    // If there is ONLY BGM (no voiceover loaded), drive playback and timeline
    if (!this.audio && this.bgmAudio) {
      if (
        this.bgmAudio.ended ||
        (this.bgmAudio.duration > 0 && this.bgmAudio.currentTime >= this.bgmAudio.duration - 0.05)
      ) {
        this.bgmAudio.currentTime = 0;
      }
      useEditorStore.getState().setPlaying(true);
      this.startSyncLoop();
    }
  }

  public pause() {
    this.stopSyncLoop();
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
    }
    useEditorStore.getState().setPlaying(false);
  }

  public togglePlay() {
    if (useEditorStore.getState().isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(targetTime: number) {
    const duration = useEditorStore.getState().duration || 99999;
    const clamped = Math.max(0, Math.min(targetTime, duration));

    if (this.audio) {
      try {
        this.audio.currentTime = clamped;
      } catch (err) {
        console.warn("[AudioPlayer] Error seeking audio:", err);
      }
    }

    if (this.bgmAudio) {
      try {
        if (this.bgmAudio.duration && !isNaN(this.bgmAudio.duration)) {
          this.bgmAudio.currentTime = clamped % this.bgmAudio.duration;
        } else {
          this.bgmAudio.currentTime = clamped;
        }
      } catch (err) {
        console.warn("[AudioPlayer] Error seeking BGM:", err);
      }
    }

    this.triggeredSfxIds.clear();
    this.lastCheckTime = clamped;
    useEditorStore.getState().setCurrentTime(clamped);
  }

  public stop() {
    this.pause();
    this.triggeredSfxIds.clear();
    this.seek(0);
  }

  public clear() {
    this.teardownAudio();
    this.teardownBgm();
    this.triggeredSfxIds.clear();
    this.currentUrl = null;
    useEditorStore.getState().setPlaying(false);
    useEditorStore.getState().setCurrentTime(0);
  }

  private teardownAudio() {
    this.stopSyncLoop();
    if (this.audio) {
      this.audio.pause();
      this.audio.onloadedmetadata = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.src = "";
      try {
        this.audio.load();
      } catch {
        // ignore
      }
      this.audio = null;
    }
  }

  public teardownBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.onloadedmetadata = null;
      this.bgmAudio.onerror = null;
      this.bgmAudio.src = "";
      try {
        this.bgmAudio.load();
      } catch {
        // ignore
      }
      this.bgmAudio = null;
    }
    this.currentBgmUrl = null;
  }

  private checkSfx(newTime: number) {
    const project = useEditorStore.getState().project;
    const sfxList = project?.soundEffects || [];
    if (sfxList.length === 0) return;

    const prev = this.lastCheckTime;
    this.lastCheckTime = newTime;

    if (newTime < prev) {
      this.triggeredSfxIds.clear();
      return;
    }

    for (const sfx of sfxList) {
      if (!this.triggeredSfxIds.has(sfx.id)) {
        if (prev <= sfx.start && newTime >= sfx.start) {
          this.triggeredSfxIds.add(sfx.id);
          this.playSfx(sfx.url, sfx.volume ?? 0.8);
        }
      }
    }
  }

  private startSyncLoop() {
    this.stopSyncLoop();
    this.lastCheckTime = useEditorStore.getState().currentTime;

    const updateTime = () => {
      const isVoiceActive = this.audio && !this.audio.paused;
      const isBgmActive = this.bgmAudio && !this.bgmAudio.paused;

      if (isVoiceActive && this.audio) {
        const cur = this.audio.currentTime;
        useEditorStore.getState().setCurrentTime(cur);
        this.checkSfx(cur);

        // Drift correction: keep BGM synchronized to voiceover
        if (isBgmActive && this.bgmAudio && this.bgmAudio.duration) {
          const expectedBgmTime = cur % this.bgmAudio.duration;
          if (Math.abs(this.bgmAudio.currentTime - expectedBgmTime) > 0.45) {
            this.bgmAudio.currentTime = expectedBgmTime;
          }
        }
        this.animFrameId = requestAnimationFrame(updateTime);
      } else if (!isVoiceActive && isBgmActive && this.bgmAudio) {
        // Voiceover not playing or absent, BGM is driving playback
        const cur = this.bgmAudio.currentTime;
        useEditorStore.getState().setCurrentTime(cur);
        this.checkSfx(cur);
        this.animFrameId = requestAnimationFrame(updateTime);
      } else if (!isVoiceActive && !isBgmActive) {
        // Both stopped
        useEditorStore.getState().setPlaying(false);
        this.stopSyncLoop();
      }
    };
    this.animFrameId = requestAnimationFrame(updateTime);
  }

  private stopSyncLoop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}

export const audioPlayer = new AudioPlayerService();
