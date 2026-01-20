type Props = { onReset: () => void };

export function EmptyState({ onReset }: Props) {
  return (
    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
      <div className="text-7xl mb-6 animate-bounce">🔍</div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">ไม่พบสถานที่ที่คุณค้นหา</h3>
      <p className="text-slate-600 text-lg mb-6">ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่</p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-bold transition-all shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        รีเซ็ตตัวกรอง
      </button>
    </div>
  );
}
