"use client";

import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function PrivacyValue({ children, className }: Props) {
  const { isPrivate } = usePrivacyMode();
  return (
    <span
      aria-hidden={isPrivate || undefined}
      className={["transition-all duration-200", isPrivate ? "blur-xs select-none" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
