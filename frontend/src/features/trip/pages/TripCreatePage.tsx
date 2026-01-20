import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTripMutation } from "../tripApi";
import DateTimeInput from "../../../components/Inputs/DateTimeInput";

export default function TripCreatePage() {
  const navigate = useNavigate();
  const [createTrip, { isLoading }] = useCreateTripMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!startDate || !endDate) return false;
    return endDate.getTime() > startDate.getTime();
  }, [title, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      alert(
        "กรุณากรอกชื่อทริป และเลือกวันเวลาให้ถูกต้อง (จบทริปต้องหลังเริ่มทริป)"
      );
      return;
    }
    const toLocalISO = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - offset);
      return localDate.toISOString().replace("Z", ""); // ตัด Z ออกเพื่อให้ API มองว่าเป็น Local Time
    };

    const body = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDateTime: toLocalISO(startDate!), // ส่งแบบ 2026-01-07T00:00:00.000
      endDateTime: toLocalISO(endDate!),
    };

    try {
      const created = await createTrip(body).unwrap();
      navigate(`/trip/${created.tripId}`);
    } catch (err) {
      console.error(err);
      alert((err as any)?.data?.errorMessages?.[0] ?? "สร้างทริปไม่สำเร็จ");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium mb-2">
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>สร้างทริปใหม่</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            วางแผนการเดินทาง
          </h1>
          <p className="text-slate-600">
            กรอกข้อมูลเพื่อเริ่มต้นสร้างทริปของคุณ
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Title Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                ชื่อทริป <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="เช่น ทริปกาญจนบุรี 3 วัน 2 คืน"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500 mt-1.5">
                ตั้งชื่อที่สื่อความหมายและจดจำได้ง่าย
              </p>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                รายละเอียด (ไม่บังคับ)
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                placeholder="อธิบายจุดประสงค์ของทริป สถานที่ที่ต้องการไป หรือกิจกรรมที่วางแผนไว้..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                เพิ่มรายละเอียดเพื่อให้การวางแผนมีความชัดเจนมากขึ้น
              </p>
            </div>

            {/* Date/Time Fields */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 text-sm font-semibold mb-4">
                <svg
                  className="w-5 h-5 text-slate-600"
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
                <span>ช่วงเวลาการเดินทาง</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <DateTimeInput
                  label="วันเริ่มต้น"
                  value={startDate}
                  onChange={(d) => {
                    setStartDate(d);
                    if (d && endDate && endDate.getTime() <= d.getTime()) {
                      setEndDate(null);
                    }
                  }}
                  required
                />

                <DateTimeInput
                  label="วันสิ้นสุด"
                  value={endDate}
                  onChange={setEndDate}
                  minDate={startDate ?? undefined}
                  required
                />
              </div>
            </div>

            {/* Validation Message */}
            {startDate &&
              endDate &&
              endDate.getTime() <= startDate.getTime() && (
                <div className="flex items-start gap-3 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <svg
                    className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      วันที่ไม่ถูกต้อง
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      วันสิ้นสุดต้องมาหลังวันเริ่มต้น
                    </p>
                  </div>
                </div>
              )}

            {/* Duration Info */}
            {startDate &&
              endDate &&
              endDate.getTime() > startDate.getTime() && (
                <div className="flex items-start gap-3 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-lg">
                  <svg
                    className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">
                      ระยะเวลาทริป
                    </p>
                    <p className="text-sm text-emerald-600 mt-0.5">
                      {Math.ceil(
                        (endDate.getTime() - startDate.getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      วัน
                    </p>
                  </div>
                </div>
              )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold transition-all hover:bg-slate-50 active:scale-[0.98]"
                onClick={() => navigate(-1)}
              >
                ยกเลิก
              </button>

              <button
                disabled={isLoading || !canSubmit}
                className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold transition-all active:scale-[0.98] ${
                  isLoading || !canSubmit
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                }`}
                type="submit"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    กำลังสร้าง...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    สร้างทริป
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                เคล็ดลับการสร้างทริป
              </h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    ตั้งชื่อที่สื่อความหมาย เช่น "ทริปกาญจนบุรี 3 วัน 2 คืน"
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>เพิ่มรายละเอียดเพื่อช่วยจำจุดประสงค์ของทริป</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>ตรวจสอบวันเวลาให้ถูกต้องก่อนสร้างทริป</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
