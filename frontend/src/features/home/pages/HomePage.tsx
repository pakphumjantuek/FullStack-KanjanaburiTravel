import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGetHomeQuery } from "../homeApi";

import heroBridge from "../../../assets/hero-bridge.jpg"; // หรือ .jpg

import {
  ArrowDown,
  Search,
  MapPinned,
  Trees,
  Landmark,
  Mountain,
  Hotel,
  UtensilsCrossed,
  MapPin,
  Star,
} from "lucide-react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "lg";
};

function Button({
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: BtnProps) {
  const base =
    "inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes =
    size === "lg"
      ? "px-7 py-3.5 text-base rounded-2xl"
      : "px-5 py-2.5 text-sm rounded-xl";

  const variants =
    variant === "primary"
      ? "bg-green-600 hover:bg-green-700 text-white"
      : variant === "outline"
        ? "border border-white/35 bg-white/10 hover:bg-white/15 text-white"
        : "bg-transparent hover:bg-white/10 text-white";

  return (
    <button
      className={`${base} ${sizes} ${variants} ${className}`}
      {...props}
    />
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetHomeQuery({ topN: 10 });
  const [query, setQuery] = useState("");

  const sections = data?.sections ?? [];

  const categories = useMemo(
    () => [
      { key: "recommended", label: "ท่องเที่ยว", Icon: MapPinned },
      { key: "nature", label: "ธรรมชาติ", Icon: Trees },
      { key: "history", label: "ประวัติศาสตร์", Icon: Landmark },
      { key: "activity", label: "กิจกรรม", Icon: Mountain },
      { key: "stay", label: "ที่พัก", Icon: Hotel },
      { key: "food", label: "ร้านอาหาร", Icon: UtensilsCrossed },
    ],
    [],
  );

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/places?search=${encodeURIComponent(q)}` : "/places");
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* ================= HERO ================= */}
      <section className="relative min-h-[94vh] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBridge})` }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/35 to-black/70" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 text-center">
          <p
            className="text-white/90 font-medium text-lg mb-4 animate-[fadeIn_.6s_ease_forwards] opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            ยินดีต้อนรับสู่
          </p>

          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight mb-6
                       animate-[fadeUp_.7s_ease_forwards] opacity-0"
            style={{ animationDelay: "0.3s" }}
          >
            กาญจนบุรี
          </h1>

          <p
            className="text-white/90 text-xl md:text-2xl mb-3 animate-[fadeUp_.7s_ease_forwards] opacity-0"
            style={{ animationDelay: "0.45s" }}
          >
            ดินแดนแห่งวัฒนธรรมและธรรมชาติอันงดงาม
          </p>

          <p
            className="text-white/75 text-base md:text-lg max-w-2xl mx-auto mb-8
                       animate-[fadeUp_.7s_ease_forwards] opacity-0"
            style={{ animationDelay: "0.6s" }}
          >
            ค้นหาเส้นทาง เที่ยว กิน พัก และกิจกรรมที่ใช่สำหรับคุณในกาญจนบุรี
          </p>

          {/* Search Bar */}
          <form
            onSubmit={onSearch}
            className="max-w-3xl mx-auto mb-8 animate-[fadeUp_.7s_ease_forwards] opacity-0"
            style={{ animationDelay: "0.75s" }}
          >
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-white/40 px-4 py-3 flex items-center gap-3">
              <Search className="text-gray-500" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาสถานที่ท่องเที่ยว..."
                className="flex-1 bg-transparent outline-none text-sm md:text-base text-gray-900 placeholder:text-gray-500"
              />
              <Button type="submit" className="rounded-xl">
                ค้นหา
              </Button>
            </div>
          </form>

          {/* CTA */}
          <div
            className="flex flex-col sm:flex-row gap-3 justify-center
                       animate-[fadeUp_.7s_ease_forwards] opacity-0"
            style={{ animationDelay: "0.9s" }}
          >
            <Button size="lg" onClick={() => navigate("/places")}>
              เริ่มการเดินทาง
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/places")}
            >
              ชมสถานที่ท่องเที่ยว
            </Button>
          </div>

          {/* Category pills */}
          <div
            className="mt-10 max-w-5xl mx-auto
                       animate-[fadeIn_.7s_ease_forwards] opacity-0"
            style={{ animationDelay: "1.05s" }}
          >
            <div className="flex items-center gap-2 overflow-x-auto justify-center py-2">
              {categories.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigate("/places")}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full
                             bg-white/10 hover:bg-white/15 text-white border border-white/20
                             transition-colors"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/15">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <a
            href="#sections"
            className="flex flex-col items-center text-white/70 hover:text-white transition-colors
                       animate-[floatY_2.2s_ease-in-out_infinite]"
          >
            <span className="text-sm mb-2">เลื่อนเพื่อสำรวจ</span>
            <ArrowDown className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* ================= SECTIONS ================= */}
      <div
        id="sections"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16"
      >
        {sections.map((sec) => (
          <section key={sec.key} className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {sec.title}
                </h2>
                <p className="text-gray-500 text-sm mt-1">แนะนำจากระบบ</p>
              </div>

              <Link
                to="/places"
                className="text-sm font-medium text-green-700 hover:text-green-800"
              >
                ดูเพิ่มเติม →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-7">
              {sec.items.map((p, index) => {
                const imageUrl = p.coverImageUrl
                  ? `${import.meta.env.VITE_API_BASE_URLS ?? ""}${p.coverImageUrl}`
                  : "https://via.placeholder.com/400x300?text=No+Image";

                const rating =
                  typeof (p as any).rating === "number"
                    ? (p as any).rating
                    : undefined;
                const location =
                  (p as any).locationName ?? (p as any).district ?? undefined;

                return (
                  <div
                    key={p.placeId}
                    onClick={() => navigate(`/placeDetails/${p.placeId}`)}
                    className="group cursor-pointer rounded-2xl overflow-hidden bg-white border border-gray-200
                               shadow-sm hover:shadow-lg transition-all duration-300
                               animate-[fadeUp_.6s_ease_forwards] opacity-0"
                    style={{ animationDelay: `${0.05 + index * 0.06}s` }}
                  >
                    <div className="relative h-56 overflow-hidden bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/0 to-black/0" />

                      {p.categoryName && (
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-white/90 text-gray-900 text-xs font-semibold rounded-full border border-white/40">
                            {p.categoryName}
                          </span>
                        </div>
                      )}

                      {rating != null && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur rounded-full">
                          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                          <span className="text-white text-xs font-semibold">
                            {rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="font-semibold text-gray-900 text-base line-clamp-2 group-hover:text-green-700 transition-colors">
                        {p.name}
                      </h3>

                      <p className="text-sm text-gray-600 line-clamp-2 mt-2 min-h-10">
                        {p.description}
                      </p>

                      <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                        {location && (
                          <div className="inline-flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="line-clamp-1">{location}</span>
                          </div>
                        )}
                      </div>

                      {p.tags?.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {p.tags
                            .slice(0, 3)
                            .map((tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                              >
                                #{tag}
                              </span>
                            ))}
                        </div>
                      )}

                      <div className="mt-5">
                        <button
                          className="w-full rounded-xl border border-gray-200 bg-white hover:bg-gray-50
                                     py-2.5 text-sm font-semibold text-gray-800 transition-colors"
                        >
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Bottom CTA */}
        <div className="rounded-3xl border border-gray-200 bg-linear-to-r from-green-50 via-green-50/60 to-white p-8 md:p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            พร้อมออกเดินทางหรือยัง?
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            วางแผนทริปและรับคำแนะนำสถานที่ที่เหมาะกับคุณในกาญจนบุรี
          </p>
          <Button size="lg" onClick={() => navigate("/trip")}>
            วางแผนเที่ยวเลย
          </Button>
        </div>
      </div>

      {/* Keyframes (ย้ายไป global css ได้) */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px) }
          to { opacity: 1; transform: translateY(0) }
        }
        @keyframes floatY {
          0%, 100% { transform: translate(-50%, 0) }
          50% { transform: translate(-50%, -8px) }
        }
      `}</style>
    </div>
  );
}
