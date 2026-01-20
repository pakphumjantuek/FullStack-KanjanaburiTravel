import React, { useMemo, useState, useEffect } from "react";
import {
  useGetMyInterestsQuery,
  useReplaceMyInterestsMutation,
} from "../../features/interests/interestApi";

// ... (ส่วนประกาศ CONST และ Helper Function เหมือนเดิม ไม่ต้องแก้) ...
const DEFAULT_KEYS = [
  { key: "food", label: "🍜 อาหารพื้นถิ่น" },
  { key: "culture", label: "🎭 วัฒนธรรม" },
  { key: "history", label: "📚 ประวัติศาสตร์" },
  { key: "nature", label: "🌿 ธรรมชาติ" },
  { key: "community", label: "👥 ชุมชน/วิถีชีวิต" },
];

const PRESET_LEVELS = [
  { value: 0, label: "ไม่สนใจ" },
  { value: 0.33, label: "ต่ำ" },
  { value: 0.66, label: "ปานกลาง" },
  { value: 1, label: "สูง" },
];

type InterestState = Record<string, number>;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const getColorClass = (value: number): string => {
  if (value < 0.25) return "bg-slate-200 text-slate-600";
  if (value < 0.5) return "bg-yellow-400 text-yellow-900";
  if (value < 0.75) return "bg-orange-400 text-white";
  return "bg-rose-500 text-white";
};

const getLevelLabel = (value: number): string => {
  if (value === 0) return "ไม่สนใจ";
  if (value < 0.35) return "ต่ำ";
  if (value < 0.7) return "ปานกลาง";
  return "สูง";
};
// ... (จบส่วน Helper Function) ...

const UserInterestsPage: React.FC = () => {
  const { data, isLoading, error } = useGetMyInterestsQuery();
  const [replaceInterests, { isLoading: isSaving }] = useReplaceMyInterestsMutation();
  const [successMessage, setSuccessMessage] = useState("");

  const initialMap = useMemo(() => {
    const map: InterestState = {};
    DEFAULT_KEYS.forEach((x) => (map[x.key] = 0.2));
    (data ?? []).forEach((x) => (map[x.interestKey] = x.weight));
    return map;
  }, [data]);

  const [local, setLocal] = useState<InterestState>({});

  useEffect(() => {
    setLocal(initialMap);
  }, [initialMap]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const errorMessage = (error as any)?.data?.errorMessages?.[0] ?? (error as any)?.error ?? "";

  const onChange = (key: string, value: number) => {
    setLocal((prev) => ({ ...prev, [key]: clamp01(value) }));
  };

  const onSave = async () => {
    try {
      const items = Object.entries(local).map(([interestKey, weight]) => ({
        interestKey,
        weight,
      }));
      await replaceInterests({ items }).unwrap();
      setSuccessMessage("✅ บันทึกความสนใจสำเร็จแล้ว!");
    } catch { /* Handled by RTK Query */ }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-pulse text-slate-500 flex items-center gap-2">
        <span className="animate-spin text-xl">⏳</span> กำลังโหลด...
      </div>
    </div>
  );

  if (errorMessage) return (
    <div className="max-w-3xl mx-auto mt-10 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
      ❌ {errorMessage}
    </div>
  );

  return (
    // ปรับ max-w ให้กว้างขึ้นเล็กน้อยเพื่อให้ 2 คอลัมน์ดูไม่อึดอัด (จาก 2xl เป็น 3xl)
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header className="mb-8 text-center md:text-left">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">🎯 ความสนใจของฉัน</h2>
        <p className="text-slate-500">ปรับน้ำหนักความสนใจเพื่อให้ระบบแนะนำสถานที่ท่องเที่ยวได้ตรงใจ</p>
      </header>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-center animate-in fade-in slide-in-from-top-4 duration-300">
          {successMessage}
        </div>
      )}

      {/* --- จุดแก้ไขหลัก: เปลี่ยนเป็น Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEFAULT_KEYS.map((item, index) => {
          const value = local[item.key] ?? 0;
          const levelLabel = getLevelLabel(value);
          const colorClass = getColorClass(value);

          // เช็คว่าเป็นตัวสุดท้ายและเป็นเลขคี่หรือไม่ (เพื่อให้ตัวสุดท้ายขยายเต็มจอ ถ้าต้องการ)
          // ถ้าไม่ต้องการให้ตัวสุดท้ายขยายเต็ม ให้ลบ logic 'isLastItemOdd' ออกได้เลย
          const isLastItemOdd = index === DEFAULT_KEYS.length - 1 && DEFAULT_KEYS.length % 2 !== 0;

          return (
            <div 
              key={item.key} 
              className={`p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all 
                ${isLastItemOdd ? 'md:col-span-2' : ''} 
              `}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                    {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors duration-300 ${colorClass}`}>
                    {levelLabel}
                  </span>
                </div>
              </div>

              {/* Slider */}
              <div className="flex items-center gap-3 mb-4">
                 <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={value}
                    onChange={(e) => onChange(item.key, Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-mono font-bold text-slate-400 w-8 text-right">
                    {value.toFixed(2)}
                  </span>
              </div>

              {/* Preset Buttons - ปรับขนาดให้เล็กลงนิดหน่อยเพื่อให้พอดีกับ 2 คอลัมน์ */}
              <div className="grid grid-cols-4 gap-1">
                {PRESET_LEVELS.map((preset) => {
                  const isActive = Math.abs(value - preset.value) < 0.05;
                  return (
                    <button
                      key={preset.value}
                      onClick={() => onChange(item.key, preset.value)}
                      className={`py-1.5 rounded text-[10px] sm:text-xs font-medium transition-all duration-200 border text-center
                        ${isActive 
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                          : "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50"}`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`py-3 px-6 rounded-xl font-bold text-white transition-all shadow-sm
            ${isSaving 
              ? "bg-slate-300 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]"}`}
        >
          {isSaving ? "⌛ กำลังบันทึก..." : "💾 บันทึก"}
        </button>
        <button
          onClick={() => confirm("ต้องการรีเซ็ตกลับเป็นค่าเริ่มต้น?") && setLocal(initialMap)}
          disabled={isSaving}
          className="py-3 px-6 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98]"
        >
          🔄 รีเซ็ต
        </button>
      </div>
    </div>
  );
};

export default UserInterestsPage;