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

const pct = (v: number) => Math.round(v * 100);

const paceLabel = (v: number) => {
  if (v <= 0.3) return "แน่น";
  if (v <= 0.7) return "พอดี";
  return "ชิล";
};

const budgetLabel = (v: number) => {
  if (v <= 0.3) return "ประหยัด";
  if (v <= 0.7) return "กลาง ๆ";
  return "จัดเต็ม";
};

const steps = [
  { key: "time", title: "เวลา" },
  { key: "tags", title: "แนวที่ชอบ" },
  { key: "style", title: "สไตล์ทริป" },
  { key: "summary", title: "สรุป" },
] as const;

type StepKey = (typeof steps)[number]["key"];

const Stepper = ({ stepIndex }: { stepIndex: number }) => {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const active = i === stepIndex;
        const done = i < stepIndex;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                done
                  ? "bg-purple-600 border-purple-600 text-white"
                  : active
                  ? "bg-purple-50 border-purple-300 text-purple-700"
                  : "bg-white border-gray-200 text-gray-400"
              }`}
              title={s.title}
            >
              {i + 1}
            </div>
            <div
              className={`hidden sm:block text-sm font-semibold ${
                active ? "text-gray-900" : done ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {s.title}
            </div>
            {i !== steps.length - 1 && (
              <div className={`h-[2px] w-8 sm:w-12 ${done ? "bg-purple-600" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const AutoTripModalWizard = ({ open, loading, onClose, onConfirm }: Props) => {
  // -------------------------
  // Load PlaceTag (Paged)
  // -------------------------
  const { data: placeTagPaged, isLoading } = useGetAllPlaceTagQuery({
    page: 1,
    pageSize: 500,
    search: "",
  });

  const placeTags: any[] = Array.isArray((placeTagPaged as any)?.items)
    ? ((placeTagPaged as any).items as any[])
    : [];

  const tags: UiTag[] = useMemo(() => {
    const map = new Map<number, UiTag>();

    for (const pt of placeTags) {
      const tagId = pt?.tag?.tagId ?? pt?.tagId;
      const tagName = pt?.tag?.tagName ?? pt?.tagName;
      if (!tagId || !tagName) continue;

      if (!map.has(tagId)) map.set(tagId, { tagId, tagName, count: 0 });
      map.get(tagId)!.count++;
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [placeTags]);

  // -------------------------
  // Wizard state
  // -------------------------
  const [stepIndex, setStepIndex] = useState(0);

  // -------------------------
  // Form state
  // -------------------------
  const [days, setDays] = useState(2);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [relaxedPace, setRelaxedPace] = useState(0.6);
  const [budgetLevel, setBudgetLevel] = useState(0.5);
  const [withElderOrKids, setWithElderOrKids] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  // Reset when open
  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setDays(2);
    setHoursPerDay(8);
    setSelectedTags([]);
    setRelaxedPace(0.6);
    setBudgetLevel(0.5);
    setWithElderOrKids(false);
    setTagSearch("");
  }, [open]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    const popularFirst = tags.slice(0, 40);
    if (!q) return popularFirst;

    return tags
      .filter((t) => t.tagName.toLowerCase().includes(q))
      .slice(0, 60);
  }, [tags, tagSearch]);

  const summary = useMemo(() => {
    const tagText =
      selectedTags.length === 0 ? "ไม่เลือกแนว (สุ่มให้เหมาะ)" : selectedTags.join(", ");
    return {
      daysText: `${days} วัน`,
      hoursText: `${hoursPerDay} ชม./วัน`,
      paceText: `${paceLabel(relaxedPace)} (${pct(relaxedPace)}%)`,
      budgetText: `${budgetLabel(budgetLevel)} (${pct(budgetLevel)}%)`,
      elderText: withElderOrKids ? "มี" : "ไม่มี",
      tagText,
    };
  }, [days, hoursPerDay, relaxedPace, budgetLevel, withElderOrKids, selectedTags]);

  const canGoNext = useMemo(() => {
    const step: StepKey = steps[stepIndex].key;
    if (step === "time") {
      return days >= 1 && days <= 7 && hoursPerDay >= 4 && hoursPerDay <= 14;
    }
    if (step === "tags") {
      // ไม่บังคับเลือกแท็ก (ให้ผ่านได้)
      return true;
    }
    if (step === "style") {
      return relaxedPace >= 0 && relaxedPace <= 1 && budgetLevel >= 0 && budgetLevel <= 1;
    }
    return true;
  }, [stepIndex, days, hoursPerDay, relaxedPace, budgetLevel]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const submit = () => {
    onConfirm({
      days,
      hoursPerDay,
      preferredTagNames: selectedTags,
      relaxedPace,
      budgetLevel,
      withElderOrKids,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">สร้างทริปอัตโนมัติ</h2>
              <p className="text-sm text-gray-600 mt-1">
                ทำทีละขั้น จะง่ายและไม่รก 🙂
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <div className="mt-4">
            <Stepper stepIndex={stepIndex} />
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* STEP 1: TIME */}
          {steps[stepIndex].key === "time" && (
            <section className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Step 1: เลือกเวลาเที่ยว</h3>
                <p className="text-sm text-gray-600 mt-1">
                  กำหนดคร่าว ๆ ก่อน เดี๋ยวเราจัดแพลนให้
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">กี่วัน</label>
                    <span className="text-xs text-gray-500">1–7 วัน</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {[1, 2, 3, 4].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDays(d)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          days === d
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                        }`}
                      >
                        {d} วัน
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={days}
                    onChange={(e) => setDays(clamp(Number(e.target.value || 1), 1, 7))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">ชั่วโมง/วัน</label>
                    <span className="text-xs text-gray-500">4–14 ชม.</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {[6, 8, 10, 12].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHoursPerDay(h)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          hoursPerDay === h
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                        }`}
                      >
                        {h} ชม.
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    min={4}
                    max={14}
                    value={hoursPerDay}
                    onChange={(e) =>
                      setHoursPerDay(clamp(Number(e.target.value || 8), 4, 14))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
              </div>
            </section>
          )}

          {/* STEP 2: TAGS */}
          {steps[stepIndex].key === "tags" && (
            <section className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Step 2: เลือกแนวที่ชอบ</h3>
                <p className="text-sm text-gray-600 mt-1">
                  เลือกได้หลายแท็ก หรือข้ามได้ถ้าไม่แน่ใจ
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-700">
                    แนวที่ชอบ {selectedTags.length > 0 && `(${selectedTags.length})`}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    ล้าง
                  </button>
                </div>

                <input
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="ค้นหาแท็ก เช่น คาเฟ่, ธรรมชาติ..."
                  className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                />

                <div className="mt-3 flex flex-wrap gap-2 max-h-48 overflow-auto pr-1">
                  {isLoading ? (
                    <span className="text-xs text-gray-500">กำลังโหลดแท็ก...</span>
                  ) : filteredTags.length === 0 ? (
                    <span className="text-xs text-gray-500">ไม่พบแท็กที่ค้นหา</span>
                  ) : (
                    filteredTags.map((tag) => {
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            active
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                          }`}
                          title={`พบ ${tag.count} แห่ง`}
                        >
                          {tag.tagName}
                          <span
                            className={`ml-1 ${active ? "text-purple-100" : "text-gray-400"}`}
                          >
                            · {tag.count}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  *ถ้าไม่เลือกแท็ก ระบบจะจัดให้แบบเหมาะ ๆ
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: STYLE */}
          {steps[stepIndex].key === "style" && (
            <section className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">Step 3: ปรับสไตล์ทริป</h3>
                <p className="text-sm text-gray-600 mt-1">ปรับได้ตามความชอบ</p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 space-y-5">
                {/* Pace */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold text-gray-700">ความชิลของทริป</div>
                    <div className="text-xs font-semibold text-gray-600">
                      {paceLabel(relaxedPace)} · {pct(relaxedPace)}%
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={relaxedPace}
                    onChange={(e) => setRelaxedPace(clamp(Number(e.target.value), 0, 1))}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>แน่น</span>
                    <span>ชิล</span>
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-semibold text-gray-700">งบประมาณ</div>
                    <div className="text-xs font-semibold text-gray-600">
                      {budgetLabel(budgetLevel)} · {pct(budgetLevel)}%
                    </div>
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

                {/* Elder/Kids toggle */}
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4 bg-gray-50">
                  <div>
                    <div className="text-sm font-bold text-gray-800">มีเด็ก / ผู้สูงอายุ</div>
                    <div className="text-xs text-gray-500 mt-1">
                      ระบบจะทำให้ทริปชิลขึ้นและจุดน้อยลง
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWithElderOrKids((v) => !v)}
                    className={`relative inline-flex h-9 w-16 items-center rounded-full transition ${
                      withElderOrKids ? "bg-green-600" : "bg-gray-300"
                    }`}
                    aria-label="Toggle elder/kids"
                  >
                    <span
                      className={`inline-block h-7 w-7 transform rounded-full bg-white transition ${
                        withElderOrKids ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STEP 4: SUMMARY */}
          {steps[stepIndex].key === "summary" && (
            <section className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Step 4: สรุปก่อนสร้างทริป</h3>
                <p className="text-sm text-gray-600 mt-1">
                  ตรวจดูอีกครั้ง ถ้าถูกใจแล้วกด “สร้างทริป”
                </p>
              </div>

              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                <div className="text-sm font-bold text-gray-800 mb-2">สรุปที่เลือก</div>
                <div className="text-sm text-gray-700 grid grid-cols-2 gap-y-2">
                  <div>
                    ระยะเวลา: <span className="font-semibold">{summary.daysText}</span>
                  </div>
                  <div>
                    เวลาเที่ยว: <span className="font-semibold">{summary.hoursText}</span>
                  </div>
                  <div>
                    ความชิล: <span className="font-semibold">{summary.paceText}</span>
                  </div>
                  <div>
                    งบ: <span className="font-semibold">{summary.budgetText}</span>
                  </div>
                  <div className="col-span-2">
                    เด็ก/ผู้สูงอายุ: <span className="font-semibold">{summary.elderText}</span>
                  </div>
                  <div className="col-span-2">
                    แนวที่ชอบ: <span className="font-semibold">{summary.tagText}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <button
            onClick={stepIndex === 0 ? onClose : goBack}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 disabled:opacity-60"
          >
            {stepIndex === 0 ? "ยกเลิก" : "ย้อนกลับ"}
          </button>

          <div className="flex items-center gap-2">
            {steps[stepIndex].key !== "summary" ? (
              <button
                onClick={goNext}
                disabled={loading || !canGoNext}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "กำลังสร้าง..." : "สร้างทริป"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTripModalWizard;
