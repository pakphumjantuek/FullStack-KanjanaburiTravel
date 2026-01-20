// src/features/place/components/place-list/PaginationBar.tsx
type Props = {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
};

export function PaginationBar({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        ← ก่อนหน้า
      </button>

      <div className="flex gap-2">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = page <= 3 ? i + 1 : Math.max(1, page - 2) + i;
          if (pageNum > totalPages) return null;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-11 px-4 py-2.5 rounded-xl font-bold transition-all ${
                page === pageNum
                  ? "bg-emerald-400 text-slate-900 shadow-md"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        ถัดไป →
      </button>
    </div>
  );
}
