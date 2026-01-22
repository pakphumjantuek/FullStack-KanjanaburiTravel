// src/features/trip/pages/TripMapPage.tsx
import { useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Loading } from "../../../components/Loading";

// ✅ controller: รวม state + data + handlers
import { useTripMapController } from "../hooks/useTripMapController";

// ✅ UI blocks (แนะนำแยกไฟล์)
import { TripMapSidebar } from "../components/map/TripMapSidebar";
import { TripMapView } from "../components/map/TripMapView";

// ✅ longdo adapter
import { fitPoints, setCenter } from "../components/map/longdoMapAdapter";

export default function TripMapPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const navigate = useNavigate();

  const c = useTripMapController(tripId);

  // ✅ hold map instance in page (ไม่ใช้ window global)
  const mapRef = useRef<any>(null);

  // ✅ IMPORTANT: hooks must be called before any conditional return
  const fitPts = useMemo(() => {
    const route = c.routePoints ?? [];
    const pts = c.orderedLatLng ?? [];
    return route.length ? route : pts;
  }, [c.routePoints, c.orderedLatLng]);

  // ---------------- Render guards (after all hooks) ----------------
  if (c.isLoading) return <Loading />;

  if (c.isError) {
    return (
      <div className="min-h-screen w-full px-4 py-10 bg-gray-50">
        <div className="max-w-4xl mx-auto border rounded-2xl p-6 text-rose-700 bg-white shadow-sm">
          <div className="font-extrabold text-lg">โหลดทริปไม่สำเร็จ</div>
          <div className="mt-1 text-sm text-gray-600">
            {(c.error as any)?.data?.errorMessages?.[0] ?? "unknown"}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="px-4 py-2 rounded-lg border"
              onClick={() => navigate(-1)}
            >
              ← กลับ
            </button>
            <button
              className="px-4 py-2 rounded-lg border"
              onClick={() => c.refetch()}
            >
              ↻ ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!c.trip) return <div className="p-6">ไม่พบทริป</div>;

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header / Summary */}
      <div className="sticky top-0 z-[50] border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
                แผนที่การเดินทาง
              </div>

              <div className="mt-1 flex items-center gap-3 min-w-0">
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 truncate">
                  {c.trip.title}
                </h1>
                <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  วันที่ {c.selectedDay}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {/* pills */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold border-blue-200 bg-blue-50 text-blue-700">
                  <span className="opacity-80">จุดวันนี้</span>
                  <span className="font-extrabold">{c.coordStats.total}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold border-emerald-200 bg-emerald-50 text-emerald-700">
                  <span className="opacity-80">มีพิกัด</span>
                  <span className="font-extrabold">{c.coordStats.withCoords}</span>
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold ${
                    c.coordStats.withoutCoords
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="opacity-80">ไม่มีพิกัด</span>
                  <span className="font-extrabold">{c.coordStats.withoutCoords}</span>
                </div>

                {c.routeLoading ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold border-blue-200 bg-blue-50 text-blue-700">
                    <span className="opacity-80">เส้นทาง</span>
                    <span className="font-extrabold">กำลังคำนวณ...</span>
                  </div>
                ) : c.routeInfo ? (
                  <>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold border-emerald-200 bg-emerald-50 text-emerald-700">
                      <span className="opacity-80">ระยะทาง</span>
                      <span className="font-extrabold">
                        ~{c.routeInfo.km.toFixed(1)} กม.
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold border-emerald-200 bg-emerald-50 text-emerald-700">
                      <span className="opacity-80">เวลา</span>
                      <span className="font-extrabold">~{c.routeInfo.min} นาที</span>
                    </div>
                  </>
                ) : (
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold ${
                      c.canRoute
                        ? "border-gray-200 bg-gray-50 text-gray-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <span className="opacity-80">เส้นทาง</span>
                    <span className="font-extrabold">
                      {c.canRoute ? "พร้อมคำนวณ" : "ต้อง ≥ 2 จุด"}
                    </span>
                  </div>
                )}

                {c.routeError && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold border-rose-200 bg-rose-50 text-rose-700">
                    <span className="opacity-80">ผิดพลาด</span>
                    <span className="font-extrabold">{c.routeError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate(`/trip/${tripId}/planner`)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold"
              >
                ← กลับไปวางแผน
              </button>

              <button
                onClick={() => navigate(`/trip/${tripId}`)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold"
              >
                ข้อมูลทริป
              </button>

              <button
                onClick={c.handleComputeAndSave}
                disabled={c.isSaving || c.routeLoading || !c.canRoute}
                title={c.saveDisabledReason}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {c.isSaving || c.routeLoading ? "กำลังบันทึก..." : "บันทึกเส้นทางวันนี้"}
              </button>
            </div>
          </div>

          {/* Day selector */}
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-gray-700 mr-1">เลือกวัน:</span>
              {Array.from({ length: Math.max(c.maxDay, 1) }).map((_, i) => {
                const d = i + 1;
                const active = d === c.selectedDay;
                const count = c.dayCounts.get(d) ?? 0;

                return (
                  <button
                    key={d}
                    onClick={() => c.setSelectedDay(d)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-blue-400"
                    }`}
                  >
                    วัน {d}
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-lg text-xs font-extrabold ${
                        active ? "bg-white/20" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* toggle filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => c.setOnlyWithCoords((v) => !v)}
                className={`w-full flex items-start justify-between gap-3 rounded-2xl border p-3 text-left transition ${
                  c.onlyWithCoords
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div>
                  <div className="font-bold text-gray-900">
                    แสดงเฉพาะสถานที่ที่มีพิกัด (แนะนำ)
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    ช่วยให้คำนวณเส้นทางได้แม่นยำและไม่เจอปัญหาจุดหาย
                  </div>
                </div>

                <div
                  className={`w-11 h-6 rounded-full p-1 transition ${
                    c.onlyWithCoords ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition ${
                      c.onlyWithCoords ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>

              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="font-bold text-gray-900">ทำไมบางจุดไม่ขึ้นแผนที่?</div>
                <div className="text-xs text-gray-600 mt-1">
                  ส่วนใหญ่เกิดจากสถานที่นั้น{" "}
                  <span className="font-bold text-amber-700">ไม่มี Latitude/Longitude</span>{" "}
                  — ให้กลับไปหน้า “วางแผน” หรือ “รายละเอียดสถานที่” แล้วเติมพิกัด
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: list */}
          <div className="lg:col-span-4">
            <TripMapSidebar
              tripId={tripId}
              selectedDay={c.selectedDay}
              onlyWithCoords={c.onlyWithCoords}
              dayItemsRaw={c.dayItemsRaw}
              dayItems={c.dayItems}
              placeMap={c.placeMap}
              coordStats={c.coordStats}
              hoveredPlaceId={c.hoveredPlaceId}
              onHover={c.setHoveredPlaceId}
              onClickPlace={c.goPlace}
              onGoPlanner={() => navigate(`/trip/${tripId}/planner`)}
            />
          </div>

          {/* Right: map */}
          <div className={`lg:col-span-8 ${c.isFullscreen ? "fixed inset-0 z-[9999] bg-white p-2" : ""}`}>
            <TripMapView
              center={c.center}
              markers={c.markerModels}
              routePoints={c.routePoints}
              hoveredPlaceId={c.hoveredPlaceId}
              isFullscreen={c.isFullscreen}
              onToggleFullscreen={() => c.setIsFullscreen((v) => !v)}
              onClickPlace={c.goPlace}
              onMapReady={(map) => {
                mapRef.current = map;
                // optional: เปิดมา fit ครั้งแรก
                if (fitPts.length) fitPoints(map, fitPts);
              }}
              onFit={() => {
                const map = mapRef.current;
                if (!map) return;
                fitPoints(map, fitPts);
              }}
              onCenter={() => {
                const map = mapRef.current;
                if (!map) return;
                setCenter(map, c.center);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
