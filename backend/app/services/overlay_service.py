import json
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from app.config import settings
from app.models.overlay import OverlayItem, OverlayCategory, OverlayAnimation, OverlayType

try:
    from PIL import Image, ImageDraw
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

DEFAULT_SVG_PRESETS = [
    {
        "id": "arrow-neon-down",
        "name": "Neon Arrow Down",
        "category": "arrows",
        "type": "svg",
        "defaultAnimation": "bounce",
        "filename": "arrow_neon_down.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" fill="none">
  <defs>
    <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#fb7185"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <path d="M100 20 L100 160 M50 120 L100 180 L150 120" stroke="url(#arrowGrad)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />
  <circle cx="100" cy="20" r="14" fill="#ffffff" />
</svg>"""
    },
    {
        "id": "arrow-curved-right",
        "name": "Curved Arrow Right",
        "category": "arrows",
        "type": "svg",
        "defaultAnimation": "wiggle",
        "filename": "arrow_curved_right.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" fill="none">
  <defs>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <path d="M40 160 C 50 60, 130 50, 190 80 M150 45 L195 80 L160 120" stroke="url(#cyanGrad)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" filter="url(#cyanGlow)" />
</svg>"""
    },
    {
        "id": "arrow-hand-drawn",
        "name": "Sketch Arrow",
        "category": "arrows",
        "type": "svg",
        "defaultAnimation": "wiggle",
        "filename": "arrow_hand_drawn.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200" fill="none">
  <path d="M30 140 Q 100 150 170 80 M130 70 L175 78 L160 120" stroke="#facc15" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1" />
  <path d="M35 142 Q 102 148 168 82 M132 72 L173 80 L158 118" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
</svg>"""
    },
    {
        "id": "line-neon-underline",
        "name": "Neon Glow Underline",
        "category": "lines",
        "type": "svg",
        "defaultAnimation": "pulse",
        "filename": "line_neon_underline.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80" fill="none">
  <defs>
    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="50%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#f43f5e"/>
    </linearGradient>
    <filter id="lineGlow" x="-10%" y="-30%" width="120%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <path d="M20 40 Q 150 55 280 40" stroke="url(#lineGrad)" stroke-width="18" stroke-linecap="round" filter="url(#lineGlow)"/>
  <path d="M25 40 Q 150 53 275 40" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
</svg>"""
    },
    {
        "id": "line-brush-accent",
        "name": "Brush Stroke Accent",
        "category": "lines",
        "type": "svg",
        "defaultAnimation": "slide-left",
        "filename": "line_brush_accent.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" fill="none">
  <path d="M15 30 C 70 18, 180 42, 305 28 C 220 38, 120 22, 15 30 Z" fill="#38bdf8"/>
  <path d="M25 32 C 85 24, 185 36, 295 29 C 225 35, 135 26, 25 32 Z" fill="#ffffff" opacity="0.6"/>
</svg>"""
    },
    {
        "id": "line-dashed-marker",
        "name": "Dashed Target Line",
        "category": "lines",
        "type": "svg",
        "defaultAnimation": "pulse",
        "filename": "line_dashed_marker.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 60" fill="none">
  <line x1="20" y1="30" x2="260" y2="30" stroke="#10b981" stroke-width="14" stroke-linecap="round" stroke-dasharray="18 16" />
</svg>"""
    },
    {
        "id": "callout-target",
        "name": "Target Reticle",
        "category": "callouts",
        "type": "svg",
        "defaultAnimation": "pulse",
        "filename": "callout_target.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
  <circle cx="100" cy="100" r="70" stroke="#f59e0b" stroke-width="8" stroke-dasharray="20 15"/>
  <circle cx="100" cy="100" r="40" stroke="#f59e0b" stroke-width="6"/>
  <circle cx="100" cy="100" r="14" fill="#ef4444"/>
  <line x1="100" y1="10" x2="100" y2="50" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>
  <line x1="100" y1="150" x2="100" y2="190" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>
  <line x1="10" y1="100" x2="50" y2="100" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>
  <line x1="150" y1="100" x2="190" y2="100" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>
</svg>"""
    },
    {
        "id": "callout-star-sparkle",
        "name": "Star Sparkle Burst",
        "category": "stickers",
        "type": "svg",
        "defaultAnimation": "spin",
        "filename": "callout_star_sparkle.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
  <path d="M100 10 Q 100 100 190 100 Q 100 100 100 190 Q 100 100 10 100 Q 100 100 100 10 Z" fill="#fbbf24"/>
  <circle cx="100" cy="100" r="22" fill="#ffffff"/>
  <circle cx="150" cy="45" r="8" fill="#fbbf24"/>
  <circle cx="45" cy="155" r="8" fill="#fbbf24"/>
</svg>"""
    },
    {
        "id": "callout-fire-flame",
        "name": "Fire Flame Hype",
        "category": "stickers",
        "type": "svg",
        "defaultAnimation": "bounce",
        "filename": "callout_fire_flame.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 220" fill="none">
  <defs>
    <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="60%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#facc15"/>
    </linearGradient>
  </defs>
  <path d="M90 10 C 110 50, 160 90, 160 145 C 160 185, 130 215, 90 215 C 50 215, 20 185, 20 145 C 20 105, 55 70, 75 40 C 70 70, 85 90, 95 85 C 110 80, 80 40, 90 10 Z" fill="url(#fireGrad)"/>
  <path d="M90 90 C 105 110, 130 135, 130 160 C 130 185, 110 200, 90 200 C 70 200, 50 185, 50 160 C 50 135, 75 115, 90 90 Z" fill="#fef08a"/>
</svg>"""
    },
    {
        "id": "callout-alert-exclamation",
        "name": "Pop Alert Exclamation",
        "category": "callouts",
        "type": "svg",
        "defaultAnimation": "pop",
        "filename": "callout_alert_exclamation.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" fill="none">
  <circle cx="90" cy="90" r="80" fill="#dc2626" stroke="#f87171" stroke-width="8"/>
  <rect x="78" y="38" width="24" height="60" rx="12" fill="#ffffff"/>
  <circle cx="90" cy="126" r="13" fill="#ffffff"/>
</svg>"""
    },
    {
        "id": "callout-checkmark",
        "name": "Checkmark Success",
        "category": "callouts",
        "type": "svg",
        "defaultAnimation": "pop",
        "filename": "callout_checkmark.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" fill="none">
  <circle cx="90" cy="90" r="80" fill="#16a34a" stroke="#4ade80" stroke-width="8"/>
  <path d="M50 92 L78 120 L132 64" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>"""
    },
    {
        "id": "callout-question-mark",
        "name": "Question Mark Pop",
        "category": "callouts",
        "type": "svg",
        "defaultAnimation": "wiggle",
        "filename": "callout_question_mark.svg",
        "svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" fill="none">
  <circle cx="90" cy="90" r="80" fill="#7c3aed" stroke="#c084fc" stroke-width="8"/>
  <text x="90" y="125" font-family="Inter, sans-serif" font-size="100" font-weight="bold" fill="#ffffff" text-anchor="middle">?</text>
</svg>"""
    }
]

