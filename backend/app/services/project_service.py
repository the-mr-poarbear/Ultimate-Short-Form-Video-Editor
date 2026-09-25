import json
import uuid
import shutil
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone
from app.config import settings
from app.models.project import Project, Slice, ProjectSettings
from app.models.transcript import TranscriptSegment
from app.models.media import MediaAsset

class ProjectService:
    def __init__(self, projects_dir: Path = settings.PROJECTS_DIR):
        self.projects_dir = projects_dir

    def get_project_dir(self, project_id: str) -> Path:
        return self.projects_dir / project_id

    def get_project_file(self, project_id: str) -> Path:
        return self.get_project_dir(project_id) / "project.json"

    def create_project(self, title: str = "New Book Bite") -> Project:
        project_id = str(uuid.uuid4())[:8]
        proj_dir = self.get_project_dir(project_id)
        proj_dir.mkdir(parents=True, exist_ok=True)
        (proj_dir / "audio").mkdir(exist_ok=True)
        (proj_dir / "transcript").mkdir(exist_ok=True)
        (proj_dir / "media").mkdir(exist_ok=True)
        (proj_dir / "renders").mkdir(exist_ok=True)

        now = datetime.now(timezone.utc).isoformat()
        project = Project(
            id=project_id,
            title=title,
            createdAt=now,
            updatedAt=now,
            settings=ProjectSettings()
        )
        self.save_project(project)
        return project

    def save_project(self, project: Project) -> Project:
        proj_dir = self.get_project_dir(project.id)
        proj_dir.mkdir(parents=True, exist_ok=True)
        file_path = self.get_project_file(project.id)
        now = datetime.now(timezone.utc).isoformat()
        project.updatedAt = now
        if not project.createdAt:
            project.createdAt = now
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(project.model_dump_json(indent=2))
        return project

    def get_project(self, project_id: str) -> Optional[Project]:
        file_path = self.get_project_file(project_id)
        if not file_path.exists():
            return None
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return Project(**data)

    def list_projects(self) -> List[Project]:
        projects = []
        if not self.projects_dir.exists():
            return projects
        for p in self.projects_dir.iterdir():
            if p.is_dir() and (p / "project.json").exists():
                proj = self.get_project(p.name)
                if proj:
                    file_path = p / "project.json"
                    mtime = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc).isoformat()
                    if not proj.createdAt:
                        proj.createdAt = mtime
                    if not proj.updatedAt:
                        proj.updatedAt = mtime
                    projects.append(proj)
        # Sort by updatedAt descending (most recent first)
        projects.sort(key=lambda x: x.updatedAt or "", reverse=True)
        return projects

    def duplicate_project(self, project_id: str, new_title: Optional[str] = None) -> Optional[Project]:
        orig = self.get_project(project_id)
        if not orig:
            return None

        new_id = str(uuid.uuid4())[:8]
        new_title = new_title or f"{orig.title} (Copy)"

        orig_dir = self.get_project_dir(project_id)
        new_dir = self.get_project_dir(new_id)
        new_dir.mkdir(parents=True, exist_ok=True)

        for folder in ["audio", "transcript", "media", "renders"]:
            src_folder = orig_dir / folder
            dst_folder = new_dir / folder
            if src_folder.exists():
                shutil.copytree(src_folder, dst_folder, dirs_exist_ok=True)
            else:
                dst_folder.mkdir(exist_ok=True)

        data = orig.model_dump()
        data["id"] = new_id
        data["title"] = new_title
        now = datetime.now(timezone.utc).isoformat()
        data["createdAt"] = now
        data["updatedAt"] = now

        if data.get("originalAudio"):
            data["originalAudio"] = data["originalAudio"].replace(f"/media/{project_id}/", f"/media/{new_id}/")
        if data.get("processedAudio"):
            data["processedAudio"] = data["processedAudio"].replace(f"/media/{project_id}/", f"/media/{new_id}/")
        if data.get("backgroundVideo"):
            data["backgroundVideo"] = data["backgroundVideo"].replace(f"/media/{project_id}/", f"/media/{new_id}/")
        if data.get("backgroundMusic") and data["backgroundMusic"].get("url"):
            data["backgroundMusic"]["url"] = data["backgroundMusic"]["url"].replace(f"/media/{project_id}/", f"/media/{new_id}/")

        for asset in data.get("mediaAssets", []):
            if "url" in asset and asset["url"]:
                asset["url"] = asset["url"].replace(f"/media/{project_id}/", f"/media/{new_id}/")

        new_project = Project(**data)
        self.save_project(new_project)
        return new_project

    def delete_project(self, project_id: str) -> bool:
        proj_dir = self.get_project_dir(project_id)
        if proj_dir.exists():
            shutil.rmtree(proj_dir)
            return True
        return False

project_service = ProjectService()
