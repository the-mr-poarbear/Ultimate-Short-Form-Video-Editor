import json
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

from app.config import settings
from app.models.character import Character, CharacterPose

class CharacterService:
    def __init__(self, characters_dir: Path = settings.CHARACTERS_DIR):
        self.characters_dir = characters_dir
        self.characters_dir.mkdir(parents=True, exist_ok=True)
        self.data_file = self.characters_dir / "characters.json"
        if not self.data_file.exists():
            self._write_characters([])

    def _read_characters(self) -> List[Character]:
        if not self.data_file.exists():
            return []
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [Character(**item) for item in data]
        except Exception as e:
            print(f"Error reading characters.json: {e}")
            return []

    def _write_characters(self, characters: List[Character]):
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump([c.model_dump() for c in characters], f, indent=2)

    def list_characters(self) -> List[Character]:
        characters = self._read_characters()
        characters.sort(key=lambda c: c.updatedAt or c.createdAt or "", reverse=True)
        return characters

    def get_character(self, character_id: str) -> Optional[Character]:
        characters = self._read_characters()
        for c in characters:
            if c.id == character_id:
                return c
        return None

    def create_character(self, name: str) -> Character:
        characters = self._read_characters()
        char_id = str(uuid.uuid4())[:8]
        char_folder = self.characters_dir / char_id
        char_folder.mkdir(parents=True, exist_ok=True)

        now = datetime.now(timezone.utc).isoformat()
        character = Character(
            id=char_id,
            name=name.strip(),
            poses=[],
            createdAt=now,
            updatedAt=now
        )
        characters.append(character)
        self._write_characters(characters)
        return character

    def update_character(self, character_id: str, name: str, default_pose_id: Optional[str] = None) -> Optional[Character]:
        characters = self._read_characters()
        for c in characters:
            if c.id == character_id:
                c.name = name.strip()
                if default_pose_id is not None:
                    c.defaultPoseId = default_pose_id
                c.updatedAt = datetime.now(timezone.utc).isoformat()
                self._write_characters(characters)
                return c
        return None

    def delete_character(self, character_id: str) -> bool:
        characters = self._read_characters()
        new_list = [c for c in characters if c.id != character_id]
        if len(new_list) == len(characters):
            return False
        self._write_characters(new_list)

        char_folder = self.characters_dir / character_id
        if char_folder.exists():
            shutil.rmtree(char_folder, ignore_errors=True)
        return True

    def add_pose(self, character_id: str, pose_name: str, file_bytes: bytes, filename: str) -> Optional[CharacterPose]:
        characters = self._read_characters()
        target: Optional[Character] = None
        for c in characters:
            if c.id == character_id:
                target = c
                break

        if not target:
            return None

        pose_id = str(uuid.uuid4())[:8]
        ext = Path(filename).suffix.lower()
        if not ext or ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]:
            ext = ".png"

        char_folder = self.characters_dir / character_id
        char_folder.mkdir(parents=True, exist_ok=True)

        save_name = f"{pose_id}{ext}"
        dest_path = char_folder / save_name

        with open(dest_path, "wb") as f:
            f.write(file_bytes)

        now = datetime.now(timezone.utc).isoformat()
        image_url = f"/characters_media/{character_id}/{save_name}"

        pose = CharacterPose(
            id=pose_id,
            name=pose_name.strip(),
            imageUrl=image_url,
            createdAt=now
        )

        target.poses.append(pose)
        if not target.defaultPoseId:
            target.defaultPoseId = pose_id
        target.updatedAt = now

        self._write_characters(characters)
        return pose

    def delete_pose(self, character_id: str, pose_id: str) -> bool:
        characters = self._read_characters()
        target: Optional[Character] = None
        for c in characters:
            if c.id == character_id:
                target = c
                break

        if not target:
            return False

        pose_to_delete = next((p for p in target.poses if p.id == pose_id), None)
        if not pose_to_delete:
            return False

        target.poses = [p for p in target.poses if p.id != pose_id]
        if target.defaultPoseId == pose_id:
            target.defaultPoseId = target.poses[0].id if target.poses else None

        target.updatedAt = datetime.now(timezone.utc).isoformat()
        self._write_characters(characters)

        # Delete image file if exists
        try:
            filename = Path(pose_to_delete.imageUrl).name
            file_path = self.characters_dir / character_id / filename
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Error removing pose file: {e}")

        return True

    def update_pose(self, character_id: str, pose_id: str, name: str) -> Optional[CharacterPose]:
        characters = self._read_characters()
        for c in characters:
            if c.id == character_id:
                for p in c.poses:
                    if p.id == pose_id:
                        p.name = name.strip()
                        c.updatedAt = datetime.now(timezone.utc).isoformat()
                        self._write_characters(characters)
                        return p
        return None

character_service = CharacterService()