class OverlayService:
    def __init__(self, overlays_dir: Path = settings.OVERLAYS_DIR):
        self.overlays_dir = overlays_dir
        self.overlays_dir.mkdir(parents=True, exist_ok=True)
        self.assets_dir = self.overlays_dir / "assets"
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        self.data_file = self.overlays_dir / "overlays.json"
        self._seed_defaults()

    def _read_overlays(self) -> List[OverlayItem]:
        if not self.data_file.exists():
            return []
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [OverlayItem(**item) for item in data]
        except Exception as e:
            print(f"[OverlayService] Error reading overlays.json: {e}")
            return []

    def _write_overlays(self, items: List[OverlayItem]):
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump([item.model_dump() for item in items], f, indent=2)

    def _seed_defaults(self):
        existing = self._read_overlays()
        existing_ids = {o.id for o in existing}
        updated = False

        # 1. Seed SVG Presets
        for p in DEFAULT_SVG_PRESETS:
            p_id = p["id"]
            filename = p["filename"]
            asset_path = self.assets_dir / filename
            if not asset_path.exists():
                with open(asset_path, "w", encoding="utf-8") as f:
                    f.write(p["svg"])

            if p_id not in existing_ids:
                item = OverlayItem(
                    id=p_id,
                    name=p["name"],
                    category=p["category"],
                    type=p["type"],
                    url=f"/overlays_media/assets/{filename}",
                    defaultAnimation=p["defaultAnimation"],
                    isPreset=True,
                    createdAt=datetime.now(timezone.utc).isoformat()
                )
                existing.append(item)
                existing_ids.add(p_id)
                updated = True

        # 2. Seed Animated GIF Preset if PIL is available
        gif_id = "arrow-animated-gif"
        gif_filename = "arrow_animated.gif"
        gif_path = self.assets_dir / gif_filename

        if HAS_PIL and not gif_path.exists():
            try:
                frames = []
                positions = [10, 22, 35, 22]
                for y_offset in positions:
                    im = Image.new("RGBA", (140, 160), (0, 0, 0, 0))
                    draw = ImageDraw.Draw(im)
                    # Neon cyan down arrow with white inner
                    # Shaft
                    draw.rounded_rectangle([55, 10 + y_offset, 85, 90 + y_offset], radius=8, fill=(6, 182, 212, 255))
                    draw.rounded_rectangle([63, 14 + y_offset, 77, 86 + y_offset], radius=4, fill=(255, 255, 255, 255))
                    # Head
                    head_coords = [(20, 80 + y_offset), (70, 140 + y_offset), (120, 80 + y_offset)]
                    draw.polygon(head_coords, fill=(6, 182, 212, 255))
                    inner_head = [(36, 84 + y_offset), (70, 126 + y_offset), (104, 84 + y_offset)]
                    draw.polygon(inner_head, fill=(255, 255, 255, 255))
                    frames.append(im)

                frames[0].save(
                    gif_path,
                    save_all=True,
                    append_images=frames[1:],
                    duration=110,
                    loop=0,
                    disposal=2
                )
            except Exception as e:
                print(f"[OverlayService] Could not generate animated GIF preset: {e}")

        if gif_path.exists() and gif_id not in existing_ids:
            gif_item = OverlayItem(
                id=gif_id,
                name="Animated Bounce Arrow (GIF)",
                category="arrows",
                type="gif",
                url=f"/overlays_media/assets/{gif_filename}",
                defaultAnimation="none",
                isPreset=True,
                createdAt=datetime.now(timezone.utc).isoformat()
            )
            existing.append(gif_item)
            updated = True

        if updated or not self.data_file.exists():
            self._write_overlays(existing)

    def list_overlays(self, category: Optional[str] = None) -> List[OverlayItem]:
        items = self._read_overlays()
        if category and category != "all":
            items = [item for item in items if item.category == category]
        return items

    def get_overlay(self, overlay_id: str) -> Optional[OverlayItem]:
        for item in self._read_overlays():
            if item.id == overlay_id:
                return item
        return None

    def create_overlay(
        self,
        name: str,
        category: str,
        default_animation: str,
        file_bytes: bytes,
        filename: str
    ) -> OverlayItem:
        items = self._read_overlays()
        overlay_id = str(uuid.uuid4())[:8]
        ext = Path(filename).suffix.lower()
        if not ext:
            ext = ".png"

        overlay_type: OverlayType = "image"
        if ext == ".svg":
            overlay_type = "svg"
        elif ext == ".gif":
            overlay_type = "gif"

        save_name = f"{overlay_id}{ext}"
        dest_path = self.assets_dir / save_name

        with open(dest_path, "wb") as f:
            f.write(file_bytes)

        now = datetime.now(timezone.utc).isoformat()
        item = OverlayItem(
            id=overlay_id,
            name=name.strip(),
            category=category if category in ["arrows", "lines", "callouts", "stickers", "custom"] else "custom",
            type=overlay_type,
            url=f"/overlays_media/assets/{save_name}",
            defaultAnimation=default_animation if default_animation in [
                "none", "bounce", "pulse", "spin", "fade", "slide-up", "slide-down", "slide-left", "slide-right", "pop", "wiggle", "glow"
            ] else "bounce",
            isPreset=False,
            createdAt=now
        )

        items.insert(0, item)
        self._write_overlays(items)
        return item

    def delete_overlay(self, overlay_id: str) -> bool:
        items = self._read_overlays()
        target = next((item for item in items if item.id == overlay_id), None)
        if not target:
            return False

        new_list = [item for item in items if item.id != overlay_id]
        self._write_overlays(new_list)

        # Delete asset file if not preset
        if not target.isPreset:
            try:
                filename = Path(target.url).name
                file_path = self.assets_dir / filename
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                print(f"[OverlayService] Error removing overlay asset file: {e}")

        return True

overlay_service = OverlayService()
