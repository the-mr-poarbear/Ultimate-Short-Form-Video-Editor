import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";
import { getMediaUrl } from "../services/api";
import { audioPlayer } from "../services/audioPlayer";

export function useAudioPlayer() {
  const project = useEditorStore((s) => s.project);
  const currentTime = useEditorStore((s) => s.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const duration = useEditorStore((s) => s.duration);

  // Use processed audio if available, otherwise fall back to original
  const audioSrc = project?.processedAudio || project?.originalAudio;

  useEffect(() => {
    if (!audioSrc) {
      audioPlayer.clear();
      return;
    }

    const fullUrl = getMediaUrl(audioSrc);
    audioPlayer.load(fullUrl);
  }, [audioSrc]);

  return {
    audioElement: audioPlayer.getAudioElement(),
    isPlaying,
    currentTime,
    duration,
    seek: (targetTime: number) => audioPlayer.seek(targetTime),
    togglePlay: () => audioPlayer.togglePlay(),
    play: () => audioPlayer.play(),
    pause: () => audioPlayer.pause(),
    stop: () => audioPlayer.stop(),
    audioPlayer,
  };
}
