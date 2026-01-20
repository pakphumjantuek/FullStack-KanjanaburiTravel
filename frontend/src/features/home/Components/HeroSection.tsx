import { ArrowDown } from 'lucide-react';
import heroBridge from '../../../assets/hero-bridge.svg';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBridge})` }}
      >
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/40 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold-light font-medium text-lg mb-4 animate-fade-in opacity-0" style={{ animationDelay: '0.2s' }}>
            ยินดีต้อนรับสู่
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-primary-foreground mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.4s' }}>
            กาญจนบุรี
          </h1>
          <p className="text-primary-foreground/90 text-xl md:text-2xl mb-4 animate-fade-in-up opacity-0" style={{ animationDelay: '0.6s' }}>
            ดินแดนแห่งวัฒนธรรมและธรรมชาติอันงดงาม
          </p>
          <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto mb-10 animate-fade-in-up opacity-0" style={{ animationDelay: '0.8s' }}>
            สัมผัสประสบการณ์การท่องเที่ยวเชิงวัฒนธรรมและลิ้มรสอาหารพื้นถิ่นที่เป็นเอกลักษณ์
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up opacity-0" style={{ animationDelay: '1s' }}>
            <button className="bg-gold-light text-primary-foreground px-6 py-3 rounded-xl text-xl font-semibold">
              เริ่มการเดินทาง
            </button>
            <button className="bg-hero text-primary-foreground px-6 py-3 rounded-xl text-xl font-semibold">
              ชมสถานที่ท่องเที่ยว
            </button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-float">
        <a href="#attractions" className="flex flex-col items-center text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <span className="text-sm mb-2">เลื่อนเพื่อสำรวจ</span>
          <ArrowDown className="w-5 h-5" />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;