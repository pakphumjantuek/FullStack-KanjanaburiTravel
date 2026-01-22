import  { useEffect, useRef } from "react";
import type { LatLng } from "../../utils/osrm";
import { initLongdoMap, renderMarkers, renderPolyline, setCenter, zoomTo } from "./longdoMapAdapter";

type MarkerModel = {
  placeId: number;
  lat: number;
  lng: number;
  title: string;
  badge: string;
  tone: "start" | "end" | "num";
};

type Props = {
  center: LatLng;
  markers: MarkerModel[];
  routePoints: LatLng[];
  hoveredPlaceId: number | null;

  isFullscreen: boolean;
  onToggleFullscreen: () => void;

  onClickPlace: (placeId: number) => void;

  // ✅ NEW
  onMapReady?: (map: any) => void;

  // ✅ parent handlers
  onFit: () => void;
  onCenter: () => void;
};

export function TripMapView({
  center,
  markers,
  routePoints,
  hoveredPlaceId,
  isFullscreen,
  onToggleFullscreen,
  onClickPlace,
  onMapReady,
  onFit,
  onCenter,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerById = useRef<Map<number, any>>(new Map());
  const polylineRef = useRef<any>(null);

  // init once
  useEffect(() => {
    if (!mapDivRef.current) return;
    if (!window.longdo) return;
    if (mapRef.current) return;

    const map = initLongdoMap(mapDivRef.current, center);
    mapRef.current = map;

    if (map && onMapReady) onMapReady(map);

    return () => {
      mapRef.current = null;
      markerById.current.clear();
      polylineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep center on changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setCenter(map, center);
  }, [center]);

  // render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    renderMarkers({
      map,
      markers,
      markerById: markerById.current,
      onClickPlace,
    });
  }, [markers, onClickPlace]);

  // render polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    renderPolyline({ map, routePoints, polylineRef });
  }, [routePoints]);

  // hovered -> zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hoveredPlaceId) return;

    const mk = markerById.current.get(hoveredPlaceId);
    const loc = mk?.location?.() ?? mk?._location;
    if (!loc) return;

    zoomTo(map, loc.lat, loc.lon, 15);
  }, [hoveredPlaceId]);

  return (
    <div className={`rounded-3xl overflow-hidden border bg-white shadow-sm relative ${isFullscreen ? "h-full" : "h-[72vh]"}`}>
      <div className="absolute z-20 top-4 right-4 flex flex-col gap-2">
        <button
          onClick={onFit}
          className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 text-xs font-bold text-gray-800 shadow-sm hover:border-blue-400"
        >
          ซูมทั้งหมด
        </button>

        <button
          onClick={onCenter}
          className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 text-xs font-bold text-gray-800 shadow-sm hover:border-blue-400"
        >
          กลับจุดเริ่ม
        </button>

        <button
          onClick={onToggleFullscreen}
          className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 text-xs font-bold text-gray-800 shadow-sm hover:border-blue-400"
        >
          {isFullscreen ? "ปิดเต็มจอ" : "เต็มจอ"}
        </button>
      </div>

      {window.longdo ? (
        <div ref={mapDivRef} className="h-full w-full" />
      ) : (
        <div className="h-full w-full flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border p-4 bg-white">
            <div className="font-extrabold text-red-700">Longdo Map SDK ยังไม่ถูกโหลด</div>
            <div className="text-sm text-gray-600 mt-2">
              เพิ่ม script ใน <span className="font-mono">public/index.html</span>:
              <div className="mt-2 rounded bg-gray-100 p-2 text-xs font-mono">
                {"<script src=\"https://api.longdo.com/map3/?key=YOUR-KEY\"></script>"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
