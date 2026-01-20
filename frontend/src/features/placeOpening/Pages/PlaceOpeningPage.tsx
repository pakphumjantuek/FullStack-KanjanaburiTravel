import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  useGetPlaceOpeningQuery,
  useCreateDefaultOpeningMutation,
  useUpsertOpeningWeeklyMutation,
  useDeleteOpeningByPlaceMutation,
} from "../placeOpenApi";
import {
  dayNames,
  type UpsertOpeningHourDto,
  type UpsertWeeklyOpeningHoursDto,
} from "../placetype";
import type { PlaceType } from "../placetype";
import { confirmDelete, showSuccessOk } from "../../../utils";
import { useNavigate } from "react-router-dom";

// รองรับ "09:00", "09:00:00", "09:00:00.0000000"
function toHHmm(time?: string | null) {
  const t = (time ?? "").trim();
  const [h = "09", m = "00"] = t.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function buildDefaultWeek(): UpsertOpeningHourDto[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    openTime: "09:00",
    closeTime: "18:00",
    isClosed: false,
  }));
}

export default function PlaceOpeningPage() {
  const placeId = Number(useParams().placeId);
  const placeName = useLocation().state?.placeName ?? "สถานที่นี้";
  const navigate = useNavigate();

  if (!Number.isFinite(placeId) || placeId <= 0) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          placeId ไม่ถูกต้อง
        </div>
      </div>
    );
  }


  const { data, isLoading, isFetching, error, refetch } =
    useGetPlaceOpeningQuery(placeId);

  const [createDefault, { isLoading: isCreating }] =
    useCreateDefaultOpeningMutation();
  const [upsertWeekly, { isLoading: isSaving }] =
    useUpsertOpeningWeeklyMutation();
  const [deleteByPlace, { isLoading: isDeleting }] =
    useDeleteOpeningByPlaceMutation();

  const [week, setWeek] = useState<UpsertOpeningHourDto[]>(buildDefaultWeek);

  const hasOpeningHours = Array.isArray(data) && data.length > 0;

  // โหลดค่าเดิมจาก backend (data เป็น array) แล้วเติมให้ครบ 7 วัน
  useEffect(() => {
    if (!Array.isArray(data)) return;

    const map = new Map<number, PlaceType>();
    for (const oh of data) {
      const d = Number(oh.dayOfWeek);
      if (Number.isFinite(d)) map.set(d, oh);
    }

    setWeek(
      Array.from({ length: 7 }, (_, i) => {
        const oh = map.get(i);
        return {
          dayOfWeek: i,
          openTime: toHHmm(oh?.openTime ?? "09:00"),
          closeTime: toHHmm(oh?.closeTime ?? "18:00"),
          isClosed: Boolean(oh?.isClosed),
        };
      })
    );
  }, [data]);

  const onToggleClosed = (day: number) => {
    setWeek((prev) =>
      prev.map((x) =>
        x.dayOfWeek === day ? { ...x, isClosed: !x.isClosed } : x
      )
    );
  };

  const onChangeTime = (
    day: number,
    field: "openTime" | "closeTime",
    value: string
  ) => {
    setWeek((prev) =>
      prev.map((x) => (x.dayOfWeek === day ? { ...x, [field]: value } : x))
    );
  };

  const validateWeek = (items: UpsertOpeningHourDto[]) => {
    for (const it of items) {
      if (it.isClosed) continue;
      if (!it.openTime || !it.closeTime)
        return "กรุณากรอกเวลาเปิดและเวลาปิดให้ครบ";
      if (it.closeTime < it.openTime)
        return `วัน${dayNames[it.dayOfWeek]}: เวลาปิดต้องไม่น้อยกว่าเวลาเปิด`;
    }
    return null;
  };

  const handleCreateDefault = async () => {
    try {
      await createDefault({
        placeId,
        body: { openTime: "09:00:00", closeTime: "18:00:00" },
      }).unwrap();
      await refetch();
      alert("สร้างเวลาเริ่มต้นสำเร็จ");
    } catch (e: any) {
      alert(
        e?.data?.errorMessages?.[0] ??
          e?.message ??
          "สร้างเวลาเริ่มต้นไม่สำเร็จ"
      );
    }
  };

  const handleSaveWeekly = async () => {
    const msg = validateWeek(week);
    if (msg) return alert(msg);

    const toHHmmss = (t: string) => (t.length === 5 ? `${t}:00` : t);

    const payload: UpsertWeeklyOpeningHoursDto = {
      items: week.map((x) => ({
        ...x,
        openTime: toHHmmss(x.openTime),
        closeTime: toHHmmss(x.closeTime),
      })),
    };

    try {
      await upsertWeekly({ placeId, body: payload }).unwrap();
      await refetch();
      showSuccessOk("บันทึกสำเร็จ");
    } catch (e: any) {
      alert(e?.data?.errorMessages?.[0] ?? e?.message ?? "บันทึกไม่สำเร็จ");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete(
      "คุณแน่ใจหรือไม่ว่าต้องการลบ/รีเซ็ตเวลาเปิด–ปิดทั้งหมดของสถานที่นี้?"
    );
    if (!confirmed) return;
    try {
      await deleteByPlace(placeId).unwrap();
      setWeek(buildDefaultWeek());
      showSuccessOk("ลบสำเร็จ");
    } catch (e: any) {
      alert(e?.data?.errorMessages?.[0] ?? e?.message ?? "ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">เวลาเปิด–ปิดสถานที่</h1>
        <p className="mt-1 text-sm text-gray-600">
          ชื่อสถานที่:{" "}
          <span className="font-semibold text-gray-800">{placeName}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          onClick={() => navigate(-1)}
          disabled={isFetching}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          กลับ
        </button>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          รีเฟรช
        </button>

        <button
          onClick={handleSaveWeekly}
          disabled={isSaving || isLoading || isFetching}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "กำลังบันทึก..." : "บันทึกทั้งสัปดาห์"}
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "กำลังลบ..." : "ลบ/รีเซ็ต"}
        </button>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="mt-1 text-xs">
            กรุณาตรวจสอบการเชื่อมต่อหรือดูรายละเอียดในคอนโซล
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasOpeningHours && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-5">
          <p className="font-medium text-amber-900">
            ยังไม่มีเวลาเปิด–ปิดสำหรับสถานที่นี้
          </p>
          <p className="mt-1 text-sm text-amber-800">
            กรุณาสร้างข้อมูลเวลาเปิด–ปิดเพื่อให้ผู้ใช้ทราบเวลาบริการ
          </p>
          <button
            onClick={handleCreateDefault}
            disabled={isCreating}
            className="mt-4 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating
              ? "กำลังสร้าง..."
              : "สร้างเวลาเปิด–ปิดมาตรฐาน (09:00–18:00)"}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
        <div className="grid grid-cols-12 gap-3 bg-gray-100 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
          <div className="col-span-3">วัน</div>
          <div className="col-span-3">เวลาเปิด</div>
          <div className="col-span-3">เวลาปิด</div>
          <div className="col-span-2">ปิดสถานที่</div>
          <div className="col-span-1 text-left">สถานะ</div>
        </div>

        <div className="divide-y divide-gray-200">
          {week.map((d) => (
            <div
              key={d.dayOfWeek}
              className="grid grid-cols-12 items-center gap-3 px-6 py-4 hover:bg-gray-50"
            >
              <div className="col-span-3 text-sm font-semibold text-gray-900">
                {dayNames[d.dayOfWeek]}
              </div>

              <div className="col-span-3">
                <input
                  type="time"
                  value={d.openTime}
                  disabled={d.isClosed}
                  onChange={(e) =>
                    onChangeTime(d.dayOfWeek, "openTime", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div className="col-span-3">
                <input
                  type="time"
                  value={d.closeTime}
                  disabled={d.isClosed}
                  onChange={(e) =>
                    onChangeTime(d.dayOfWeek, "closeTime", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={d.isClosed}
                    onChange={() => onToggleClosed(d.dayOfWeek)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                  />
                  ปิด
                </label>
              </div>

              <div className="col-span-1 flex items-center justify-center">
                {!d.isClosed ? (
                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-green-100 px-4 py-1.5 text-xs font-semibold text-green-800">
                    {d.openTime}–{d.closeTime}
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-700">
                    ปิด
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-medium text-gray-700">💡 หมายเหตุ</p>
        <p className="mt-2 text-xs text-gray-600">
          ระบบนี้ไม่รองรับการเปิดข้ามวัน (เช่น 18:00–02:00) โปรดตั้งค่าเวลาเปิด–ปิดของแต่ละวันแยกกัน
        </p>
      </div>
    </div>
  );
}
