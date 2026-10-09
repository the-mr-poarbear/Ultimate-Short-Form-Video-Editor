export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  emphasized?: boolean;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: WordTiming[];
}
