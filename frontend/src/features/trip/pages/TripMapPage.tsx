// src/features/trip/pages/TripMapPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Loading } from "../../../components/Loading";
import { useGetTripDetailQuery, useSaveRouteMutation } from "../tripApi";
import { usePlacesByIds } from "../hooks/usePlacesByIds";
import { showSuccessOk } from "../../../utils";

/**
 * ✅ IMPORTANT (ต้องมี)
 * เพิ่มใน public/index.html:
 * <script src="https://api.longdo.com/map3/?key=YOUR-KEY"></script>
 */
declare global {
  interface Window {
    longdo?: any;
  }
}

// ---------------- Types ----------------
type LatLng = [number, number]; // [lat, lng]
type OsrmResponse = {
  routes?: Array<{
    distance: number; // meters
    duration: number; // seconds
    geometry: { coordinates: Array<[number, number]>; type: "LineString" }; // [lng,lat]
  }>;
};

// ---------------- UI helpers ----------------
const StatPill = ({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "gray" | "blue" | "green" | "amber" | "red";
}) => {
  const toneCls: Record<string, string> = {
    gray: "border-gray-200 bg-gray-50 text-gray-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-green-200 bg-green-50 text-green-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-medium ${toneCls[tone]}`}
    >
      <span className="opacity-80">{label}</span>
      <span className="font-extrabold">{value}</span>
    </div>
  );
};

