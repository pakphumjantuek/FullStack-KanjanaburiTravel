// src/features/trip/pages/TripPlannerPage.tsx
import  { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Loading } from "../../../components/Loading";
import { showSuccessOk, confirmDelete } from "../../../utils";

import {
  useGetTripDetailQuery,
  useDeleteTripItemMutation,
  useReorderTripItemsMutation,
  useGetTripSegmentsQuery,
} from "../tripApi";

import { usePlacesByIds } from "../hooks/usePlacesByIds";
import type { TripDetailDto } from "../tripTypes";

import { useLazyGetPlaceOpeningQuery } from "../../placeOpening/placeOpenApi";
import type { PlaceType as OpeningHourDto } from "../../placeOpening/placetype";

import PlannerDayTabs from "../components/planner/PlannerDayTabs";
import PlannerList from "../components/planner/PlannerList";
import PlannerTimeline from "../components/planner/PlannerTimeline";

import {
  buildTimeline,
  summarizeIssues,
  clamp,
  safeTripResult,
  sortItems,
  hhmmFromDateTime,
  swapReorderPayload,
  type PlaceLite,
} from "../components/planner/timeline";

import { openingText as openingTextFn } from "../components/planner/opening";

export default function TripPlannerPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const navigate = useNavigate();

  const baseSkip = !Number.isFinite(tripId) || tripId <= 0;

  const { data, isLoading, isError, error, refetch } = useGetTripDetailQuery(tripId, {
    skip: baseSkip,
  });

  const trip = safeTripResult(data) as TripDetailDto | undefined;

  const [removeTripItem, { isLoading: isRemoving }] = useDeleteTripItemMutation();
  const [reorderTripItems, { isLoading: isReordering }] = useReorderTripItemsMutation();

  const itemsSorted = useMemo(() => sortItems(trip), [trip]);
  const maxDay = useMemo(
    () => (itemsSorted.length ? Math.max(...itemsSorted.map((x) => x.dayIndex || 1)) : 1),
    [itemsSorted]
  );

  const [selectedDay, setSelectedDay] = useState(1);
  useEffect(() => setSelectedDay((d) => clamp(d, 1, maxDay)), [maxDay]);

  const dayItems = useMemo(
    () => itemsSorted.filter((x) => x.dayIndex === selectedDay),
    [itemsSorted, selectedDay]
  );

  const placeIds = useMemo(() => Array.from(new Set(dayItems.map((x) => x.placeId))), [dayItems]);
  const { map: placeMapRaw, isLoading: isPlacesLoading } = usePlacesByIds(placeIds);

  const placeMap = useMemo(() => {
    const m = new Map<number, PlaceLite>();
    for (const [pid, p] of placeMapRaw.entries()) {
      m.set(pid, {
        placeId: pid,
        name: (p as any)?.name ?? `Place #${pid}`,
        avgVisitMinutes: (p as any)?.avgVisitMinutes ?? null,
      });
    }
    return m;
  }, [placeMapRaw]);

  const dayBaseDate = useMemo(() => {
    const base = trip?.startDateTime ? new Date(trip.startDateTime) : new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + (selectedDay - 1));
    return base;
  }, [selectedDay, trip?.startDateTime]);

  const startTimeHHMM = useMemo(
    () => hhmmFromDateTime(trip?.startDateTime ?? null, "09:00"),
    [trip?.startDateTime]
  );

  const tripEndAt = useMemo(() => {
    if (!trip?.endDateTime) return null;
    const end = new Date(trip.endDateTime);
    return Number.isNaN(end.getTime()) ? null : end;
  }, [trip?.endDateTime]);

  const { data: segments = [] } = useGetTripSegmentsQuery(
    { tripId, dayIndex: selectedDay },
    { skip: baseSkip }
  );

  // opening hours cache (no hook order issue)
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

  const timeline = useMemo(
    () =>
      buildTimeline({
        dayBaseDate,
        startTimeHHMM,
        tripStart: trip?.startDateTime ?? null,
        tripEndAt,
        items: dayItems,
        places: placeMap,
        segments,
        openingByPlace,
      }),
    [
      dayBaseDate,
      startTimeHHMM,
      trip?.startDateTime,
      tripEndAt,
      dayItems,
      placeMap,
      segments,
      openingByPlace,
    ]
  );

  const issuesSummary = useMemo(() => summarizeIssues(timeline.rows), [timeline.rows]);

  const overTripEndMinutes = useMemo(() => {
    if (!tripEndAt || timeline.rows.length === 0) return 0;
    const last = timeline.rows[timeline.rows.length - 1];
    const diffMs = last.departAt.getTime() - tripEndAt.getTime();
    return diffMs > 0 ? Math.ceil(diffMs / 60_000) : 0;
  }, [timeline.rows, tripEndAt]);

  const openingText = (placeId: number) =>
    openingTextFn({
      openingByPlace,
      placeId,
      tripStart: trip?.startDateTime ?? null,
      dayIndex: selectedDay,
    });

  // actions
  const onRemove = async (tripItemId: number) => {
    const ok = await confirmDelete();
    if (!ok) return;

    try {
      await removeTripItem({ tripId, tripItemId }).unwrap();
      showSuccessOk("ลบออกจากทริปแล้ว");
    } catch (e: any) {
      alert(e?.data?.errorMessages?.[0] ?? "ลบไม่สำเร็จ");
    }
  };

  const onMove = async (tripItemId: number, dir: "up" | "down") => {
    const idx = dayItems.findIndex((x) => x.tripItemId === tripItemId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= dayItems.length) return;

    try {
      await reorderTripItems({
        tripId,
        body: { dayIndex: selectedDay, items: swapReorderPayload(dayItems, idx, swapIdx) },
      }).unwrap();
      showSuccessOk("จัดลำดับแล้ว");
    } catch (e: any) {
      alert(e?.data?.errorMessages?.[0] ?? "จัดลำดับไม่สำเร็จ");
    }
  };

  // render guards (NO hooks here)
  if (isLoading) return <Loading />;

  if (isError) {
    return (
      <div className="min-h-screen w-full px-4 py-8">
        <div className="max-w-4xl mx-auto border rounded-xl p-5 text-red-600">
          โหลดทริปไม่สำเร็จ: {(error as any)?.data?.errorMessages?.[0] ?? "unknown"}
          <div className="mt-3 flex gap-2">
            <button className="px-4 py-2 rounded-lg border" onClick={() => navigate(-1)}>
              กลับ
            </button>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={() => refetch()}>
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) return <div className="p-6">ไม่พบทริป</div>;

  return (
    <div className="min-h-screen w-full px-4 py-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-xl font-bold text-gray-900">วางแผนการเดินทาง</div>
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-semibold text-blue-700">{trip.title}</span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-gray-500">ทริป #{trip.tripId}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/trip/${tripId}/map`)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                แผนที่และเส้นทาง
              </button>
              <button
                onClick={() => navigate(`/trip/${tripId}`)}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:border-blue-600 hover:text-blue-700"
              >
                ข้อมูลทริป
              </button>
            </div>
          </div>
        </div>

        <PlannerDayTabs
          maxDay={maxDay}
          selectedDay={selectedDay}
          itemsSorted={itemsSorted}
          onSelectDay={setSelectedDay}
          rightText={isPlacesLoading ? "กำลังโหลด..." : `วันนี้มี ${dayItems.length} สถานที่`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlannerList
            tripId={tripId}
            selectedDay={selectedDay}
            dayItems={dayItems}
            placeMap={placeMap}
            isRemoving={isRemoving}
            isReordering={isReordering}
            openingText={openingText}
            onAddPlace={() => navigate("/places")}
            onOpenPlace={(placeId) => navigate(`/placeDetails/${placeId}`)}
            onMove={onMove}
            onRemove={onRemove}
          />

          <PlannerTimeline
            selectedDay={selectedDay}
            startTimeHHMM={startTimeHHMM}
            rows={timeline.rows}
            startAt={timeline.startAt}
            totalStay={timeline.totalStay}
            totalTravel={timeline.totalTravel}
            issuesSummary={issuesSummary}
            overTripEndMinutes={overTripEndMinutes}
          />
        </div>
      </div>
    </div>
  );
}
