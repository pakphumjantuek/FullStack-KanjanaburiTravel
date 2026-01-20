import { useEffect, useMemo, useState } from "react";
import { useGetAllPlaceTagQuery } from "../../placeTag/placeTagApi";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (data: {
    days: number;
    hoursPerDay: number;
    preferredTagNames: string[];
    relaxedPace: number;
    budgetLevel: number;
    withElderOrKids: boolean;
  }) => void;
};

type UiTag = { tagId: number; tagName: string; count: number };

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const AutoTripModal = ({ open, loading, onClose, onConfirm }: Props) => {
  // -------------------------
  // Load PlaceTag (Paged)
  // -------------------------
  const { data: placeTagPaged, isLoading } = useGetAllPlaceTagQuery({
    page: 1,
    pageSize: 500, // เอาเยอะ ๆ กันตกหล่น (ปรับได้)
    search: "",
  });

  // ✅ บังคับให้เป็น array เสมอ (กัน undefined / shape ไม่ตรง)
  const placeTags: any[] = Array.isArray((placeTagPaged as any)?.items)
    ? ((placeTagPaged as any).items as any[])
    : [];

  // -------------------------
  // Convert PlaceTag[] -> unique Tag[] (sorted by popularity-ish)
  // -------------------------
  const tags: UiTag[] = useMemo(() => {
    const map = new Map<number, UiTag>();

    for (const pt of placeTags) {
      // รองรับหลาย shape:
      // - pt.tag.tagId / pt.tag.tagName
      // - pt.tagId / pt.tagName
      const tagId = pt?.tag?.tagId ?? pt?.tagId;
      const tagName = pt?.tag?.tagName ?? pt?.tagName;

      if (!tagId || !tagName) continue;

      if (!map.has(tagId)) map.set(tagId, { tagId, tagName, count: 0 });
      map.get(tagId)!.count++;
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [placeTags]);

  // -------------------------
  // Form state
  // -------------------------
  const [days, setDays] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [relaxedPace, setRelaxedPace] = useState(0.5);
  const [budgetLevel, setBudgetLevel] = useState(0.5);
  const [withElderOrKids, setWithElderOrKids] = useState(false);

  // Reset form when open
  useEffect(() => {
    if (!open) return;
    setDays(1);
    setHoursPerDay(8);
    setSelectedTags([]);
    setRelaxedPace(0.5);
    setBudgetLevel(0.5);
    setWithElderOrKids(false);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            สร้างทริปอัตโนมัติ
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Days / Hours */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">กี่วัน</label>
            <input
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(clamp(Number(e.target.value || 1), 1, 7))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <div className="mt-1 text-xs text-gray-500">1–7 วัน</div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              ชั่วโมง/วัน
            </label>
            <input
              type="number"
              min={4}
              max={14}
              value={hoursPerDay}
              onChange={(e) =>
                setHoursPerDay(clamp(Number(e.target.value || 8), 4, 14))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <div className="mt-1 text-xs text-gray-500">4–14 ชม.</div>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-700">แนวที่ชอบ</div>
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700"
            >
              ล้าง
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              <span className="text-xs text-gray-500">กำลังโหลดแท็ก...</span>
            ) : tags.length === 0 ? (
              <span className="text-xs text-gray-500">ยังไม่มีแท็กในระบบ</span>
            ) : (
              tags.map((tag) => {
                const active = selectedTags.includes(tag.tagName);
                return (
                  <button
                    key={tag.tagId}
                    type="button"
                    onClick={() => {
                      setSelectedTags((prev) =>
                        prev.includes(tag.tagName)
                          ? prev.filter((t) => t !== tag.tagName)
                          : [...prev, tag.tagName]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                    }`}
                    title={`พบ ${tag.count} แห่ง`}
                  >
                    {tag.tagName}
                    <span
                      className={`ml-1 ${
                        active ? "text-purple-100" : "text-gray-400"
                      }`}
                    >
                      · {tag.count}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            *เลือกได้หลายแท็ก (ส่งเป็น TagName ไป backend)
          </div>
        </div>

        {/* Pace */}
        <div className="mb-4">
          <div className="flex justify-between text-sm font-semibold text-gray-700 mb-1">
            <span>ความชิลของทริป</span>
            <span>{Math.round(relaxedPace * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={relaxedPace}
            onChange={(e) =>
              setRelaxedPace(clamp(Number(e.target.value), 0, 1))
            }
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>แน่น</span>
            <span>ชิล</span>
          </div>
        </div>

        {/* Budget */}
        <div className="mb-4">
          <div className="flex justify-between text-sm font-semibold text-gray-700 mb-1">
            <span>งบประมาณ</span>
            <span>{Math.round(budgetLevel * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={budgetLevel}
            onChange={(e) => setBudgetLevel(clamp(Number(e.target.value), 0, 1))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>ประหยัด</span>
            <span>แพงได้</span>
          </div>
        </div>

        {/* Elder */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-700">
              มีเด็ก / ผู้สูงอายุ
            </div>
            <div className="text-xs text-gray-500 mt-1">
              แนะนำให้ทริปชิลขึ้นและจุดน้อยลง (ฝั่ง backend ปรับ logic ต่อได้)
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWithElderOrKids((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              withElderOrKids
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {withElderOrKids ? "ใช่" : "ไม่ใช่"}
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-60"
          >
            ยกเลิก
          </button>

          <button
            disabled={loading}
            onClick={() =>
              onConfirm({
                days,
                hoursPerDay,
                preferredTagNames: selectedTags,
                relaxedPace,
                budgetLevel,
                withElderOrKids,
              })
            }
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "กำลังสร้าง..." : "สร้างทริป"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoTripModal;
