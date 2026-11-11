import React, { useEffect, useState } from 'react';
import { Heart, Gift, Crown, Megaphone } from 'lucide-react';

interface LiveGuideBannerProps {
  customAnnouncement?: string;
}

interface GuideBullet {
  text: string;
  imageUrl?: string;
}

interface GuideSlide {
  id: string;
  badge: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets: GuideBullet[];
}

const DEFAULT_GUIDE_SLIDES: GuideSlide[] = [
  {
    id: 'how_to_play',
    badge: 'HƯỚNG DẪN CHƠI',
    badgeClass: 'from-rose-500 to-pink-500 text-white',
    icon: Heart,
    bullets: [
      { text: '❤️ Thả tim / Chat "câu": Câu cá' },
      {
        text: '➕ Follow: Cần trúc đen Lv2',
        imageUrl: '/assets/rods/rod-02-can-truc-den.png',
      },
      { text: '💬 Chat "cần": Xem KC & Mồi' },
      { text: '🏆 Cấp Cần & BXH lưu vĩnh viễn' },
    ],
  },
  {
    id: 'gift_baits',
    badge: 'QUÀ TẶNG MỒI',
    badgeClass: 'from-sky-400 to-cyan-500 text-slate-950',
    icon: Gift,
    bullets: [
      {
        text: '5 KC: +10 Dế mèn (x1.15)',
        imageUrl: '/assets/baits/bait-2-de-men.png',
      },
      {
        text: '20 KC: +8 Tôm tươi (x1.30)',
        imageUrl: '/assets/baits/bait-3-tom-tuoi.png',
      },
      {
        text: '50 KC: +6 Cá con (x1.50)',
        imageUrl: '/assets/baits/bait-4-ca-con.png',
      },
      {
        text: '120 KC: +5 Mồi thơm (x1.75)',
        imageUrl: '/assets/baits/bait-5-moi-thom.png',
      },
      {
        text: '300 KC: +3 Mồi vàng (x2.00)',
        imageUrl: '/assets/baits/bait-6-moi-vang.png',
      },
    ],
  },
  {
    id: 'rod_levels',
    badge: 'TÍCH KC LÊN CẦN',
    badgeClass: 'from-amber-400 to-yellow-500 text-slate-950',
    icon: Crown,
    bullets: [
      { text: '💎 100% KC quà cộng vào Cần' },
      { text: 'Lv2 Trúc đen: 10 KC • Lv3: 30 KC' },
      { text: 'Lv4 Thủy tinh: 70 KC • Lv5: 150 KC' },
      { text: 'Lv6–9: Carbon Pro ➔ Cần vàng' },
      { text: '🐉 Lv10 Cần Thần Ngư: 1,900 KC' },
    ],
  },
];

export const LiveGuideBanner: React.FC<LiveGuideBannerProps> = ({
  customAnnouncement,
}) => {
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = React.useMemo<GuideSlide[]>(() => {
    const trimmed = customAnnouncement?.trim();
    if (!trimmed) return DEFAULT_GUIDE_SLIDES;

    const customBullets: GuideBullet[] = trimmed
      .split(/[;\n•]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

    return [
      {
        id: 'host_pinned',
        badge: 'THÔNG BÁO LIVE',
        badgeClass: 'from-amber-400 via-orange-500 to-rose-500 text-white',
        icon: Megaphone,
        bullets:
          customBullets.length > 1
            ? customBullets
            : [
                { text: trimmed },
                { text: '❤️ Thả tim / Chat "câu": Câu cá' },
                { text: '➕ Follow: Cần trúc đen Lv2' },
              ],
      },
      ...DEFAULT_GUIDE_SLIDES,
    ];
  }, [customAnnouncement]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[slideIndex % slides.length] || slides[0];
  const IconComp = current.icon;

  return (
    <div className="w-[46%] sm:w-[45%] shrink-0 game-hud-card rounded-2xl p-2 text-white pointer-events-none select-none flex flex-col justify-between">
      {/* Header Row: Category Pill + Slide Indicator */}
      <div>
        <div className="flex items-center justify-between gap-1">
          <div
            className={`px-2 py-0.5 rounded-full font-display font-extrabold text-[9.5px] bg-gradient-to-r ${current.badgeClass} shrink-0 flex items-center gap-1 shadow-sm whitespace-nowrap`}
          >
            <IconComp className="w-3 h-3 shrink-0" />
            <span>{current.badge}</span>
          </div>

          <span className="px-1.5 py-0.5 rounded-full bg-slate-900/90 border border-white/10 text-[8.5px] font-extrabold text-amber-300 shrink-0">
            {(slideIndex % slides.length) + 1}/{slides.length}
          </span>
        </div>

        {/* Thin Divider */}
        <div className="w-full h-[1.5px] bg-white/10 rounded-full my-1.5" />

        {/* Bullet List Content with Real Bait/Rod Asset Icons */}
        <ul className="space-y-1 text-[10px] font-bold text-slate-100 leading-snug">
          {current.bullets.map((item, idx) => (
            <li
              key={idx}
              className="flex items-center gap-1.5 bg-slate-950/65 border border-white/5 rounded-lg px-2 py-[3px]"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-4 h-3.5 object-contain shrink-0"
                />
              ) : (
                <span className="text-amber-400 font-black leading-none">
                  •
                </span>
              )}
              <span className="flex-1 whitespace-normal">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Indicator Dots */}
      <div className="flex items-center justify-center gap-1 pt-1.5">
        {slides.map((s, idx) => (
          <span
            key={s.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === slideIndex % slides.length
                ? 'w-4 bg-amber-400'
                : 'w-1.5 bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
