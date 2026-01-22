
import type { TripItemDto } from "../../tripTypes";

type Props = {
  maxDay: number;
  selectedDay: number;
  itemsSorted: TripItemDto[];
  onSelectDay: (day: number) => void;
  rightText?: string;
};

export default function PlannerDayTabs({
  maxDay,
  selectedDay,
  itemsSorted,
  onSelectDay,
  rightText,
}: Props) {
  const days = Array.from({ length: Math.max(maxDay, 1) }, (_, i) => i + 1);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-sm font-semibold text-gray-800">ขั้นตอนที่ 1: เลือกวันที่</div>

        <div className="flex flex-wrap gap-2 flex-1">
          {days.map((d) => {
            const active = d === selectedDay;
            const count = itemsSorted.filter((x) => x.dayIndex === d).length;

            return (
              <button
                key={d}
                onClick={() => onSelectDay(d)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
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

        {rightText && (
          <div className="text-sm text-gray-700 font-semibold bg-gray-50 px-3 py-2 rounded-lg border border-gray-300">
            {rightText}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700">ปกติ</span>
        <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">ยังไม่เปิด</span>
        <span className="px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800">มีปัญหา/เกินเวลา</span>
        <span className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600">ปิดทำการ</span>
      </div>
    </div>
  );
}
