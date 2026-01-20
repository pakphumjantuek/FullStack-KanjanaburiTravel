import { useMemo, useState } from "react";
import { useGetTrainingStatsQuery } from "../../features/recommend/recommendApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  Legend,
} from "recharts";
import { formatThaiDate } from "../../utils";

export default function RecommendAdminPage() {
  const [days, setDays] = useState(90);

  const {
    data: stats,
    isLoading: loadingStats,
    error: errStats,
    refetch: refetchStats,
  } = useGetTrainingStatsQuery(
    { days },
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const topUsersChartData = useMemo(() => {
    const users: { name: string; logs: number }[] = [];
    let guestLogs = 0;

    for (const u of stats?.topUsers || []) {
      if (u.userId) {
        users.push({ name: `ผู้ใช้ #${u.userId}`, logs: u.logs });
      } else {
        guestLogs += u.logs ?? 0;
      }
    }

    if (guestLogs > 0) {
      users.push({ name: "Guest (ทั้งหมด)", logs: guestLogs });
    }
    return users;
  }, [stats?.topUsers]);

  const topPlacesChartData = useMemo(
    () =>
      (stats?.topPlaces || []).map((p) => ({
        name: p.name || `สถานที่ #${p.placeId}`,
        logs: p.logs,
      })),
    [stats?.topPlaces]
  );

  // ===============================
  // ➕ ADD: DAILY TREND
  // ===============================
  const dailyTrendData = useMemo(() => {
    return (stats?.daily || []).map((d) => ({
      date: formatThaiDate(d.dateUtc.slice(0, 10)),
      totalLogs: d.totalLogs,
      rowsTrainable: d.rowsTrainable,
    }));
  }, [stats?.daily]);

  // ===============================
  // ➕ ADD: DAILY ACTIONS (STACKED)
  // ===============================
  const dailyActionsData = useMemo(() => {
    const map = new Map<string, any>();

    for (const a of stats?.dailyActions || []) {
      const date = formatThaiDate(a.dateUtc.slice(0, 10));
      if (!map.has(date)) map.set(date, { date });
      map.get(date)[a.actionType] = a.count;
    }

    return Array.from(map.values());
  }, [stats?.dailyActions]);

  // ===============================
  // ➕ ADD: FUNNEL
  // ===============================
  const funnelData = useMemo(() => {
    const map = Object.fromEntries(
      (stats?.actions || []).map((a) => [a.actionType, a.count])
    );

    return [
      { step: "View", value: map.View ?? 0 },
      { step: "Click", value: map.Click ?? 0 },
      { step: "AddToTrip", value: map.AddToTrip ?? 0 },
      { step: "Favorite", value: map.Favorite ?? 0 },
      { step: "Review", value: map.Review ?? 0 },
    ].filter((x) => x.value > 0);
  }, [stats?.actions]);


  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-9xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              📊 สถิติและแผนภูมิ
            </h1>
            <p className="text-slate-500 mt-1">แดชบอร์ดสรุปข้อมูลการใช้งาน</p>
          </div>

          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <span className="text-sm">ย้อนหลัง</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
              <span className="text-sm">วัน</span>
            </div>

            <button
              className="px-5 py-2.5 rounded-lg border bg-white"
              onClick={() => refetchStats()}
            >
              🔄 รีเฟรช
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          {loadingStats ? (
            <div className="py-12 text-center">กำลังโหลด...</div>
          ) : errStats ? (
            <div className="py-12 text-center text-red-600">
              โหลดสถิติไม่สำเร็จ
            </div>
          ) : (
            <>
              {/* ===============================
                  🆕 DAILY TREND (เพิ่ม)
              =============================== */}

              {/* KEY METRICS */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">เมตริกส์สำคัญ</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Stat
                    label="บันทึกทั้งหมด"
                    value={stats?.totalLogs}
                    icon="📝"
                  />
                  <Stat
                    label="บันทึกสถานที่"
                    value={stats?.placeLogs}
                    icon="📍"
                  />
                  <Stat
                    label="ผู้ใช้ไม่ซ้ำ"
                    value={stats?.uniqueUsers}
                    icon="👥"
                  />
                  <Stat
                    label="สถานที่ไม่ซ้ำ"
                    value={stats?.uniquePlaces}
                    icon="🏢"
                  />
                  <Stat
                    label="Trainable"
                    value={stats?.rowsTrainable}
                    icon="✓"
                  />
                  <Stat
                    label="ตั้งแต่"
                    value={
                      stats?.sinceUtc
                        ? formatThaiDate(stats.sinceUtc.slice(0, 10))
                        : "-"
                    }
                    icon="📅"
                  />
                </div>
              </div>
              {dailyTrendData.length > 0 && (
                <div className="mb-8 bg-sky-50 p-6 rounded-xl border">
                  <h3 className="font-semibold mb-4">📈 แนวโน้มรายวัน</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={dailyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        dataKey="totalLogs"
                        name="Logs"
                        stroke="#0ea5e9"
                        fill="#bae6fd"
                      />
                      <Line
                        dataKey="rowsTrainable"
                        name="Trainable"
                        stroke="#22c55e"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ===============================
                  🆕 STACKED ACTIONS (เพิ่ม)
              =============================== */}
              {dailyActionsData.length > 0 && (
                <div className="mb-8 bg-indigo-50 p-6 rounded-xl border">
                  <h3 className="font-semibold mb-4">📊 การกระทำต่อวัน</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={dailyActionsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="View" stackId="a" fill="#60a5fa" />
                      <Bar dataKey="Click" stackId="a" fill="#f87171" />
                      <Bar dataKey="AddToTrip" stackId="a" fill="#34d399" />
                      <Bar dataKey="Favorite" stackId="a" fill="#fbbf24" />
                      <Bar dataKey="Review" stackId="a" fill="#c084fc" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ===============================
                  🆕 FUNNEL (เพิ่ม)
              =============================== */}
              {funnelData.length > 0 && (
                <div className="mb-8 bg-rose-50 p-6 rounded-xl border">
                  <h3 className="font-semibold mb-4">🎯 Funnel การใช้งาน</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={funnelData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="step" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#fb7185" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ===============================
                  ⬇️ ของเดิมทั้งหมด (ไม่ลบ)
              =============================== */}

              {/* CHARTS เดิม */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Users */}
                {topUsersChartData.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-6 border">
                    <h3 className="font-semibold mb-4">👥 ผู้ใช้ยอดนิยม</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topUsersChartData}>
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="logs" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top Places */}
                {topPlacesChartData.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-6 border">
                    <h3 className="font-semibold mb-4">🏆 สถานที่ยอดนิยม</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topPlacesChartData}>
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="logs" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: any;
  icon?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border">
      <div className="flex items-center gap-2 text-xs mb-2">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold">{String(value ?? "-")}</div>
    </div>
  );
}
