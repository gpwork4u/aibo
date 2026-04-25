"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateProjectInput,
  ListProjectsParams,
  ListProjectsResponse,
  Project,
  UpdateProjectInput,
  archiveProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "@/lib/api/projects";

export const PROJECTS_QUERY_KEY = ["projects"] as const;
export const projectKey = (id: string) => ["project", id] as const;

export function useProjects(params: ListProjectsParams = {}) {
  return useQuery<ListProjectsResponse>({
    queryKey: [...PROJECTS_QUERY_KEY, params],
    queryFn: () => listProjects(params),
  });
}

export function useProject(id: string | null | undefined) {
  return useQuery<Project>({
    queryKey: projectKey(id ?? ""),
    queryFn: () => getProject(id as string),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      updateProject(id, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: projectKey(vars.id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      deleteProject(id, force ?? false),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: projectKey(vars.id) });
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveProject(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: projectKey(id) });
    },
  });
}
