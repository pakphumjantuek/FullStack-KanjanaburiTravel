import {
  formatThaiRange,
  getTripDuration,
  getTripStatus,
} from "../../utils/tripUi";

type Trip = {
  tripId: number;
  title: string;
  description?: string | null;
  startDateTime: string;
  endDateTime: string;
};

type Props = {
  trip: Trip;
  onOpen: (tripId: number) => void;
  onPlanner: (tripId: number) => void;
  onDelete: (tripId: number, title: string) => void;
};

export function TripCard({ trip, onOpen, onPlanner, onDelete }: Props) {
  const duration = getTripDuration(trip.startDateTime, trip.endDateTime);
  const status = getTripStatus(trip.startDateTime, trip.endDateTime);
  const range = formatThaiRange(trip.startDateTime, trip.endDateTime);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(trip.tripId);
        }
      }}
      onClick={() => onOpen(trip.tripId)}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 flex flex-col overflow-hidden relative transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform origin-left md:scale-x-0 md:group-hover:scale-x-100 transition-transform duration-500 ease-out" />

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${status.className}`}
          >
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-5 h-5 text-gray-300 group-hover:text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
        </div>

        <h3 className="font-bold text-xl text-gray-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
          {trip.title}
        </h3>

        {trip.description ? (
          <p className="text-gray-500 text-sm mb-4 line-clamp-2">
            {trip.description}
          </p>
        ) : (
          <p className="text-gray-400 text-sm mb-4 italic">
            ยังไม่มีคำอธิบายทริป
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-gray-50">
          <div className="flex flex-col gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
              <svg
                className="w-4 h-4 text-blue-500"
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
              <span className="font-medium text-gray-700">{range}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                <svg
                  className="w-4 h-4 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium text-gray-700">
                  {duration} วัน
                </span>
              </div>

              <span className="text-xs text-gray-400">
                คลิกเพื่อดูรายละเอียด →
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlanner(trip.tripId);
              }}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-blue-200 hover:shadow-lg"
            >
              จัดแผนเที่ยว
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(trip.tripId, trip.title);
              }}
              className="px-3 py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="ลบทริป"
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
    </div>
  );
}
