import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGetHomeQuery } from "../homeApi";

import heroBridge from "../../../assets/hero-bridge.jpg";

import {
  Search,
  Trees,
  Landmark,
  Mountain,
  Hotel,
  UtensilsCrossed,
  Star,
  MapPin,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type Category = {
  key: string;
  label: string;
  icon: React.ElementType;
  to: string;
};

function SectionHeader({
  title,
  icon: Icon,
  to,
}: {
  title: string;
  icon?: React.ElementType;
  to: string;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-xl bg-emerald-100/50 text-emerald-600">
            <Icon className="w-6 h-6" />
          </div>
        )}
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
      </div>
      <Link
        to={to}
        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
        onClick={() => window.scrollTo(0, 0)}
      >
        ดูทั้งหมด
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

function PlaceCard({
  place,
  onClick,
  variant = "portrait",
}: {
  place: any;
  onClick: () => void;
  variant?: "portrait" | "landscape";
}) {
  const imageUrl = place.coverImageUrl
    ? `${import.meta.env.VITE_API_BASE_URLS ?? ""}${place.coverImageUrl}`
    : "";

  const rating = typeof place.rating === "number" ? place.rating : undefined; 
  const displayRating = rating ?? (place.popularityScore > 0 ? (place.popularityScore % 5) : 4.5);
  
  const location = place.locationName ?? place.district ?? "กาญจนบุรี";

  if (variant === "landscape") {
    return (
      <button
        onClick={onClick}
        className="group relative flex w-full h-[280px] rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300"
      >
        <div className="w-2/5 md:w-1/2 relative overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={place.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-slate-200 grid place-items-center text-slate-400">
              <Sparkles className="w-8 h-8 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-transparent" />
        </div>
        
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center text-left bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex items-center gap-2 mb-3">
            {place.categoryName && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 tracking-wide uppercase">
                {place.categoryName}
              </span>
            )}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-700">{typeof displayRating === 'number' ? displayRating.toFixed(1) : '4.5'}</span>
            </div>
          </div>

          <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
            {place.name}
          </h3>

          <div className="flex items-center gap-2 text-slate-500 mb-4">
            <MapPin className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="text-sm line-clamp-1">{location}</span>
          </div>

          {place.description && (
             <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-4">
                {place.description}
             </p>
          )}

          <div className="mt-auto">
            <span className="inline-flex items-center text-sm font-bold text-emerald-600 border-b-2 border-emerald-100 group-hover:border-emerald-500 transition-colors pb-0.5">
               อ่านรีวิวเต็ม
               <ArrowRight className="w-4 h-4 ml-1" />
            </span>
          </div>
        </div>
      </button>
    );
  }

  // Portrait (Standard)
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col w-full bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-emerald-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300">
            <Sparkles className="w-10 h-10 opacity-20" />
          </div>
        )}

        <div className="absolute top-3 left-3">
          {place.categoryName && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/95 text-slate-700 backdrop-blur shadow-sm">
              {place.categoryName}
            </span>
          )}
        </div>
        
        <div className="absolute top-3 right-3">
             <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/95 backdrop-blur shadow-sm">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-slate-800">
                    {typeof displayRating === 'number' ? displayRating.toFixed(1) : '4.5'}
                </span>
            </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col text-left">
        <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 mb-1">
          {place.name}
        </h3>
        <div className="flex items-center gap-1.5 text-slate-500 mb-2">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
          <span className="text-xs line-clamp-1">{location}</span>
        </div>
        {place.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {place.description}
            </p>
        )}
      </div>
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  // Fetch slightly more items to fill layouts
  const { data, isLoading } = useGetHomeQuery({ topN: 12 });

  const [query, setQuery] = useState("");

  const categories: Category[] = useMemo(
    () => [
      { key: "top", label: "ยอดนิยม", icon: Star, to: "/places?sort=top" },
      { key: "nature", label: "ธรรมชาติ", icon: Trees, to: "/places?category=Nature" },
      { key: "history", label: "ประวัติศาสตร์", icon: Landmark, to: "/places?category=History" },
      { key: "activity", label: "กิจกรรม", icon: Mountain, to: "/places?category=Activity" },
      { key: "stay", label: "ที่พัก", icon: Hotel, to: "/places?category=Accommodation" },
      { key: "food", label: "ร้านอาหาร", icon: UtensilsCrossed, to: "/places?category=Restaurant" },
    ],
    []
  );

  const sections = data?.sections ?? [];
  
  // Assuming specific logic: First section is recommended, Second is trending
  const recommendedSection = sections.length > 0 ? sections[0] : null;
  const popularSection = sections.length > 1 ? sections[1] : null;
  const otherSections = sections.length > 2 ? sections.slice(2) : [];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/places?search=${encodeURIComponent(q)}` : "/places");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-slate-400 text-sm font-medium animate-pulse">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <section className="relative h-[550px] md:h-[600px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBridge}
            alt="Kanchanaburi"
            className="w-full h-full object-cover scale-105 animate-[zoom-slow_20s_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-white" />
        </div>

        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center pb-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white border border-white/20 backdrop-blur-md mb-6 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold tracking-wide">เที่ยวกาญจนบุรี The Best of Kanchanaburi</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-sm mb-6 leading-tight">
              ค้นหาความทรงจำ<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-400">
                 ในแบบของคุณ
              </span>
            </h1>

            <p className="text-white/90 text-lg md:text-xl font-medium max-w-xl mb-10 leading-relaxed drop-shadow-sm">
              รวมทุกแลนด์มาร์คสำคัญ ที่พักสุดชิล และร้านเด็ดห้ามพลาด 
              ให้ทริปกาญจนบุรีของคุณพิเศษกว่าที่เคย
            </p>

            {/* Main Search Bar */}
            <form onSubmit={onSearch} className="group relative max-w-xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <div className="relative flex items-center gap-3 p-2 bg-white rounded-2xl shadow-2xl">
                <div className="pl-4 text-emerald-500">
                  <Search className="w-6 h-6" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาสถานที่, ที่พัก, ร้านอาหาร..."
                  className="flex-1 bg-transparent py-3 text-lg text-slate-800 placeholder:text-slate-400 font-medium outline-none"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-3 font-bold shadow-md transition-all active:scale-95"
                >
                  ค้นหา
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* CATEGORIES STRIP */}
      <section className="relative -mt-10 mb-16 z-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-xl border border-white/40 p-3 rounded-2xl shadow-xl shadow-slate-200/50 flex flex-wrap justify-center md:justify-between gap-2 md:gap-4 overflow-x-auto">
             {categories.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    onClick={() => navigate(c.to)}
                    className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                        <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm">{c.label}</span>
                  </button>
                );
             })}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 space-y-20">
        
        {/* RECOMMENDED SECTION (Landscape / Highlight) */}
        {recommendedSection && (
            <section>
                <SectionHeader 
                    title="ยอดนิยมสำหรับคุณ" 
                    icon={Sparkles} 
                    to="/places?sort=recommended" 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Big Highlight */}
                    {recommendedSection.items?.slice(0, 4).map((item) => (
                        <PlaceCard 
                            key={item.placeId} 
                            place={item} 
                            variant="landscape"
                            onClick={() => navigate(`/placeDetails/${item.placeId}`)} 
                        />
                    ))}
                </div>
            </section>
        )}

        {/* POPULAR NOW SECTION (Grid) */}
        {popularSection && (
             <section>
                <SectionHeader 
                    title={popularSection.title || "ยอดนิยมตอนนี้"} // Fallback or use API title
                    icon={TrendingUp}
                    to="/places?sort=popular"
                />
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
                    {popularSection.items?.slice(0, 8).map((item) => (
                         <PlaceCard 
                            key={item.placeId} 
                            place={item} 
                            variant="portrait"
                            onClick={() => navigate(`/placeDetails/${item.placeId}`)} 
                        />
                    ))}
                </div>
            </section>
        )}
        
        {/* OTHER SECTIONS */}
        {otherSections.map((sec) => (
            <section key={sec.key}>
                <SectionHeader 
                    title={sec.title} 
                    to="/places" 
                />
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {sec.items?.slice(0, 4).map((item) => (
                         <PlaceCard 
                            key={item.placeId} 
                            place={item} 
                            onClick={() => navigate(`/placeDetails/${item.placeId}`)} 
                        />
                    ))}
                </div>
            </section>
        ))}

        {/* CTA Banner */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-6 py-12 md:px-16 md:py-20 text-center md:text-left">
           <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[100px] opacity-20" />
           <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[300px] h-[300px] bg-blue-500 rounded-full blur-[80px] opacity-20" />
           
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-2xl">
                 <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
                    ยังตัดสินใจไม่ได้? <br/>
                    <span className="text-emerald-400">ให้เราช่วยวางแผนทริป</span>
                 </h2>
                 <p className="text-slate-300 text-lg mb-0 leading-relaxed">
                    ตอบคำถามสั้นๆ ไม่กี่ข้อ ระบบจะช่วยจัดทริปที่
                    เหมาะกับสไตล์ของคุณที่สุด ฟรี!
                 </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                 <button
                   onClick={() => navigate("/trip")}
                   className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-1"
                 >
                    เริ่มวางแผนทริป
                 </button>
                 <button 
                    onClick={() => navigate("/places")}
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur border border-white/10 transition-all hover:-translate-y-1"
                 >
                    ดูสถานที่ทั้งหมด
                 </button>
              </div>
           </div>
        </section>

      </main>
    </div>
  );
}
