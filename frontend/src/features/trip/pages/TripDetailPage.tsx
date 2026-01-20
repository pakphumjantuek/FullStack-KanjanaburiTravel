import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetTripDetailQuery, useDeleteTripMutation } from "../tripApi";
import { usePlacesByIds } from "../hooks/usePlacesByIds";

// ✅ ปรับ path ให้ตรงโปรเจกต์คุณ
import { useLazyGetPlaceOpeningQuery } from "../../placeOpening/placeOpenApi";
import type { PlaceType as OpeningHourDto, PlaceType } from "../../placeOpening/placetype";
import { formatThaiDateTime } from "../../../utils";

// ---------- UI helpers ----------
type BadgeTone = "gray" | "blue" | "emerald" | "amber" | "rose" | "purple";

const Badge = ({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) => {
  const cls =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : tone === "purple"
      ? "bg-purple-50 text-purple-700 border-purple-100"
      : "bg-gray-50 text-gray-700 border-gray-100";

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
};


// รองรับ "09:00:00" -> "09:00"
const toHHMM = (t?: string | null) => {
  if (!t) return "-";
  return t.length >= 5 ? t.substring(0, 5) : t;
};

/**
 * คำนวณ dayOfWeek (0-6) ของ "วันในทริป"
 * dayIndex: 1 = วันแรก, 2 = วันที่สอง ...
 */
const getTripDayOfWeek = (tripStart?: string | null, dayIndex?: number | null) => {
  if (!tripStart) return null;
  const start = new Date(tripStart);
  if (Number.isNaN(start.getTime())) return null;

  const offsetDays = Math.max((dayIndex ?? 1) - 1, 0);
  const d = new Date(start);
  d.setDate(d.getDate() + offsetDays);
  return d.getDay(); // 0-6
};

// ---------- types (เบาๆพอให้ใช้) ----------
type TripItem = {
  tripItemId: number;
  placeId: number;
  dayIndex: number; // 1..N
  orderIndex: number;
};

type TripSegment = {
  tripSegmentId?: number;
  fromTripItemId: number;
  toTripItemId: number;
  distanceKm?: number;
  travelMinutes?: number;
  transportMode?: string;
};

type TripDetail = {
  title: string;
  description?: string | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  items: TripItem[];
  segments: TripSegment[];
};

// ---------- Page ----------
export default function TripDetailPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetTripDetailQuery(tripId, {
    skip: !Number.isFinite(tripId) || tripId <= 0,
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

  // -------- delete --------
  const handleDelete = async () => {
    if (!confirm("ลบทริปนี้ใช่ไหม?")) return;
    try {
      await deleteTrip(tripId).unwrap();
      navigate("/trip");
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.errorMessages?.[0] ?? "ลบทริปไม่สำเร็จ");
    }
  };

  // ---- sort items ----
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

  // ---- days ----
  const days = useMemo(() => {
    const max = itemsSorted.length
      ? Math.max(...itemsSorted.map((x) => x.dayIndex || 1))
      : 1;
    return Array.from({ length: Math.max(max, 1) }, (_, i) => i + 1);
  }, [itemsSorted]);

  // ---- filtered items ----
  const filteredItems = useMemo(() => {
    if (dayFilter === 0) return itemsSorted;
    return itemsSorted.filter((x) => x.dayIndex === dayFilter);
  }, [itemsSorted, dayFilter]);

  // ✅ placeIds (unique)
  const placeIds = useMemo(() => {
    const ids = itemsSorted.map((x) => x.placeId);
    return Array.from(new Set(ids));
  }, [itemsSorted]);

  // ✅ โหลด place detail (เพื่อชื่อ/ที่อยู่/avgVisitMinutes)
  const { map: placeMap, isLoading: isPlacesLoading } = usePlacesByIds(placeIds);

  // ✅ โหลด openingHours ต่อ placeId (เพื่อแสดงเวลาทำการจริงตามวัน)
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

      const results = await Promise.all(
        placeIds.map(async (pid) => {
          try {
            const list = await triggerOpening(pid, true).unwrap();
            return [pid, list] as const;
          } catch {
          return [pid, [] as PlaceType[]] as const; // ✅ แก้ตรงนี้
          }
        })
      );

      if (!cancelled) setOpeningByPlace(new Map(results ));
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [placeIds, triggerOpening]);

  // ---- itemById: tripItemId -> meta (order/day/name) ----
  const itemById = useMemo(() => {
    const m = new Map<
      number,
      { order: number; day: number; placeId: number; name: string }
    >();

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

  // ---- segments totals ----
  const segTotals = useMemo(() => {
    const segs = data?.segments ?? [];
    const km = segs.reduce((a, s) => a + (s.distanceKm ?? 0), 0);
    const min = segs.reduce((a, s) => a + (s.travelMinutes ?? 0), 0);
    return { km, min };
  }, [data?.segments]);

  // ---- segments filtered by day ----
  const filteredSegments = useMemo(() => {
    const segs = data?.segments ?? [];
    if (dayFilter === 0) return segs;
    return segs.filter((s) => {
      const from = itemById.get(s.fromTripItemId);
      return (from?.day ?? 0) === dayFilter;
    });
  }, [data?.segments, dayFilter, itemById]);

  // ---- state render ----
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

  // ---------- helper: render opening by trip day ----------
  const renderOpeningText = (placeId: number, dayIndex: number) => {
    const dow = getTripDayOfWeek(data.startDateTime, dayIndex);
    const list = openingByPlace.get(placeId) ?? [];
    const oh = dow == null ? null : list.find((x) => x.dayOfWeek === dow);

    if (!oh) return "ไม่ระบุ";
    if (oh.isClosed) return "ปิดทำการ";
    return `${toHHMM(oh.openTime)} - ${toHHMM(oh.closeTime)} น.`;
  };

  // ---------- main ----------
  return (
    <div className="min-h-screen w-full bg-linear-to-b from-gray-50 to-white px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* top nav */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/trip")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 bg-white hover:border-blue-500 hover:text-blue-700 font-medium text-gray-800 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>กลับ</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/trip/${tripId}/map`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 bg-white hover:border-blue-500 hover:text-blue-700 font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>แผนที่และเส้นทาง</span>
            </button>

            <button
              onClick={() => navigate(`/trip/${tripId}/planner`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>วางแผนการเดินทาง</span>
            </button>
          </div>
        </div>

        {/* layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* left: summary */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>ข้อมูลทริป</span>
                </div>

                <div className="mt-2 text-2xl font-bold text-gray-900 break-words">
                  {data.title}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-600 font-medium">เริ่มต้น</div>
                      <div className="font-semibold text-gray-900">{formatThaiDateTime(data.startDateTime ?? '')}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-600 font-medium">สิ้นสุด</div>
                      <div className="font-semibold text-gray-900">{formatThaiDateTime(data.endDateTime ?? '')}</div>
                    </div>
                  </div>
                </div>

                {data.description && (
                  <div className="mt-4 text-sm text-gray-700 leading-relaxed bg-gray-50 border rounded-2xl p-4">
                    {data.description}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>📍 สถานที่ {data.items.length}</Badge>
                  <Badge tone="purple">🛣️ เส้นทาง {data.segments.length}</Badge>
                  {data.segments.length > 0 && (
                    <>
                      <Badge tone="emerald">📏 {segTotals.km.toFixed(1)} กม.</Badge>
                      <Badge tone="emerald">⏱ {segTotals.min} นาที</Badge>
                    </>
                  )}
                </div>

                {isPlacesLoading && (
                  <div className="mt-3 text-xs text-gray-500">กำลังโหลดชื่อสถานที่...</div>
                )}
              </div>

              <div className="p-5 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isDeleting ? "กำลังดำเนินการ..." : "ลบทริปนี้"}
                </button>

                <div className="mt-2 text-xs text-center text-gray-600 flex items-center justify-center gap-1">
                  <span className="text-amber-600">⚠️</span>
                  <span>การลบจะไม่สามารถกู้คืนได้</span>
                </div>
              </div>
            </div>
          </div>

          {/* right: content */}
          <div className="lg:col-span-8">
            <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
              {/* tabs */}
              <div className="p-4 border-b border-gray-200 bg-white flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTab("items")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
                      tab === "items"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                    }`}
                  >
                    📍 <span>รายการสถานที่</span>
                  </button>

                  <button
                    onClick={() => setTab("segments")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
                      tab === "segments"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                    }`}
                  >
                    🛣️ <span>เส้นทางการเดินทาง</span>
                  </button>
                </div>

                {/* day filter */}
                <div className="md:ml-auto flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">กรองตามวัน:</span>

                  <button
                    onClick={() => setDayFilter(0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      dayFilter === 0
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-gray-300 hover:border-blue-400 text-gray-700"
                    }`}
                  >
                    ทั้งหมด
                  </button>

                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDayFilter(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        dayFilter === d
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white border-gray-300 hover:border-blue-400 text-gray-700"
                      }`}
                    >
                      วันที่ {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* body */}
              <div className="p-5">
                {tab === "items" ? (
                  data.items.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                      <div className="text-5xl mb-2">🧳</div>
                      <div className="text-lg font-bold text-gray-900">ยังไม่มีสถานที่ท่องเที่ยวในทริป</div>
                      <div className="mt-2 text-sm text-gray-600">เริ่มต้นวางแผนการเดินทางโดยเพิ่มสถานที่ที่ต้องการไป</div>
                      <button
                        onClick={() => navigate(`/trip/${tripId}/planner`)}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-sm"
                      >
                        ✏️ <span>วางแผนการเดินทาง</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredItems.map((it) => {
                        const p: any = placeMap.get(it.placeId);
                        const name = p?.name ?? `Place #${it.placeId}`;

                        return (
                          <div
                            key={it.tripItemId}
                            className="rounded-2xl border bg-white p-4 hover:bg-gray-50 transition"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 font-extrabold flex items-center justify-center shrink-0">
                                {it.orderIndex ?? "-"}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-bold text-gray-900 truncate">{name}</div>
                                  <Badge tone="blue">วันที่ {it.dayIndex}</Badge>
                                  <Badge>ลำดับ {it.orderIndex}</Badge>
                                </div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                  {/* ✅ เวลาทำการจาก OpeningHours จริง */}
                                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                                    <div className="text-xs text-gray-600 font-medium mb-1">เวลาทำการ (ตามวันในทริป)</div>
                                    <div className="font-semibold text-gray-900">
                                      {renderOpeningText(it.placeId, it.dayIndex)}
                                    </div>
                                  </div>

                                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                                    <div className="text-xs text-gray-600 font-medium mb-1">ระยะเวลาที่แนะนำ</div>
                                    <div className="font-semibold text-gray-900">
                                      {p?.avgVisitMinutes ? `${p.avgVisitMinutes} นาที` : "60 นาที"}
                                    </div>
                                  </div>
                                </div>

                                {p?.address && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    📍 <span className="line-clamp-2">{p.address}</span>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => navigate(`/placeDetails/${it.placeId}`)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-gray-300 bg-white hover:border-blue-500 hover:text-blue-700 text-sm font-medium shrink-0 transition-all"
                                title="ดูรายละเอียดสถานที่"
                              >
                                <span>ดูรายละเอียด</span>
                                <span>›</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : data.segments.length === 0 ? (
                  <div className="rounded-2xl border bg-gray-50 p-6 text-center">
                    <div className="text-5xl">🚗</div>
                    <div className="mt-2 font-bold text-gray-900">ยังไม่มีข้อมูลเส้นทาง</div>
                    <div className="mt-1 text-sm text-gray-600">
                      จะมีเมื่อมีสถานที่อย่างน้อย 2 จุด และคำนวณเส้นทาง
                    </div>
                    <button
                      onClick={() => navigate(`/trip/${tripId}/map`)}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    >
                      🗺️ ไปหน้าแผนที่
                    </button>
                  </div>
                ) : filteredSegments.length === 0 ? (
                  <div className="rounded-2xl border bg-gray-50 p-6 text-center">
                    <div className="text-5xl">🧭</div>
                    <div className="mt-2 font-bold text-gray-900">ไม่มีเส้นทางใน Day {dayFilter}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      ลองเลือก “ทั้งหมด” หรือคำนวณเส้นทางของวันนั้นก่อน
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSegments.map((s) => {
                      const from = itemById.get(s.fromTripItemId);
                      const to = itemById.get(s.toTripItemId);

                      return (
                        <div
                          key={s.tripSegmentId ?? `${s.fromTripItemId}-${s.toTripItemId}`}
                          className="rounded-lg border border-gray-300 bg-white p-4 hover:border-purple-400 hover:shadow-sm transition"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <div className="font-semibold text-gray-900 text-sm">
                              <span className="text-blue-600">#{from?.order ?? "?"}</span>{" "}
                              {from?.name ?? s.fromTripItemId}
                              <span className="mx-2 text-gray-400">→</span>
                              <span className="text-blue-600">#{to?.order ?? "?"}</span>{" "}
                              {to?.name ?? s.toTripItemId}
                            </div>

                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                              {String(s.transportMode ?? "รถยนต์")}
                            </span>

                            {from?.day && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                วันที่ {from.day}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                              <div className="text-xs text-green-700 font-medium mb-1">ระยะทาง</div>
                              <div className="font-bold text-green-900">
                                {(s.distanceKm ?? 0).toFixed(2)} กม.
                              </div>
                            </div>

                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                              <div className="text-xs text-amber-700 font-medium mb-1">เวลาเดินทาง</div>
                              <div className="font-bold text-amber-900">{s.travelMinutes ?? 0} นาที</div>
                            </div>

                            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                              <div className="text-xs text-purple-700 font-medium mb-1">ประเภท</div>
                              <div className="font-bold text-purple-900 capitalize">
                                {String(s.transportMode ?? "รถยนต์")}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      onClick={() => navigate(`/trip/${tripId}/map`)}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-sm"
                    >
                      🗺️ <span>ดูแผนที่ทั้งหมด</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
