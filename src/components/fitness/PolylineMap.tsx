import { decodePolyline, polylineToSvgPath } from "@/lib/strava/polyline";
import { MapPin } from "lucide-react";

interface PolylineMapProps {
  polyline: string | null;
  className?: string;
  width?: number;
  height?: number;
}

export function PolylineMap({ polyline, className = "", width = 200, height = 120 }: PolylineMapProps) {
  if (!polyline) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-wm-muted border border-wm-border ${className}`}
        style={{ width: "100%", maxWidth: width, height }}
      >
        <MapPin className="text-wm-muted-foreground" size={24} />
      </div>
    );
  }

  const points = decodePolyline(polyline);
  const pathD = polylineToSvgPath(points, width, height);

  return (
    <div
      className={`rounded-lg overflow-hidden bg-wm-muted border border-wm-border ${className}`}
      style={{ width: "100%", maxWidth: width, height }}
    >
      <svg role="img" aria-label="Percorso dell’attività" width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <path
          d={pathD}
          fill="none"
          stroke="var(--wm-fitness)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
