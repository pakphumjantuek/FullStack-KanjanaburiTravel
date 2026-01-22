import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loading } from "../../../components/Loading";
import { useDebounce } from "../../../utils/useDebounce";
import { confirmDelete } from "../../../utils";
import { message } from "antd"; // Use Ant Design message for cleaner notifications

import { useGetAllLocalDishQuery } from "../../localDish/LocalDishApi";
import type { LocalDishType } from "../../localDish/LocalDishType";

import {
  useGetDishesByPlaceIdQuery,
  useUpsertDishToPlaceMutation,
  useDeleteDishFromPlaceMutation,
} from "../placeApi";
import type { DishForPlaceDto } from "../placeTypes";
import {
  Search,
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle2,
  Store,
  Utensils,
  Plus,
} from "lucide-react";

const PlaceMenuManagePage = () => {
  const navigate = useNavigate();
  const { placeId } = useParams<{ placeId: string }>();
  const loc = useLocation() as any;

  const pid = useMemo(() => {
    const n = Number(placeId);
    return Number.isFinite(n) ? n : null;
  }, [placeId]);

  const placeName = loc?.state?.placeName as string | undefined;

  // Tabs: 'my-menu' (default) | 'all-dishes'
  const [activeTab, setActiveTab] = useState<"my-menu" | "all-dishes">("my-menu");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  // 1) Fetch ALL dishes (for adding new ones)
  const { data: allDishPaged, isLoading: allDishLoading } =
    useGetAllLocalDishQuery(
      { page: 1, pageSize: 200, search: debouncedSearch },
      { skip: pid === null || activeTab !== "all-dishes" }
    );
  const allDishes: LocalDishType[] = allDishPaged?.items ?? [];

  // 2) Fetch CURRENT shop dishes
  const {
    data: placeDishes,
    isLoading: placeDishLoading,
    refetch,
  } = useGetDishesByPlaceIdQuery(pid as number, { skip: pid === null });

  // Map for quick lookup
  const placeDishMap = useMemo(() => {
    const m = new Map<number, DishForPlaceDto>();
    (placeDishes ?? []).forEach((d) => m.set(d.dishId, d));
    return m;
  }, [placeDishes]);

  // Local state for edits
  const [priceByDishId, setPriceByDishId] = useState<Record<number, string>>({});
  const [enabledByDishId, setEnabledByDishId] = useState<
    Record<number, boolean>
  >({});

  // Sync state when placeDishes loads or tab changes
  useEffect(() => {
    const p: Record<number, string> = {};
    const e: Record<number, boolean> = {};

    // Load from existing place dishes
    (placeDishes ?? []).forEach((d) => {
      p[d.dishId] = d.price != null ? String(d.price) : "";
      e[d.dishId] = d.isAvailable ?? true;
    });
    
    // Also preserve edits for things currently being viewed if needed, 
    // but simple reset on data refresh is safer related to refetch.
    setPriceByDishId((prev) => ({ ...prev, ...p }));
    setEnabledByDishId((prev) => ({ ...prev, ...e }));
  }, [placeDishes]);

  const [upsertDishToPlace, { isLoading: saving }] =
    useUpsertDishToPlaceMutation();
  const [deleteDishFromPlace, { isLoading: deleting }] =
    useDeleteDishFromPlaceMutation();

  if (pid === null) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="bg-white border rounded-xl p-8 text-center shadow-lg">
          <p className="text-xl text-slate-700 mb-4">ไม่พบรหัสสถานที่ (Place ID)</p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" 
            onClick={() => navigate(-1)}
          >
            ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (dishId: number) => {
    const enabled = enabledByDishId[dishId] ?? true;
    const priceStr = priceByDishId[dishId] ?? "";
    const price = priceStr.trim() === "" ? null : Number(priceStr);

    try {
      await upsertDishToPlace({
        placeId: pid,
        body: { dishId, price, isAvailable: enabled },
      }).unwrap();
      message.success("บันทึกข้อมูลเรียบร้อย");
      refetch();
    } catch (err) {
      console.error(err);
      message.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleRemove = async (dishId: number) => {
    const ok = await confirmDelete("ต้องการลบเมนูนี้ออกจากร้านใช่ไหม?");
    if (!ok) return;

    try {
      await deleteDishFromPlace({ placeId: pid, dishId }).unwrap();
      message.success("ลบเมนูเรียบร้อย");
      refetch();
    } catch (err) {
      console.error(err);
      message.error("ไม่สามารถลบได้");
    }
  };

  // Determine which list to show
  let displayedDishes: {
    id: number;
    nameTH: string;
    nameEN?: string | null;
    isLinked: boolean;
    imageUrl?: string | null;
  }[] = [];

  if (activeTab === "my-menu") {
    // Show only linked dishes. locally filter by search if needed
    const list = placeDishes ?? [];
    if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        displayedDishes = list.filter(d => 
            d.nameTH.toLowerCase().includes(s) || 
            (d.nameEN && d.nameEN.toLowerCase().includes(s))
        ).map(d => ({
            id: d.dishId,
            nameTH: d.nameTH,
            nameEN: d.nameEN,
            isLinked: true,
            imageUrl: d.coverImageUrl
        }));
    } else {
        displayedDishes = list.map(d => ({
            id: d.dishId,
            nameTH: d.nameTH,
            nameEN: d.nameEN,
            isLinked: true,
            imageUrl: d.coverImageUrl
        }));
    }
  } else {
    // Show all dishes from system
    displayedDishes = allDishes.map(d => {
        const cover = d.images?.find(i => i.isCover)?.imageUrl || d.images?.[0]?.imageUrl;
        return {
            id: d.dishId!,
            nameTH: d.nameTH,
            nameEN: d.nameEN,
            isLinked: placeDishMap.has(d.dishId!),
            imageUrl: cover
        };
    });
  }

  const isLoading = activeTab === "all-dishes" ? allDishLoading : placeDishLoading;

  return (
    <div className="min-h-screen bg-slate-50 w-full px-4 py-8 md:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button
            className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
          </button>
          <h1 className="text-3xl font-bold text-slate-800">
            {placeName ? `จัดการเมนู: ${placeName}` : "จัดการเมนูอาหาร"}
          </h1>
          <p className="text-slate-500 mt-1">
            เพิ่มลบรายการอาหาร และกำหนดราคาสำหรับร้านนี้
          </p>
        </div>
        <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex">
          <button
            onClick={() => setActiveTab("my-menu")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "my-menu"
                ? "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-200"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Store className="w-4 h-4" /> เมนูของฉัน ({placeDishes?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("all-dishes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "all-dishes"
                ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Utensils className="w-4 h-4" /> เมนูทั้งหมดในระบบ
          </button>
        </div>
      </div>

      {/* Search & Content */}
      <div className="bg-white border text-card-foreground shadow-sm rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'my-menu' ? "ค้นหาในร้าน..." : "ค้นหาเมนูทั้งหมด..."}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            />
          </div>
          {activeTab === 'all-dishes' && (
             <div className="text-xs text-slate-500 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
               💡 เมนูที่เป็นสีเขียวคือเมนูที่ท่านมีอยู่แล้ว
             </div>
          )}
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div className="col-span-12 md:col-span-5">รายการเมนู</div>
          <div className="col-span-6 md:col-span-2 text-center">สถานะการขาย</div>
          <div className="col-span-6 md:col-span-2">ราคาตั้งต้น (บาท)</div>
          <div className="col-span-12 md:col-span-3 text-right">ดำเนินการ</div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
          {isLoading ? (
             <div className="py-20 flex justify-center items-center text-slate-400">
                <Loading />
             </div>
          ) : displayedDishes.length === 0 ? (
             <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Utensils className="w-12 h-12 mb-3 opacity-20" />
                <p>ไม่พบรายการเมนู</p>
             </div>
          ) : (
            displayedDishes.map((item) => {
              const isOnMyMenu = item.isLinked;
              // If we are in "All Display", highlight rows that are already in menu
              const isHighlight = activeTab === 'all-dishes' && isOnMyMenu;
              
              const enabled = enabledByDishId[item.id] ?? true;
              const price = priceByDishId[item.id] ?? "";

              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                     isHighlight ? "bg-emerald-50/30" : "hover:bg-slate-50"
                  }`}
                >
                  {/* Name */}
                  <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                    
                     <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                           {item.nameTH}
                           {isHighlight && <span className="text-[10px] items-center flex gap-0.5 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/> มีแล้ว</span>}
                        </div>
                        <div className="text-xs text-slate-500">{item.nameEN || "-"}</div>
                     </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="col-span-6 md:col-span-2 flex justify-center">
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={enabled}
                        onChange={(e) => setEnabledByDishId(prev => ({ ...prev, [item.id]: e.target.checked }))}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                      <span className="ml-2 text-xs font-medium text-slate-600 group-hover:text-slate-900">
                        {enabled ? "พร้อมขาย" : "หมดชั่วคราว"}
                      </span>
                    </label>
                  </div>

                  {/* Price */}
                  <div className="col-span-6 md:col-span-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPriceByDishId(prev => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="ตั้งราคา..."
                        className="w-full border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">฿</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-12 md:col-span-3 flex justify-end items-center gap-2 mt-2 md:mt-0">
                     <button
                        onClick={() => handleSave(item.id)}
                        disabled={saving}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 ${
                           isOnMyMenu 
                              ? "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                              : "bg-orange-600 text-white hover:bg-orange-700 border border-transparent shadow-orange-200/50"
                        }`}
                     >
                        {isOnMyMenu ? <><Save className="w-3.5 h-3.5" /> บันทึก</> : <><Plus className="w-3.5 h-3.5" /> เพิ่มเมนู</>}
                     </button>
                     
                     {isOnMyMenu && (
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={deleting}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="ลบออกจากร้าน"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                     )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceMenuManagePage;
