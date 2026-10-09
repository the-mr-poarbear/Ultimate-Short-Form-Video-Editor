import os
import math
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

    def ensure_raster_image(self, file_path: Path, output_dir: Optional[Path] = None) -> Path:
        """
        If file_path is an SVG, converts it to a PNG file using resvg_py
        because FFmpeg on Windows typically lacks an SVG decoder.
        """
        if file_path.suffix.lower() == ".svg":
            target_dir = output_dir or file_path.parent
            png_path = target_dir / f"{file_path.stem}_converted.png"
            if not png_path.exists() or png_path.stat().st_mtime < file_path.stat().st_mtime:
                try:
                    import resvg_py
                    with open(file_path, "r", encoding="utf-8") as f:
                        svg_content = f.read()
                    png_bytes = resvg_py.svg_to_bytes(svg_content)
                    with open(png_path, "wb") as f:
                        f.write(png_bytes)
                except Exception as e:
                    print(f"[VideoRenderer] Warning: Failed to convert SVG to PNG ({file_path}): {e}")
                    return file_path
            if png_path.exists():
                return png_path
        return file_path

    _cached_encoder_settings = None

    @classmethod
    def get_video_encoder_settings(cls) -> dict:
        """
        Detects GPU hardware encoders for high-speed exports.
        Prioritizes:
          1. NVIDIA NVENC (h264_nvenc) - Dedicated GPU chip on RTX / GTX cards
          2. Intel QuickSync (h264_qsv) - Intel Iris Xe / UHD hardware encoder
          3. AMD AMF (h264_amf)
          Fallback: CPU libx264 with veryfast preset
        """
        if cls._cached_encoder_settings is not None:
            return cls._cached_encoder_settings

        # 1. Test NVIDIA NVENC
        try:
            res = subprocess.run(
                ["ffmpeg", "-hide_banner", "-y", "-f", "lavfi", "-i", "color=c=black:s=192x192:d=0.1", "-c:v", "h264_nvenc", "-f", "null", "-"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=3
            )
            if res.returncode == 0:
                cls._cached_encoder_settings = {
                    "type": "nvenc",
                    "name": "NVIDIA NVENC (GPU Accelerated)",
                    "args": ["-c:v", "h264_nvenc", "-preset", "p3", "-tune", "hq", "-rc:v", "vbr", "-cq", "21", "-b:v", "0", "-spatial-aq", "1"],
                }
                return cls._cached_encoder_settings
        except Exception:
            pass

        # 2. Test Intel QuickSync (QSV)
        try:
            res = subprocess.run(
                ["ffmpeg", "-hide_banner", "-y", "-f", "lavfi", "-i", "color=c=black:s=192x192:d=0.1", "-c:v", "h264_qsv", "-f", "null", "-"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=3
            )
            if res.returncode == 0:
                cls._cached_encoder_settings = {
                    "type": "qsv",
                    "name": "Intel QuickSync (GPU Accelerated)",
                    "args": ["-c:v", "h264_qsv", "-preset", "veryfast", "-global_quality", "21"],
                }
                return cls._cached_encoder_settings
        except Exception:
            pass

        # 3. Test AMD AMF
        try:
            res = subprocess.run(
                ["ffmpeg", "-hide_banner", "-y", "-f", "lavfi", "-i", "color=c=black:s=192x192:d=0.1", "-c:v", "h264_amf", "-f", "null", "-"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=3
            )
            if res.returncode == 0:
                cls._cached_encoder_settings = {
                    "type": "amf",
                    "name": "AMD AMF (GPU Accelerated)",
                    "args": ["-c:v", "h264_amf", "-quality", "speed", "-rc", "cqp", "-qp_i", "21", "-qp_p", "21"],
                }
                return cls._cached_encoder_settings
        except Exception:
            pass

        # 4. CPU Fallback
        cls._cached_encoder_settings = {
            "type": "cpu",
            "name": "CPU (Multi-threaded libx264 veryfast)",
            "args": ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21"],
        }
        return cls._cached_encoder_settings

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

                    is_emp = bool(getattr(active_word, "emphasized", False))
                    if is_emp:
                        # Emphasized active word: bold, big, centered on screen (pos 540, 960)
                        clean_w = active_word.word.strip().replace("{", "").replace("}", "").upper()
                        big_fs = int((font_size or 52) * 2.4)
                        emp_stroke = max(int(stroke_w * 2), 4)
                        emp_text = f"{{\\an5\\pos(540,960)\\fs{big_fs}\\b1\\1c&H{highlight_hex}&\\3c&H{outline_hex}&\\bord{emp_stroke}\\shad4\\fscx115\\fscy115}}{clean_w}"
                        events.append(
                            f"Dialogue: 1,{w_start_str},{w_end_str},Default,,0,0,0,,{emp_text}"
                        )
                    else:
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

    def render(
        self,
        project: Project,
        project_dir: Path,
        job_id: Optional[str] = None,
        resolution: str = "1080p",
        custom_width: Optional[int] = None,
        custom_height: Optional[int] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        fps: int = 30
    ) -> Path:
        """
        Renders the video using FFmpeg with customizable resolution and trim range.
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

        # Calculate target resolution
        res_lower = (resolution or "1080p").lower()
        if res_lower == "720p":
            target_w, target_h = 720, 1280
        elif res_lower in ("4k", "2160p"):
            target_w, target_h = 2160, 3840
        elif res_lower == "custom" and custom_width and custom_height:
            target_w = int(custom_width) - (int(custom_width) % 2)
            target_h = int(custom_height) - (int(custom_height) % 2)
        else:
            target_w, target_h = 1080, 1920

        # Calculate timing range
        clip_start = max(0.0, float(start_time or 0.0))
        clip_end = min(duration, float(end_time)) if (end_time is not None and float(end_time) > clip_start) else duration
        export_dur = max(0.1, clip_end - clip_start)
        is_partial = (clip_start > 0.02 or clip_end < duration - 0.02)
        time_args = ["-ss", f"{clip_start:.3f}", "-t", f"{export_dur:.3f}"] if is_partial else ["-shortest"]

        # Build FFmpeg command inputs
        inputs = []
        filter_graphs = []

        # Input 0: Audio voiceover
        processed_audio_path = project_dir / "audio" / "processed.wav"
        orig_files = list((project_dir / "audio").glob("original.*"))

        # Automatically upgrade legacy 16kHz mono audio to pristine 44.1kHz stereo
        if processed_audio_path.exists() and orig_files:
            try:
                from app.services.audio_service import audio_service
                probe_cmd = [
                    "ffprobe", "-v", "error", "-select_streams", "a:0",
                    "-show_entries", "stream=sample_rate,channels",
                    "-of", "default=noprint_wrappers=1:nokey=1", str(processed_audio_path)
                ]
                probe_out = subprocess.run(probe_cmd, stdout=subprocess.PIPE, text=True).stdout.strip().split()
                if probe_out:
                    sr = int(probe_out[0])
                    ch = int(probe_out[1]) if len(probe_out) > 1 else 1
                    if sr <= 16000 or ch < 2:
                        print(f"[VideoRenderer] Upgrading legacy low-quality audio ({sr}Hz, {ch}ch) to 44.1kHz stereo...")
                        threshold = getattr(project.settings, "silenceThresholdDb", -35.0)
                        min_silence = getattr(project.settings, "minimumSilenceMs", 300)
                        retention = getattr(project.settings, "silenceRetentionPercent", 20.0)
                        audio_service.process_and_reduce_silence(
                            input_path=orig_files[0],
                            output_path=processed_audio_path,
                            threshold_db=threshold,
                            min_silence_ms=min_silence,
                            retention_percent=retention
                        )
            except Exception as e:
                print(f"[VideoRenderer] Audio upgrade note: {e}")

        if not processed_audio_path.exists():
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

        # Determine background media (image or video)
        bg_media_path = None
        is_bg_image = False
        if project.backgroundVideo:
            bg_cand = project_dir / "media" / Path(project.backgroundVideo).name
            if bg_cand.exists():
                bg_media_path = bg_cand
                bg_asset = next(
                    (a for a in project.mediaAssets if Path(a.path).name == bg_cand.name or a.url == project.backgroundVideo),
                    None
                )
                if bg_asset:
                    is_bg_image = (bg_asset.type == "image")
                else:
                    is_bg_image = bg_cand.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".svg"]

        input_index = 1
        base_video_tag = "bg"

        if bg_media_path:
            bg_media_path = self.ensure_raster_image(bg_media_path, renders_dir)
            if is_bg_image:
                inputs.extend(["-loop", "1", "-i", str(bg_media_path)])
            else:
                inputs.extend(["-stream_loop", "-1", "-i", str(bg_media_path)])
            filter_graphs.append(
                f"[{input_index}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=duration={duration:.3f},setpts=PTS-STARTPTS[{base_video_tag}];"
            )
            input_index += 1
        else:
            filter_graphs.append(
                f"color=c=0x0d0f12:s=1080x1920:r=30:d={duration:.3f}[{base_video_tag}];"
            )

        # Sort slices chronologically for accurate layering and timing
        sorted_slices = sorted(project.slices, key=lambda x: x.start)

        # Slice visuals
        current_canvas = base_video_tag
        slices_with_visual = [s for s in sorted_slices if s.visual and s.visual.assetId]

        if job_id:
            job_service.update_progress(job_id, 25, f"Compositing {len(slices_with_visual)} slice visuals...")

        for idx, s in enumerate(slices_with_visual):
            asset = next((a for a in project.mediaAssets if a.id == s.visual.assetId), None)
            if not asset:
                continue

            asset_file = project_dir / "media" / Path(asset.path).name
            if not asset_file.exists():
                continue
            asset_file = self.ensure_raster_image(asset_file, renders_dir)

            layout_style = getattr(s.visual, "layoutStyle", "fullscreen") or "fullscreen"

            # Look up slice in the full timeline to accurately determine adjacent slice media status:
            s_timeline_idx = sorted_slices.index(s)
            is_first_slice = (s_timeline_idx == 0)
            has_next_slice = (s_timeline_idx < len(sorted_slices) - 1)
            next_slice = sorted_slices[s_timeline_idx + 1] if has_next_slice else None
            next_has_visual = bool(next_slice and next_slice.visual and next_slice.visual.assetId)

            # 1. Start at 0.0 only if this is the first slice on the timeline and starts near 0.0
            eff_start = 0.0 if (is_first_slice and s.start <= 0.5) else s.start

            # 2. Timing for the end of the slice:
            # - If the next slice on the timeline ALSO has visual media:
            #   Extend to next_slice.start with a 1-frame (0.04s) safety overlap buffer so consecutive
            #   fullscreen media transitions seamlessly with zero background flash.
            # - If the next slice has NO visual media (background image section):
            #   End cleanly at the slice boundary with ZERO buffer so video never bleeds into the background image.
            # - If this is the last slice on the timeline:
            #   Extend to duration if this slice spans to the end, with zero buffer.
            if has_next_slice:
                if next_has_visual:
                    eff_end = next_slice.start
                    buffer = 0.04 if layout_style == "fullscreen" else 0.0
                else:
                    eff_end = min(s.end, next_slice.start) if s.end else next_slice.start
                    buffer = 0.0
            else:
                eff_end = max(s.end, duration)
                buffer = 0.0

            slice_dur = max(eff_end - eff_start, 0.1)
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
            pos_x = getattr(s.visual, "positionX", 50.0) or 50.0
            pos_y = getattr(s.visual, "positionY", 50.0) or 50.0
            scale = getattr(s.visual, "scale", 1.0) or 1.0
            zoom = getattr(s.visual, "zoom", 1.0) or 1.0
            fit = getattr(s.visual, "fit", "cover") or "cover"
            crop_x_pct = getattr(s.visual, "cropX", 0.0) or 0.0
            crop_y_pct = getattr(s.visual, "cropY", 0.0) or 0.0
            transition = getattr(s.visual, "transition", "none") or "none"
            rotation = getattr(s.visual, "rotation", 0.0) or 0.0
            speed = getattr(s.visual, "speed", 1.0) or 1.0
            if speed <= 0:
                speed = 1.0

            pan_coverage = getattr(s.visual, "panCoverage", 100.0) or 100.0
            cov_norm = max(0.2, min(1.0, pan_coverage / 100.0))

            if layout_style == "window":
                custom_w = getattr(s.visual, "width", None)
                custom_h = getattr(s.visual, "height", None)
                if custom_w is not None:
                    win_w = max(160, int(1080 * custom_w / 100.0))
                else:
                    win_w = max(160, int(1080 * 0.75 * scale))

                if custom_h is not None:
                    win_h = max(90, int(1920 * custom_h / 100.0))
                else:
                    if asset.type == "video":
                        win_h = max(90, int(1920 * 0.25))
                    else:
                        win_h = max(90, int(1920 * 0.39))

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

            has_rotation = abs(rotation) > 0.01

            # In fullscreen mode with rotation (e.g. rotating horizontal media to vertical):
            # Calculate the unrotated bounding box required so that rotating by rotation degrees
            # fully covers the 1080x1920 canvas without square letterboxing or height clipping.
            if layout_style == "fullscreen" and has_rotation:
                rad = abs(rotation * math.pi / 180.0)
                crop_box_w = int(math.ceil(win_w * abs(math.cos(rad)) + win_h * abs(math.sin(rad))))
                crop_box_h = int(math.ceil(win_w * abs(math.sin(rad)) + win_h * abs(math.cos(rad))))
                crop_box_w = (crop_box_w // 2) * 2
                crop_box_h = (crop_box_h // 2) * 2
            else:
                crop_box_w = win_w
                crop_box_h = win_h

            # Scaling with aspect ratio preservation
            if transition in ["pan-right", "pan-left", "pan-down", "pan-up"]:
                effective_zoom = max(1.25, zoom)
            else:
                effective_zoom = max(1.0, zoom)

            z_w = (int(crop_box_w * effective_zoom) // 2) * 2
            z_h = (int(crop_box_h * effective_zoom) // 2) * 2

            # Dynamic pan / crop expressions with clamped time to protect boundary buffers
            if transition == "pan-right":
                x_expr = f"min(in_w-{crop_box_w},(in_w-{crop_box_w})*{cov_norm:.3f}*min(1,t/{slice_dur:.3f}))"
                y_expr = f"max(0,min(in_h-{crop_box_h},(in_h-{crop_box_h})*{(50.0 + crop_y_pct) / 100.0:.3f}))"
            elif transition == "pan-left":
                x_expr = f"max(0,(in_w-{crop_box_w})*{cov_norm:.3f}*(1.0-min(1,t/{slice_dur:.3f})))"
                y_expr = f"max(0,min(in_h-{crop_box_h},(in_h-{crop_box_h})*{(50.0 + crop_y_pct) / 100.0:.3f}))"
            elif transition == "pan-down":
                x_expr = f"max(0,min(in_w-{crop_box_w},(in_w-{crop_box_w})*{(50.0 + crop_x_pct) / 100.0:.3f}))"
                y_expr = f"min(in_h-{crop_box_h},(in_h-{crop_box_h})*{cov_norm:.3f}*min(1,t/{slice_dur:.3f}))"
            elif transition == "pan-up":
                x_expr = f"max(0,min(in_w-{crop_box_w},(in_w-{crop_box_w})*{(50.0 + crop_x_pct) / 100.0:.3f}))"
                y_expr = f"max(0,(in_h-{crop_box_h})*{cov_norm:.3f}*(1.0-min(1,t/{slice_dur:.3f})))"
            else:
                # Static / Zoom / Fade framing using cropX and cropY offset
                x_expr = f"max(0,min(in_w-{crop_box_w},(in_w-{crop_box_w})*{(50.0 + crop_x_pct) / 100.0:.3f}))"
                y_expr = f"max(0,min(in_h-{crop_box_h},(in_h-{crop_box_h})*{(50.0 + crop_y_pct) / 100.0:.3f}))"

            if fit == "contain":
                scale_part = (
                    f"scale=w='if(gt(a,{crop_box_w}/{crop_box_h}),{z_w},-2)':h='if(gt(a,{crop_box_w}/{crop_box_h}),-2,{z_h})':force_original_aspect_ratio=decrease:force_divisible_by=2,"
                    f"pad=w='max(iw,{crop_box_w})':h='max(ih,{crop_box_h})':x='(ow-iw)/2':y='(oh-ih)/2':color=0x00000000"
                )
            else:
                scale_part = f"scale={z_w}:{z_h}:force_original_aspect_ratio=increase:force_divisible_by=2"

            if asset.type == "video" and abs(speed - 1.0) > 0.01:
                speed_filter = f"setpts=(1/{speed:.4f})*PTS,"
            else:
                speed_filter = ""

            base_filter = f"{speed_filter}{scale_part},crop={crop_box_w}:{crop_box_h}:x='{x_expr}':y='{y_expr}',fps=30"

            if transition == "fade":
                fade_d = min(0.35, slice_dur / 2.0)
                v_filters = (
                    f"{base_filter},"
                    f"fade=t=in:st=0:d={fade_d:.3f}:alpha=1"
                )
            elif transition == "zoom-in":
                v_filters = (
                    f"{base_filter},"
                    f"scale=w='{crop_box_w}*(1+0.12*min(1,t/{slice_dur:.3f}))':h='{crop_box_h}*(1+0.12*min(1,t/{slice_dur:.3f}))':eval=frame,"
                    f"crop={crop_box_w}:{crop_box_h}"
                )
            elif transition == "zoom-out":
                v_filters = (
                    f"{base_filter},"
                    f"scale=w='max({crop_box_w},{crop_box_w}*(1.12-0.12*min(1,t/{slice_dur:.3f})))':h='max({crop_box_h},{crop_box_h}*(1.12-0.12*min(1,t/{slice_dur:.3f})))':eval=frame,"
                    f"crop={crop_box_w}:{crop_box_h}"
                )
            else:
                v_filters = f"{base_filter}"

            if has_rotation:
                if layout_style == "fullscreen":
                    v_filters += f",rotate={rotation:.2f}*PI/180:ow=1080:oh=1920:c=none"
                else:
                    v_filters += f",rotate={rotation:.2f}*PI/180:c=none:ow=rotw({rotation:.2f}*PI/180):oh=roth({rotation:.2f}*PI/180)"

            v_filters += f",format=yuva420p,trim=duration={slice_dur + buffer:.3f},setpts=PTS-STARTPTS+{eff_start:.3f}/TB"

            filter_graphs.append(f"[{v_input_idx}:v]{v_filters}[{tag_v}];")
            next_canvas = f"canvas_{idx}"
            if layout_style == "fullscreen":
                overlay_coords = "0:0"
            elif has_rotation:
                overlay_coords = f"'(1080*{pos_x:.3f}/100.0)-w/2':'(1920*{pos_y:.3f}/100.0)-h/2'"
            else:
                overlay_coords = f"{overlay_x}:{overlay_y}"

            filter_graphs.append(
                f"[{current_canvas}][{tag_v}]overlay={overlay_coords}:enable='between(t,{eff_start:.3f},{eff_end + buffer:.3f})':eof_action=repeat[{next_canvas}];"
            )
            current_canvas = next_canvas

        # Slice characters overlay - contiguous timing to prevent pop-out during speech gaps
        slices_with_char = [
            s for s in sorted_slices
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

            char_s_idx = sorted_slices.index(s)
            eff_c_start = s.start
            if char_s_idx < len(sorted_slices) - 1 and getattr(sorted_slices[char_s_idx + 1], "character", None) and sorted_slices[char_s_idx + 1].character.characterId:
                eff_c_end = sorted_slices[char_s_idx + 1].start
            else:
                eff_c_end = s.end

            slice_dur = max(eff_c_end - eff_c_start, 0.1)
            tag_c = f"char_{c_idx}"
            char_w = max(40, int(1080 * (s.character.width or 35.0) / 100.0))
            char_h = max(40, int(1920 * (s.character.height or 40.0) / 100.0))
            char_w = (char_w // 2) * 2
            char_h = (char_h // 2) * 2

            pos_x = s.character.positionX if s.character.positionX is not None else 75.0
            pos_y = s.character.positionY if s.character.positionY is not None else 75.0
            overlay_cx = int((1080 * pos_x / 100.0) - char_w / 2)
            overlay_cy = int((1920 * pos_y / 100.0) - char_h / 2)

            char_filters = (
                f"scale={char_w}:{char_h}:force_original_aspect_ratio=decrease:force_divisible_by=2,"
                f"pad={char_w}:{char_h}:(ow-iw)/2:(oh-ih)/2:color=0x00000000"
            )
            if getattr(s.character, "flipX", False):
                char_filters += ",hflip"
            char_filters += f",format=yuva420p,trim=duration={slice_dur:.3f},setpts=PTS-STARTPTS+{eff_c_start:.3f}/TB"

            filter_graphs.append(f"[{c_input_idx}:v]{char_filters}[{tag_c}];")
            next_char_canvas = f"char_canvas_{c_idx}"
            filter_graphs.append(
                f"[{current_canvas}][{tag_c}]overlay={overlay_cx}:{overlay_cy}:enable='between(t,{eff_c_start:.3f},{eff_c_end:.3f})':eof_action=pass[{next_char_canvas}];"
            )
            current_canvas = next_char_canvas

        # Timeline Overlays (Secondary Timeline Visual FX & Animations)
        timeline_overlays = getattr(project, "overlays", []) or []
        timeline_overlays = sorted(timeline_overlays, key=lambda o: (getattr(o, "lane", 0) or 0, o.start))
        for ov_idx, ov in enumerate(timeline_overlays):
            ov_dur = max(ov.end - ov.start, 0.1)
            ov_file = None
            if ov.url.startswith("/overlays_media/"):
                rel_p = ov.url.replace("/overlays_media/", "", 1).split("?")[0]
                cand = settings.OVERLAYS_DIR / rel_p
                if cand.exists():
                    ov_file = cand
            elif ov.url.startswith("/media/"):
                rel_p = ov.url.replace("/media/", "", 1).split("?")[0]
                cand = settings.PROJECTS_DIR / rel_p
                if cand.exists():
                    ov_file = cand
            else:
                cand = settings.OVERLAYS_DIR / "assets" / Path(ov.url).name
                if cand.exists():
                    ov_file = cand

            if not ov_file or not ov_file.exists():
                continue
            ov_file = self.ensure_raster_image(ov_file, renders_dir)

            ov_input_idx = input_index
            input_index += 1

            is_gif = ov_file.suffix.lower() == ".gif"
            if is_gif:
                inputs.extend(["-stream_loop", "-1", "-i", str(ov_file)])
            else:
                inputs.extend(["-loop", "1", "-i", str(ov_file)])

            tag_ov = f"ov_{ov_idx}"
            scale_fac = ov.scale if ov.scale is not None else 1.0
            ov_w = max(20, int(1080 * (ov.width or 30.0) / 100.0 * scale_fac))
            ov_h = max(20, int(1920 * (ov.height or 30.0) / 100.0 * scale_fac))
            ov_w = (ov_w // 2) * 2
            ov_h = (ov_h // 2) * 2

            pos_x = ov.positionX if ov.positionX is not None else 50.0
            pos_y = ov.positionY if ov.positionY is not None else 50.0
            anim = getattr(ov, "animation", "none") or "none"
            rot_base = getattr(ov, "rotation", 0.0) or 0.0

            # Dynamic overlay coordinates for motion animations
            if anim == "bounce":
                overlay_x_expr = f"'(1080*{pos_x:.3f}/100.0)-w/2'"
                overlay_y_expr = f"'(1920*{pos_y:.3f}/100.0)-h/2 - 48*abs(sin(PI*(t-{ov.start:.3f})/1.2))'"
            elif anim == "slide-up":
                overlay_x_expr = f"'(1080*{pos_x:.3f}/100.0)-w/2'"
                overlay_y_expr = f"'(1920*{pos_y:.3f}/100.0)-h/2 - 72*(1-cos(2*PI*(t-{ov.start:.3f})/1.4))/2'"
            elif anim == "slide-down":
                overlay_x_expr = f"'(1080*{pos_x:.3f}/100.0)-w/2'"
                overlay_y_expr = f"'(1920*{pos_y:.3f}/100.0)-h/2 + 72*(1-cos(2*PI*(t-{ov.start:.3f})/1.4))/2'"
            elif anim == "slide-left":
                overlay_x_expr = f"'(1080*{pos_x:.3f}/100.0)-w/2 - 72*(1-cos(2*PI*(t-{ov.start:.3f})/1.4))/2'"
                overlay_y_expr = f"'(1920*{pos_y:.3f}/100.0)-h/2'"
            elif anim == "slide-right":
                overlay_x_expr = f"'(1080*{pos_x:.3f}/100.0)-w/2 + 72*(1-cos(2*PI*(t-{ov.start:.3f})/1.4))/2'"
                overlay_y_expr = f"'(1920*{pos_y:.3f}/100.0)-h/2'"
            else:
                overlay_x_expr = f"'(1080*{pos_x:.3f}/100.0)-w/2'"
                overlay_y_expr = f"'(1920*{pos_y:.3f}/100.0)-h/2'"

            ov_filters = (
                f"scale={ov_w}:{ov_h}:force_original_aspect_ratio=decrease:force_divisible_by=2,"
                f"pad={ov_w}:{ov_h}:(ow-iw)/2:(oh-ih)/2:color=0x00000000"
            )
            if getattr(ov, "flipX", False):
                ov_filters += ",hflip"

            # Dynamic scale animations (pulse, pop, glow)
            if anim == "pulse":
                ov_filters += f",scale=w='trunc({ov_w}*(1+0.12*sin(2*PI*t/1.4))/2)*2':h='trunc({ov_h}*(1+0.12*sin(2*PI*t/1.4))/2)*2':eval=frame"
            elif anim == "pop":
                ov_filters += f",scale=w='trunc({ov_w}*(1+0.20*sin(2*PI*t/1.0))/2)*2':h='trunc({ov_h}*(1+0.20*sin(2*PI*t/1.0))/2)*2':eval=frame"
            elif anim == "glow":
                ov_filters += f",scale=w='trunc({ov_w}*(1+0.08*sin(2*PI*t/1.5))/2)*2':h='trunc({ov_h}*(1+0.08*sin(2*PI*t/1.5))/2)*2':eval=frame"

            # Rotation (spin, wiggle, or static)
            if anim == "spin":
                ov_filters += f",rotate=a='({rot_base:.2f} + 360*t/3.0)*PI/180':c=none:ow='hypot(iw,ih)':oh='hypot(iw,ih)'"
            elif anim == "wiggle":
                ov_filters += f",rotate=a='({rot_base:.2f} + 10*sin(2*PI*t/0.8))*PI/180':c=none:ow='hypot(iw,ih)':oh='hypot(iw,ih)'"
            elif abs(rot_base) > 0.1:
                ov_filters += f",rotate={rot_base:.2f}*PI/180:c=none:ow=rotw({rot_base:.2f}*PI/180):oh=roth({rot_base:.2f}*PI/180)"

            # Opacity (fade animation or static opacity)
            if anim == "fade":
                ov_filters += f",format=yuva420p,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*(0.65+0.35*cos(2*PI*T/1.6))'"
            elif getattr(ov, "opacity", 1.0) and ov.opacity < 0.99:
                ov_filters += f",colorchannelmixer=aa={ov.opacity:.2f}"

            ov_filters += f",format=yuva420p,trim=duration={ov_dur:.3f},setpts=PTS-STARTPTS+{ov.start:.3f}/TB"

            filter_graphs.append(f"[{ov_input_idx}:v]{ov_filters}[{tag_ov}];")
            next_ov_canvas = f"ov_canvas_{ov_idx}"
            filter_graphs.append(
                f"[{current_canvas}][{tag_ov}]overlay={overlay_x_expr}:{overlay_y_expr}:enable='between(t,{ov.start:.3f},{ov.end:.3f})':eof_action=pass[{next_ov_canvas}];"
            )
            current_canvas = next_ov_canvas

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

        # Timeline Sound Effects (Secondary Timeline Audio FX)
        timeline_sfx = getattr(project, "soundEffects", []) or []
        sfx_inputs = []
        for sfx_idx, sfx in enumerate(timeline_sfx):
            sfx_file = None
            if sfx.url.startswith("/sfx_media/"):
                rel_p = sfx.url.replace("/sfx_media/", "", 1).split("?")[0]
                cand = settings.SFX_DIR / rel_p
                if cand.exists():
                    sfx_file = cand
            elif sfx.url.startswith("/media/"):
                rel_p = sfx.url.replace("/media/", "", 1).split("?")[0]
                cand = settings.PROJECTS_DIR / rel_p
                if cand.exists():
                    sfx_file = cand
            else:
                cand = settings.SFX_DIR / "assets" / Path(sfx.url).name
                if cand.exists():
                    sfx_file = cand

            if not sfx_file or not sfx_file.exists():
                continue

            sfx_in_idx = input_index
            input_index += 1
            inputs.extend(["-i", str(sfx_file)])
            sfx_inputs.append((sfx_in_idx, sfx))

        # Final subtitles filter
        # Escape path for FFmpeg subtitles filter on Windows
        fonts_dir = (Path(__file__).resolve().parent.parent / "assets" / "fonts")
        escaped_ass = str(ass_path).replace("\\", "/").replace(":", "\\:")
        sub_tag = "[pre_outv]" if (target_w != 1080 or target_h != 1920) else "[outv]"
        if fonts_dir.exists():
            escaped_fonts_dir = str(fonts_dir).replace("\\", "/").replace(":", "\\:")
            filter_graphs.append(
                f"[{current_canvas}]subtitles='{escaped_ass}':fontsdir='{escaped_fonts_dir}'{sub_tag}"
            )
        else:
            filter_graphs.append(
                f"[{current_canvas}]subtitles='{escaped_ass}'{sub_tag}"
            )

        if target_w != 1080 or target_h != 1920:
            filter_graphs.append(
                f";[pre_outv]scale={target_w}:{target_h}:flags=lanczos[outv]"
            )

        # Audio mixing: Master voiceover (0:a) + Background music + Timeline Sound Effects
        # Resample all tracks to 44.1kHz stereo to guarantee pristine high-fidelity audio
        audio_mix_inputs = ["[voice]"]
        filter_graphs.append(";[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.0[voice];")

        if has_bgm and bgm_input_idx is not None:
            bgm_vol = getattr(project.backgroundMusic, "volume", 0.15) if project.backgroundMusic else 0.15
            fade_in = getattr(project.backgroundMusic, "fadeInDuration", 1.0) if project.backgroundMusic else 1.0
            fade_out = getattr(project.backgroundMusic, "fadeOutDuration", 2.0) if project.backgroundMusic else 2.0
            fade_out_st = max(0.0, duration - fade_out)
            filter_graphs.append(
                f"[{bgm_input_idx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume={bgm_vol:.3f},afade=t=in:st=0:d={fade_in:.2f},afade=t=out:st={fade_out_st:.2f}:d={fade_out:.2f},atrim=duration={duration:.3f}[bgm_aud];"
            )
            audio_mix_inputs.append("[bgm_aud]")

        for s_idx, (in_idx, sfx) in enumerate(sfx_inputs):
            sfx_vol = getattr(sfx, "volume", 0.8) if sfx.volume is not None else 0.8
            start_ms = max(0, int(sfx.start * 1000))
            tag_sfx = f"sfx_aud_{s_idx}"
            filter_graphs.append(
                f"[{in_idx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume={sfx_vol:.3f},adelay={start_ms}|{start_ms},atrim=duration={duration:.3f}[{tag_sfx}];"
            )
            audio_mix_inputs.append(f"[{tag_sfx}]")

        if len(audio_mix_inputs) > 1:
            filter_graphs.append(
                f"{''.join(audio_mix_inputs)}amix=inputs={len(audio_mix_inputs)}:duration=first:dropout_transition=0:normalize=0[outa]"
            )
            audio_map_tag = "[outa]"
        else:
            audio_map_tag = "[voice]"

        full_filter = "".join(filter_graphs)

        encoder_info = self.get_video_encoder_settings()
        print(f"[VideoRenderer] Exporting using encoder: {encoder_info['name']}")

        if job_id:
            res_label = f"{target_w}x{target_h}"
            dur_label = f"{export_dur:.1f}s"
            job_service.update_progress(job_id, 45, f"Exporting {res_label} MP4 ({dur_label}) via {encoder_info['name']}...")

        cmd = [
            "ffmpeg", "-y",
            "-threads", "0",
            *inputs,
            "-filter_complex", full_filter,
            "-sws_flags", "fast_bilinear",
            "-map", "[outv]",
            "-map", audio_map_tag,
            *encoder_info["args"],
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "256k",
            "-ar", "44100",
            "-ac", "2",
            *time_args,
            str(output_mp4)
        ]

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"[VideoRenderer] Primary encoder ({encoder_info['name']}) failed: {res.stderr}")
            cpu_args = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21"]
            if encoder_info["type"] != "cpu":
                print("[VideoRenderer] Retrying with CPU fallback...")
                if job_id:
                    job_service.update_progress(job_id, 50, "Retrying with CPU encoder fallback...")
                fallback_cmd = [
                    "ffmpeg", "-y",
                    "-threads", "0",
                    *inputs,
                    "-filter_complex", full_filter,
                    "-sws_flags", "fast_bilinear",
                    "-map", "[outv]",
                    "-map", audio_map_tag,
                    *cpu_args,
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "256k",
                    "-ar", "44100",
                    "-ac", "2",
                    *time_args,
                    str(output_mp4)
                ]
                res = subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            # Fallback 2: if subtitles filter had path issues: render without subtitles filter
            if res.returncode != 0 and "subtitles" in full_filter:
                print("[VideoRenderer] Retrying without subtitles filter...")
                alt_filter = full_filter.replace(f"subtitles='{escaped_ass}'", "null")
                alt_cmd = [
                    "ffmpeg", "-y",
                    "-threads", "0",
                    *inputs,
                    "-filter_complex", alt_filter,
                    "-sws_flags", "fast_bilinear",
                    "-map", "[outv]",
                    "-map", audio_map_tag,
                    *cpu_args,
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "256k",
                    "-ar", "44100",
                    "-ac", "2",
                    *time_args,
                    str(output_mp4)
                ]
                res = subprocess.run(alt_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            elif res.returncode != 0:
                raise RuntimeError(f"FFmpeg render failed: {res.stderr[-500:]}")

        if job_id:
            import time
            timestamp = int(time.time())
            job_service.complete_job(job_id, "Video exported successfully", {"videoUrl": f"/media/{project.id}/renders/final.mp4?t={timestamp}"})

        return output_mp4

video_renderer = VideoRenderer()