const PrimaryBtn = ({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

const GhostBtn = ({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
  >
    {children}
  </button>
);

// ---------------- Map helpers ----------------
function toLonLat([lat, lng]: LatLng) {
  return { lon: lng, lat };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function calcBBox(points: LatLng[]) {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;

  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

// zoom heuristic (เรียบง่าย + ใช้งานจริงโอเค)
function zoomFromSpan(span: number) {
  if (span > 10) return 6;
  if (span > 5) return 7;
  if (span > 3) return 8;
  if (span > 1.5) return 9;
  if (span > 0.8) return 10;
  if (span > 0.35) return 11;
  if (span > 0.18) return 12;
  return 13;
}

function makeBadgeHtml(text: string, tone: "start" | "end" | "num") {
  const bg =
    tone === "start"
      ? "linear-gradient(135deg,#059669,#10b981)"
      : tone === "end"
      ? "linear-gradient(135deg,#e11d48,#fb7185)"
      : "linear-gradient(135deg,#111827,#0b1220)";
  const size = tone === "num" ? 36 : 44;
  const fontSize = tone === "num" ? 13 : 11;
  const border = tone === "num" ? 2 : 3;
  const padding = tone === "num" ? 0 : 6;

  return `
    <div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${bg};
      color:white;font-weight:900;font-size:${fontSize}px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 14px 28px rgba(0,0,0,.25);
      border:${border}px solid rgba(255,255,255,.95);
      transform: translateY(-4px);
      text-align:center;
      padding:${padding}px;
      line-height:1.05;
      letter-spacing:-.2px;
    ">${text}</div>
  `;
}

export default function TripMapPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const navigate = useNavigate();

  // ---------------- Queries ----------------
  const {
    data: trip,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetTripDetailQuery(tripId, {
    skip: !Number.isFinite(tripId) || tripId <= 0,
  });

  const [saveRoute, { isLoading: isSaving }] = useSaveRouteMutation();

  // ---------------- UI State ----------------
  const [selectedDay, setSelectedDay] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // hover list -> zoom map
  const [hoveredPlaceId, setHoveredPlaceId] = useState<number | null>(null);

  // route state
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ km: number; min: number } | null>(
    null
  );
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // ---------------- Data derived ----------------
  const itemsSorted = useMemo(() => {
    const items = trip?.items ?? [];
    return items
      .slice()
      .sort((a, b) => a.dayIndex - b.dayIndex || a.orderIndex - b.orderIndex);
  }, [trip?.items]);

  const maxDay = useMemo(() => {
    if (itemsSorted.length === 0) return 1;
    return Math.max(...itemsSorted.map((x) => x.dayIndex || 1));
  }, [itemsSorted]);

  useEffect(() => {
    setSelectedDay((d) => clamp(d, 1, maxDay));
  }, [maxDay]);

  const dayItems = useMemo(
    () => itemsSorted.filter((x) => x.dayIndex === selectedDay),
    [itemsSorted, selectedDay]
  );

  const placeIds = useMemo(() => dayItems.map((x) => x.placeId), [dayItems]);
  const { map: placeMap, isLoading: isPlacesLoading } = usePlacesByIds(placeIds);

  const orderedLatLng = useMemo(() => {
    const pts: LatLng[] = [];
    for (const it of dayItems) {
      const p = placeMap.get(it.placeId);
      if (!p) continue;
      if (typeof p.latitude === "number" && typeof p.longitude === "number") {
        pts.push([p.latitude, p.longitude]);
      }
    }
    return pts;
  }, [dayItems, placeMap]);

  const pointsCount = orderedLatLng.length;
  const canRoute = pointsCount >= 2;
  const center: LatLng = orderedLatLng[0] ?? [13.7563, 100.5018];

  // ---------------- OSRM compute ----------------
  const computeOsrm = async () => {
    if (orderedLatLng.length < 2) throw new Error("ต้องมีอย่างน้อย 2 สถานที่");

    const coordStr = orderedLatLng.map(([lat, lng]) => `${lng},${lat}`).join(";");

    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordStr}` +
      `?overview=full&geometries=geojson&steps=false`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

    const json = (await res.json()) as OsrmResponse;
    const r = json?.routes?.[0];
    if (!r) throw new Error("OSRM ไม่คืนค่าเส้นทาง");

    const pts = r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng);

    return {
      polylineLngLat: r.geometry.coordinates as number[][], // [lng,lat]
      pointsLatLng: pts, // [lat,lng]
      totalDistanceKm: r.distance / 1000,
      totalTravelMinutes: Math.round(r.duration / 60),
    };
  };

  // auto compute when points change
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setRouteError(null);
      setRouteInfo(null);
      setRoutePoints([]);

      if (orderedLatLng.length < 2) return;

      try {
        setRouteLoading(true);
        const r = await computeOsrm();
        if (cancelled) return;

        setRoutePoints(r.pointsLatLng);
        setRouteInfo({ km: r.totalDistanceKm, min: r.totalTravelMinutes });
      } catch (e: any) {
        if (!cancelled) setRouteError(e?.message ?? "โหลดเส้นทางไม่สำเร็จ");
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedLatLng]);

  const handleComputeAndSave = async () => {
    try {
      setRouteError(null);
      setRouteLoading(true);

      const r = await computeOsrm();

      setRoutePoints(r.pointsLatLng);
      setRouteInfo({ km: r.totalDistanceKm, min: r.totalTravelMinutes });

      await saveRoute({
        tripId,
        body: {
          dayIndex: selectedDay,
          transportMode: "driving",
          totalDistanceKm: r.totalDistanceKm,
          totalTravelMinutes: r.totalTravelMinutes,
          polyline: r.polylineLngLat,
        },
      }).unwrap();

      showSuccessOk(
        `บันทึกแล้ว ~${r.totalDistanceKm.toFixed(1)} กม., ${r.totalTravelMinutes} นาที`
      );
    } catch (e: any) {
      console.error(e);
      alert(e?.data?.errorMessages?.[0] ?? e?.message ?? "คำนวณ/บันทึกไม่สำเร็จ");
    } finally {
      setRouteLoading(false);
    }
  };

  // ---------------- Longdo map wiring ----------------
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerByPlaceId = useRef<Map<number, any>>(new Map());
  const polylineRef = useRef<any>(null);

  // init once
  useEffect(() => {
    if (!mapDivRef.current) return;
    const longdo = window.longdo;
    if (!longdo) return;
    if (mapRef.current) return;

    const map = new longdo.Map({ placeholder: mapDivRef.current });
    mapRef.current = map;

    map.Event.bind("ready", () => {
      map.location(toLonLat(center), true);
      map.zoom(12, true);
    });

    return () => {
      mapRef.current = null;
      markerByPlaceId.current.clear();
      polylineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep map centered when day changes
  useEffect(() => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;
    map.location(toLonLat(center), true);
  }, [center]);

  const markerModels = useMemo(() => {
    const firstId = dayItems[0]?.placeId;
    const lastId = dayItems[dayItems.length - 1]?.placeId;

    return dayItems
      .map((it, idx) => {
        const p = placeMap.get(it.placeId);
        if (!p) return null;
        if (typeof p.latitude !== "number" || typeof p.longitude !== "number")
          return null;

        const isStart = it.placeId === firstId;
        const isEnd = it.placeId === lastId;

        const badge = isStart ? "เริ่ม" : isEnd ? "จบ" : String(idx + 1);
        const tone: "start" | "end" | "num" = isStart ? "start" : isEnd ? "end" : "num";

        return {
          placeId: it.placeId,
          lat: p.latitude,
          lng: p.longitude,
          title: p?.name ?? `สถานที่ #${it.placeId}`,
          badge,
          tone,
        };
      })
      .filter(Boolean) as Array<{
      placeId: number;
      lat: number;
      lng: number;
      title: string;
      badge: string;
      tone: "start" | "end" | "num";
    }>;
  }, [dayItems, placeMap]);

  // render markers
  useEffect(() => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;

    // clear old
    for (const [, mk] of markerByPlaceId.current) map.Overlays.remove(mk);
    markerByPlaceId.current.clear();

    for (const m of markerModels) {
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

      mk.Event?.bind?.("click", () => navigate(`/placeDetails/${m.placeId}`));

      map.Overlays.add(mk);
      markerByPlaceId.current.set(m.placeId, mk);
    }
  }, [markerModels, navigate]);

  // render route polyline
  useEffect(() => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;

    if (polylineRef.current) {
      map.Overlays.remove(polylineRef.current);
      polylineRef.current = null;
    }

    if (!routePoints.length) return;

    const line = routePoints.map(([lat, lng]) => ({ lon: lng, lat }));
    const pl = new longdo.Polyline(line, { lineWidth: 6 });
    map.Overlays.add(pl);
    polylineRef.current = pl;
  }, [routePoints]);

  // hover -> zoom
  useEffect(() => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;
    if (!hoveredPlaceId) return;

    const mk = markerByPlaceId.current.get(hoveredPlaceId);
    if (!mk) return;

    const loc = mk.location?.() ?? mk._location;
    if (!loc) return;

    map.location(loc, true);
    map.zoom(Math.max(map.zoom(), 15), true);
  }, [hoveredPlaceId]);

  // controls
  const fitPoints = routePoints.length ? routePoints : orderedLatLng;

  const handleFit = () => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;
    if (!fitPoints.length) return;

    const { minLat, maxLat, minLng, maxLng } = calcBBox(fitPoints);
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const span = Math.max(maxLat - minLat, maxLng - minLng);

    map.location({ lon: midLng, lat: midLat }, true);
    map.zoom(clamp(zoomFromSpan(span), 3, 18), true);
  };

  const handleCenter = () => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;
    map.location(toLonLat(center), true);
    map.zoom(Math.max(map.zoom(), 12), true);
  };

  // ---------------- Render guards ----------------
  if (isLoading) return <Loading />;

  if (isError) {
    return (
      <div className="min-h-screen w-full px-4 py-10 bg-gray-50">
        <div className="max-w-4xl mx-auto border rounded-2xl p-6 text-rose-700 bg-white shadow-sm">
          <div className="font-bold text-lg">โหลดทริปไม่สำเร็จ</div>
          <div className="mt-1 text-sm text-gray-600">
            {(error as any)?.data?.errorMessages?.[0] ?? "unknown"}
          </div>
          <div className="mt-4 flex gap-2">
            <GhostBtn onClick={() => navigate(-1)}>← กลับ</GhostBtn>
            <GhostBtn onClick={() => refetch()}>↻ ลองใหม่</GhostBtn>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) return <div className="p-6">ไม่พบทริป</div>;

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header / Summary */}
      <div className="sticky top-0 z-[50] border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                แผนที่การเดินทาง
              </div>

              <div className="mt-1 flex items-center gap-3 min-w-0">
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 truncate">
                  {trip.title}
                </h1>
                <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                  วันที่ {selectedDay}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatPill
                  label="จุดวันนี้"
                  value={pointsCount}
                  tone={canRoute ? "blue" : "amber"}
                />

                {isPlacesLoading ? (
                  <StatPill label="พิกัด" value="กำลังโหลด..." tone="gray" />
                ) : !canRoute ? (
                  <StatPill label="เส้นทาง" value="ต้อง ≥ 2 จุด" tone="amber" />
                ) : routeLoading ? (
                  <StatPill label="เส้นทาง" value="กำลังคำนวณ..." tone="blue" />
                ) : routeInfo ? (
                  <>
                    <StatPill
                      label="ระยะทาง"
                      value={`~${routeInfo.km.toFixed(1)} กม.`}
                      tone="green"
                    />
                    <StatPill label="เวลา" value={`~${routeInfo.min} นาที`} tone="green" />
                  </>
                ) : (
                  <StatPill label="เส้นทาง" value="พร้อมคำนวณ" tone="gray" />
                )}

                {routeError && <StatPill label="ผิดพลาด" value={routeError} tone="red" />}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <GhostBtn onClick={() => navigate(`/trip/${tripId}/planner`)}>
                ← กลับไปวางแผน
              </GhostBtn>
              <GhostBtn onClick={() => navigate(`/trip/${tripId}`)}>
                ข้อมูลทริป
              </GhostBtn>

              <PrimaryBtn
                onClick={handleComputeAndSave}
                disabled={isSaving || routeLoading || !canRoute}
              >
                {isSaving || routeLoading ? "กำลังบันทึก..." : "บันทึกเส้นทางวันนี้"}
              </PrimaryBtn>
            </div>
          </div>

          {/* Day selector */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 mr-1">เลือกวัน:</span>
            {Array.from({ length: Math.max(maxDay, 1) }).map((_, i) => {
              const d = i + 1;
              const active = d === selectedDay;
              const count = itemsSorted.filter((x) => x.dayIndex === d).length;

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-blue-400"
                  }`}
                >
                  วัน {d}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-lg text-xs font-bold ${
                      active ? "bg-white/20" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: List */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="font-extrabold text-gray-900">
                  ลำดับการไป (วัน {selectedDay})
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  ชี้เมาส์เพื่อซูมบนแผนที่ / คลิกเพื่อดูรายละเอียด
                </div>
              </div>

              {dayItems.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-sm font-semibold text-gray-800">
                    ยังไม่มีสถานที่ในวันนี้
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    ไปที่หน้าวางแผนเพื่อเพิ่มสถานที่
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <ol className="space-y-2">
                    {dayItems.map((it, idx) => {
                      const p = placeMap.get(it.placeId);
                      const title = p?.name ?? `สถานที่ #${it.placeId}`;
                      const hasCoord =
                        typeof p?.latitude === "number" &&
                        typeof p?.longitude === "number";
                      const isStart = it.placeId === dayItems[0]?.placeId;
                      const isEnd = it.placeId === dayItems[dayItems.length - 1]?.placeId;

                      return (
                        <li key={it.tripItemId}>
                          <button
                            onMouseEnter={() => setHoveredPlaceId(it.placeId)}
                            onMouseLeave={() => setHoveredPlaceId(null)}
                            onClick={() => navigate(`/placeDetails/${it.placeId}`)}
                            className={`w-full text-left rounded-xl border p-3 transition flex gap-3 ${
                              hoveredPlaceId === it.placeId
                                ? "bg-blue-50 border-blue-300 shadow-sm"
                                : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm border-2 shrink-0 ${
                                !hasCoord
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : isStart
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isEnd
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {idx + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-gray-900 truncate">{title}</div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                                {isStart && (
                                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-semibold">
                                    เริ่มต้น
                                  </span>
                                )}
                                {isEnd && (
                                  <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-semibold">
                                    ปลายทาง
                                  </span>
                                )}
                                {!hasCoord && (
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-semibold">
                                    ไม่มีพิกัด
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 text-[11px] text-gray-500">
                                {hasCoord
                                  ? "พร้อมแสดงบนแผนที่"
                                  : "เพิ่ม latitude/longitude เพื่อแสดงบนแผนที่"}
                              </div>
                            </div>

                            <div className="text-gray-400 font-bold">›</div>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600">
                  <span className="font-semibold">ทิป:</span> จุดที่ไม่ขึ้นบนแผนที่มักเกิดจาก
                  ไม่มี Latitude/Longitude
                </div>
              </div>
            </div>
          </div>

          {/* Right: Map */}
          <div
            className={`lg:col-span-8 ${
              isFullscreen ? "fixed inset-0 z-[9999] bg-white p-2" : ""
            }`}
          >
            <div
              className={`rounded-3xl overflow-hidden border bg-white shadow-sm relative ${
                isFullscreen ? "h-full" : "h-[72vh]"
              }`}
            >
              {/* floating controls */}
              <div className="absolute z-20 top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={handleFit}
                  className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:border-blue-400"
                >
                  ซูมทั้งหมด
                </button>
                <button
                  onClick={handleCenter}
                  className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:border-blue-400"
                >
                  กลับจุดเริ่ม
                </button>
                <button
                  onClick={() => setIsFullscreen((v) => !v)}
                  className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:border-blue-400"
                >
                  {isFullscreen ? "ปิดเต็มจอ" : "เต็มจอ"}
                </button>
              </div>

              {/* status label */}
              <div className="absolute z-20 top-4 left-4">
                <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-2 shadow-sm">
                  <div className="text-xs font-extrabold text-gray-900">
                    {routePoints.length ? "เส้นทางพร้อมใช้งาน" : "แสดงเฉพาะจุด"}
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    ลาก/ซูมแผนที่ได้ตามต้องการ
                  </div>
                </div>
              </div>

              {/* map mount */}
              {window.longdo ? (
                <div ref={mapDivRef} className="h-full w-full" />
              ) : (
                <div className="h-full w-full flex items-center justify-center p-6">
                  <div className="max-w-md w-full rounded-2xl border p-4 bg-white">
                    <div className="font-bold text-red-700">
                      Longdo Map SDK ยังไม่ถูกโหลด
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      เพิ่ม script ใน <span className="font-mono">public/index.html</span>:
                      <div className="mt-2 rounded bg-gray-100 p-2 text-xs font-mono">
                        {"<script src=\"https://api.longdo.com/map3/?key=YOUR-KEY\"></script>"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isFullscreen && (
                <div className="absolute z-30 bottom-4 left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="rounded-full px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold shadow-lg hover:bg-gray-800"
                  >
                    ปิดโหมดเต็มจอ
                  </button>
                </div>
              )}
            </div>

            {/* bottom summary (hide on fullscreen) */}
            {!isFullscreen && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-600">สถานะ</div>
                  <div className="mt-1 font-extrabold text-gray-900">
                    {routeLoading
                      ? "กำลังคำนวณ..."
                      : canRoute
                      ? "พร้อมใช้งาน"
                      : "ต้องเพิ่มจุด ≥ 2"}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-600">จุดที่มีพิกัด</div>
                  <div className="mt-1 font-extrabold text-gray-900">
                    {orderedLatLng.length} จุด
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-600">การบันทึก</div>
                  <div className="mt-1 font-extrabold text-gray-900">
                    {isSaving ? "กำลังบันทึก..." : "กดปุ่มบันทึกเส้นทางด้านบน"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
