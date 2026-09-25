import { apiFetch } from "./api";
import type { Project } from "../types/project";

export const projectService = {
  createProject: (title?: string) =>
    apiFetch<Project>("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "New Book Bite" }),
    }),

  getProject: (projectId: string) =>
    apiFetch<Project>(`/api/projects/${projectId}`),

  listProjects: () =>
    apiFetch<Project[]>("/api/projects"),

  updateProject: (project: Project) =>
    apiFetch<Project>(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    }),

  deleteProject: (projectId: string) =>
    apiFetch<{ status: string }>(`/api/projects/${projectId}`, {
      method: "DELETE",
    }),

  duplicateProject: (projectId: string, title?: string) =>
    apiFetch<Project>(`/api/projects/${projectId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),
};
