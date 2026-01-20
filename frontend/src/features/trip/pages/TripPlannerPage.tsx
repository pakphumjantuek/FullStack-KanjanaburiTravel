// src/features/trip/pages/TripPlannerPage.tsx
import { useEffect, useMemo, useState } from "react";
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
import type { TripDetailDto, TripItemDto, TripSegmentDto } from "../tripTypes";

import { useLazyGetPlaceOpeningQuery } from "../../placeOpening/placeOpenApi";
import type { PlaceType as OpeningHourDto } from "../../placeOpening/placetype";

// -------------------- types --------------------
type PlaceLite = {
  placeId: number;
  name: string;
  avgVisitMinutes?: number | null;
};

type TimelineRowStatus =
  | "ok"
  | "arrive_before_open"
  | "arrive_after_close"
  | "stay_exceed_close"
  | "closed"
  | "exceed_trip_end";

type TimelineRow = {
  tripItemId: number;
  placeId: number;
  name: string;

  arriveAt: Date;
  departAt: Date;

  stayMinutes: number;
  travelFromPrevMinutes: number;

  openAt?: Date;
  closeAt?: Date;

  isClosed?: boolean;
  status: TimelineRowStatus;

  // ✅ นาทีที่ departAt เกิน Trip.EndDateTime
  exceedTripEndMinutes?: number;
};

// -------------------- helpers --------------------
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// รองรับ "09:00", "09:00:00", "09:00:00.0000000"
const toHHMM = (t?: string | null) => {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length < 2) return null;
  const hh = (parts[0] ?? "00").padStart(2, "0");
  const mm = (parts[1] ?? "00").padStart(2, "0");
  return `${hh}:${mm}`;
};

