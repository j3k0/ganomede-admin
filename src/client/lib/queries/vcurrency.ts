import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export interface Item {
  id: string;
  costs: Record<string, number>;
}

export interface ItemsResponse {
  items: Item[];
  currencies: string[];
}

export interface Pack {
  id: string;
  currency: string;
  amount: number;
}

export const vcurrencyKeys = {
  items: () => ["items"] as const,
  packs: () => ["packs"] as const,
};

export function useItems() {
  return useQuery({
    queryKey: vcurrencyKeys.items(),
    queryFn: () => api.get<ItemsResponse>("/items"),
  });
}

export function usePacks() {
  return useQuery({
    queryKey: vcurrencyKeys.packs(),
    queryFn: () => api.get<Pack[]>("/packs"),
  });
}

export function useSaveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Item) => {
      // Try POST first (create), fall back to PUT (update)
      try {
        return await api.post(`/items/${encodeURIComponent(item.id)}`, item);
      } catch {
        return await api.put(`/items/${encodeURIComponent(item.id)}`, item);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: vcurrencyKeys.items() }),
  });
}

export function useSavePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pack: Pack) => {
      try {
        return await api.post(`/packs/${encodeURIComponent(pack.id)}`, pack);
      } catch {
        return await api.put(`/packs/${encodeURIComponent(pack.id)}`, pack);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: vcurrencyKeys.packs() }),
  });
}
