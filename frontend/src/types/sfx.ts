export type SfxCategory = "whoosh" | "pop" | "impact" | "chime" | "voice" | "custom";

export interface SfxItem {
  id: string;
  name: string;
  category: SfxCategory;
  url: string;
  duration: number; // in seconds
  isPreset: boolean;
  createdAt?: string;
}

export interface TimelineSoundEffect {
  id: string;
  sfxId?: string;
  url: string;
  name: string;
  start: number;       // start in timeline (seconds)
  duration: number;    // duration (seconds)
  volume?: number;     // 0.0 to 1.0 (default 0.8)
}
