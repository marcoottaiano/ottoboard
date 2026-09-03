"use client";
import { useIsFetching } from "@tanstack/react-query";
export function GlobalLoadingBar() {
  const fetching = useIsFetching() > 0;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px] overflow-hidden transition-opacity duration-300 ${fetching ? "opacity-100" : "opacity-0"}`}
    >
      <div className="h-full" style={{ animation: fetching ? "loading-bar 1.4s ease-in-out infinite" : undefined }}>
        <div className="h-full w-1/2 bg-linear-to-r from-transparent via-wm-primary to-transparent" />
      </div>
    </div>
  );
}
