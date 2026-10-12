function readGeotag(meta: Record<string, unknown> | null | undefined) {
  if (!meta || typeof meta !== 'object') return null;
  const geotag = (meta.geotag || (meta as { Geotag?: unknown }).Geotag) as
    | { latitude?: unknown; longitude?: unknown; accuracy?: unknown }
    | undefined;
  if (!geotag || typeof geotag !== 'object') return null;
  const lat = Number(geotag.latitude);
  const lng = Number(geotag.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, accuracy: geotag.accuracy };
}

/** Numeric lat/lng from verification metadata (for map links). */
export function getVerificationGeotagCoords(
  meta: Record<string, unknown> | null | undefined
): { lat: number; lng: number } | null {
  const g = readGeotag(meta);
  return g ? { lat: g.lat, lng: g.lng } : null;
}

/** GPS line from end-user verification metadata (`geotag`). */
export function formatVerificationGpsLine(meta: Record<string, unknown> | null | undefined): string | null {
  const g = readGeotag(meta);
  if (!g) return null;
  let s = `${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}`;
  if (g.accuracy != null && Number.isFinite(Number(g.accuracy))) {
    s += ` (±${Math.round(Number(g.accuracy))} m)`;
  }
  return s;
}

/** Human-readable address stored at verification (reverse geocode or client). */
export function getVerificationLocationLabel(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const label = (meta as { locationLabel?: unknown }).locationLabel;
  if (typeof label === 'string' && label.trim()) return label.trim();
  return null;
}
