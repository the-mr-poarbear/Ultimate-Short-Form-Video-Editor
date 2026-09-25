import re
from typing import List, Optional
from app.models.transcript import TranscriptSegment, WordTiming
from app.models.project import Slice

class SliceGenerator:
    def __init__(
        self,
        min_duration: float = 2.0,
        max_duration: float = 8.0,
        preferred_min: float = 4.0,
        preferred_max: float = 6.0
    ):
        self.min_duration = min_duration
        self.max_duration = max_duration
        self.preferred_min = preferred_min
        self.preferred_max = preferred_max

    def generate_slices(
        self,
        segments: List[TranscriptSegment],
        min_duration: Optional[float] = None,
        max_duration: Optional[float] = None
    ) -> List[Slice]:
        """
        Groups words into slices using punctuation, pauses, and duration boundaries.
        Never splits in the middle of a word.
        """
        min_dur = min_duration or self.min_duration
        max_dur = max_duration or self.max_duration

        # Flatten all words from all segments
        all_words: List[WordTiming] = []
        for seg in segments:
            for w in seg.words:
                all_words.append(w)

        if not all_words:
            # Fallback if no words present: use segments directly
            slices = []
            for i, seg in enumerate(segments):
                slices.append(Slice(
                    id=f"slice-{i+1}",
                    start=seg.start,
                    end=seg.end,
                    text=seg.text
                ))
            return slices

        slices: List[Slice] = []
        current_words: List[WordTiming] = []
        slice_idx = 1
        slice_start = all_words[0].start

        for i, word in enumerate(all_words):
            current_words.append(word)
            current_duration = word.end - slice_start
            is_last_word = (i == len(all_words) - 1)

            if is_last_word:
                # Flush the final slice
                slices.append(self._create_slice(slice_idx, slice_start, word.end, current_words))
                break

            next_word = all_words[i + 1]
            pause_after = max(next_word.start - word.end, 0.0)
            clean_word = word.word.strip()

            # Punctuation scoring
            is_sentence_end = bool(re.search(r"[.!?]+['\"]?$", clean_word))
            is_clause_end = bool(re.search(r"[,;:\—\-]+['\"]?$", clean_word))
            is_natural_pause = pause_after >= 0.35

            next_word_duration = next_word.end - next_word.start
            would_exceed_max = (current_duration + next_word_duration > max_dur)

            should_split = False

            if current_duration < min_dur:
                # Too short; do not split yet unless forced by max_dur (rare if min_dur < max_dur)
                should_split = False
            elif would_exceed_max:
                # Must split to avoid exceeding maximum duration
                should_split = True
            elif current_duration >= self.preferred_max:
                # Past preferred max; split on any punctuation or pause or next word
                if is_sentence_end or is_clause_end or is_natural_pause or pause_after >= 0.15:
                    should_split = True
                elif current_duration >= (max_dur - 1.0):
                    should_split = True
            elif current_duration >= self.preferred_min:
                # In preferred 4-6s window; split on sentence end, strong punctuation, or natural pause
                if is_sentence_end or is_natural_pause or (is_clause_end and current_duration >= 4.5):
                    should_split = True
            elif current_duration >= min_dur:
                # Between min and preferred min; only split on strong sentence boundary if pause exists
                if is_sentence_end and (is_natural_pause or pause_after >= 0.25):
                    should_split = True

            if should_split:
                # End current slice at midpoint of pause or word end
                slice_end = word.end + min(pause_after / 2.0, 0.2)
                slices.append(self._create_slice(slice_idx, slice_start, slice_end, current_words))
                slice_idx += 1
                current_words = []
                slice_start = slice_end

        # Ensure contiguous boundaries without gaps or overlaps
        for idx in range(len(slices) - 1):
            if slices[idx].end < slices[idx + 1].start:
                slices[idx].end = slices[idx + 1].start

        return slices

    def _create_slice(self, idx: int, start: float, end: float, words: List[WordTiming]) -> Slice:
        text = " ".join(w.word for w in words).strip()
        return Slice(
            id=f"slice-{idx:02d}",
            start=round(start, 3),
            end=round(end, 3),
            text=text
        )

    def split_slice_at_time(self, slices: List[Slice], slice_id: str, split_time: float) -> List[Slice]:
        """Splits an existing slice at split_time into two slices."""
        new_slices = []
        for s in slices:
            if s.id == slice_id and s.start < split_time < s.end:
                s1 = Slice(
                    id=f"{s.id}-a",
                    start=s.start,
                    end=round(split_time, 3),
                    text=s.text, # Can be refined based on word timings
                    visual=s.visual
                )
                s2 = Slice(
                    id=f"{s.id}-b",
                    start=round(split_time, 3),
                    end=s.end,
                    text=s.text
                )
                new_slices.extend([s1, s2])
            else:
                new_slices.append(s)
        return new_slices

    def merge_slices(self, slices: List[Slice], first_id: str, second_id: str) -> List[Slice]:
        """Merges two contiguous slices into one."""
        s1 = next((s for s in slices if s.id == first_id), None)
        s2 = next((s for s in slices if s.id == second_id), None)
        if not s1 or not s2:
            return slices

        merged = Slice(
            id=s1.id,
            start=min(s1.start, s2.start),
            end=max(s1.end, s2.end),
            text=f"{s1.text} {s2.text}".strip(),
            visual=s1.visual or s2.visual
        )

        new_slices = []
        for s in slices:
            if s.id == first_id:
                new_slices.append(merged)
            elif s.id == second_id:
                continue
            else:
                new_slices.append(s)
        return new_slices

    def delete_slice(self, slices: List[Slice], slice_id: str) -> List[Slice]:
        """Removes a slice by its ID."""
        return [s for s in slices if s.id != slice_id]

slice_generator = SliceGenerator()
