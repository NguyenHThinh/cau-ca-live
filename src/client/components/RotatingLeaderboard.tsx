import React, { useEffect, useState } from 'react';
import { LeaderboardBundle } from '../../shared/types.js';
import {
  getFishByNameOrId,
  getRodConfigByLevel,
  RARITY_META,
} from '../../shared/gameConfig.js';
import { Trophy, Crown, Sparkles } from 'lucide-react';

interface RotatingLeaderboardProps {
  leaderboards: LeaderboardBundle;
  rotationIntervalMs?: number;
}

type BoardTab = 'BIGGEST' | 'BEST_TIER' | 'HUNTER';

const TABS: Array<{
  key: BoardTab;
  title: string;
  badgeGradient: string;
}> = [
  {
    key: 'BIGGEST',
    title: 'TOP CÁ NẶNG NHẤT',
    badgeGradient: 'from-amber-400 to-yellow-500',
  },
  {
    key: 'BEST_TIER',
    title: 'TOP CÁ XỊN NHẤT',
    badgeGradient: 'from-fuchsia-400 to-purple-500',
  },
  {
    key: 'HUNTER',
    title: 'THỢ SĂN CÁ HIẾM',
    badgeGradient: 'from-cyan-400 to-sky-500',
  },
];

export const RotatingLeaderboard: React.FC<RotatingLeaderboardProps> = ({
  leaderboards,
  rotationIntervalMs = 15000,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepMs = 250;
    const increment = (stepMs / rotationIntervalMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          setActiveIndex((idx) => (idx + 1) % TABS.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [rotationIntervalMs]);

  const currentTab = TABS[activeIndex];

  return (
    <div className="flex-1 min-w-0 game-hud-card rounded-2xl p-2 text-white pointer-events-none select-none">
      {/* Header Row: Title + Auto Page Indicator */}
      <div className="flex items-center justify-between gap-1">
        <div
          className={`px-2 py-0.5 rounded-full font-display text-[9.5px] font-extrabold bg-gradient-to-r ${currentTab.badgeGradient} text-slate-950 shadow-sm flex items-center gap-1 whitespace-nowrap`}
        >
          {activeIndex === 0 && <Trophy className="w-3 h-3 shrink-0" />}
          {activeIndex === 1 && <Crown className="w-3 h-3 shrink-0" />}
          {activeIndex === 2 && <Sparkles className="w-3 h-3 shrink-0" />}
          <span>{currentTab.title}</span>
        </div>

        <span className="px-1.5 py-0.5 rounded-full bg-slate-900/90 border border-white/10 text-[8.5px] font-extrabold text-amber-300 shrink-0">
          {activeIndex + 1}/{TABS.length}
        </span>
      </div>

      {/* Auto-Rotation Progress Line */}
      <div className="w-full h-[2px] bg-slate-800/90 rounded-full overflow-hidden my-1">
        <div
          style={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-teal-400 via-amber-300 to-rose-400 transition-all duration-200"
        />
      </div>

      {/* 2-Line Rows per Rank (Line 1: Top + Name + Rod Lv | Line 2: Fish PNG + Fish Name + Weight) */}
      <div className="space-y-1">
        {((currentTab.key === 'BIGGEST' &&
          leaderboards.biggestCatch.length === 0) ||
          (currentTab.key === 'BEST_TIER' &&
            leaderboards.bestTierCatch.length === 0) ||
          (currentTab.key === 'HUNTER' &&
            leaderboards.epicLegendHunter.length === 0)) && (
          <div className="bg-slate-950/60 border border-white/10 rounded-lg px-2.5 py-3 text-center">
            <p className="font-display font-bold text-[10px] text-amber-300/90">
              🏆 Chưa có kỷ lục
            </p>
            <p className="text-[9px] text-slate-300 font-semibold mt-0.5">
              Thả ❤️ hoặc gõ "câu" để chiếm Top 1!
            </p>
          </div>
        )}

        {currentTab.key === 'BIGGEST' &&
          leaderboards.biggestCatch.slice(0, 4).map((item) => {
            const rod = getRodConfigByLevel(item.rodLevel);
            const rarityMeta =
              RARITY_META[item.maxFishRarity] || RARITY_META.COMMON;
            const fishAsset = getFishByNameOrId(item.maxFishName);
            return (
              <div
                key={item.tiktokUid}
                className="bg-slate-950/75 border border-white/10 rounded-lg px-2 py-1 flex flex-col gap-[1.5px]"
              >
                {/* Line 1: Rank + User Name + Rod Level */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MedalRank rank={item.rank} />
                    <span className="font-bold text-[10px] text-white truncate">
                      {item.nickname.replace(/^[^\w\u00C0-\u1EF9]+/, '').trim()}
                    </span>
                  </div>
                  <span
                    style={{ color: rod.color }}
                    className="text-[8.5px] font-black shrink-0"
                  >
                    Lv{item.rodLevel}
                  </span>
                </div>

                {/* Line 2: Fish PNG Icon + Fish Name + Weight (kg) */}
                <div className="flex items-center justify-between gap-1 pl-5 text-[9.5px]">
                  <div className="flex items-center gap-1 min-w-0">
                    {fishAsset?.imageUrl ? (
                      <img
                        src={fishAsset.imageUrl}
                        alt={item.maxFishName}
                        className="w-4 h-3.5 object-contain shrink-0"
                      />
                    ) : (
                      <span>{item.maxFishEmoji}</span>
                    )}
                    <span
                      style={{ color: rarityMeta.color }}
                      className="font-bold truncate"
                    >
                      {item.maxFishName}
                    </span>
                  </div>
                  <span className="font-display font-extrabold text-amber-300 shrink-0">
                    {item.maxFishWeight.toFixed(1)} kg
                  </span>
                </div>
              </div>
            );
          })}

        {currentTab.key === 'BEST_TIER' &&
          leaderboards.bestTierCatch.slice(0, 4).map((item) => {
            const rod = getRodConfigByLevel(item.rodLevel);
            const rarityMeta =
              RARITY_META[item.rarestFishRarity] || RARITY_META.COMMON;
            const fishAsset = getFishByNameOrId(item.rarestFishName);
            return (
              <div
                key={item.tiktokUid}
                className="bg-slate-950/75 border border-white/10 rounded-lg px-2 py-1 flex flex-col gap-[1.5px]"
              >
                {/* Line 1: Rank + User Name + Rod Level */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MedalRank rank={item.rank} />
                    <span className="font-bold text-[10px] text-white truncate">
                      {item.nickname.replace(/^[^\w\u00C0-\u1EF9]+/, '').trim()}
                    </span>
                  </div>
                  <span
                    style={{ color: rod.color }}
                    className="text-[8.5px] font-black shrink-0"
                  >
                    Lv{item.rodLevel}
                  </span>
                </div>

                {/* Line 2: Fish PNG + Tier + Fish Name + Weight (kg) */}
                <div className="flex items-center justify-between gap-1 pl-5 text-[9.5px]">
                  <div className="flex items-center gap-1 min-w-0">
                    {fishAsset?.imageUrl && (
                      <img
                        src={fishAsset.imageUrl}
                        alt={item.rarestFishName}
                        className="w-4 h-3.5 object-contain shrink-0"
                      />
                    )}
                    <span
                      style={{ color: rarityMeta.color }}
                      className="font-extrabold truncate"
                    >
                      [{rarityMeta.label}] {item.rarestFishName}
                    </span>
                  </div>
                  <span className="font-display font-extrabold text-amber-300 shrink-0">
                    {item.rarestFishWeight.toFixed(1)} kg
                  </span>
                </div>
              </div>
            );
          })}

        {currentTab.key === 'HUNTER' &&
          leaderboards.epicLegendHunter.slice(0, 4).map((item) => {
            const rod = getRodConfigByLevel(item.rodLevel);
            return (
              <div
                key={item.tiktokUid}
                className="bg-slate-950/75 border border-white/10 rounded-lg px-2 py-1 flex flex-col gap-[1.5px]"
              >
                {/* Line 1: Rank + User Name + Rod Level */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MedalRank rank={item.rank} />
                    <span className="font-bold text-[10px] text-white truncate">
                      {item.nickname.replace(/^[^\w\u00C0-\u1EF9]+/, '').trim()}
                    </span>
                  </div>
                  <span
                    style={{ color: rod.color }}
                    className="text-[8.5px] font-black shrink-0"
                  >
                    Lv{item.rodLevel}
                  </span>
                </div>

                {/* Line 2: Detailed Legendary & Epic Fish Counts + Total Weight */}
                <div className="flex items-center justify-between gap-1 pl-5 text-[9px]">
                  <div className="flex items-center gap-1 min-w-0 truncate">
                    <span className="text-amber-300 font-extrabold whitespace-nowrap">
                      👑 {item.legendaryCount} Huyền thoại
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-purple-300 font-extrabold whitespace-nowrap">
                      ✨ {item.epicCount} Sử thi
                    </span>
                  </div>
                  <span className="font-display font-extrabold text-cyan-300 shrink-0">
                    {item.totalWeight.toFixed(1)} kg
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

const MedalRank: React.FC<{ rank: number }> = ({ rank }) => {
  const styles =
    rank === 1
      ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-sm'
      : rank === 2
      ? 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-950'
      : rank === 3
      ? 'bg-gradient-to-b from-amber-600 to-amber-800 text-white'
      : 'bg-slate-800 text-slate-200';
  return (
    <span
      className={`w-3.5 h-3.5 rounded-full font-display font-extrabold text-[8.5px] flex items-center justify-center shrink-0 ${styles}`}
    >
      {rank}
    </span>
  );
};
