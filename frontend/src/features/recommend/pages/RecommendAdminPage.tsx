import { useMemo, useState } from "react";
import {
  useGetRecommendStatusQuery,
  useGetTrainingStatsQuery,
  useRetrainNowMutation,
} from "../recommendApi";
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
import { formatThaiDate, formatThaiDateTime } from "../../../utils";

export default function RecommendAdminPage() {
  const [days, setDays] = useState(90);
  const [minRows, setMinRows] = useState(20);
  const [activeTab, setActiveTab] = useState("status");

  const {
    data: status,
    isLoading: loadingStatus,
    error: errStatus,
    refetch: refetchStatus,
  } = useGetRecommendStatusQuery();

  const {
    data: stats,
    isLoading: loadingStats,
    error: errStats,
    refetch: refetchStats,
  } = useGetTrainingStatsQuery(
    { days },
    {
      pollingInterval: 3000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const [retrainNow, { isLoading: training }] = useRetrainNowMutation();

  const modelBadge = useMemo(() => {
    const exists = status?.model?.exists;
    return exists ? "พร้อมใช้งาน" : "ยังไม่มีไฟล์โมเดล";
  }, [status]);

  const onRetrain = async () => {
    try {
      await retrainNow({ days, minRows }).unwrap();
      await Promise.all([refetchStatus(), refetchStats()]);
      alert("เทรนโมเดลสำเร็จ");
    } catch (e: any) {
      alert(e?.message ?? "เทรนไม่สำเร็จ");
    }
  };

  // Chart data
  const actionsChartData = stats?.actions || [];
  const topUsersChartData = (() => {
    const users: { name: string; logs: number }[] = [];
    let guestLogs = 0;

    for (const u of stats?.topUsers || []) {
      if (u.userId) {
        users.push({
          name: `ผู้ใช้ #${u.userId}`,
          logs: u.logs,
        });
      } else {
        guestLogs += u.logs ?? 0;
      }
    }

    if (guestLogs > 0) {
      users.push({ name: "Guest (ทั้งหมด)", logs: guestLogs });
    }

    return users;
  })();

  const topPlacesChartData = (stats?.topPlaces || []).map((p) => ({
    name: p.name || `สถานที่ #${p.placeId}`,
    logs: p.logs,
  }));

  const COLORS = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ];

  const TabButton = ({
    id,
    label,
    icon,
  }: {
    id: string;
    label: string;
    icon: string;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all border-b-2 ${
        activeTab === id
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-600 hover:text-slate-900"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-8xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              แนะนำแบบฉลาด (ML)
            </h1>
            <p className="text-slate-500 mt-1">แดชบอร์ด & การตั้งค่า</p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-medium text-slate-700 transition-colors"
              onClick={() => {
                refetchStatus();
                refetchStats();
              }}
            >
              🔄 รีเฟรช
            </button>
            <button
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={training}
              onClick={onRetrain}
            >
              {training ? "⏳ กำลังเทรน..." : "⚡ Retrain Now"}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            <TabButton id="status" label="สถานะโมเดล" icon="🤖" />
            <TabButton id="stats" label="สถิติและแผนภูมิ" icon="📊" />
            <TabButton id="config" label="การตั้งค่า" icon="⚙️" />
          </div>

          <div className="p-6">
            {/* STATUS TAB */}
            {activeTab === "status" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    🤖 สถานะโมเดล
                  </h2>
                  <span
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                      status?.model?.exists
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {modelBadge}
                  </span>
                </div>

                {loadingStatus ? (
                  <div className="py-6 text-center text-slate-500">
                    กำลังโหลด...
                  </div>
                ) : errStatus ? (
                  <div className="py-6 text-center text-red-600 font-medium">
                    โหลดไม่สำเร็จ
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="text-sm text-slate-600">📁 เส้นทาง</div>
                        <div className="text-sm font-mono text-slate-900 break-all mt-2">
                          {status?.model.path}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="text-sm text-slate-600">
                          📅 เทรนครั้งสุดท้าย
                        </div>
                        <div className="text-sm font-semibold text-slate-900 mt-2">
                          {status?.model.lastTrainedAtUtc
                            ? formatThaiDateTime(status.model.lastTrainedAtUtc)
                            : "-"}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="text-sm text-slate-600">
                          💾 เขียนครั้งสุดท้าย
                        </div>
                        <div className="text-sm font-semibold text-slate-900 mt-2">
                          {status?.model.lastWriteUtc
                            ? formatThaiDateTime(status.model.lastWriteUtc)
                            : "-"}
                        </div>
                      </div>
                    </div>

                    {status?.training && (
                      <div className="border-t border-slate-200 pt-4 mt-4">
                        <div className="font-semibold text-slate-900 mb-4">
                          🔄 สถานะการเทรน
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-linear-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                            <div className="text-sm text-orange-600 font-medium">
                              สถานะ
                            </div>
                            <div
                              className={`text-lg font-bold mt-2 ${
                                status.training.isTraining
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }`}
                            >
                              {status.training.isTraining
                                ? "🔄 กำลังเทรน..."
                                : "✓ ว่าง"}
                            </div>
                          </div>
                          <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                            <div className="text-sm text-blue-600 font-medium">
                              สำเร็จครั้งสุดท้าย
                            </div>
                            <div className="text-sm font-semibold text-slate-900 mt-2">
                              {status.training.lastSuccessUtc
                                ? new Date(
                                    status.training.lastSuccessUtc
                                  ).toLocaleString("th-TH")
                                : "-"}
                            </div>
                          </div>
                          <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                            <div className="text-sm text-purple-600 font-medium">
                              แถวสุดท้าย
                            </div>
                            <div className="text-lg font-bold text-slate-900 mt-2">
                              {status.training.lastRows ?? "-"}
                            </div>
                          </div>
                          <div className="bg-linear-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
                            <div className="text-sm text-pink-600 font-medium">
                              ข้อความสุดท้าย
                            </div>
                            <div className="text-sm font-semibold text-slate-900 mt-2 truncate">
                              {status.training.lastMessage ?? "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STATS & CHARTS TAB */}
            {activeTab === "stats" && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-slate-900">
                  📈 สถิติและแผนภูมิ
                </h2>

                {loadingStats ? (
                  <div className="py-12 text-center text-slate-500">
                    กำลังโหลด...
                  </div>
                ) : errStats ? (
                  <div className="py-12 text-center text-red-600 font-medium">
                    โหลดสถิติไม่สำเร็จ
                  </div>
                ) : (
                  <>
                    {/* KEY METRICS */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        เมตริกส์สำคัญ
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Stat
                          label="บันทึกทั้งหมด"
                          value={stats?.totalLogs ?? 0}
                          icon="📝"
                        />
                        <Stat
                          label="บันทึกสถานที่"
                          value={stats?.placeLogs ?? 0}
                          icon="📍"
                        />
                        <Stat
                          label="ผู้ใช้ที่ไม่ซ้ำ"
                          value={stats?.uniqueUsers ?? 0}
                          icon="👥"
                        />
                        <Stat
                          label="สถานที่ที่ไม่ซ้ำ"
                          value={stats?.uniquePlaces ?? 0}
                          icon="🏢"
                        />
                        <Stat
                          label="แถวที่สามารถเทรนได้"
                          value={stats?.rowsTrainable ?? 0}
                          icon="✓"
                        />
                        <Stat
                          label="ข้อมูลตั้งแต่"
                          value={formatThaiDate(stats?.sinceUtc?.slice(0, 10) ?? "-")}
                          icon="📅"
                        />
                      </div>
                    </div>

                    {/* CHARTS */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Actions Pie Chart */}
                      {actionsChartData.length > 0 && (
                        <div className="bg-linear-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6">
                          <h3 className="text-lg font-semibold text-orange-900 mb-4">
                            🎯 สัดส่วนการกระทำ
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={actionsChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                              >
                                {actionsChartData.map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Top Users Bar Chart */}
                      {topUsersChartData.length > 0 && (
                        <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
                          <h3 className="text-lg font-semibold text-blue-900 mb-4">
                            👥 ผู้ใช้ยอดนิยม
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topUsersChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar
                                dataKey="logs"
                                fill="#3b82f6"
                                radius={[8, 8, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Top Places Bar Chart */}
                      {topPlacesChartData.length > 0 && (
                        <div className="bg-linear-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6">
                          <h3 className="text-lg font-semibold text-green-900 mb-4">
                            🏆 สถานที่ยอดนิยม
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topPlacesChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar
                                dataKey="logs"
                                fill="#10b981"
                                radius={[8, 8, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Actions Bar Chart */}
                      {actionsChartData.length > 0 && (
                        <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6">
                          <h3 className="text-lg font-semibold text-purple-900 mb-4">
                            📊 จำนวนการกระทำ
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={actionsChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="actionType"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar
                                dataKey="count"
                                fill="#a855f7"
                                radius={[8, 8, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* DETAILED LISTS */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
                        <div className="font-semibold text-orange-900 mb-3">
                          🎯 การกระทำ
                        </div>
                        <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
                          {stats?.actions && stats.actions.length > 0 ? (
                            stats.actions.map((a, idx) => (
                              <li
                                key={`${a.actionType}-${idx}`}
                                className="flex justify-between"
                              >
                                <span className="text-orange-800">
                                  {a.actionType}
                                </span>
                                <span className="bg-orange-200 px-2 py-1 rounded font-semibold text-orange-900">
                                  {a.count}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="text-orange-600">ไม่มีข้อมูล</li>
                          )}
                        </ul>
                      </div>

                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                        <div className="font-semibold text-blue-900 mb-3">
                          👥 ผู้ใช้ยอดนิยม
                        </div>
                        <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
                          {(() => {
                            const list = stats?.topUsers ?? [];
                            if (list.length === 0)
                              return (
                                <li className="text-blue-600">ไม่มีข้อมูล</li>
                              );

                            const users = list.filter((u) => u.userId != null);
                            const guestLogs = list
                              .filter((u) => u.userId == null)
                              .reduce((sum, u) => sum + (u.logs ?? 0), 0);

                            const merged =
                              guestLogs > 0
                                ? [
                                    ...users,
                                    {
                                      userId: 0,
                                      displayName: "Guest (ทั้งหมด)",
                                      logs: guestLogs,
                                    },
                                  ]
                                : users;

                            return merged.map((u) => (
                              <li
                                key={
                                  u.userId === 0
                                    ? "guest-all"
                                    : `user-${u.userId}`
                                }
                                className="flex justify-between text-blue-800"
                              >
                                <span>
                                  {u.userId === 0 ? "Guest" : `#${u.userId}`}{" "}
                                  {u.displayName}
                                </span>
                                <span className="text-blue-600 font-medium">
                                  {u.logs}
                                </span>
                              </li>
                            ));
                          })()}
                        </ul>
                      </div>

                      <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                        <div className="font-semibold text-green-900 mb-3">
                          🏆 สถานที่ยอดนิยม
                        </div>
                        <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
                          {stats?.topPlaces && stats.topPlaces.length > 0 ? (
                            stats.topPlaces.map((p) => (
                              <li
                                key={p.placeId}
                                className="flex justify-between gap-2 text-green-800"
                              >
                                <span className="truncate">
                                  {p.name ?? `สถานที่ #${p.placeId}`}
                                </span>
                                <span className="text-green-600 font-medium shrink-0">
                                  {p.logs}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="text-green-600">ไม่มีข้อมูล</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CONFIG TAB */}
            {activeTab === "config" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  ⚙️ การตั้งค่าพารามิเตอร์
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
                    <label className="block text-lg font-semibold text-blue-900 mb-3">
                      📅 ย้อนหลังกี่วัน
                    </label>
                    <input
                      type="number"
                      className="w-full border border-blue-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      value={days}
                      min={0}
                      max={3650}
                      onChange={(e) => setDays(Number(e.target.value))}
                    />
                    <div className="text-sm text-blue-700 mt-3">
                      💡 0 = ข้อมูลทั้งหมด
                    </div>
                  </div>

                  <div className="bg-linear-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6">
                    <label className="block text-lg font-semibold text-green-900 mb-3">
                      📊 จำนวนแถวขั้นต่ำ
                    </label>
                    <input
                      type="number"
                      className="w-full border border-green-300 rounded-lg px-4 py-3 text-slate-900 focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                      value={minRows}
                      min={1}
                      max={5000}
                      onChange={(e) => setMinRows(Number(e.target.value))}
                    />
                    <div className="text-sm text-green-700 mt-3">
                      💡 ต้องมีแถวขั้นต่ำนี้เพื่อเทรน
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <p className="text-yellow-900 font-semibold">ℹ️ ข้อมูล</p>
                  <ul className="text-yellow-800 mt-3 space-y-2">
                    <li>
                      • วันปัจจุบัน:{" "}
                      <span className="font-mono">
                        {new Date().toLocaleDateString("th-TH")}
                      </span>
                    </li>
                    <li>
                      • วันที่ย้อนหลัง:{" "}
                      <span className="font-mono">{days} วัน</span>
                    </li>
                    <li>
                      • แถวขั้นต่ำสำหรับเทรน:{" "}
                      <span className="font-mono">{minRows} แถว</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
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
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-900 ">{String(value)}</div>
    </div>
  );
}
