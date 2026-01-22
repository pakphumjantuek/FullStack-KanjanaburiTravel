import AutoTripModal from "../components/AutoTripModal";
import { TripHeroHeader } from "../components/list/TripHeroHeader";
import { TripControls } from "../components/list/TripControls";
import { TripGrid } from "../components/list/TripGrid";
import { TripCardSkeleton } from "../components/list/TripCardSkeleton";
import { TripPagination } from "../components/list/TripPagination";
import { useTripListController } from "../hooks/useTripListController";


export default function TripListPage() {
  const c = useTripListController();

  return (
    <div className="min-h-screen w-full bg-gray-50 pb-20 font-prompt">
      <TripHeroHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <TripControls
          search={c.search}
          onSearchChange={c.setSearch}
          onClearSearch={() => c.setSearch("")}
          onOpenAutoTrip={() => c.setAutoTripOpen(true)}
          isAutoTripLoading={c.isAutoTripLoading}
          onCreate={c.goCreate}
        />

        {c.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {c.skeletonCount.map((_, idx) => (
              <TripCardSkeleton key={idx} />
            ))}
          </div>
        )}

        {!c.isLoading && c.trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {c.hasSearch ? "ไม่พบทริปที่ตรงกับคำค้นหา" : "เริ่มการผจญภัยของคุณ!"}
            </h3>
            <p className="text-gray-500 mb-8 text-center max-w-md">
              {c.hasSearch
                ? "ลองเปลี่ยนคำค้นหา หรือกดล้างคำค้นหาเพื่อดูรายการทั้งหมด"
                : "คุณยังไม่มีทริปในรายการ ลองสร้างทริปใหม่ หรือให้ระบบช่วยวางแผนอัตโนมัติได้เลย"}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {c.hasSearch ? (
                <button
                  onClick={() => c.setSearch("")}
                  className="px-8 py-3 rounded-full border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                >
                  ล้างคำค้นหา
                </button>
              ) : (
                <>
                  <button
                    onClick={c.goCreate}
                    className="px-8 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200"
                  >
                    สร้างทริปใหม่
                  </button>
                  <button
                    onClick={() => c.setAutoTripOpen(true)}
                    className="px-8 py-3 rounded-full border-2 border-dashed border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50"
                  >
                    ✨ ช่วยสร้างทริปอัตโนมัติ
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {!c.isLoading && c.trips.length > 0 && (
          <TripGrid
            trips={c.trips}
            onOpen={c.goTripDetail}
            onPlanner={c.goPlanner}
            onDelete={c.handleDeleteTrip}
          />
        )}

        <TripPagination
          page={c.page}
          totalPages={c.totalPages}
          onPrev={() => c.setPage(Math.max(1, c.page - 1))}
          onNext={() => c.setPage(Math.min(c.totalPages, c.page + 1))}
        />
      </div>

      <AutoTripModal
        open={c.autoTripOpen}
        onClose={() => c.setAutoTripOpen(false)}
        onConfirm={c.handleGenerateAutoTrip}
      />
    </div>
  );
}
