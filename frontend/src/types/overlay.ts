export type OverlayCategory = "arrows" | "lines" | "callouts" | "stickers" | "custom";
export type OverlayType = "svg" | "image" | "gif";
export type OverlayAnimation =
  | "none"
  | "bounce"
  | "pulse"
  | "spin"
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "pop"
  | "wiggle"
  | "glow";

export interface OverlayItem {
  id: string;
  name: string;
  category: OverlayCategory;
  type: OverlayType;
  url: string;
  defaultAnimation: OverlayAnimation;
  isPreset: boolean;
  createdAt?: string;
}

export interface TimelineOverlay {
  id: string;
  overlayId?: string;
  url: string;
  name: string;
  start: number;       // in seconds
  end: number;         // in seconds
  positionX?: number;  // 0 to 100% center (default 50)
  positionY?: number;  // 0 to 100% center (default 50)
  width?: number;      // width in % of 9:16 canvas (default 30)
  height?: number;     // height in % of 9:16 canvas (default 30)
  scale?: number;      // 0.2 to 3.0 (default 1.0)
  rotation?: number;   // -180 to 180 degrees
  opacity?: number;    // 0.0 to 1.0 (default 1.0)
  flipX?: boolean;     // mirror horizontal
  animation?: OverlayAnimation;
  lane?: number;       // stacked timeline track lane index (0, 1, 2...)
}
