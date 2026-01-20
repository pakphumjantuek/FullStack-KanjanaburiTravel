import { useParams } from "react-router-dom";
import { useGetUserInterestDetailsQuery } from "../interestApi";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";



export default function UserInterestDetailsPage() {
  const { userId } = useParams();
  const id = Number(userId);

  const { data, isLoading, isError } = useGetUserInterestDetailsQuery(
    { userId: id, days: 90, top: 20 },
    { skip: !Number.isFinite(id) || id <= 0 }
  );

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 font-semibold">userId ไม่ถูกต้อง</p>
        </div>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );

  const dto = data;
  if (isError || !dto)
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 font-semibold">โหลดข้อมูลไม่สำเร็จ</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            ความสนใจผู้ใช้ #{dto.userId}
          </h1>
          <p className="text-slate-600 mt-2 text-sm">
            ข้อมูลตั้งแต่วันที่ {new Date(dto.sinceUtc).toLocaleDateString("th-TH")} ({dto.days} วันที่ผ่านมา)
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TOP INTERESTS */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="font-semibold text-slate-900 mb-4 text-base uppercase tracking-wide">
              ความสนใจสูงสุด
            </div>
            {dto.topInterests.length > 0 ? (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {dto.topInterests.map((it) => (
                  <li
                    key={it.interestKey}
                    className="flex justify-between items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition"
                  >
                    <div className="min-w-0 truncate text-slate-800 font-medium text-sm">
                      {it.displayName || it.interestKey}
                    </div>
                    <span className="bg-slate-100 px-3 py-1 rounded text-xs font-semibold text-slate-700 shrink-0">
                      {it.weight.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-lg text-center">
                ไม่มีข้อมูล
              </div>
            )}
          </div>

          {/* ACTION SUMMARY */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="font-semibold text-slate-900 mb-4 text-base uppercase tracking-wide">
              สรุปพฤติกรรม
            </div>
            {Object.keys(dto.actionCounts).length > 0 ? (
              <ul className="space-y-3">
                {Object.entries(dto.actionCounts).map(([k, v]) => (
                  <li
                    key={k}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition"
                  >
                    <span className="text-slate-800 font-medium text-sm">{k}</span>
                    <span className="bg-slate-100 px-3 py-1 rounded text-xs font-semibold text-slate-700">
                      {v}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-lg text-center">
                ไม่มีพฤติกรรม
              </div>
            )}
          </div>

          {/* TOP PLACES */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="font-semibold text-slate-900 mb-4 text-base uppercase tracking-wide">
              สถานที่ที่มีผลต่อความสนใจ
            </div>

            {dto.topPlaces && dto.topPlaces.length > 0 ? (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {dto.topPlaces.map((p) => (
                  <li
                    key={p.placeId}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 truncate text-sm">
                        {p.name}
                      </div>
                      {p.categoryName && (
                        <div className="text-xs text-slate-500">{p.categoryName}</div>
                      )}
                    </div>

                    {typeof p.score === "number" && (
                      <span className="bg-slate-100 px-3 py-1 rounded text-xs font-semibold text-slate-700 shrink-0">
                        {p.score.toFixed(2)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-lg text-center">
                ไม่มีข้อมูล
              </div>
            )}
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* INTERESTS PIE CHART */}
          {dto.topInterests.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-4 uppercase tracking-wide">
                สัดส่วนความสนใจ
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dto.topInterests.map((it) => ({
                      name: it.displayName || it.interestKey,
                      value: Number(it.weight.toFixed(2)),
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {["#1e40af", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"].map(
                      (color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      )
                    )}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ACTION BAR CHART */}
          {Object.keys(dto.actionCounts).length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-4 uppercase tracking-wide">
                จำนวนการกระทำ
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(dto.actionCounts).map(([k, v]) => ({
                    name: k,
                    count: v,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1e40af" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TOP PLACES BAR CHART */}
          {dto.topPlaces && dto.topPlaces.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <h3 className="text-base font-semibold text-slate-900 mb-4 uppercase tracking-wide">
                คะแนนสถานที่
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={dto.topPlaces.map((p) => ({
                    name: p.name || `สถานที่ #${p.placeId}`,
                    score: Number(p.score?.toFixed(2) ?? 0),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#1e40af" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
