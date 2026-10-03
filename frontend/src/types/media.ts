export interface MediaAsset {
  id: string;
  name: string;
  type: "image" | "video";
  path: string;
  url: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  speed?: number;
}