const hhmmFromDateTime = (dt?: string | null, fallback = "09:00") => {
  if (!dt) return fallback;
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return fallback;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const atDayTime = (day: Date, hhmm: string) => {
  const [hh, mm] = hhmm.split(":").map((n) => Number(n));
  const d = new Date(day);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
};

const fmtHHMM = (d: Date) =>
  d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

const safeTripResult = (d: any) => d?.result ?? d;

const sortItems = (trip?: TripDetailDto) =>
  (trip?.items ?? [])
    .slice()
    .sort(
      (a, b) =>
        (a.dayIndex ?? 1) - (b.dayIndex ?? 1) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    );

const swapReorderPayload = (items: TripItemDto[], idx: number, swapIdx: number) => {
  const reordered = items.slice();
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
  return reordered.map((it, i) => ({ tripItemId: it.tripItemId, orderIndex: i + 1 }));
};

// dayOfWeek 0-6 ของ “วันในทริป” (ใช้ startDateTime ของ trip)
const dayOfWeekFromTripDay = (tripStart?: string | null, dayIndex?: number | null) => {
  if (!tripStart) return null;
  const start = new Date(tripStart);
  if (Number.isNaN(start.getTime())) return null;

  const offset = Math.max((dayIndex ?? 1) - 1, 0);
  const d = new Date(start);
  d.setDate(d.getDate() + offset);
  return d.getDay(); // 0-6
};

const getOpeningForTripDay = (
  openingByPlace: Map<number, OpeningHourDto[]>,
  placeId: number,
  tripStart: string | null | undefined,
  dayIndex: number
) => {
  const dow = dayOfWeekFromTripDay(tripStart, dayIndex);
  if (dow == null) return null;
  const list = openingByPlace.get(placeId) ?? [];
  return list.find((x) => x.dayOfWeek === dow) ?? null;
};

// -------------------- timeline builder --------------------
function buildTimeline(params: {
  dayBaseDate: Date;
  startTimeHHMM: string;
  tripStart?: string | null;
  tripEndAt?: Date | null;

  items: TripItemDto[];
  places: Map<number, PlaceLite>;
  segments?: TripSegmentDto[];
  openingByPlace: Map<number, OpeningHourDto[]>;
}) {
  const {
    dayBaseDate,
    startTimeHHMM,
    tripStart,
    tripEndAt,
    items,
    places,
    segments = [],
    openingByPlace,
  } = params;

  const segMap = new Map<string, TripSegmentDto>();
  for (const s of segments) segMap.set(`${s.fromTripItemId}->${s.toTripItemId}`, s);

  const startAt = atDayTime(dayBaseDate, startTimeHHMM);
  let cursor = new Date(startAt);

  const rows: TimelineRow[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const p = places.get(it.placeId);

    // travel
    const prev = items[i - 1];
    let travelMin = 0;
    if (prev) {
      const seg = segMap.get(`${prev.tripItemId}->${it.tripItemId}`);
      travelMin = seg?.travelMinutes ?? 0;
      cursor = new Date(cursor.getTime() + travelMin * 60_000);
    }

    const arriveAt = new Date(cursor);

    // stay
    const stayMinutes = Math.max(10, p?.avgVisitMinutes ?? 60);
    const departAt = new Date(arriveAt.getTime() + stayMinutes * 60_000);

    // opening hours (ตามวันในทริป)
    const oh = getOpeningForTripDay(openingByPlace, it.placeId, tripStart, it.dayIndex);
    const isClosed = Boolean(oh?.isClosed);

    const openHHMM = toHHMM(oh?.openTime ?? null);
    const closeHHMM = toHHMM(oh?.closeTime ?? null);

    const openAt = !isClosed && openHHMM ? atDayTime(dayBaseDate, openHHMM) : undefined;
    let closeAt = !isClosed && closeHHMM ? atDayTime(dayBaseDate, closeHHMM) : undefined;

    // รองรับปิดข้ามเที่ยงคืน (18:00-02:00)
    if (openAt && closeAt && closeAt < openAt) {
      closeAt = new Date(closeAt);
      closeAt.setDate(closeAt.getDate() + 1);
    }

    // ---- status ----
    let status: TimelineRowStatus = "ok";

    if (isClosed) {
      status = "closed";
    } else {
      if (openAt && arriveAt < openAt) status = "arrive_before_open";
      if (closeAt && arriveAt > closeAt) status = "arrive_after_close";
      if (closeAt && arriveAt <= closeAt && departAt > closeAt) status = "stay_exceed_close";
    }

    // ---- exceed trip end minutes ----
    let exceedTripEndMinutes: number | undefined;
    if (tripEndAt) {
      const diffMs = departAt.getTime() - tripEndAt.getTime();
      if (diffMs > 0) exceedTripEndMinutes = Math.ceil(diffMs / 60_000);
    }

    // ถ้าเกินเวลาสิ้นสุดทริป ให้ override เป็นสถานะนี้ (แบบ B: ไม่ตัด)
    if (!isClosed && tripEndAt && departAt > tripEndAt) {
      status = "exceed_trip_end";
    }

    rows.push({
      tripItemId: it.tripItemId,
      placeId: it.placeId,
      name: p?.name ?? `Place #${it.placeId}`,
      arriveAt,
      departAt,
      stayMinutes,
      travelFromPrevMinutes: travelMin,
      openAt,
      closeAt,
      isClosed,
      status,
      exceedTripEndMinutes,
    });

    cursor = new Date(departAt);
  }

  return {
    rows,
    totalStay: rows.reduce((a, r) => a + r.stayMinutes, 0),
    totalTravel: rows.reduce((a, r) => a + r.travelFromPrevMinutes, 0),
    startAt,
  };
}

// -------------------- component --------------------
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

  // -------- items/day --------
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

  // dedupe placeIds
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

  // ✅ dayBaseDate: ยึดวันเริ่มทริปจริง + offset
  const dayBaseDate = useMemo(() => {
    const base = trip?.startDateTime ? new Date(trip.startDateTime) : new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + (selectedDay - 1));
    return base;
  }, [selectedDay, trip?.startDateTime]);

  // ✅ startTime: ใช้เวลาจริงของทริป (เวลาเริ่มใน DB)
  const startTimeHHMM = useMemo(
    () => hhmmFromDateTime(trip?.startDateTime ?? null, "09:00"),
    [trip?.startDateTime]
  );

  // ✅ tripEndAt (เอาไปใช้เช็คเกินเวลา)
  const tripEndAt = useMemo(() => {
    if (!trip?.endDateTime) return null;
    const end = new Date(trip.endDateTime);
    if (Number.isNaN(end.getTime())) return null;
    return end;
  }, [trip?.endDateTime]);

  // -------- segments --------
  const { data: segments = [] } = useGetTripSegmentsQuery(
    { tripId, dayIndex: selectedDay },
    { skip: baseSkip }
  );

  // -------- openingHours per place --------
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

      // fetch เฉพาะที่ยังไม่มีใน cache
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
  }, [placeIds, triggerOpening]); // ตั้งใจไม่ใส่ openingByPlace กัน loop

  // -------- timeline --------
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

  // ✅ สรุปเกินเวลาทริป (จากแถวสุดท้าย)
  const overTripEndMinutes = useMemo(() => {
    if (!tripEndAt || timeline.rows.length === 0) return 0;
    const last = timeline.rows[timeline.rows.length - 1];
    const diffMs = last.departAt.getTime() - tripEndAt.getTime();
    return diffMs > 0 ? Math.ceil(diffMs / 60_000) : 0;
  }, [timeline.rows, tripEndAt]);

  // -------------------- actions --------------------
  const handleRemove = async (tripItemId: number) => {
    const ok = await confirmDelete();
    if (!ok) return;

    try {
      await removeTripItem({ tripId, tripItemId }).unwrap();
      showSuccessOk("ลบออกจากทริปแล้ว");
    } catch (e: any) {
      alert(e?.data?.errorMessages?.[0] ?? "ลบไม่สำเร็จ");
    }
  };

  const handleMove = async (tripItemId: number, dir: "up" | "down") => {
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

  // -------------------- renders --------------------
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

  const openingText = (placeId: number) => {
    const oh = getOpeningForTripDay(openingByPlace, placeId, trip.startDateTime ?? null, selectedDay);
    if (!oh) return "เวลาเปิดทำการ: ไม่ระบุ";
    if (oh.isClosed) return "เวลาเปิดทำการ: ปิดทำการ";
    return `เวลาเปิดทำการ: ${toHHMM(oh.openTime) ?? "-"} - ${toHHMM(oh.closeTime) ?? "-"} น.`;
  };

  const statusBadge = (r: TimelineRow) => {
    if (r.status === "ok") return null;

    if (r.status === "exceed_trip_end") {
      return (
        <span className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white">
          เกินเวลาทริป {r.exceedTripEndMinutes ?? 0} นาที
        </span>
      );
    }

    const text =
      r.status === "arrive_before_open"
        ? "ยังไม่เปิดทำการ"
        : r.status === "arrive_after_close"
        ? "ปิดทำการแล้ว"
        : r.status === "stay_exceed_close"
        ? "เที่ยวเกินเวลาปิด"
        : "ปิดทำการ";

    const cls =
      r.status === "arrive_before_open"
        ? "bg-amber-600 text-white"
        : r.status === "arrive_after_close" || r.status === "stay_exceed_close"
        ? "bg-red-600 text-white"
        : "bg-gray-600 text-white";

    return <span className={`px-3 py-1.5 rounded text-xs font-semibold ${cls}`}>{text}</span>;
  };

  return (
    <div className="min-h-screen w-full px-4 py-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xl font-bold text-gray-900">วางแผนการเดินทาง</div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-blue-700">{trip.title}</span>
                <span className="text-gray-400 mx-2">|</span>
                <span className="text-gray-500">รหัสทริป #{trip.tripId}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ช่วงเวลาในทริป:{" "}
                <span className="font-medium text-gray-700">{fmtHHMM(new Date(trip.startDateTime))}</span> -{" "}
                <span className="font-medium text-gray-700">{tripEndAt ? fmtHHMM(tripEndAt) : "-"}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/trip/${tripId}/map`)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                แผนที่และเส้นทาง
              </button>
              <button
                onClick={() => navigate(`/trip/${tripId}`)}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:border-blue-600 hover:text-blue-700"
              >
                ข้อมูลทริป
              </button>
            </div>
          </div>
        </div>

        {/* Day tabs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm font-semibold text-gray-800">เลือกวันที่:</div>

            <div className="flex flex-wrap gap-2 flex-1">
              {Array.from({ length: Math.max(maxDay, 1) }, (_, i) => {
                const d = i + 1;
                const active = d === selectedDay;
                const count = itemsSorted.filter((x) => x.dayIndex === d).length;

                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    วันที่ {d} <span className="ml-2 text-xs opacity-90">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="text-sm text-gray-700 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-300">
              {isPlacesLoading ? "กำลังโหลด..." : `ทั้งหมด ${dayItems.length} สถานที่`}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: List */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-lg font-bold text-gray-900">รายการสถานที่</div>
                <div className="text-xs text-gray-600">วันที่ {selectedDay}</div>
              </div>

              <button
                onClick={() => navigate("/places")}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                เพิ่มสถานที่
              </button>
            </div>

            {dayItems.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                <div className="text-gray-800 font-semibold">ยังไม่มีสถานที่ในวันนี้</div>
                <div className="text-sm text-gray-600 mt-1">กด “เพิ่มสถานที่” เพื่อเริ่มวางแผน</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {dayItems.map((it, idx) => {
                  const p = placeMap.get(it.placeId);
                  const name = p?.name ?? `Place #${it.placeId}`;

                  return (
                    <div key={it.tripItemId} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div className="font-semibold text-gray-900 truncate">{name}</div>
                          </div>
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <div>{openingText(it.placeId)}</div>
                            <div>ระยะเวลาที่แนะนำ: {p?.avgVisitMinutes ?? 60} นาที</div>
                          </div>
                          <button
                            onClick={() => navigate(`/placeDetails/${it.placeId}`)}
                            className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                          >
                            ดูข้อมูลเพิ่มเติม →
                          </button>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMove(it.tripItemId, "up")}
                              disabled={idx === 0 || isReordering}
                              className="w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-30"
                              title="เลื่อนขึ้น"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => handleMove(it.tripItemId, "down")}
                              disabled={idx === dayItems.length - 1 || isReordering}
                              className="w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-30"
                              title="เลื่อนลง"
                            >
                              ↓
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemove(it.tripItemId)}
                            disabled={isRemoving}
                            className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-40"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(isRemoving || isReordering) && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 font-medium">
                {isRemoving ? "กำลังลบ..." : "กำลังบันทึกลำดับใหม่..."}
              </div>
            )}
          </div>

          {/* Right: Timeline */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="text-lg font-bold text-gray-900">ตารางเวลา</div>
                <div className="text-xs text-gray-600">
                  วันที่ {selectedDay} • เวลาเริ่มต้น {startTimeHHMM} น.
                </div>
              </div>

              <div className="flex gap-2 text-xs font-medium">
                <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  เดินทาง: {timeline.totalTravel} นาที
                </div>
                <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded border border-green-200">
                  เที่ยว: {timeline.totalStay} นาที
                </div>
              </div>
            </div>

            {timeline.rows.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                <div className="text-gray-800 font-semibold">ยังไม่มีตารางเวลา</div>
                <div className="text-sm text-gray-600 mt-1">เพิ่มสถานที่อย่างน้อย 1 จุด</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                <div className="text-sm font-medium text-gray-700 bg-green-50 px-4 py-2.5 rounded-lg border border-green-200">
                  เริ่มออกเดินทาง: {fmtHHMM(timeline.startAt)} น.
                </div>

                {timeline.rows.map((r, idx) => (
                  <div key={r.tripItemId}>
                    {idx > 0 && r.travelFromPrevMinutes > 0 && (
                      <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2">
                        ใช้เวลาเดินทาง {r.travelFromPrevMinutes} นาที
                      </div>
                    )}

                    <div
                      className={`rounded-xl border p-4 ${
                        r.status === "ok"
                          ? "border-gray-200"
                          : r.status === "arrive_before_open"
                          ? "border-amber-200 bg-amber-50"
                          : r.status === "closed"
                          ? "border-gray-200 bg-gray-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{r.name}</div>

                          <div className="mt-2 text-sm space-y-1">
                            <div className="text-gray-700">
                              ถึงเวลา:{" "}
                              <span className="font-semibold text-blue-700">{fmtHHMM(r.arriveAt)} น.</span>
                            </div>
                            <div className="text-gray-700">
                              ออกเวลา:{" "}
                              <span className="font-semibold text-indigo-700">{fmtHHMM(r.departAt)} น.</span>
                            </div>
                            <div className="text-gray-700">
                              ระยะเวลา: <span className="font-semibold">{r.stayMinutes} นาที</span>
                            </div>

                            {r.status === "closed" ? (
                              <div className="text-xs font-semibold text-gray-700">ปิดทำการ</div>
                            ) : r.openAt || r.closeAt ? (
                              <div className="text-xs text-gray-600">
                                เปิด-ปิด: {r.openAt ? fmtHHMM(r.openAt) : "-"} -{" "}
                                {r.closeAt ? fmtHHMM(r.closeAt) : "-"} น.
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600">เวลาเปิด-ปิด: ไม่ระบุ</div>
                            )}
                          </div>
                        </div>

                        {statusBadge(r)}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-sm font-medium text-gray-700 bg-purple-50 px-4 py-2.5 rounded-lg border border-purple-200">
                  สิ้นสุดเวลา: {fmtHHMM(timeline.rows[timeline.rows.length - 1].departAt)} น. • รวม{" "}
                  {Math.floor((timeline.totalStay + timeline.totalTravel) / 60)} ชม.{" "}
                  {(timeline.totalStay + timeline.totalTravel) % 60} นาที
                  {overTripEndMinutes > 0 && (
                    <span className="ml-2 text-red-700 font-semibold">
                      (เกินเวลาทริป {overTripEndMinutes} นาที)
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700">
              ระบบคำนวณเวลาเดินทางจาก Trip Segments ของวันนั้น หากไม่มีข้อมูลจะถือว่า 0 นาที
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
