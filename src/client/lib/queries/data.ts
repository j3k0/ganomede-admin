import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export const dataKeys = {
  all: ["data"] as const,
  list: (query?: string) => [...dataKeys.all, "list", query ?? ""] as const,
  detail: (id: string) => [...dataKeys.all, id] as const,
};

export function useDataDocs(query?: string) {
  return useQuery({
    queryKey: dataKeys.list(query),
    queryFn: () => api.get<string[]>(`/data/docs${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  });
}

export function useDataDoc(id: string) {
  return useQuery({
    queryKey: dataKeys.detail(id),
    queryFn: () => api.get<unknown>(`/data/docs/${encodeURIComponent(id)}`),
    enabled: !!id,
  });
}

export function useCreateDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id?: string; [key: string]: unknown }) =>
      api.post("/data/docs", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: dataKeys.all }),
  });
}

export function useUpdateDoc(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      api.post(`/data/docs/${encodeURIComponent(id)}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dataKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dataKeys.list() });
    },
  });
}

export function useDeleteDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/data/docs/${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: dataKeys.all }),
  });
}

export function useBulkUpsert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documents: Record<string, unknown>) =>
      api.post("/data/docs/_bulk_upsert", { documents }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dataKeys.all }),
  });
}
