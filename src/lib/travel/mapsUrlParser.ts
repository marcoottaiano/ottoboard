/**
 * Parses a Google Maps URL to extract latitude and longitude.
 *
 * Supported formats:
 *   - @lat,lon  (e.g. maps.google.com/...@41.9028,12.4964,...)
 *   - ?q=lat,lon (e.g. maps.google.com/?q=41.9028,12.4964)
 *
 * Short links (maps.app.goo.gl/...) are NOT resolved — coordinates are not
 * present in the URL itself, so null is returned immediately.
 */
export function parseMapsUrl(url: string): { lat: number; lon: number } | null {
  if (!url || !url.trim()) return null

  // Format 1: @lat,lon[,zoom]
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (atMatch) {
    const lat = parseFloat(atMatch[1])
    const lon = parseFloat(atMatch[2])
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon }
    }
  }

  // Format 2: ?q=lat,lon or &q=lat,lon
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (qMatch) {
    const lat = parseFloat(qMatch[1])
    const lon = parseFloat(qMatch[2])
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon }
    }
  }

  return null
}
