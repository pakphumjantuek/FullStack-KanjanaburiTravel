import type { LatLng } from "../../utils/osrm";
import { makeBadgeHtml } from "./makeBadgeHtml";

declare global {
  interface Window {
    longdo?: any;
  }
}

export function initLongdoMap(placeholder: HTMLDivElement, center: LatLng) {
  const longdo = window.longdo;
  if (!longdo) return null;

  const map = new longdo.Map({ placeholder });

  map.Event.bind("ready", () => {
    map.location({ lon: center[1], lat: center[0] }, true);
    map.zoom(12, true);
  });

  return map;
}

export function clearOverlays(map: any, markerById: Map<number, any>, polylineRef: { current: any | null }) {
  for (const [, mk] of markerById) map.Overlays.remove(mk);
  markerById.clear();

  if (polylineRef.current) {
    map.Overlays.remove(polylineRef.current);
    polylineRef.current = null;
  }
}

export function renderMarkers(params: {
  map: any;
  markers: Array<{ placeId: number; lat: number; lng: number; title: string; badge: string; tone: "start" | "end" | "num" }>;
  markerById: Map<number, any>;
  onClickPlace?: (placeId: number) => void;
}) {
  const { map, markers, markerById, onClickPlace } = params;
  const longdo = window.longdo;
  if (!longdo) return;

  // clear old markers only
  for (const [, mk] of markerById) map.Overlays.remove(mk);
  markerById.clear();

  for (const m of markers) {
    const mk = new longdo.Marker(
      { lon: m.lng, lat: m.lat },
      {
        title: m.title,
        detail: "คลิกเพื่อดูรายละเอียด",
        icon: {
          html: makeBadgeHtml(m.badge, m.tone),
          offset: {
            x: m.tone === "num" ? 18 : 22,
            y: m.tone === "num" ? 36 : 44,
          },
        },
      }
    );

    mk.Event?.bind?.("click", () => onClickPlace?.(m.placeId));

    map.Overlays.add(mk);
    markerById.set(m.placeId, mk);
  }
}

export function renderPolyline(params: { map: any; routePoints: LatLng[]; polylineRef: { current: any | null } }) {
  const { map, routePoints, polylineRef } = params;
  const longdo = window.longdo;
  if (!longdo) return;

  if (polylineRef.current) {
    map.Overlays.remove(polylineRef.current);
    polylineRef.current = null;
  }

  if (!routePoints.length) return;

  const line = routePoints.map(([lat, lng]) => ({ lon: lng, lat }));
  const pl = new longdo.Polyline(line, { lineWidth: 6 });
  map.Overlays.add(pl);
  polylineRef.current = pl;
}

export function setCenter(map: any, center: LatLng) {
  map.location({ lon: center[1], lat: center[0] }, true);
}

export function zoomTo(map: any, lat: number, lng: number, minZoom = 15) {
  map.location({ lon: lng, lat }, true);
  map.zoom(Math.max(map.zoom(), minZoom), true);
}

export function fitPoints(map: any, points: LatLng[]) {
  if (!points.length) return;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const span = Math.max(maxLat - minLat, maxLng - minLng);

  const zoomFromSpan = (s: number) => {
    if (s > 10) return 6;
    if (s > 5) return 7;
    if (s > 3) return 8;
    if (s > 1.5) return 9;
    if (s > 0.8) return 10;
    if (s > 0.35) return 11;
    if (s > 0.18) return 12;
    return 13;
  };

  map.location({ lon: midLng, lat: midLat }, true);
  map.zoom(Math.max(3, Math.min(18, zoomFromSpan(span))), true);
}
