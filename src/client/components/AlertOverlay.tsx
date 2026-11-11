import React from 'react';
import {
  CatchResult,
  EnvironmentState,
  LiveEventAlert,
} from '../../shared/types.js';
import { SEASON_META } from '../../shared/gameConfig.js';
import { Sun, Moon, Sparkles } from 'lucide-react';

interface AlertOverlayProps {
  activeAlert: LiveEventAlert | null;
  recentCatches: CatchResult[];
  environment: EnvironmentState;
}

export const AlertOverlay: React.FC<AlertOverlayProps> = ({
  activeAlert,
  environment,
}) => {
  const seasonMeta = SEASON_META[environment.season] || SEASON_META.SPRING;
  const isNight = environment.dayPhase === 'NIGHT';
  const signatureFishName = isNight
    ? 'Cá trăng bạc ★'
    : seasonMeta.signatureFish;
  const signatureFishImg = isNight
    ? '/assets/fish/fish-t5-22-trang-bac.png'
    : seasonMeta.signatureFishImage;

  return (
    <>
      {/* 1. HORIZONTAL DAY/NIGHT + SEASON + SIGNATURE FISH BAR (Bottom-Right Corner) */}
      <div className="absolute bottom-2.5 right-2.5 z-40 game-hud-card rounded-full px-3 py-1 text-[10px] font-display font-extrabold text-white flex items-center gap-2 pointer-events-none select-none shadow-lg">
        {/* Day / Night */}
        <span
          className={`flex items-center gap-1 whitespace-nowrap ${
            isNight ? 'text-indigo-300' : 'text-amber-300'
          }`}
        >
          {isNight ? (
            <Moon className="w-3 h-3 shrink-0" />
          ) : (
            <Sun className="w-3 h-3 shrink-0" />
          )}
          <span>{isNight ? 'Ban Đêm' : 'Ban Ngày'}</span>
        </span>

        <span className="text-slate-500">•</span>

        {/* Season */}
        <span
          style={{ color: seasonMeta.color }}
          className="whitespace-nowrap"
        >
          {seasonMeta.emoji} {seasonMeta.name}
        </span>

        <span className="text-slate-500">•</span>

        {/* Signature Star Fish with Real PNG Sprite */}
        <span className="text-amber-300 whitespace-nowrap flex items-center gap-1">
          <img
            src={signatureFishImg}
            alt={signatureFishName}
            className="w-5 h-3.5 object-contain shrink-0"
          />
          <span>{signatureFishName}</span>
        </span>
      </div>

      {/* 2. FULL-VIEW FLOATING TOAST ALERT IN THE CENTER OF THE LAKE */}
      {activeAlert && (
        <div className="fixed inset-x-0 top-[27%] z-50 flex justify-center pointer-events-none px-3 select-none">
          <div
            className={`max-w-[390px] w-full rounded-2xl px-4 py-3 border-2 shadow-2xl backdrop-blur-xl animate-popIn flex items-center gap-3 ${
              activeAlert.type === 'RECORD_BREAKER' ||
              activeAlert.rarity === 'LEGENDARY'
                ? 'bg-amber-950/95 border-amber-400'
                : activeAlert.type === 'FOLLOW_BONUS'
                ? 'bg-emerald-950/95 border-emerald-400'
                : activeAlert.type === 'ROD_CHECK'
                ? 'bg-sky-950/95 border-sky-400'
                : 'bg-slate-900/95 border-teal-400'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-300/60 flex items-center justify-center text-amber-300 shrink-0 text-xl overflow-hidden p-1">
              {activeAlert.imageUrl ? (
                <img
                  src={activeAlert.imageUrl}
                  alt={activeAlert.title}
                  className="w-full h-full object-contain drop-shadow"
                />
              ) : (
                activeAlert.emoji || <Sparkles className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-display text-[11.5px] font-extrabold text-amber-300 uppercase leading-snug whitespace-normal">
                {activeAlert.title}
              </div>
              <div className="text-[11px] text-white font-semibold leading-snug whitespace-normal mt-0.5">
                {activeAlert.subtitle}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
