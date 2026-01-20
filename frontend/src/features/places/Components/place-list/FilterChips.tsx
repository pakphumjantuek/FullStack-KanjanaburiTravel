import { Map } from "lucide-react";

type Props = {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
};

export function FilterChips({ categories, selectedCategory, onSelect }: Props) {
  const Chip = ({
    active,
    children,
    onClick,
  }: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap border shadow-sm flex items-center gap-2
        ${
          active
            ? "bg-teal-600 text-white border-teal-600 shadow-teal-200/50 hover:bg-teal-700 transform scale-105 z-10"
            : "bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        }
      `}
    >
      {active && (
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      )}
      {children}
    </button>
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Map size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-none">
              หมวดหมู่สถานที่
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              เลือกประเภทเพื่อค้นหาสถานที่ที่ใช่
            </p>
          </div>
        </div>

        {selectedCategory && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div className="relative">
        {/* Scroll container */}
        <div className="flex gap-3 overflow-x-auto pb-4 px-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300">
          <Chip active={!selectedCategory} onClick={() => onSelect(null)}>
            ทั้งหมด
          </Chip>

          {categories.map((cat) => (
            <Chip
              key={cat}
              active={selectedCategory === cat}
              onClick={() => onSelect(cat)}
            >
              {cat}
            </Chip>
          ))}
        </div>

        {/* Gradient fades for scroll indication (optional, visual enhancement) */}
        <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none sm:hidden" />
      </div>
    </div>
  );
}
