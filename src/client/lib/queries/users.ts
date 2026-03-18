import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

// --- Types ---
export interface SearchResult {
  query: string;
  results: Array<{ found: boolean; method: string; userId?: string }>;
  matchingIds: string[];
}

export interface UserProfile {
  userId: string;
  balance: Array<{ currency: string; count: number }>;
  transactions: Transaction[];
  banInfo: { exists: boolean; createdAt?: string };
  avatar: string | null;
  metadata: Record<string, unknown>;
  directory: { id: string; aliases: Record<string, string> } | null;
}

export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  currency: string;
  reason: string;
  data: Record<string, unknown>;
  balance?: number;
}

export interface ReportsBlocks {
  blockedBy: Array<{ username: string; on: string }>;
  blocks: Array<{ username: string; on: string }>;
  reportedBy: Array<{ username: string; on: string }>;
  reports: Array<{ username: string; on: string }>;
}

export interface ReportedUser {
  target: string;
  total: number;
}

export interface ChatRoom {
  users: string[];
  messages: Array<{ from: string; timestamp: string; type: string; message: string }>;
}

// --- Query Keys ---
export const userKeys = {
  all: ["users"] as const,
  search: (query: string) => [...userKeys.all, "search", query] as const,
  detail: (userId: string) => [...userKeys.all, userId] as const,
  reportsBlocks: (userId: string) => [...userKeys.all, userId, "reports-blocks"] as const,
  reported: () => [...userKeys.all, "reported"] as const,
  chat: (u1: string, u2: string) => [...userKeys.all, "chat", u1, u2] as const,
  metadata: (userId: string) => [...userKeys.all, userId, "metadata"] as const,
};

// --- Queries ---
export function useUserSearch(query: string) {
  return useQuery({
    queryKey: userKeys.search(query),
    queryFn: () => api.get<SearchResult>(`/users/search/${encodeURIComponent(query)}`),
    enabled: !!query,
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => api.get<UserProfile>(`/users/${encodeURIComponent(userId)}`),
    enabled: !!userId,
  });
}

export function useReportsBlocks(userId: string) {
  return useQuery({
    queryKey: userKeys.reportsBlocks(userId),
    queryFn: () => api.get<ReportsBlocks>(`/users/reports-blocks/${encodeURIComponent(userId)}`),
    enabled: !!userId,
  });
}

export function useHighlyReported() {
  return useQuery({
    queryKey: userKeys.reported(),
    queryFn: () => api.get<ReportedUser[]>("/users/highly/reported"),
  });
}

export function useChatRoom(username1: string, username2: string) {
  return useQuery({
    queryKey: userKeys.chat(username1, username2),
    queryFn: () =>
      api.get<ChatRoom>(`/users/chat/${encodeURIComponent(username1)}/${encodeURIComponent(username2)}`),
    enabled: !!username1 && !!username2,
  });
}

export function useUserMetadata(userId: string) {
  return useQuery({
    queryKey: userKeys.metadata(userId),
    queryFn: () => api.get<Array<{ id: string; value: unknown }>>(`/users/${encodeURIComponent(userId)}/usermeta`),
    enabled: !!userId,
  });
}

// --- Mutations ---
export function useAwardCurrency(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; currency: string }) =>
      api.post(`/users/${encodeURIComponent(userId)}/rewards`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useBan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/users/${encodeURIComponent(userId)}/ban`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useUnban(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/users/${encodeURIComponent(userId)}/unban`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function usePasswordReset(userId: string) {
  return useMutation({
    mutationFn: (data: { newPassword: string }) =>
      api.post(`/users/${encodeURIComponent(userId)}/password-reset`, data),
  });
}

export function useUpdateMetadata(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      api.put(`/users/${encodeURIComponent(userId)}/usermeta/${data.key}`, { value: data.value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.metadata(userId) });
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: (data: { to: string; subject: string; text: string; html?: string }) =>
      api.post("/send-email", data),
  });
}
