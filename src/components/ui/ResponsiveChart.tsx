"use client";
import { type ComponentProps } from "react";
import { ResponsiveContainer } from "recharts";
import { useChartVisibility } from "./ChartVisibility";
export function ResponsiveChart(props: ComponentProps<typeof ResponsiveContainer>) {
  const visible = useChartVisibility();
  return visible ? <ResponsiveContainer {...props} /> : null;
}
