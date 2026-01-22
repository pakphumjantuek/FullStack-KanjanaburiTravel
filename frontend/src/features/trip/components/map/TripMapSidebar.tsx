import type { TripItemDto } from "../../tripTypes";

// ปรับ type ให้ตรงกับ place dto ของคุณ
// ถ้าคุณมี PlaceDto อยู่แล้ว ให้ import ของจริงแทน
type PlaceLike = {
  placeId: number;
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type TripMapSidebarProps = {
  tripId: number;
  selectedDay: number;

  onlyWithCoords: boolean;

  dayItemsRaw: TripItemDto[];
  dayItems: TripItemDto[];

  placeMap: Map<number, PlaceLike>;

  coordStats: { total: number; withCoords: number; withoutCoords: number };

  hoveredPlaceId: number | null;

  onHover: (placeId: number | null) => void;
  onClickPlace: (placeId: number) => void;

  onGoPlanner: () => void; // ✅ ให้เป็น void ชัดๆ
};

export function TripMapSidebar(props: TripMapSidebarProps) {
  const {
    selectedDay,
    onlyWithCoords,
    dayItemsRaw,
    dayItems,
    placeMap,
    coordStats,
    hoveredPlaceId,
    onHover,
    onClickPlace,
    onGoPlanner,
  } = props;

  const list = onlyWithCoords ? dayItems : dayItemsRaw;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="font-extrabold text-gray-900">
          ลำดับการไป (วัน {selectedDay})
        </div>
        <div className="text-xs text-gray-600 mt-1">
          ชี้เมาส์เพื่อซูมบนแผนที่ • คลิกเพื่อดูรายละเอียด
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            จุดวันนี้ {coordStats.total}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            มีพิกัด {coordStats.withCoords}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full border ${
              coordStats.withoutCoords
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-gray-50 text-gray-700 border-gray-200"
            }`}
          >
            ไม่มีพิกัด {coordStats.withoutCoords}
          </span>
        </div>
      </div>

      {dayItemsRaw.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-sm font-bold text-gray-800">ยังไม่มีสถานที่ในวันนี้</div>
          <div className="text-xs text-gray-600 mt-1">ไปที่หน้าวางแผนเพื่อเพิ่มสถานที่</div>
          <div className="mt-3">
            <button
              onClick={onGoPlanner}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold"
            >
              ไปหน้าวางแผน
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3">
          {onlyWithCoords && coordStats.withoutCoords > 0 && (
            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="font-extrabold text-amber-900">
                ซ่อน {coordStats.withoutCoords} จุดที่ไม่มีพิกัด
              </div>
              <div className="text-xs text-amber-800 mt-1">
                ปิดตัวเลือก “แสดงเฉพาะสถานที่ที่มีพิกัด” เพื่อดูทั้งหมด
              </div>
            </div>
          )}

          <ol className="space-y-2">
            {list.map((it, idx) => {
              const p: any = placeMap.get(it.placeId);
              const title = p?.name ?? `สถานที่ #${it.placeId}`;
              const hasCoord =
                typeof p?.latitude === "number" && typeof p?.longitude === "number";

              const isStart = it.placeId === list[0]?.placeId;
              const isEnd = it.placeId === list[list.length - 1]?.placeId;

              return (
                <li key={it.tripItemId}>
                  <button
                    onMouseEnter={() => onHover(it.placeId)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onClickPlace(it.placeId)}
                    className={`w-full text-left rounded-2xl border p-3 transition flex gap-3 ${
                      hoveredPlaceId === it.placeId
                        ? "bg-blue-50 border-blue-300 shadow-sm"
                        : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm border-2 shrink-0 ${
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
                      <div className="font-extrabold text-gray-900 truncate">
                        {title}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                        {isStart && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                            เริ่มต้น
                          </span>
                        )}
                        {isEnd && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-bold">
                            ปลายทาง
                          </span>
                        )}
                        {!hasCoord && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold">
                            ไม่มีพิกัด
                          </span>
                        )}
                        {hasCoord && (
                          <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-bold">
                            ปักหมุดแล้ว
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-[11px] text-gray-500">
                        {hasCoord
                          ? "พร้อมแสดงบนแผนที่"
                          : "เพิ่ม latitude/longitude เพื่อแสดงบนแผนที่"}
                      </div>
                    </div>

                    <div className="text-gray-400 font-extrabold text-lg">›</div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <span className="font-bold">ทิป:</span> ถ้าเส้นทางไม่ขึ้น ให้เช็คว่า “มีพิกัด” อย่างน้อย 2 จุด
        </div>
      </div>
    </div>
  );
}
