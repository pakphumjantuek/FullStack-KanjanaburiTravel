import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
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
import { confirmDelete } from "../../../utils";
import { message } from "antd";
import { 
  ArrowLeft, 
  Save, 
  RotateCcw, 
  Trash2, 
  Clock, 
  CalendarClock,
  Info
} from "lucide-react";
import { Loading } from "../../../components/Loading";

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-lg max-w-md">
           <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Info className="text-red-600 w-6 h-6" />
           </div>
           <h3 className="text-lg font-semibold text-slate-800 mb-2">ไม่พบข้อมูลสถานที่</h3>
           <p className="text-slate-500 mb-6">รหัสสถานที่ (ID) ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง</p>
           <button onClick={() => navigate(-1)} className="text-blue-600 font-medium hover:underline">ย้อนกลับ</button>
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
      message.success("สร้างเวลาเริ่มต้นสำเร็จ");
    } catch (e: any) {
      message.error(e?.data?.errorMessages?.[0] ?? "สร้างเวลาเริ่มต้นไม่สำเร็จ");
    }
  };

  const handleSaveWeekly = async () => {
    const msg = validateWeek(week);
    if (msg) return message.warning(msg);

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
      message.success("บันทึกข้อมูลเรียบร้อย");
    } catch (e: any) {
      message.error(e?.data?.errorMessages?.[0] ?? "บันทึกไม่สำเร็จ");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete(
      "คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตเวลาเปิด-ปิด ทั้งหมด?"
    );
    if (!confirmed) return;
    try {
      await deleteByPlace(placeId).unwrap();
      setWeek(buildDefaultWeek());
      message.success("รีเซ็ตข้อมูลแล้ว");
    } catch (e: any) {
       message.error(e?.data?.errorMessages?.[0] ?? "ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full px-4 py-8 md:px-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <button
            className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                 <Clock className="w-8 h-8 text-blue-600" />
                 เวลาทำการ
              </h1>
              <p className="text-slate-500 mt-2 text-lg">
                 กำหนดเวลาเปิด-ปิดของ <span className="font-semibold text-slate-700">{placeName}</span>
              </p>
           </div>
           
           <div className="flex items-center gap-3">
              <button
                 onClick={() => refetch()}
                 disabled={isFetching}
                 className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                 title="รีเฟรชข้อมูล"
              >
                 <RotateCcw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg font-medium transition-colors"
              >
                 <Trash2 className="w-4 h-4" /> รีเซ็ต
              </button>

              <button
                onClick={handleSaveWeekly}
                disabled={isSaving || isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all active:translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                 <Save className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Loading / Error states */}
        {isLoading ? (
             <div className="bg-white border rounded-2xl p-12 flex justify-center shadow-sm">
                <Loading />
             </div>
        ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center text-red-800">
               <p className="font-semibold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
               <button onClick={() => refetch()} className="text-sm underline mt-2">ลองใหม่อีกครั้ง</button>
            </div>
        ) : (
           <div className="bg-white border text-card-foreground shadow-sm rounded-2xl overflow-hidden relative">
              
              {/* Overlay for "No Data" with action to create default */}
              {!isLoading && !hasOpeningHours && (
                 <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                       <CalendarClock className="w-8 h-8"/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">ยังไม่มีการกำหนดเวลาทำการ</h3>
                    <p className="text-slate-500 mb-6 max-w-md">
                       ท่านสามารถสร้างตารางเวลาเริ่มต้น (09:00 - 18:00 น. ทุกวัน) ได้ทันที หรือกำหนดเองทีละวัน
                    </p>
                    <button
                       onClick={handleCreateDefault}
                       disabled={isCreating}
                       className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
                    >
                       {isCreating ? "กำลังสร้าง..." : "สร้างเวลาทำการเริ่มต้น"}
                    </button>
                 </div>
              )}

              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase tracking-wider">
                 <div className="col-span-3">วันในสัปดาห์</div>
                 <div className="col-span-3">เวลาเปิด</div>
                 <div className="col-span-3">เวลาปิด</div>
                 <div className="col-span-3 text-center">สถานะ</div>
              </div>

              {/* List */}
              <div className="divide-y divide-slate-100">
                 {week.map((d) => (
                    <div 
                       key={d.dayOfWeek}
                       className={`group transition-colors ${d.isClosed ? 'bg-slate-50/50' : 'hover:bg-blue-50/20'}`}
                    >
                       <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center">
                          
                          {/* Day Label */}
                          <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm border ${
                                d.isClosed 
                                   ? 'bg-slate-100 text-slate-400 border-slate-200' 
                                   : 'bg-white text-blue-600 border-blue-100'
                             }`}>
                                {dayNames[d.dayOfWeek].charAt(0)}
                             </div>
                             <span className={`font-semibold ${d.isClosed ? 'text-slate-400' : 'text-slate-800'}`}>
                                {dayNames[d.dayOfWeek]}
                             </span>
                          </div>
                          
                          {/* Inputs Container */}
                          <div className={`col-span-1 md:col-span-6 grid grid-cols-2 gap-4 transition-opacity duration-200 ${d.isClosed ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                              <div className="relative">
                                 <input
                                    type="time"
                                    value={d.openTime}
                                    onChange={(e) => onChangeTime(d.dayOfWeek, "openTime", e.target.value)}
                                    className="w-full pl-3 pr-2 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-mono text-center"
                                 />
                                 <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">เปิด</span>
                              </div>
                              <div className="relative">
                                 <input
                                    type="time"
                                    value={d.closeTime}
                                    onChange={(e) => onChangeTime(d.dayOfWeek, "closeTime", e.target.value)}
                                    className="w-full pl-3 pr-2 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-mono text-center"
                                 />
                                 <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-400 font-medium">ปิด</span>
                              </div>
                          </div>

                          {/* Status / Toggle */}
                          <div className="col-span-1 md:col-span-3 flex items-center justify-between md:justify-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                             <div className="md:hidden text-sm text-slate-500 font-medium">สถานะร้าน</div>
                             
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                   type="checkbox" 
                                   className="sr-only peer"
                                   checked={!d.isClosed}
                                   onChange={() => onToggleClosed(d.dayOfWeek)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                <span className={`ml-3 text-sm font-medium w-16 ${!d.isClosed ? 'text-emerald-600' : 'text-slate-400'}`}>
                                   {!d.isClosed ? 'เปิดทำการ' : 'ปิด'}
                                </span>
                             </label>
                          </div>
                          
                       </div>
                    </div>
                 ))}
              </div>
              
              <div className="bg-slate-50 border-t p-4 flex items-start gap-3">
                 <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"/>
                 <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">คำแนะนำ</p>
                    <p>• ระบบแสดงเวลาแบบ 24 ชั่วโมง (เช่น 09:00, 18:30)</p>
                    <p>• หากร้านเปิดข้ามวัน (เช่น 18:00 - 02:00) กรุณาแบ่งช่วงเวลาเป็น 2 วัน (วันแรก 18:00-23:59, วันถัดไป 00:00-02:00) หรือระบุหมายเหตุเพิ่มเติมในรายละเอียดร้าน</p>
                 </div>
              </div>

           </div>
        )}
      </div>
    </div>
  );
}
