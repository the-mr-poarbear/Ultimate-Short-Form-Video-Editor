export interface CharacterPose {
  id: string;
  name: string;
  imageUrl: string;
  createdAt?: string;
}

export interface Character {
  id: string;
  name: string;
  defaultPoseId?: string;
  poses: CharacterPose[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SliceCharacter {
  characterId: string;
  poseId: string;
  positionX?: number; // 0 to 100% center (default 75)
  positionY?: number; // 0 to 100% center (default 75)
  width?: number;     // 10 to 95% of canvas width (default 35)
  height?: number;    // 10 to 95% of canvas height (default 40)
  scale?: number;     // 0.2 to 2.5
  flipX?: boolean;    // mirror horizontal
  visible?: boolean;
}
