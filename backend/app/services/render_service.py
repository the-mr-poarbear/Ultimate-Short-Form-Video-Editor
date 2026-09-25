import os
import subprocess
from pathlib import Path
from typing import Optional, List
from app.models.project import Project, Slice
from app.services.job_service import job_service
from app.config import settings
from app.services.character_service import character_service

class VideoRenderer:
    def format_ass_time(self, seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int(round((seconds - int(seconds)) * 100))
        return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"

    def hex_to_ass_color_raw(self, hex_str: str) -> str:
        """Converts #RRGGBB into BBGGRR hex string."""
        if not hex_str:
            return "FFFFFF"
        clean = hex_str.strip().lstrip("#")
        if len(clean) == 6:
            r, g, b = clean[0:2], clean[2:4], clean[4:6]
            return f"{b}{g}{r}".upper()
        return "FFFFFF"

    def hex_to_ass_color(self, hex_str: str, alpha: str = "00") -> str:
        """Converts #RRGGBB into ASS &HAABBGGRR format."""
        raw = self.hex_to_ass_color_raw(hex_str)
        return f"&H{alpha}{raw}".upper()

    def generate_ass_subtitles(self, project: Project, output_ass_path: Path) -> Path:
        """
        Generates an ASS subtitle file with word-level highlighting for FFmpeg subtitles filter.
        Matches the preview viewer typography: uppercase text, font pop scale, outline, and colors.
        """
        style = project.settings.captionStyle
        primary_hex = self.hex_to_ass_color_raw(style.textColor or "#FFFFFF")
        highlight_hex = self.hex_to_ass_color_raw(style.highlightColor or "#FFE600")
        outline_hex = self.hex_to_ass_color_raw(style.strokeColor or "#000000")

        spacing = getattr(style, "letterSpacing", 0.0) or 0.0
        margin_v = int(1920 * (1.0 - (style.positionY or 80.0) / 100.0))
        font_name = style.fontFamily or "Inter"
        font_size = style.fontSize or 52
        stroke_w = max(style.strokeWidth if style.strokeWidth is not None else 3, 1)

        primary_col = f"&H00{primary_hex}"
        highlight_col = f"&H00{highlight_hex}"
        outline_col = f"&H00{outline_hex}"
        back_col = "&H80000000"

        header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_col},{highlight_col},{outline_col},{back_col},-1,0,0,0,100,100,{spacing:.1f},0,1,{stroke_w},3,2,40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        events = []
        max_words = max(style.maxWordsPerLine or 4, 2)

        for seg in project.transcript:
            if not seg.words:
                continue

            words = seg.words
            for chunk_start_idx in range(0, len(words), max_words):
                chunk = words[chunk_start_idx : chunk_start_idx + max_words]

                for active_i, active_word in enumerate(chunk):
                    w_start_str = self.format_ass_time(active_word.start)
                    w_end_str = self.format_ass_time(active_word.end)

                    text_parts = []
                    for i, w in enumerate(chunk):
                        # Force uppercase to strictly match preview viewer
                        clean_w = w.word.strip().replace("{", "").replace("}", "").upper()
                        if i == active_i:
                            # Highlighted active word: Pop scale (112%), highlight color, stroke
                            text_parts.append(
                                f"{{\\1c&H{highlight_hex}&\\3c&H{outline_hex}&\\b1\\fscx112\\fscy112}}{clean_w}"
                            )
                        else:
                            # Inactive word: Primary color, stroke, normal scale
                            text_parts.append(
                                f"{{\\1c&H{primary_hex}&\\3c&H{outline_hex}&\\b1\\fscx100\\fscy100}}{clean_w}"
                            )

                    line_text = " ".join(text_parts)
                    events.append(
                        f"Dialogue: 0,{w_start_str},{w_end_str},Default,,0,0,0,,{line_text}"
                    )

        content = header + "\n".join(events) + "\n"
        with open(output_ass_path, "w", encoding="utf-8") as f:
            f.write(content)

        return output_ass_path

    def render(self, project: Project, project_dir: Path, job_id: Optional[str] = None) -> Path:
        """
        Renders the full 1080x1920 30FPS MP4 video using FFmpeg.
        """
        renders_dir = project_dir / "renders"
        renders_dir.mkdir(exist_ok=True)
        output_mp4 = renders_dir / "final.mp4"
        ass_path = renders_dir / "subtitles.ass"

        if job_id:
            job_service.update_progress(job_id, 10, "Generating word-highlighted subtitle track...")

        self.generate_ass_subtitles(project, ass_path)

        duration = project.duration
        if duration <= 0:
            duration = 10.0

        # Build FFmpeg command inputs
        inputs = []
        filter_graphs = []

        # Input 0: Audio voiceover
        processed_audio_path = project_dir / "audio" / "processed.wav"
        if not processed_audio_path.exists():
            orig_files = list((project_dir / "audio").glob("original.*"))
            if orig_files:
                processed_audio_path = orig_files[0]
            else:
                processed_audio_path = project_dir / "audio" / "original.mp3"

        inputs.extend(["-i", str(processed_audio_path)])

        # Determine background music
        bgm_path = None
        if project.backgroundMusic and project.backgroundMusic.url:
            url_clean = project.backgroundMusic.url.split("?")[0]
            bgm_filename = Path(url_clean).name
            cand1 = project_dir / "audio" / bgm_filename
            cand2 = project_dir / "media" / bgm_filename
            if cand1.exists():
                bgm_path = cand1
            elif cand2.exists():
                bgm_path = cand2
            else:
                bgm_files = list((project_dir / "audio").glob("bgm.*"))
                if bgm_files:
                    bgm_path = bgm_files[0]

        # Determine background
        bg_video_path = None
        if project.backgroundVideo:
            bg_cand = project_dir / "media" / Path(project.backgroundVideo).name
            if bg_cand.exists():
                bg_video_path = bg_cand

        input_index = 1
        base_video_tag = "bg"

        if bg_video_path:
            inputs.extend(["-stream_loop", "-1", "-i", str(bg_video_path)])
            filter_graphs.append(
                f"[{input_index}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=duration={duration:.3f},setpts=PTS-STARTPTS[{base_video_tag}];"
            )
            input_index += 1
        else:
            filter_graphs.append(
                f"color=c=0x0d0f12:s=1080x1920:r=30:d={duration:.3f}[{base_video_tag}];"
            )

        # Slice visuals
        current_canvas = base_video_tag
        slices_with_visual = [s for s in project.slices if s.visual and s.visual.assetId]

        if job_id:
            job_service.update_progress(job_id, 25, f"Compositing {len(slices_with_visual)} slice visuals...")

        for idx, s in enumerate(slices_with_visual):
            asset = next((a for a in project.mediaAssets if a.id == s.visual.assetId), None)
            if not asset:
                continue

            asset_file = project_dir / "media" / Path(asset.path).name
            if not asset_file.exists():
                continue

            slice_dur = max(s.end - s.start, 0.1)
            v_input_idx = input_index
            input_index += 1

            media_start = getattr(s.visual, "mediaStart", 0.0) or 0.0
            if asset.type == "image":
                inputs.extend(["-loop", "1", "-i", str(asset_file)])
            else: # video
                if media_start > 0:
                    inputs.extend(["-ss", f"{media_start:.3f}", "-stream_loop", "-1", "-i", str(asset_file)])
                else:
                    inputs.extend(["-stream_loop", "-1", "-i", str(asset_file)])

            tag_v = f"v_asset_{idx}"
            layout_style = getattr(s.visual, "layoutStyle", "fullscreen") or "fullscreen"
            pos_x = getattr(s.visual, "positionX", 50.0) or 50.0
            pos_y = getattr(s.visual, "positionY", 50.0) or 50.0
            scale = getattr(s.visual, "scale", 1.0) or 1.0
            zoom = getattr(s.visual, "zoom", 1.0) or 1.0
            crop_x_pct = getattr(s.visual, "cropX", 0.0) or 0.0
            crop_y_pct = getattr(s.visual, "cropY", 0.0) or 0.0
            transition = getattr(s.visual, "transition", "none") or "none"

            pan_coverage = getattr(s.visual, "panCoverage", 100.0) or 100.0
            cov_norm = max(0.2, min(1.0, pan_coverage / 100.0))

            if layout_style == "window":
                custom_w = getattr(s.visual, "width", None)
                custom_h = getattr(s.visual, "height", None)
                if custom_w is not None and custom_h is not None:
                    win_w = max(160, int(1080 * custom_w / 100.0))
                    win_h = max(90, int(1920 * custom_h / 100.0))
                else:
                    win_w = max(160, int(1080 * 0.75 * scale))
                    if asset.type == "video":
                        win_h = max(90, int(win_w * 9 / 16))
                    else:
                        win_h = win_w
                win_w = (win_w // 2) * 2
                win_h = (win_h // 2) * 2

                overlay_x = int((1080 * pos_x / 100.0) - win_w / 2)
                overlay_y = int((1920 * pos_y / 100.0) - win_h / 2)
            else:
                # Fullscreen mode
                win_w = 1080
                win_h = 1920
                overlay_x = 0
                overlay_y = 0

            # Scaling with force_original_aspect_ratio=increase
            # For pan transitions, ensure at least 1.25 effective zoom if needed
            if transition in ["pan-right", "pan-left", "pan-down", "pan-up"]:
                effective_zoom = max(1.25, zoom)
            else:
                effective_zoom = max(1.0, zoom)

            z_w = (int(win_w * effective_zoom) // 2) * 2
            z_h = (int(win_h * effective_zoom) // 2) * 2

            # Dynamic pan / crop expressions
            if transition == "pan-right":
                x_expr = f"min(in_w-{win_w},(in_w-{win_w})*{cov_norm:.3f}*(t/{slice_dur:.3f}))"
                y_expr = f"max(0,min(in_h-{win_h},(in_h-{win_h})*{(50.0 + crop_y_pct) / 100.0:.3f}))"
            elif transition == "pan-left":
                x_expr = f"max(0,(in_w-{win_w})*{cov_norm:.3f}*(1.0-t/{slice_dur:.3f}))"
                y_expr = f"max(0,min(in_h-{win_h},(in_h-{win_h})*{(50.0 + crop_y_pct) / 100.0:.3f}))"
            elif transition == "pan-down":
                x_expr = f"max(0,min(in_w-{win_w},(in_w-{win_w})*{(50.0 + crop_x_pct) / 100.0:.3f}))"
                y_expr = f"min(in_h-{win_h},(in_h-{win_h})*{cov_norm:.3f}*(t/{slice_dur:.3f}))"
            elif transition == "pan-up":
                x_expr = f"max(0,min(in_w-{win_w},(in_w-{win_w})*{(50.0 + crop_x_pct) / 100.0:.3f}))"
                y_expr = f"max(0,(in_h-{win_h})*{cov_norm:.3f}*(1.0-t/{slice_dur:.3f}))"
            else:
                # Static / Zoom / Fade framing using cropX and cropY offset
                x_expr = f"max(0,min(in_w-{win_w},(in_w-{win_w})*{(50.0 + crop_x_pct) / 100.0:.3f}))"
                y_expr = f"max(0,min(in_h-{win_h},(in_h-{win_h})*{(50.0 + crop_y_pct) / 100.0:.3f}))"

            base_filter = f"scale={z_w}:{z_h}:force_original_aspect_ratio=increase,crop={win_w}:{win_h}:x='{x_expr}':y='{y_expr}',fps=30"

            if transition == "fade":
                fade_d = min(0.35, slice_dur / 2.0)
                fade_out_st = max(slice_dur - fade_d, 0.0)
                v_filters = (
                    f"{base_filter},"
                    f"fade=t=in:st=0:d={fade_d:.3f}:alpha=1,"
                    f"fade=t=out:st={fade_out_st:.3f}:d={fade_d:.3f}:alpha=1,"
                    f"format=yuva420p,trim=duration={slice_dur:.3f},setpts=PTS-STARTPTS+{s.start:.3f}/TB"
                )
            elif transition == "zoom-in":
                v_filters = (
                    f"{base_filter},"
                    f"scale=w='{win_w}*(1+0.12*t/{slice_dur:.3f})':h='{win_h}*(1+0.12*t/{slice_dur:.3f})':eval=frame,"
                    f"crop={win_w}:{win_h},format=yuva420p,trim=duration={slice_dur:.3f},setpts=PTS-STARTPTS+{s.start:.3f}/TB"
                )
            elif transition == "zoom-out":
                v_filters = (
                    f"{base_filter},"
                    f"scale=w='{win_w}*(1.12-0.12*t/{slice_dur:.3f})':h='{win_h}*(1.12-0.12*t/{slice_dur:.3f})':eval=frame,"
                    f"crop={win_w}:{win_h},format=yuva420p,trim=duration={slice_dur:.3f},setpts=PTS-STARTPTS+{s.start:.3f}/TB"
                )
            else:
                v_filters = f"{base_filter},format=yuva420p,trim=duration={slice_dur:.3f},setpts=PTS-STARTPTS+{s.start:.3f}/TB"

            filter_graphs.append(f"[{v_input_idx}:v]{v_filters}[{tag_v}];")
            next_canvas = f"canvas_{idx}"
            filter_graphs.append(
                f"[{current_canvas}][{tag_v}]overlay={overlay_x}:{overlay_y}:enable='between(t,{s.start:.3f},{s.end:.3f})':eof_action=pass[{next_canvas}];"
            )
            current_canvas = next_canvas

        # Slice characters overlay
        slices_with_char = [
            s for s in project.slices
            if getattr(s, "character", None) and s.character.characterId and s.character.poseId
        ]
        for c_idx, s in enumerate(slices_with_char):
            char_data = character_service.get_character(s.character.characterId)
            if not char_data:
                continue
            pose = next((p for p in char_data.poses if p.id == s.character.poseId), None)
            if not pose or not pose.imageUrl:
                continue

            pose_filename = Path(pose.imageUrl).name
            pose_file = settings.CHARACTERS_DIR / s.character.characterId / pose_filename
            if not pose_file.exists():
                continue

            c_input_idx = input_index
            input_index += 1
            inputs.extend(["-loop", "1", "-i", str(pose_file)])

            slice_dur = max(s.end - s.start, 0.1)
            tag_c = f"char_{c_idx}"
            char_w = max(40, int(1080 * (s.character.width or 35.0) / 100.0))
            char_h = max(40, int(1920 * (s.character.height or 40.0) / 100.0))
            char_w = (char_w // 2) * 2
            char_h = (char_h // 2) * 2

            pos_x = s.character.positionX if s.character.positionX is not None else 75.0
            pos_y = s.character.positionY if s.character.positionY is not None else 75.0
            overlay_cx = int((1080 * pos_x / 100.0) - char_w / 2)
            overlay_cy = int((1920 * pos_y / 100.0) - char_h / 2)

            char_filters = f"scale={char_w}:{char_h}:force_original_aspect_ratio=contain"
            if getattr(s.character, "flipX", False):
                char_filters += ",hflip"
            char_filters += f",format=yuva420p,trim=duration={slice_dur:.3f},setpts=PTS-STARTPTS+{s.start:.3f}/TB"

            filter_graphs.append(f"[{c_input_idx}:v]{char_filters}[{tag_c}];")
            next_char_canvas = f"char_canvas_{c_idx}"
            filter_graphs.append(
                f"[{current_canvas}][{tag_c}]overlay={overlay_cx}:{overlay_cy}:enable='between(t,{s.start:.3f},{s.end:.3f})':eof_action=pass[{next_char_canvas}];"
            )
            current_canvas = next_char_canvas

        # Background music input
        has_bgm = bool(bgm_path)
        bgm_input_idx = None
        if has_bgm:
            bgm_input_idx = input_index
            input_index += 1
            is_loop = getattr(project.backgroundMusic, "loop", True) if project.backgroundMusic else True
            if is_loop:
                inputs.extend(["-stream_loop", "-1", "-i", str(bgm_path)])
            else:
                inputs.extend(["-i", str(bgm_path)])

        # Final subtitles filter
        # Escape path for FFmpeg subtitles filter on Windows
        fonts_dir = (Path(__file__).resolve().parent.parent / "assets" / "fonts")
        escaped_ass = str(ass_path).replace("\\", "/").replace(":", "\\:")
        if fonts_dir.exists():
            escaped_fonts_dir = str(fonts_dir).replace("\\", "/").replace(":", "\\:")
            filter_graphs.append(
                f"[{current_canvas}]subtitles='{escaped_ass}':fontsdir='{escaped_fonts_dir}'[outv]"
            )
        else:
            filter_graphs.append(
                f"[{current_canvas}]subtitles='{escaped_ass}'[outv]"
            )

        # Audio mixing if background music is active
        audio_map_tag = "0:a"
        if has_bgm and bgm_input_idx is not None:
            bgm_vol = getattr(project.backgroundMusic, "volume", 0.15) if project.backgroundMusic else 0.15
            fade_in = getattr(project.backgroundMusic, "fadeInDuration", 1.0) if project.backgroundMusic else 1.0
            fade_out = getattr(project.backgroundMusic, "fadeOutDuration", 2.0) if project.backgroundMusic else 2.0
            fade_out_st = max(0.0, duration - fade_out)
            filter_graphs.append(
                f";[0:a]volume=1.0[voice];[{bgm_input_idx}:a]volume={bgm_vol:.3f},afade=t=in:st=0:d={fade_in:.2f},afade=t=out:st={fade_out_st:.2f}:d={fade_out:.2f},atrim=duration={duration:.3f}[bgm_aud];[voice][bgm_aud]amix=inputs=2:duration=first:dropout_transition=2[outa]"
            )
            audio_map_tag = "[outa]"

        full_filter = "".join(filter_graphs)

        cmd = [
            "ffmpeg", "-y",
            *inputs,
            "-filter_complex", full_filter,
            "-map", "[outv]",
            "-map", audio_map_tag,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            str(output_mp4)
        ]

        if job_id:
            job_service.update_progress(job_id, 45, "Encoding 1080x1920 30FPS MP4...")

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"[VideoRenderer] FFmpeg stderr: {res.stderr}")
            # Fallback if subtitles filter had path issues: render without subtitles filter
            if "subtitles" in full_filter:
                alt_filter = full_filter.replace(f"subtitles='{escaped_ass}'", "null")
                alt_cmd = [
                    "ffmpeg", "-y",
                    *inputs,
                    "-filter_complex", alt_filter,
                    "-map", "[outv]",
                    "-map", audio_map_tag,
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "20",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-shortest",
                    str(output_mp4)
                ]
                subprocess.run(alt_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            else:
                raise RuntimeError(f"FFmpeg render failed: {res.stderr[-500:]}")

        if job_id:
            job_service.complete_job(job_id, "Video exported successfully", {"videoUrl": f"/media/{project.id}/renders/final.mp4"})

        return output_mp4

video_renderer = VideoRenderer()
