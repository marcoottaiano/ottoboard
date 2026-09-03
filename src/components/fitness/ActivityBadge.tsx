import { ActivityType } from "@/types";

const BADGE_STYLES: Record<ActivityType, { label: string; className: string }> = {
  Run: { label: "Corsa", className: "bg-wm-fitness/20 text-wm-fitness border-wm-fitness/30" },
  WeightTraining: { label: "Palestra", className: "bg-wm-chart-blue/20 text-wm-chart-blue border-wm-chart-blue/30" },
  Walk: { label: "Camminata", className: "bg-wm-chart-teal/20 text-wm-chart-teal border-wm-chart-teal/30" },
  Hike: { label: "Escursione", className: "bg-wm-success/20 text-wm-success border-wm-success/30" },
  Ski: { label: "Sci", className: "bg-wm-chart-teal/20 text-wm-chart-teal border-wm-chart-teal/30" },
};

const DEFAULT_STYLE = { label: "Altro", className: "bg-gray-500/20 text-wm-muted-foreground border-gray-500/30" };

interface ActivityBadgeProps {
  type: string;
  className?: string;
}

export function ActivityBadge({ type, className = "" }: ActivityBadgeProps) {
  const style = BADGE_STYLES[type as ActivityType] ?? DEFAULT_STYLE;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style.className} ${className}`}
    >
      {style.label}
    </span>
  );
}
