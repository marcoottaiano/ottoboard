import { decodePolyline, polylineToSvgPath } from '@/lib/strava/polyline'
import { MapPin } from 'lucide-react'

interface PolylineMapProps {
  polyline: string | null
  className?: string
  width?: number
  height?: number
}

export function PolylineMap({ polyline, className = '', width = 200, height = 120 }: PolylineMapProps) {
  if (!polyline) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-white/5 border border-white/10 ${className}`}
        style={{ width, height }}
      >
        <MapPin className="text-gray-600" size={24} />
      </div>
    )
  }

  const points = decodePolyline(polyline)
  const pathD = polylineToSvgPath(points, width, height)

  return (
    <div
      className={`rounded-lg overflow-hidden bg-white/5 border border-white/10 ${className}`}
      style={{ width, height }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path
          d={pathD}
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
