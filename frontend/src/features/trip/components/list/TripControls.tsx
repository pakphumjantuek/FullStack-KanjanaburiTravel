type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  onClearSearch: () => void;

  onOpenAutoTrip: () => void;
  isAutoTripLoading: boolean;

  onCreate: () => void;
};

export function TripControls({
  search,
  onSearchChange,
  onClearSearch,
  onOpenAutoTrip,
  isAutoTripLoading,
  onCreate,
}: Props) {
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-6 mb-10">
      <div className="flex flex-col lg:flex-row gap-5 justify-between items-center">
        <div className="w-full lg:w-[420px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <input
              type="text"
              className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow shadow-sm group-hover:border-blue-300"
              placeholder="ค้นหาชื่อทริป หรือคำอธิบาย..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />

            {search.trim().length > 0 && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={onClearSearch}
                title="ล้างคำค้นหา"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.707-10.707a1 1 0 00-1.414-1.414L10 7.172 8.707 5.879a1 1 0 10-1.414 1.414L8.586 8.586 7.293 9.879a1 1 0 101.414 1.414L10 10l1.293 1.293a1 1 0 001.414-1.414L11.414 8.586l1.293-1.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-2">
            คำแนะนำ: ลองพิมพ์ “น้ำตก”, “คาเฟ่”, “ที่พัก” เพื่อค้นหาทริปที่เกี่ยวข้อง
          </p>
        </div>

        <div className="flex gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={onOpenAutoTrip}
            disabled={isAutoTripLoading}
            className="flex-1 lg:flex-none items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:flex border border-indigo-100"
          >
            {isAutoTripLoading ? "กำลังสร้าง..." : "✨ ช่วยสร้างทริป"}
          </button>

          <button
            onClick={onCreate}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            สร้างทริปใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
