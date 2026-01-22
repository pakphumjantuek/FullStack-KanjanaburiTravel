import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetTripDetailQuery,
  useSaveRouteMutation,
} from "../tripApi";
import { usePlacesByIds } from "../hooks/usePlacesByIds";

type LatLng = [number, number];

type OsrmResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: Array<[number, number]>; type: "LineString" };
  }>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function useTripMapController(tripId: number) {
  const navigate = useNavigate();

  const { data: trip, isLoading, isError, error, refetch } = useGetTripDetailQuery(tripId, {
    skip: !Number.isFinite(tripId) || tripId <= 0,
  });

  const [saveRoute, { isLoading: isSaving }] = useSaveRouteMutation();

  const [selectedDay, setSelectedDay] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [onlyWithCoords, setOnlyWithCoords] = useState(true);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<number | null>(null);

  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ km: number; min: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // ---- items sorted / max day ----
  const itemsSorted = useMemo(() => {
    const items = trip?.items ?? [];
    return items.slice().sort((a: any, b: any) => (a.dayIndex ?? 1) - (b.dayIndex ?? 1) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [trip?.items]);

  const maxDay = useMemo(() => {
    if (!itemsSorted.length) return 1;
    return Math.max(...itemsSorted.map((x: any) => x.dayIndex ?? 1));
  }, [itemsSorted]);

  useEffect(() => {
    setSelectedDay((d) => clamp(d, 1, maxDay));
  }, [maxDay]);

  // ---- day items ----
  const dayItemsRaw = useMemo(() => {
    return itemsSorted.filter((x: any) => (x.dayIndex ?? 1) === selectedDay);
  }, [itemsSorted, selectedDay]);

  const placeIds = useMemo(() => dayItemsRaw.map((x: any) => x.placeId), [dayItemsRaw]);
  const { map: placeMap } = usePlacesByIds(placeIds);

  const dayItems = useMemo(() => {
    if (!onlyWithCoords) return dayItemsRaw;
    return dayItemsRaw.filter((it: any) => {
      const p: any = placeMap.get(it.placeId);
      return typeof p?.latitude === "number" && typeof p?.longitude === "number";
    });
  }, [dayItemsRaw, onlyWithCoords, placeMap]);

  const coordStats = useMemo(() => {
    let withCoords = 0;
    let withoutCoords = 0;
    for (const it of dayItemsRaw) {
      const p: any = placeMap.get(it.placeId);
      const ok = typeof p?.latitude === "number" && typeof p?.longitude === "number";
      if (ok) withCoords++;
      else withoutCoords++;
    }
    return { total: dayItemsRaw.length, withCoords, withoutCoords };
  }, [dayItemsRaw, placeMap]);

  // ordered points
  const orderedLatLng = useMemo(() => {
    const pts: LatLng[] = [];
    for (const it of dayItems) {
      const p: any = placeMap.get(it.placeId);
      if (!p) continue;
      if (typeof p.latitude === "number" && typeof p.longitude === "number") {
        pts.push([p.latitude, p.longitude]);
      }
    }
    return pts;
  }, [dayItems, placeMap]);

  const canRoute = orderedLatLng.length >= 2;

  // default center
  const center: LatLng = orderedLatLng[0] ?? [13.7563, 100.5018];

  // ---- markers model ----
  const markerModels = useMemo(() => {
    const firstId = dayItems[0]?.placeId;
    const lastId = dayItems[dayItems.length - 1]?.placeId;

    return dayItems
      .map((it: any, idx: number) => {
        const p: any = placeMap.get(it.placeId);
        if (!p) return null;
        if (typeof p.latitude !== "number" || typeof p.longitude !== "number") return null;

        const isStart = it.placeId === firstId;
        const isEnd = it.placeId === lastId;

        const badge = isStart ? "เริ่ม" : isEnd ? "จบ" : String(idx + 1);

        return {
          placeId: it.placeId,
          lat: p.latitude,
          lng: p.longitude,
          title: p?.name ?? `สถานที่ #${it.placeId}`,
          badge,
          tone: isStart ? "start" : isEnd ? "end" : "num",
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

  // ---- OSRM compute ----
  const computeOsrm = useCallback(async () => {
    if (orderedLatLng.length < 2) throw new Error("ต้องมีอย่างน้อย 2 สถานที่ที่มีพิกัด");

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
  }, [orderedLatLng]);

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
  }, [orderedLatLng, computeOsrm]);

  // ✅ THIS IS THE MISSING METHOD
  const handleComputeAndSave = useCallback(async () => {
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
    } catch (e: any) {
      console.error(e);
      setRouteError(e?.data?.errorMessages?.[0] ?? e?.message ?? "คำนวณ/บันทึกไม่สำเร็จ");
    } finally {
      setRouteLoading(false);
    }
  }, [computeOsrm, saveRoute, tripId, selectedDay]);

  const saveDisabledReason = !canRoute
    ? onlyWithCoords
      ? "ต้องมีอย่างน้อย 2 สถานที่ที่มีพิกัด"
      : "ต้องมีอย่างน้อย 2 สถานที่"
    : routeLoading
    ? "กำลังคำนวณเส้นทาง"
    : isSaving
    ? "กำลังบันทึก"
    : undefined;

  const dayCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const it of itemsSorted as any[]) m.set(it.dayIndex ?? 1, (m.get(it.dayIndex ?? 1) ?? 0) + 1);
    return m;
  }, [itemsSorted]);

  const goPlace = useCallback(
    (placeId: number) => navigate(`/placeDetails/${placeId}`),
    [navigate]
  );

  return {
    // query
    trip,
    isLoading,
    isError,
    error,
    refetch,

    // ui state
    selectedDay,
    setSelectedDay,
    isFullscreen,
    setIsFullscreen,
    onlyWithCoords,
    setOnlyWithCoords,
    hoveredPlaceId,
    setHoveredPlaceId,

    // derived data
    itemsSorted,
    maxDay,
    dayCounts,
    dayItemsRaw,
    dayItems,
    placeMap,
    coordStats,
    orderedLatLng,
    center,
    canRoute,
    markerModels,

    // route
    routePoints,
    routeInfo,
    routeLoading,
    routeError,

    // actions
    handleComputeAndSave,
    isSaving,
    saveDisabledReason,
    goPlace,
  };
}
