import type { TranscriptSegment } from "./transcript";
import type { MediaAsset } from "./media";
import type { SliceCharacter } from "./character";
import type { TimelineOverlay } from "./overlay";
import type { TimelineSoundEffect } from "./sfx";

export type { SliceCharacter, TimelineOverlay, TimelineSoundEffect };

export type VisualTransition =
  | "none"
  | "fade"
  | "zoom-in"
  | "zoom-out"
  | "pan-right"
  | "pan-left"
  | "pan-down"
  | "pan-up";
export type SliceLayoutStyle = "fullscreen" | "window";

export interface SliceVisual {
  assetId: string;
  type: "image" | "video";
  fit?: "cover" | "contain";
  transition?: VisualTransition;
  layoutStyle?: SliceLayoutStyle;
  positionX?: number; // 0 to 100% center
  positionY?: number; // 0 to 100% center
  scale?: number;     // 0.2 to 2.5
  rotation?: number;  // -180 to 180 deg
  speed?: number;     // 0.2 to 5.0
  width?: number;     // width in % of 9:16 canvas (15-95%)
  height?: number;    // height in % of 9:16 canvas (10-95%)
  zoom?: number;      // content zoom 1.0 to 3.0
  cropX?: number;     // pan offset X (-50 to +50)
  cropY?: number;     // pan offset Y (-50 to +50)
  panCoverage?: number; // 20 to 100% of media width/height to reveal during pan
  mediaStart?: number; // start offset in seconds into source video clip
  borderRadius?: number; // corner radius in px
  borderWidth?: number;  // border width in px
  borderColor?: string;  // border color
  shadow?: boolean;      // drop shadow
}

export interface Slice {
  id: string;
  start: number;
  end: number;
  text: string;
  visual?: SliceVisual;
  character?: SliceCharacter;
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
  positionY: number; // percentage from top (e.g. 80)
  maxWordsPerLine: number;
  textColor: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface ProjectSettings {
  width: 1080;
  height: 1920;
  fps: 30;

  silenceThresholdDb: number;
  minimumSilenceMs: number;
  silenceRetentionPercent: number;

  minimumSliceDuration: number;
  maximumSliceDuration: number;
  captionStyle: CaptionStyle;
}

export interface BackgroundMusic {
  url: string;
  filename?: string;
  volume: number; // 0.0 to 1.0 (default 0.15)
  loop: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export interface Project {
  id: string;
  title: string;

  originalAudio?: string;
  processedAudio?: string;

  duration: number;

  transcript: TranscriptSegment[];
  slices: Slice[];
  mediaAssets: MediaAsset[];

  backgroundVideo?: string;
  backgroundMusic?: BackgroundMusic;

  overlays?: TimelineOverlay[];
  soundEffects?: TimelineSoundEffect[];

  settings: ProjectSettings;

  createdAt?: string;
  updatedAt?: string;
}
