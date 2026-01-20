import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loading } from "../../../components/Loading";
import { useDebounce } from "../../../utils/useDebounce";
import { showSuccessOk, confirmDelete } from "../../../utils";

import { useGetAllLocalDishQuery } from "../../localDish/LocalDishApi"; // ปรับ path
import type { LocalDishType } from "../../localDish/LocalDishType";

import {
  useGetDishesByPlaceIdQuery,
  useUpsertDishToPlaceMutation,
  useDeleteDishFromPlaceMutation,
} from "../placeApi";
import type { DishForPlaceDto } from "../placeTypes";

const PlaceMenuManagePage = () => {
  const navigate = useNavigate();
  const { placeId } = useParams<{ placeId: string }>();
  const loc = useLocation() as any;

  const pid = useMemo(() => {
    const n = Number(placeId);
    return Number.isFinite(n) ? n : null;
  }, [placeId]);

  const placeName = loc?.state?.placeName as string | undefined;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const { data: allDishPaged, isLoading: allDishLoading } =
    useGetAllLocalDishQuery(
      { page: 1, pageSize: 200, search: debouncedSearch },
      { skip: pid === null },
    );
  const allDishes: LocalDishType[] = allDishPaged?.items ?? [];

  const {
    data: placeDishes,
    isLoading: placeDishLoading,
    refetch,
  } = useGetDishesByPlaceIdQuery(pid as number, { skip: pid === null });

  const placeDishMap = useMemo(() => {
    const m = new Map<number, DishForPlaceDto>();
    (placeDishes ?? []).forEach((d) => m.set(d.dishId, d));
    return m;
  }, [placeDishes]);

  const [priceByDishId, setPriceByDishId] = useState<Record<number, string>>(
    {},
  );
  const [enabledByDishId, setEnabledByDishId] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    const p: Record<number, string> = {};
    const e: Record<number, boolean> = {};
    (placeDishes ?? []).forEach((d) => {
      p[d.dishId] = d.price != null ? String(d.price) : "";
      e[d.dishId] = d.isAvailable ?? true;
    });
    setPriceByDishId(p);
    setEnabledByDishId(e);
  }, [placeDishes]);

  const [upsertDishToPlace, { isLoading: saving }] =
    useUpsertDishToPlaceMutation();
  const [deleteDishFromPlace, { isLoading: deleting }] =
    useDeleteDishFromPlaceMutation();

  if (pid === null) {
    return (
      <div className="min-h-screen p-6">
        <div className="bg-white border rounded-xl p-6">
          ไม่พบ PlaceId
          <button className="ml-4 text-blue-600" onClick={() => navigate(-1)}>
            ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  const loading = allDishLoading || placeDishLoading;

  const onSaveRow = async (dishId: number) => {
    const enabled = enabledByDishId[dishId] ?? true;
    const priceStr = priceByDishId[dishId] ?? "";
    const price = priceStr.trim() === "" ? null : Number(priceStr);

    await upsertDishToPlace({
      placeId: pid,
      body: { dishId, price, isAvailable: enabled },
    }).unwrap();

    showSuccessOk("บันทึกเมนูให้ร้านสำเร็จ");
    refetch();
  };

  const onRemoveRow = async (dishId: number) => {
    const ok = await confirmDelete("ต้องการนำเมนูนี้ออกจากร้านใช่ไหม?");
    if (!ok) return;

    await deleteDishFromPlace({ placeId: pid, dishId }).unwrap();
    showSuccessOk("นำเมนูออกจากร้านแล้ว");
    refetch();
  };

  return (
    <div className="min-h-screen w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            className="text-sm text-slate-600 hover:text-slate-900"
            onClick={() => navigate(-1)}
          >
            ← ย้อนกลับ
          </button>
          <h1 className="text-2xl font-bold mt-1">
            จัดการเมนูของร้าน {placeName ? `: ${placeName}` : ""}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            เลือกเมนู ใส่ราคา และเปิด/ปิดการขายได้
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเมนู..."
          className="w-full border rounded-xl px-4 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loading />
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b text-xs font-semibold text-slate-500">
            <div className="col-span-5">เมนู</div>
            <div className="col-span-2">สถานะผูก</div>
            <div className="col-span-2">ขาย</div>
            <div className="col-span-1">ราคา</div>
            <div className="col-span-2 text-right">จัดการ</div>
          </div>

          {allDishes.map((d) => {
            const linked = placeDishMap.has(d.dishId!);
            const enabled = enabledByDishId[d.dishId!] ?? true;
            const price = priceByDishId[d.dishId!] ?? "";

            return (
              <div
                key={d.dishId}
                className="grid grid-cols-12 gap-2 px-4 py-3 border-b items-center"
              >
                <div className="col-span-5">
                  <div className="font-semibold text-slate-900">{d.nameTH}</div>
                  <div className="text-xs text-slate-500">
                    {d.nameEN || "-"}
                  </div>
                </div>

                <div className="col-span-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      linked
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {linked ? "ผูกแล้ว" : "ยังไม่ผูก"}
                  </span>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) =>
                      setEnabledByDishId((prev) => ({
                        ...prev,
                        [d.dishId!]: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-xs text-slate-600">ขาย</span>
                </div>

                <div className="col-span-1">
                  <input
                    value={price}
                    onChange={(e) =>
                      setPriceByDishId((prev) => ({
                        ...prev,
                        [d.dishId!]: e.target.value,
                      }))
                    }
                    placeholder="120"
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    disabled={saving}
                    onClick={() => onSaveRow(d.dishId!)}
                    className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-700 disabled:opacity-60"
                  >
                    บันทึก
                  </button>

                  {linked && (
                    <button
                      disabled={deleting}
                      onClick={() => onRemoveRow(d.dishId!)}
                      className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-60"
                    >
                      เอาออก
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {allDishes.length === 0 && (
            <div className="p-6 text-sm text-slate-500">ไม่พบเมนู</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlaceMenuManagePage;
