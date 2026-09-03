"use client";
import { useEffect, useState } from "react";

/** Stable render snapshot, refreshed once a minute for relative dates and sync labels. */
export function useCurrentTime() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}
