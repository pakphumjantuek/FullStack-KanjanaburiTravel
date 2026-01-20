import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableControls from "../../../components/Table/TableControls";
import { useDebounce } from "../../../utils/useDebounce";
import { confirmDelete, formatThaiDate, showSuccessOk } from "../../../utils";
import {
  useDeleteTripMutation,
  useGetAllTripsQuery,
  useGenerateAutoTripMutation,
} from "../tripApi";
import AutoTripModal from "../components/AutoTripModal";

const TripListPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [search, setSearch] = useState("");

  const [autoTripOpen, setAutoTripOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const navigate = useNavigate();

  const [deleteTrip] = useDeleteTripMutation();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const { data, isLoading } = useGetAllTripsQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const [generateAutoTrip, { isLoading: isAutoTripLoading }] =
    useGenerateAutoTripMutation();

  const trips = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleDeleteTrip = async (tripId: number) => {
    const ok = await confirmDelete();
    if (!ok) return;

    try {
      await deleteTrip(tripId).unwrap();
      showSuccessOk("ลบทริปสำเร็จ!");
    } catch (err) {
      console.error(err);
      alert((err as any)?.data?.errorMessages?.[0] ?? "ลบทริปไม่สำเร็จ");
    }
  };

  const hasSearch = debouncedSearch.trim().length > 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full px-4 py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-sm p-8 text-center">
              <svg
                className="w-12 h-12 mx-auto animate-spin text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="mt-4 text-gray-800 font-semibold">
                กำลังโหลดข้อมูลทริป...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-gray-600 text-xs font-semibold uppercase tracking-wide mb-2">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span>รายการทริปทั้งหมด</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                ทริปของฉัน
              </h1>
              <p className="mt-2 text-gray-600">
                จัดการและวางแผนการเดินทางของคุณได้ที่นี่
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span>
                    <span className="font-semibold">{total}</span> ทริป
                  </span>
                </span>
                {hasSearch && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>ค้นหา: {debouncedSearch}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                onClick={() => setAutoTripOpen(true)}
                disabled={isAutoTripLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-all w-full md:w-auto"
              >
                {isAutoTripLoading ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L7 20l-1.5-1.5L8.25 16m1.5-1.5L12 12m0 0l2.25-2.25M12 12l-2.25-2.25M12 12l2.25 2.25M12 12l-2.25 2.25"
                      />
                    </svg>
                    สร้างทริปอัตโนมัติ
                  </>
                )}
              </button>

              <button
                onClick={() => navigate("/trip/create")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow-sm transition-all w-full md:w-auto"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                สร้างทริปใหม่
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <TableControls
              search={search}
              pageSize={pageSize}
              searchPlaceholder="ค้นหาชื่อทริป หรือคำอธิบาย..."
              onSearchChange={setSearch}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {trips.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {hasSearch ? "ไม่พบทริปที่ค้นหา" : "ยังไม่มีทริป"}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                {hasSearch
                  ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองเพื่อดูทริปทั้งหมด"
                  : "เริ่มต้นสร้างทริปแรกของคุณเพื่อวางแผนการเดินทางที่น่าจดจำ"}
              </p>
              {!hasSearch && (
                <button
                  onClick={() => navigate("/trip/create")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm transition-all"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  สร้างทริปแรก
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <div
                    key={trip.tripId}
                    className="group bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                            ทริป #{trip.tripId}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {trip.title}
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-3 mb-5">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <svg
                            className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-blue-600 font-medium mb-0.5">
                              ช่วงเวลา
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatThaiDate(trip.startDateTime)}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              ถึง {formatThaiDate(trip.endDateTime)}
                            </div>
                          </div>
                        </div>

                        {typeof trip.startLat === "number" &&
                          typeof trip.startLng === "number" && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                              <svg
                                className="w-4 h-4 text-gray-500 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="text-xs text-gray-600 font-medium">
                                จุดเริ่มต้น: {trip.startLat.toFixed(4)},{" "}
                                {trip.startLng.toFixed(4)}
                              </span>
                            </div>
                          )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/trip/${trip.tripId}`)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span>ดูข้อมูล</span>
                        </button>

                        <button
                          onClick={() => navigate(`/trip/${trip.tripId}/planner`)}
                          title="วางแผนการเดินทาง"
                          className="px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-all"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => navigate(`/trip/${trip.tripId}/map`)}
                          title="ดูแผนที่และเส้นทาง"
                          className="px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white hover:border-purple-500 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleDeleteTrip(trip.tripId)}
                          title="ลบทริปนี้"
                          className="px-3 py-2.5 rounded-lg border-2 border-red-300 bg-red-50 hover:bg-red-100 hover:border-red-400 text-red-700 transition-all"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span>ก่อนหน้า</span>
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum =
                        page <= 3 ? i + 1 : Math.max(1, page - 2) + i;
                      if (pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`min-w-[40px] px-4 py-2 rounded-lg font-semibold transition-all ${
                            page === pageNum
                              ? "bg-blue-600 text-white shadow-sm border-2 border-blue-600"
                              : "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-blue-400"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span>ถัดไป</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* AutoTrip Modal (เพิ่มใหม่แบบไม่กระทบตกแต่งเดิม) */}
      <AutoTripModal
        open={autoTripOpen}
        onClose={() => setAutoTripOpen(false)}
        onConfirm={async (pref : any) => {
          try {
            setAutoTripOpen(false);

            const start = new Date();
            start.setHours(8, 0, 0, 0);

            const trip = await generateAutoTrip({
              startDateTime: start.toISOString(),
              days: pref.days,
              hoursPerDay: pref.hoursPerDay,
              startLat: null,
              startLng: null,
              transportMode: "driving",

              preferredTagNames: pref.preferredTagNames,
              relaxedPace: pref.relaxedPace,
              budgetLevel: pref.budgetLevel,
              withElderOrKids: pref.withElderOrKids,
            }).unwrap();

            showSuccessOk("สร้างทริปอัตโนมัติสำเร็จ!");
            navigate(`/trip/${trip.tripId}`);
          } catch (err) {
            console.error(err);
            alert(
              (err as any)?.data?.errorMessages?.[0] ??
                "สร้างทริปอัตโนมัติไม่สำเร็จ"
            );
          }
        }}
      />
    </div>
  );
};

export default TripListPage;
