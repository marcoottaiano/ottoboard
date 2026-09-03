"use client";

import { useCurrentTime } from "@/hooks/useCurrentTime";
import { Clock, WifiOff } from "lucide-react";

interface SyncStatusBadgeProps {
  lastSyncedAt: string | null | undefined;
  hasError?: boolean;
}

function formatStaleness(diffMs: number): string {
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m fa`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h fa`;
  return `${Math.floor(diffH / 24)}g fa`;
}

export function SyncStatusBadge({ lastSyncedAt, hasError = false }: SyncStatusBadgeProps) {
  const now = useCurrentTime();
  if (!lastSyncedAt && !hasError) return null;

  if (lastSyncedAt) {
    const ts = new Date(lastSyncedAt).getTime();
    if (isNaN(ts)) return null;

    const diffMs = Math.max(0, now - ts);

    // Recent successful sync overrides any transient error
    if (diffMs < 30 * 60_000) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-wm-success/80 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-wm-success animate-pulse" />
          Live
        </span>
      );
    }

    if (hasError) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-wm-destructive/80 shrink-0">
          <WifiOff size={10} />
          Sync error
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs text-wm-warning/80 shrink-0">
        <Clock size={10} />
        {formatStaleness(diffMs)}
      </span>
    );
  }

  // lastSyncedAt is null/undefined and hasError is true
  return (
    <span className="inline-flex items-center gap-1 text-xs text-wm-destructive/80 shrink-0">
      <WifiOff size={10} />
      Sync error
    </span>
  );
}
