import { useQuery } from "@tanstack/react-query";
import { api } from "../api.js";

export interface WinRateAlert {
  type: "win-rate-outlier";
  details: { winner: string; loser: string; games: number; wins: number; winRate: number };
}

export interface DeviceClusterAlert {
  type: "device-cluster";
  /** userIds is capped at 50; users is the full count. */
  details: { device: string; users: number; userIds: string[] };
}

export interface FarmingSuspects {
  /** Epoch ms, null before the first scan. */
  scannedAt: number | null;
  /** Null before the first scan. */
  deviceScan: "ok" | "failed" | "disabled" | null;
  /** Unknown alert types are ignored by the UI. */
  alerts: Array<WinRateAlert | DeviceClusterAlert | { type: string; details: unknown }>;
}

export function useFarmingSuspects() {
  return useQuery({
    queryKey: ["farming-suspects"],
    queryFn: () => api.get<FarmingSuspects>("/farming-suspects"),
  });
}
