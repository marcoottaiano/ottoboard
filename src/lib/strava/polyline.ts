/**
 * Decodifica il formato Google Encoded Polyline.
 * Restituisce array di [lat, lng].
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push([lat / 1e5, lng / 1e5])
  }

  return points
}

/**
 * Converte punti lat/lng in stringa `d` SVG normalizzata nella viewport.
 */
export function polylineToSvgPath(
  points: [number, number][],
  width: number,
  height: number
): string {
  if (points.length < 2) return ''

  const lats = points.map(([lat]) => lat)
  const lngs = points.map(([, lng]) => lng)

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latRange = maxLat - minLat || 1
  const lngRange = maxLng - minLng || 1

  const padding = 4

  const toX = (lng: number) =>
    padding + ((lng - minLng) / lngRange) * (width - padding * 2)

  const toY = (lat: number) =>
    padding + ((maxLat - lat) / latRange) * (height - padding * 2)

  return points
    .map(([lat, lng], i) => `${i === 0 ? 'M' : 'L'}${toX(lng).toFixed(1)},${toY(lat).toFixed(1)}`)
    .join(' ')
}
