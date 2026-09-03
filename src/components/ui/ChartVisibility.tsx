"use client";
import { createContext, useContext, type ReactNode } from "react";
const ChartVisibilityContext = createContext(true);
export function ChartVisibility({ visible, children }: { visible: boolean; children: ReactNode }) {
  const parentVisible = useContext(ChartVisibilityContext);
  return <ChartVisibilityContext.Provider value={visible && parentVisible}>{children}</ChartVisibilityContext.Provider>;
}
export function useChartVisibility() {
  return useContext(ChartVisibilityContext);
}
