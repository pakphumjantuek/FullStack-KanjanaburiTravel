import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../../utils/useDebounce";
import { Loading } from "../../../components/Loading";
import { useGetAllLocalDishQuery } from "../LocalDishApi";
import type { LocalDishType } from "../LocalDishType";
import {
  Search,
  ChefHat,
  Flame,
  Leaf,
  Utensils,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const LocalDishUserListPage = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState("");

  const [selectedSpicyLevel, setSelectedSpicyLevel] = useState<number | null>(
    null,
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useGetAllLocalDishQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const dishes = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const uniqueSpicyLevels = useMemo(() => {
    const s = new Set<number>();
    dishes.forEach((d) => {
      if (d.spicyLevel !== undefined && d.spicyLevel !== null)
        s.add(d.spicyLevel);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [dishes]);

  const tags = useMemo(() => {
    return ["ฮาลาล", "มังสวิรัติ"];
  }, []);

  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => {
      const okSpicy =
        selectedSpicyLevel === null || d.spicyLevel === selectedSpicyLevel;

      const okTag =
        selectedTag === null ||
        (selectedTag === "ฮาลาล" && d.isHalal) ||
        (selectedTag === "มังสวิรัติ" && d.isVegetarian);

      return okSpicy && okTag;
    });
  }, [dishes, selectedSpicyLevel, selectedTag]);

  const hasFilters = Boolean(
    search || selectedSpicyLevel !== null || selectedTag,
  );

  const resetAll = () => {
    setSearch("");
    setSelectedSpicyLevel(null);
    setSelectedTag(null);
    setPage(1);
  };

  const FilterChip = ({
    active,
    children,
    onClick,
    icon,
  }: {
    active?: boolean;
    children: React.ReactNode;
    onClick: () => void;
    icon?: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 border ${
        active
          ? "bg-orange-500 text-white border-orange-500 shadow-md transform scale-105"
          : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:bg-orange-50"
      }`}
    >
      {icon}
      {children}
    </button>
  );

  const baseUrl = import.meta.env.VITE_API_BASE_URLS ?? "";
  // New nice placeholder
  const fallbackImg =
    "https://placehold.co/600x400/fff7ed/ea580c?text=Local+Food";

  const joinUrl = (base: string, path: string) => {
    const p = path.trim();
    if (!p) return "";
    if (p.startsWith("http") || p.startsWith("blob:")) return p;
    const b = (base ?? "").trim().replace(/\/$/, "");
    const p2 = p.startsWith("/") ? p : `/${p}`;
    return `${b}${p2}`;
  };

  const getDishImageUrl = (dish: LocalDishType): string => {
    const coverImage = dish.images?.find((img) => img.isCover);
    const raw = coverImage?.imageUrl || dish.images?.[0]?.imageUrl || "";
    return raw ? joinUrl(baseUrl, raw) : fallbackImg;
  };

  return (
    <div className="min-h-screen bg-orange-50/30 pb-20">
      {/* --- HERO SECTION --- */}
      <div className="relative bg-orange-600 text-white overflow-hidden shadow-lg mb-8">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 filter blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-orange-900/80"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-sm rounded-full mb-6">
            <Utensils className="w-6 h-6 text-orange-200 mr-2" />
            <span className="text-orange-100 font-medium tracking-wide text-sm uppercase">
              Kanchanaburi Local Food
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">
            อาหารท้องถิ่น <span className="text-orange-300">กาญจนบุรี</span>
          </h1>
          <p className="text-lg text-orange-100 max-w-2xl mx-auto mb-10 font-light">
            สัมผัสรสชาติที่เป็นเอกลักษณ์ วัตถุดิบพื้นบ้าน
            และวัฒนธรรมการกินที่สืบทอดมารุ่นสู่รุ่น
          </p>

          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาเมนูอาหาร..."
              className="block w-full pl-12 pr-4 py-4 rounded-full text-slate-900 placeholder:text-slate-400 bg-white shadow-xl border-2 border-transparent focus:border-orange-400 focus:ring-0 focus:outline-none transition-all text-base"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* --- FILTERS SECTION --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-4 flex-1">
            {uniqueSpicyLevels.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 mr-2 flex items-center gap-1">
                  <Flame size={16} className="text-red-500" /> ความเผ็ด:
                </span>
                <FilterChip
                  active={selectedSpicyLevel === null}
                  onClick={() => {
                    setSelectedSpicyLevel(null);
                    setPage(1);
                  }}
                >
                  ทั้งหมด
                </FilterChip>
                {uniqueSpicyLevels.map((lv) => {
                  if (lv === 0)
                    return (
                      <FilterChip
                        key={lv}
                        active={selectedSpicyLevel === lv}
                        onClick={() => {
                          setSelectedSpicyLevel(lv);
                          setPage(1);
                        }}
                      >
                        ไม่เผ็ด
                      </FilterChip>
                    );
                  return (
                    <FilterChip
                      key={lv}
                      active={selectedSpicyLevel === lv}
                      onClick={() => {
                        setSelectedSpicyLevel(lv);
                        setPage(1);
                      }}
                    >
                      ระดับ {lv}
                    </FilterChip>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 mr-2 flex items-center gap-1">
                <ChefHat size={16} className="text-orange-500" /> ประเภท:
              </span>
              <FilterChip
                active={selectedTag === null}
                onClick={() => {
                  setSelectedTag(null);
                  setPage(1);
                }}
              >
                ทั้งหมด
              </FilterChip>
              {tags.map((t) => (
                <FilterChip
                  key={t}
                  active={selectedTag === t}
                  onClick={() => {
                    setSelectedTag(t);
                    setPage(1);
                  }}
                  icon={
                    t === "มังสวิรัติ" ? (
                      <Leaf size={14} className="text-green-600" />
                    ) : undefined
                  }
                >
                  {t}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 min-w-fit">
            <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
              พบ {filteredDishes.length} รายการ
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <X size={16} /> ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* --- CONTENT AREA --- */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loading />
          </div>
        ) : filteredDishes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredDishes.map((dish: LocalDishType) => (
              <div
                key={dish.dishId}
                onClick={() => navigate(`/localDishDetails/${dish.dishId}`)}
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col h-full"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={getDishImageUrl(dish)}
                    alt={dish.nameTH}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackImg;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    {dish.spicyLevel !== null &&
                      dish.spicyLevel !== undefined &&
                      dish.spicyLevel > 0 && (
                        <span className="bg-white/95 backdrop-blur-md text-red-600 text-xs font-bold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                          <Flame size={12} className="fill-red-600" />{" "}
                          {dish.spicyLevel}
                        </span>
                      )}
                  </div>

                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                    {dish.isHalal && (
                      <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm">
                        HALAL
                      </span>
                    )}
                    {dish.isVegetarian && (
                      <span className="bg-lime-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm flex items-center gap-0.5">
                        <Leaf size={10} /> VEGAN
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-auto">
                    <h3
                      className="text-xl font-bold text-slate-800 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1"
                      title={dish.nameTH}
                    >
                      {dish.nameTH}
                    </h3>
                    <p className="text-sm text-slate-500 mb-3 font-medium line-clamp-1">
                      {dish.nameEN || "Local Dish"}
                    </p>

                    <div className="h-px bg-slate-100 w-full mb-3" />

                    <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed mb-3">
                      {dish.description ||
                        "เมนูอาหารท้องถิ่นที่น่าสนใจ เชิญลิ้มลองรสชาติความอร่อย..."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-md">
                        ดูรายละเอียด
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                      <ChevronRight
                        size={18}
                        className="text-orange-500 group-hover:text-white transition-colors ml-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="bg-orange-50 p-4 rounded-full mb-4 animate-pulse">
              <Utensils size={40} className="text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              ไม่พบเมนูที่คุณค้นหา
            </h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูเมนูอื่น ๆ ที่เราแนะนำ
            </p>
            <button
              onClick={resetAll}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium transition-all shadow-lg shadow-slate-200/50 flex items-center gap-2"
            >
              <X size={18} /> ล้างการค้นหา
            </button>
          </div>
        )}

        {/* --- PAGINATION --- */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-12 mb-8 flex items-center justify-center gap-4">
            <button
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => p - 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200 transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>

            <span className="text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              หน้า <span className="text-orange-600 font-bold">{page}</span> จาก{" "}
              {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200 transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalDishUserListPage;
