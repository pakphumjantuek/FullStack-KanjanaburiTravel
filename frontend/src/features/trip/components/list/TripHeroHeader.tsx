import heroBg from "../../../../assets/hero-bridge.jpg";

export function TripHeroHeader() {
  return (
    <div className="relative h-[320px] w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-gray-50/95" />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-2xl mb-2 tracking-tight">
          บันทึกการเดินทางของคุณ
        </h1>
        <div className="h-1 w-20 bg-blue-500 rounded-full mb-4 shadow-lg" />
        <p className="text-gray-100 text-lg md:text-xl drop-shadow-md max-w-2xl font-light">
          วางแผน จัดการ และสร้างความทรงจำดีๆ ที่กาญจนบุรี
        </p>

        <div className="mt-5 inline-flex items-center gap-2 bg-white/10 text-white/90 border border-white/15 px-4 py-2 rounded-full text-sm backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          คลิกที่การ์ดเพื่อดูรายละเอียด หรือกด “จัดแผนเที่ยว”
        </div>
      </div>
    </div>
  );
}
