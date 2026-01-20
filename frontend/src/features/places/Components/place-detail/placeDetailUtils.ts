export function mapStaticUrl(lat?: number, lng?: number) {
  if (lat == null || lng == null) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+2bee6c(${lng},${lat})/${lng},${lat},13,0/400x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`;
}

export function googleMapsUrl(lat?: number, lng?: number) {
  if (lat == null || lng == null) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}
