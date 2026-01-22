import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetTripDetailQuery, useDeleteTripMutation } from "../tripApi";
import { usePlacesByIds } from "../hooks/usePlacesByIds";

import { useLazyGetPlaceOpeningQuery } from "../../placeOpening/placeOpenApi";
import type { PlaceType as OpeningHourDto } from "../../placeOpening/placetype";
import { formatThaiDateTime } from "../../../utils";

import type { TripDetail } from "../components/detail/types";
import { toHHMM, getTripDayOfWeek } from "../components/detail/helpers";

import { TripDetailTopNav } from "../components/detail/TripDetailTopNav";
import { TripDetailSummaryCard } from "../components/detail/TripDetailSummaryCard";
import { TripDetailTabs } from "../components/detail/TripDetailTabs";
import { TripItemsPanel } from "../components/detail/TripItemsPanel";
import { TripSegmentsPanel } from "../components/detail/TripSegmentsPanel";

export default function TripDetailPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();

  const baseSkip = !Number.isFinite(tripId) || tripId <= 0;

  const { data, isLoading, isError, error, refetch } = useGetTripDetailQuery(tripId, {
    skip: baseSkip,
  }) as {
    data?: TripDetail;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch?: () => any;
  };

  const [deleteTrip, { isLoading: isDeleting }] = useDeleteTripMutation();

  const [tab, setTab] = useState<"items" | "segments">("items");
  const [dayFilter, setDayFilter] = useState<number>(0); // 0 = all

  const handleDelete = async () => {
    const ok = window.confirm("ลบทริปนี้ใช่ไหม? (ลบแล้วกู้คืนไม่ได้)");
    if (!ok) return;

    try {
      await deleteTrip(tripId).unwrap();
      navigate("/trip");
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.errorMessages?.[0] ?? "ลบทริปไม่สำเร็จ");
    }
  };

  const itemsSorted = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .slice()
      .sort(
        (a, b) =>
          (a.dayIndex ?? 1) - (b.dayIndex ?? 1) ||
          (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      );
  }, [data?.items]);

  const days = useMemo(() => {
    const max = itemsSorted.length
      ? Math.max(...itemsSorted.map((x) => x.dayIndex || 1))
      : 1;
    return Array.from({ length: Math.max(max, 1) }, (_, i) => i + 1);
  }, [itemsSorted]);

  const countByDay = useMemo(() => {
    const m = new Map<number, number>();
    for (const it of itemsSorted) {
      const d = it.dayIndex ?? 1;
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return m;
  }, [itemsSorted]);

  const filteredItems = useMemo(() => {
    if (dayFilter === 0) return itemsSorted;
    return itemsSorted.filter((x) => x.dayIndex === dayFilter);
  }, [itemsSorted, dayFilter]);

  const placeIds = useMemo(() => {
    const ids = itemsSorted.map((x) => x.placeId);
    return Array.from(new Set(ids));
  }, [itemsSorted]);

  const { map: placeMap, isLoading: isPlacesLoading } = usePlacesByIds(placeIds);

  const [triggerOpening] = useLazyGetPlaceOpeningQuery();
  const [openingByPlace, setOpeningByPlace] = useState<Map<number, OpeningHourDto[]>>(
    () => new Map()
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!placeIds.length) {
        if (!cancelled) setOpeningByPlace(new Map());
        return;
      }

      const needFetch = placeIds.filter((pid) => !openingByPlace.has(pid));
      if (!needFetch.length) return;

      const results: Array<readonly [number, OpeningHourDto[]]> = await Promise.all(
        needFetch.map(async (pid) => {
          try {
            const list = await triggerOpening(pid, true).unwrap();
            return [pid, list] as const;
          } catch {
            return [pid, [] as OpeningHourDto[]] as const;
          }
        })
      );

      if (cancelled) return;

      setOpeningByPlace((prev) => {
        const next = new Map(prev);
        for (const [pid, list] of results) next.set(pid, list);
        return next;
      });
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeIds, triggerOpening]);

  const itemById = useMemo(() => {
    const m = new Map<number, { order: number; day: number; placeId: number; name: string }>();
    for (const it of itemsSorted) {
      const p: any = placeMap.get(it.placeId);
      m.set(it.tripItemId, {
        order: it.orderIndex ?? 0,
        day: it.dayIndex ?? 1,
        placeId: it.placeId,
        name: p?.name ?? `Place #${it.placeId}`,
      });
    }
    return m;
  }, [itemsSorted, placeMap]);

  const segTotals = useMemo(() => {
    const segs = data?.segments ?? [];
    const km = segs.reduce((a, s) => a + (s.distanceKm ?? 0), 0);
    const min = segs.reduce((a, s) => a + (s.travelMinutes ?? 0), 0);
    return { km, min };
  }, [data?.segments]);

  const filteredSegments = useMemo(() => {
    const segs = data?.segments ?? [];
    if (dayFilter === 0) return segs;
    return segs.filter((s) => {
      const from = itemById.get(s.fromTripItemId);
      return (from?.day ?? 0) === dayFilter;
    });
  }, [data?.segments, dayFilter, itemById]);

  const renderOpeningText = (placeId: number, dayIndex: number) => {
    const dow = getTripDayOfWeek(data?.startDateTime ?? null, dayIndex);
    const list = openingByPlace.get(placeId) ?? [];
    const oh = dow == null ? null : list.find((x) => (x as any).dayOfWeek === dow);

    if (!oh) return "ไม่ระบุ";
    if ((oh as any).isClosed) return "ปิดทำการ";
    return `${toHHMM((oh as any).openTime)} - ${toHHMM((oh as any).closeTime)} น.`;
  };

  // ----- states -----
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border rounded-2xl shadow-sm p-6 text-center">
          <div className="w-10 h-10 mx-auto border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-3 text-gray-600 font-medium">กำลังโหลดข้อมูลทริป...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border rounded-2xl shadow-sm p-8 max-w-md w-full">
          <div className="text-4xl">⚠️</div>
          <div className="mt-2 text-xl font-extrabold text-gray-900">โหลดไม่สำเร็จ</div>
          <div className="mt-2 text-sm text-rose-700">
            {(error as any)?.data?.errorMessages?.[0] ?? "เกิดข้อผิดพลาดที่ไม่รู้จัก"}
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => navigate("/trip")}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 font-semibold"
            >
              ← กลับ
            </button>
            <button
              onClick={() => refetch?.()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              ↻ ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-5xl">🔍</div>
          <div className="mt-2 text-xl font-extrabold text-gray-900">ไม่พบทริป</div>
          <div className="mt-2 text-sm text-gray-600">ไม่พบข้อมูลทริปที่คุณค้นหา</div>
          <button
            onClick={() => navigate("/trip")}
            className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            กลับไปหน้าทริป
          </button>
        </div>
      </div>
    );
  }

  const totalPlaces = data.items.length;
  const totalSegments = data.segments.length;
  const totalDays = days.length;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-white px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <TripDetailTopNav
          tripId={tripId}
          onBack={() => navigate("/trip")}
          onGoMap={() => navigate(`/trip/${tripId}/map`)}
          onGoPlanner={() => navigate(`/trip/${tripId}/planner`)}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <TripDetailSummaryCard
              title={data.title}
              description={data.description}
              startText={data.startDateTime ? formatThaiDateTime(data.startDateTime) : "-"}
              endText={data.endDateTime ? formatThaiDateTime(data.endDateTime) : "-"}
              totalDays={totalDays}
              totalPlaces={totalPlaces}
              totalSegments={totalSegments}
              totalKmText={`${segTotals.km.toFixed(1)} กม.`}
              totalMinText={`${segTotals.min} นาที`}
              isPlacesLoading={isPlacesLoading}
              isDeleting={isDeleting}
              onDelete={handleDelete}
            />
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
              <TripDetailTabs
                tab={tab}
                onTab={setTab}
                dayFilter={dayFilter}
                onDay={setDayFilter}
                days={days}
                countByDay={countByDay}
              />

              <div className="p-5">
                {tab === "items" ? (
                  <TripItemsPanel
                    tripId={tripId}
                    itemsAllCount={data.items.length}
                    filteredItems={filteredItems}
                    dayFilter={dayFilter}
                    placeMap={placeMap}
                    renderOpeningText={renderOpeningText}
                    onGoPlanner={() => navigate(`/trip/${tripId}/planner`)}
                    onGoPlace={(placeId) => navigate(`/placeDetails/${placeId}`)}
                  />
                ) : (
                  <TripSegmentsPanel
                    tripId={tripId}
                    segmentsAllCount={data.segments.length}
                    filteredSegments={filteredSegments}
                    dayFilter={dayFilter}
                    itemById={itemById}
                    onGoMap={() => navigate(`/trip/${tripId}/map`)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}
