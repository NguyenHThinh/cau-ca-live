import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveAnglerState,
  CharacterModelConfig,
  EnvironmentState,
  FishRarity,
} from '../../shared/types.js';
import {
  FISH_CATALOG,
  getBaitConfigByTier,
  getRodConfigByLevel,
  RARITY_META,
  resolveCharacterModel,
} from '../../shared/gameConfig.js';

interface FishingScene2DProps {
  anglers: ActiveAnglerState[];
  heartBursts: Record<string, number>;
  environment: EnvironmentState;
}

type FacingDir = 'RIGHT' | 'LEFT';

interface PondSpotConfig {
  slotId: number;
  ring: 'INNER' | 'OUTER';
  x: number; // Character standing X (%) on the lower 2/3 bank
  y: number; // Character standing Y (%) on the lower 2/3 bank (34% -> 86%)
  bobberX: number; // Non-overlapping bobber/catch X (%) in the lake
  bobberY: number; // Non-overlapping bobber/catch Y (%) in the lake
  labelOffsetX: number; // Staggered X offset (px) so 40 nameplates NEVER overlap
  labelOffsetY: number; // Staggered Y offset (px) so 40 nameplates NEVER overlap
  facing: FacingDir;
}

/**
 * Generates 40 Calibrated Spots Around the Lower 2/3 Oval Pond (Y: 34% -> 86%):
 * - Slots 0..9: BOTTOM SHOWCASE ARC (10 spots around the lower U-curve of the pond, Y: 66.5% -> 83.5%)
 *   so the first 10 anglers stand right at the bottom of the map in full view!
 * - Slots 10..19: UPPER/MID INNER BANK (Y: 34% -> 61.5%)
 * - Slots 20..39: OUTER RING pulled right up onto the outer half of the brown dirt bank
 */
function build40PondSpots(): PondSpotConfig[] {
  const spots: PondSpotConfig[] = [];

  // ============================================================================
  // LINE 1: INNER RING (20 SPOTS = 10 Bottom U-Curve + 5 Left + 5 Right)
  // Spread out from Y = 32.5% -> 84.4% (6.3% vertical step) below BXH & Guide!
  // ============================================================================

  // 1. SLOTS 0..9: INNER BOTTOM U-CURVE (10 spots evenly spaced along the lower shoreline, Y: 63.8% -> 84.4%)
  const innerBottom10Coords: Array<{
    x: number;
    y: number;
    bx: number;
    by: number;
    lx: number;
    ly: number;
    f: FacingDir;
  }> = [
    // Left-Bottom side (Lv1 -> Lv5 facing RIGHT)
    { x: 12.6, y: 63.8, bx: 32.0, by: 55.5, lx: 4, ly: -4, f: 'RIGHT' },
    { x: 16.0, y: 70.2, bx: 28.5, by: 60.5, lx: -2, ly: -1, f: 'RIGHT' },
    { x: 22.4, y: 76.4, bx: 36.5, by: 64.0, lx: 3, ly: -5, f: 'RIGHT' },
    { x: 32.0, y: 81.4, bx: 42.5, by: 67.5, lx: -3, ly: -1, f: 'RIGHT' },
    { x: 43.2, y: 84.4, bx: 46.5, by: 60.5, lx: -4, ly: -5, f: 'RIGHT' },
    // Right-Bottom side (Lv6 -> Lv10 facing LEFT)
    { x: 56.8, y: 84.4, bx: 53.5, by: 62.0, lx: 4, ly: -1, f: 'LEFT' },
    { x: 68.0, y: 81.4, bx: 57.5, by: 67.5, lx: 3, ly: -5, f: 'LEFT' },
    { x: 77.6, y: 76.4, bx: 63.5, by: 64.0, lx: -3, ly: -1, f: 'LEFT' },
    { x: 84.0, y: 70.2, bx: 71.5, by: 60.5, lx: 2, ly: -4, f: 'LEFT' },
    { x: 87.4, y: 63.8, bx: 68.0, by: 55.5, lx: -4, ly: -1, f: 'LEFT' },
  ];

  for (const b of innerBottom10Coords) {
    spots.push({
      slotId: spots.length,
      ring: 'INNER',
      x: b.x,
      y: b.y,
      bobberX: b.bx,
      bobberY: b.by,
      labelOffsetX: b.lx,
      labelOffsetY: b.ly,
      facing: b.f,
    });
  }

  // 2. SLOTS 10..14: INNER LEFT BANK (5 spots with wider 6.3% step: Y = 32.5, 38.8, 45.1, 51.4, 57.7)
  const innerSideYs = [32.5, 38.8, 45.1, 51.4, 57.7];
  const innerLeftXs = [12.4, 11.7, 11.5, 11.5, 11.8];
  const innerLeftBobbers = [
    { bx: 34.0, by: 33.0 },
    { bx: 42.0, by: 38.0 },
    { bx: 34.5, by: 43.0 },
    { bx: 43.0, by: 47.5 },
    { bx: 36.5, by: 51.5 },
  ];
  for (let i = 0; i < 5; i++) {
    const isEven = i % 2 === 0;
    spots.push({
      slotId: spots.length,
      ring: 'INNER',
      x: innerLeftXs[i],
      y: innerSideYs[i],
      bobberX: innerLeftBobbers[i].bx,
      bobberY: innerLeftBobbers[i].by,
      labelOffsetX: isEven ? 4 : 2,
      labelOffsetY: isEven ? -2 : -4,
      facing: 'RIGHT',
    });
  }

  // 3. SLOTS 15..19: INNER RIGHT BANK (5 spots with wider 6.3% step: Y = 32.5, 38.8, 45.1, 51.4, 57.7)
  const innerRightXs = [87.6, 88.3, 88.5, 88.5, 88.2];
  const innerRightBobbers = [
    { bx: 66.0, by: 33.0 },
    { bx: 58.0, by: 38.0 },
    { bx: 65.5, by: 43.0 },
    { bx: 57.0, by: 47.5 },
    { bx: 63.5, by: 51.5 },
  ];
  for (let i = 0; i < 5; i++) {
    const isEven = i % 2 === 0;
    spots.push({
      slotId: spots.length,
      ring: 'INNER',
      x: innerRightXs[i],
      y: innerSideYs[i],
      bobberX: innerRightBobbers[i].bx,
      bobberY: innerRightBobbers[i].by,
      labelOffsetX: isEven ? -4 : -2,
      labelOffsetY: isEven ? -2 : -4,
      facing: 'LEFT',
    });
  }

  // ============================================================================
  // LINE 2: OUTER RING (20 SPOTS = 5 Left + 10 Bottom U-Curve + 5 Right)
  // Spread wider horizontally & vertically (Y = 35.6% -> 90.0%, 6.3% step)
  // ============================================================================

  // 4. SLOTS 20..24: OUTER LEFT BANK (5 spots placed in the exact vertical gaps between Inner Left spots!)
  const outerSideYs = [35.6, 41.9, 48.2, 54.5, 60.8];
  const outerLeftXs = [6.2, 5.8, 5.6, 5.6, 6.0];
  const outerLeftBobbers = [
    { bx: 25.5, by: 35.0 },
    { bx: 26.5, by: 40.5 },
    { bx: 24.5, by: 46.0 },
    { bx: 27.0, by: 51.0 },
    { bx: 22.5, by: 56.5 },
  ];
  for (let i = 0; i < 5; i++) {
    const isEven = i % 2 === 0;
    spots.push({
      slotId: spots.length,
      ring: 'OUTER',
      x: outerLeftXs[i],
      y: outerSideYs[i],
      bobberX: outerLeftBobbers[i].bx,
      bobberY: outerLeftBobbers[i].by,
      labelOffsetX: isEven ? 3 : 5,
      labelOffsetY: isEven ? -3 : -1,
      facing: 'RIGHT',
    });
  }

  // 5. SLOTS 25..34: OUTER BOTTOM U-CURVE (10 spots staggered wider around the outer bottom bank, Y: 67.0% -> 90.0%)
  const outerBottom10Coords: Array<{
    x: number;
    y: number;
    bx: number;
    by: number;
    lx: number;
    ly: number;
    f: FacingDir;
  }> = [
    // Left-Bottom Outer curve (5 spots facing RIGHT)
    { x: 6.8, y: 67.0, bx: 23.5, by: 62.5, lx: 3, ly: -3, f: 'RIGHT' },
    { x: 9.8, y: 73.6, bx: 28.0, by: 68.0, lx: 2, ly: -1, f: 'RIGHT' },
    { x: 15.6, y: 80.2, bx: 34.5, by: 72.0, lx: 2, ly: -4, f: 'RIGHT' },
    { x: 25.4, y: 86.2, bx: 41.0, by: 75.0, lx: -2, ly: -1, f: 'RIGHT' },
    { x: 37.8, y: 90.0, bx: 46.8, by: 71.0, lx: -3, ly: -4, f: 'RIGHT' },
    // Right-Bottom Outer curve (5 spots facing LEFT)
    { x: 62.2, y: 90.0, bx: 53.2, by: 73.0, lx: 3, ly: -1, f: 'LEFT' },
    { x: 74.6, y: 86.2, bx: 59.0, by: 75.0, lx: 2, ly: -4, f: 'LEFT' },
    { x: 84.4, y: 80.2, bx: 65.5, by: 72.0, lx: -2, ly: -1, f: 'LEFT' },
    { x: 90.2, y: 73.6, bx: 72.0, by: 68.0, lx: -2, ly: -3, f: 'LEFT' },
    { x: 93.2, y: 67.0, bx: 76.5, by: 62.5, lx: -3, ly: -1, f: 'LEFT' },
  ];

  for (const b of outerBottom10Coords) {
    spots.push({
      slotId: spots.length,
      ring: 'OUTER',
      x: b.x,
      y: b.y,
      bobberX: b.bx,
      bobberY: b.by,
      labelOffsetX: b.lx,
      labelOffsetY: b.ly,
      facing: b.f,
    });
  }

  // 6. SLOTS 35..39: OUTER RIGHT BANK (5 spots placed in the exact vertical gaps between Inner Right spots!)
  const outerRightXs = [93.8, 94.2, 94.4, 94.4, 94.0];
  const outerRightBobbers = [
    { bx: 74.5, by: 35.0 },
    { bx: 73.5, by: 40.5 },
    { bx: 75.5, by: 46.0 },
    { bx: 73.0, by: 51.0 },
    { bx: 77.5, by: 56.5 },
  ];
  for (let i = 0; i < 5; i++) {
    const isEven = i % 2 === 0;
    spots.push({
      slotId: spots.length,
      ring: 'OUTER',
      x: outerRightXs[i],
      y: outerSideYs[i],
      bobberX: outerRightBobbers[i].bx,
      bobberY: outerRightBobbers[i].by,
      labelOffsetX: isEven ? -3 : -5,
      labelOffsetY: isEven ? -3 : -1,
      facing: 'LEFT',
    });
  }

  return spots;
}

const OVAL_POND_40_SPOTS = build40PondSpots();

interface RodVisualMetric {
  aspect: number; // True PNG width / height
  widthBoost: number; // Gentle thickness boost so thin rods & reels stay crisp on mobile screens
  tipXFrac: number; // Horizontal fraction (0..1) of the actual rod tip in PNG
  topYFrac: number; // Vertical fraction (0..1) of the actual rod tip in PNG
  gripXFrac: number; // Horizontal fraction (0..1) of the handle grip in PNG
  gripYFrac: number; // Vertical fraction (0..1) of the handle grip in PNG
}

const CHAR_SVG_WIDTH = 56;
const CHAR_SVG_HEIGHT = 66;

/**
 * Calibrated from pixel alpha scans of `/assets/rods/rod-01..10.png`
 * Preserves each rod's true slender silhouette & reel/dragon proportions!
 */
const ROD_VISUAL_METRICS: Record<number, RodVisualMetric> = {
  1: { aspect: 20 / 746, widthBoost: 2.5, tipXFrac: 0.475, topYFrac: 0.005, gripXFrac: 0.45, gripYFrac: 0.84 },
  2: { aspect: 20 / 746, widthBoost: 2.5, tipXFrac: 0.475, topYFrac: 0.005, gripXFrac: 0.46, gripYFrac: 0.84 },
  3: { aspect: 53 / 746, widthBoost: 1.9, tipXFrac: 0.236, topYFrac: 0.005, gripXFrac: 0.2, gripYFrac: 0.84 },
  4: { aspect: 33 / 747, widthBoost: 2.2, tipXFrac: 0.53, topYFrac: 0.005, gripXFrac: 0.48, gripYFrac: 0.84 },
  5: { aspect: 22 / 747, widthBoost: 2.5, tipXFrac: 0.591, topYFrac: 0.005, gripXFrac: 0.455, gripYFrac: 0.84 },
  6: { aspect: 26 / 747, widthBoost: 2.35, tipXFrac: 0.577, topYFrac: 0.005, gripXFrac: 0.49, gripYFrac: 0.84 },
  7: { aspect: 28 / 747, widthBoost: 2.35, tipXFrac: 0.589, topYFrac: 0.005, gripXFrac: 0.482, gripYFrac: 0.84 },
  8: { aspect: 28 / 747, widthBoost: 2.4, tipXFrac: 0.607, topYFrac: 0.005, gripXFrac: 0.5, gripYFrac: 0.84 },
  9: { aspect: 46 / 747, widthBoost: 2.0, tipXFrac: 0.63, topYFrac: 0.005, gripXFrac: 0.575, gripYFrac: 0.84 },
  10: { aspect: 81 / 773, widthBoost: 1.85, tipXFrac: 0.5, topYFrac: 0.01, gripXFrac: 0.475, gripYFrac: 0.84 },
};

/**
 * Computes exact SVG layout for the Character PNG (clean + optional Bling FX)
 * and the Fishing Rod anchored 100% into the character's drawn hand/paw!
 */
function computeCharacterAndRodLayout(
  charModel: CharacterModelConfig,
  rodLevel: number,
  isReeling: boolean
) {
  const m = ROD_VISUAL_METRICS[rodLevel] || ROD_VISUAL_METRICS[1];
  const clampedLv = Math.max(1, Math.min(10, rodLevel));
  const lengthScale = 1 + (clampedLv - 1) * 0.028; // Lv1 = 1.00x -> Lv10 = 1.252x

  // Normalize character clean height inside viewBox 0..46 x 0..54 (feet at y = 50.5)
  const cleanH = 44.5;
  const cleanW = cleanH * (charModel.cleanSize[0] / charModel.cleanSize[1]);
  const charX = 20.0 - cleanW / 2;
  const charY = 50.5 - cleanH;

  // Symmetric FX bounding box for Lv5..Lv10 animated bling WebP/PNG
  let fxX = charX;
  let fxY = charY;
  let fxW = cleanW;
  let fxH = cleanH;
  if (charModel.fxSize) {
    const padX =
      ((charModel.fxSize[0] - charModel.cleanSize[0]) /
        2 /
        charModel.cleanSize[0]) *
      cleanW;
    const padY =
      ((charModel.fxSize[1] - charModel.cleanSize[1]) /
        2 /
        charModel.cleanSize[1]) *
      cleanH;
    fxX = charX - padX;
    fxY = charY - padY;
    fxW = cleanW + padX * 2;
    fxH = cleanH + padY * 2;
  }

  // Exact hand/paw coordinate on the character sprite
  const handX = charX + charModel.handXFrac * cleanW;
  const handY = charY + charModel.handYFrac * cleanH;

  // Target Rod Tip extending forward & upward from the character's hand
  const targetTipX = handX + 16.5 * lengthScale;
  const targetTipY = handY + (isReeling ? -19.5 : -23.5) * lengthScale;

  const targetDx = targetTipX - handX;
  const targetDy = targetTipY - handY;
  const targetLen = Math.hypot(targetDx, targetDy);
  const targetAngleRad = Math.atan2(targetDy, targetDx);

  // Unit-height local vector from Grip (gripXFrac, gripYFrac) to Tip (tipXFrac, topYFrac)
  const effAspect = m.aspect * m.widthBoost;
  const unitTipDx = (m.tipXFrac - m.gripXFrac) * effAspect;
  const unitTipDy = m.topYFrac - m.gripYFrac;
  const unitLen = Math.hypot(unitTipDx, unitTipDy);
  const localAngleRad = Math.atan2(unitTipDy, unitTipDx);

  const rodH = targetLen / unitLen;
  const rodW = rodH * effAspect;
  const angleDeg = ((targetAngleRad - localAngleRad) * 180) / Math.PI;

  return {
    charX,
    charY,
    cleanW,
    cleanH,
    fxX,
    fxY,
    fxW,
    fxH,
    handX,
    handY,
    targetTipX,
    targetTipY,
    rodW,
    rodH,
    imgX: -m.gripXFrac * rodW,
    imgY: -m.gripYFrac * rodH,
    angleDeg,
  };
}

function getExactRodTipPercent(
  spot: PondSpotConfig,
  status: ActiveAnglerState['status'],
  isCrowded: boolean,
  sceneSize: { width: number; height: number },
  rodLevel: number,
  tiktokUid: string
): { tipX: number; tipY: number } {
  const scale = isCrowded ? 0.84 : 1.0;
  const isReeling = status === 'REELING';
  const charModel = resolveCharacterModel(rodLevel, tiktokUid);
  const layout = computeCharacterAndRodLayout(charModel, rodLevel, isReeling);

  // SVG is CHAR_SVG_WIDTH x CHAR_SVG_HEIGHT px with viewBox 0..46 x 0..54, centered at (23, 27) at (spot.x%, spot.y%)
  const deltaSvgX = layout.targetTipX - 23.0;
  const deltaSvgY = layout.targetTipY - 27.0;

  const deltaPxX =
    (spot.facing === 'RIGHT' ? 1 : -1) *
    deltaSvgX *
    (CHAR_SVG_WIDTH / 46) *
    scale;
  const deltaPxY = deltaSvgY * (CHAR_SVG_HEIGHT / 54) * scale;

  const dxPct = (deltaPxX / Math.max(1, sceneSize.width)) * 100;
  const dyPct = (deltaPxY / Math.max(1, sceneSize.height)) * 100;

  return {
    tipX: spot.x + dxPct,
    tipY: spot.y + dyPct,
  };
}

const CHARACTER_PALETTES = [
  {
    id: 'teal',
    capTop: '#2dd4bf',
    capBottom: '#0d9488',
    shirtTop: '#2dd4bf',
    shirtBottom: '#0f766e',
  },
  {
    id: 'red',
    capTop: '#f87171',
    capBottom: '#dc2626',
    shirtTop: '#f87171',
    shirtBottom: '#b91c1c',
  },
  {
    id: 'yellow',
    capTop: '#fde047',
    capBottom: '#eab308',
    shirtTop: '#facc15',
    shirtBottom: '#ca8a04',
  },
  {
    id: 'green',
    capTop: '#a3e635',
    capBottom: '#65a30d',
    shirtTop: '#84cc16',
    shirtBottom: '#4d7c0f',
  },
  {
    id: 'blue',
    capTop: '#60a5fa',
    capBottom: '#2563eb',
    shirtTop: '#3b82f6',
    shirtBottom: '#1d4ed8',
  },
  {
    id: 'purple',
    capTop: '#c084fc',
    capBottom: '#9333ea',
    shirtTop: '#a855f7',
    shirtBottom: '#7e22ce',
  },
  {
    id: 'orange',
    capTop: '#fb923c',
    capBottom: '#ea580c',
    shirtTop: '#f97316',
    shirtBottom: '#c2410c',
  },
  {
    id: 'pink',
    capTop: '#f472b6',
    capBottom: '#db2777',
    shirtTop: '#f472b6',
    shirtBottom: '#be185d',
  },
  {
    id: 'sky',
    capTop: '#7dd3fc',
    capBottom: '#0284c7',
    shirtTop: '#38bdf8',
    shirtBottom: '#0369a1',
  },
];

export const FishingScene2D: React.FC<FishingScene2DProps> = ({
  anglers,
  heartBursts,
  environment,
}) => {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [sceneSize, setSceneSize] = useState({ width: 450, height: 800 });

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width;
      const h = el.clientHeight || el.getBoundingClientRect().height;
      if (w > 0 && h > 0) {
        setSceneSize({ width: w, height: h });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isCrowded = anglers.length > 14;
  const isNight = environment.dayPhase === 'NIGHT';

  const seatedAnglers = anglers
    .slice(0, OVAL_POND_40_SPOTS.length)
    .map((angler, idx) => {
      const spot =
        OVAL_POND_40_SPOTS[angler.slotIndex % OVAL_POND_40_SPOTS.length] ||
        OVAL_POND_40_SPOTS[idx];
      return {
        angler,
        spot,
        palette:
          CHARACTER_PALETTES[angler.slotIndex % CHARACTER_PALETTES.length],
      };
    });

  return (
    <div
      ref={sceneRef}
      className="relative isolate z-10 w-full h-full overflow-hidden select-none bg-[#2b5829]"
    >
      {/* Hidden SVG Filter Definition for HD Unsharp Mask Image Sharpening */}
      <svg className="hidden" width="0" height="0">
        <defs>
          <filter id="hdSharpen">
            <feConvolveMatrix
              order="3 3"
              preserveAlpha="true"
              kernelMatrix="0 -0.35 0 -0.35 2.4 -0.35 0 -0.35 0"
            />
          </filter>
        </defs>
      </svg>

      {/* 1. HIGH-DEFINITION POND ILLUSTRATION BACKGROUND (`/assets/bg-pond.png`) */}
      <img
        src="/assets/bg-pond.png"
        alt="Fishing Pond Background"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none crisp-pond-bg"
        draggable={false}
      />

      {/* Night Mode Atmospheric Moonlight Tint */}
      {isNight && (
        <div className="absolute inset-0 bg-indigo-950/30 pointer-events-none transition-opacity duration-700" />
      )}

      {/* Subtle Animated Water Shimmer over the Oval Pond Center */}
      <div className="absolute left-[22%] right-[22%] top-[20%] bottom-[22%] rounded-full pointer-events-none overflow-hidden">
        <div
          className="w-full h-full animate-sparkle"
          style={{
            background: isNight
              ? 'radial-gradient(ellipse 65% 50% at 50% 42%, rgba(199, 210, 254, 0.28) 0%, transparent 70%)'
              : 'radial-gradient(ellipse 65% 50% at 50% 42%, rgba(165, 243, 252, 0.22) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* 2. PRECISION FISHING LINES (Connected 100% to each user's exact Rod Tip!) */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full z-30 pointer-events-none"
      >
        <defs>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="0.3"
              stdDeviation="0.25"
              floodColor="#000000"
              floodOpacity="0.45"
            />
          </filter>
        </defs>

        {seatedAnglers.map(({ angler, spot }) => {
          const isActivelyFishing =
            angler.status === 'CASTING' ||
            angler.status === 'WAITING_BITE' ||
            angler.status === 'REELING' ||
            angler.status === 'SHOW_CATCH' ||
            angler.status === 'ESCAPED';

          if (!isActivelyFishing) return null;

          const rodConfig = getRodConfigByLevel(angler.rodLevel);
          const { tipX, tipY } = getExactRodTipPercent(
            spot,
            angler.status,
            isCrowded,
            sceneSize,
            angler.rodLevel,
            angler.tiktokUid
          );

          const targetX = spot.bobberX;
          const targetY = spot.bobberY;

          const ctrlX = (tipX + targetX) / 2;
          const ctrlY = Math.min(tipY, targetY) - 3.5;

          return (
            <g key={`line_${angler.tiktokUid}`}>
              <path
                d={`M ${tipX} ${tipY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`}
                fill="none"
                filter="url(#lineGlow)"
                stroke={
                  angler.rodLevel >= 7
                    ? rodConfig.color
                    : 'rgba(255, 255, 255, 0.9)'
                }
                strokeWidth={angler.rodLevel >= 7 ? '0.38' : '0.28'}
                strokeDasharray={angler.status === 'ESCAPED' ? '1 1' : undefined}
                strokeLinecap="round"
              />
              <circle
                cx={tipX}
                cy={tipY}
                r="0.32"
                fill={angler.rodLevel >= 7 ? rodConfig.color : '#ffffff'}
              />
            </g>
          );
        })}
      </svg>

      {/* 3. NON-OVERLAPPING 40-GRID BOBBERS, FAKE TWITCHES, CATCH POPUPS & ESCAPE BADGES */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {seatedAnglers.map(({ angler, spot }) => {
          const isFishing =
            angler.status === 'CASTING' ||
            angler.status === 'WAITING_BITE' ||
            angler.status === 'REELING';

          const isShowingCatch =
            angler.status === 'SHOW_CATCH' && Boolean(angler.lastCatch);
          const isEscaped =
            angler.status === 'ESCAPED' && Boolean(angler.lastCatch);

          if (!isFishing && !isShowingCatch && !isEscaped) return null;

          const staggerY = (spot.slotId % 3) * -6;

          // A. FISH ESCAPED BADGE ("Cá thoát!")
          if (isEscaped && angler.lastCatch) {
            const tierMeta =
              RARITY_META[angler.lastCatch.rarity] || RARITY_META.COMMON;
            return (
              <div
                key={`escape_badge_${angler.tiktokUid}`}
                style={{
                  left: `${spot.bobberX}%`,
                  top: `calc(${spot.bobberY}% + ${staggerY}px)`,
                  zIndex: 60 + (spot.slotId % 10),
                }}
                className="absolute flex flex-col items-center animate-fish-pop"
              >
                <div className="px-2.5 py-[2px] rounded-full bg-rose-700 border-2 border-white text-white font-display font-extrabold text-[10.5px] whitespace-nowrap shadow-lg flex items-center gap-1">
                  <span>💨 Cá thoát!</span>
                  <span
                    style={{ color: tierMeta.color }}
                    className="text-[9.5px] font-black"
                  >
                    ({tierMeta.label})
                  </span>
                </div>
              </div>
            );
          }

          // B. FISH CAUGHT POPUP BADGE (FULL-VIEW NAME + KG)
          if (isShowingCatch && angler.lastCatch) {
            const caughtSpecies = FISH_CATALOG.find(
              (f) => f.id === angler.lastCatch?.fishId
            );
            const isHighRarity =
              angler.lastCatch.rarity === 'LEGENDARY' ||
              angler.lastCatch.rarity === 'EPIC';

            return (
              <div
                key={`catch_badge_${angler.tiktokUid}`}
                style={{
                  left: `${spot.bobberX}%`,
                  top: `calc(${spot.bobberY}% + ${staggerY}px)`,
                  zIndex: 60 + (spot.slotId % 10),
                }}
                className="absolute flex flex-col items-center animate-fish-pop"
              >
                {caughtSpecies?.imageUrl ? (
                  <img
                    src={caughtSpecies.imageUrl}
                    alt={angler.lastCatch.fishName}
                    className="w-10 h-7 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.75)] -mb-0.5"
                  />
                ) : (
                  <VectorFishIcon
                    rarity={angler.lastCatch.rarity}
                    className="w-8 h-5 drop-shadow-md -mb-0.5"
                  />
                )}

                <div
                  className={`px-2.5 py-[2px] rounded-full font-display font-extrabold text-[10.5px] whitespace-nowrap flex items-center gap-1 ${
                    isHighRarity ? 'catch-pill-gold' : 'catch-pill-green'
                  }`}
                >
                  <span>{angler.lastCatch.fishName}</span>
                  <span>•</span>
                  <span>{angler.lastCatch.weight} kg</span>
                </div>
              </div>
            );
          }

          // C. BOBBER IN WATER (with Fake Twitch Dip Indicator!)
          const isFakeTwitching =
            Boolean(angler.lastTwitchAt) &&
            Date.now() - (angler.lastTwitchAt || 0) < 900;

          return (
            <div
              key={`bobber_${angler.tiktokUid}`}
              style={{ left: `${spot.bobberX}%`, top: `${spot.bobberY}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            >
              {isFakeTwitching && (
                <span className="text-[8px] font-display font-bold text-amber-300 -mb-1 animate-bounce drop-shadow">
                  !
                </span>
              )}
              <div
                className={`w-7 h-3 rounded-full border ${
                  angler.status === 'REELING'
                    ? 'border-amber-200 animate-ping scale-125'
                    : isFakeTwitching
                    ? 'border-cyan-200 scale-110'
                    : 'border-white/50 animate-ripple'
                } flex items-center justify-center`}
              >
                <div className="w-4 h-1.5 rounded-full border border-white/65" />
              </div>

              <svg
                width="11"
                height="11"
                viewBox="0 0 14 14"
                className={`-mt-2.5 drop-shadow ${
                  angler.status === 'REELING' || isFakeTwitching
                    ? 'animate-bounce scale-125'
                    : 'animate-bobber'
                }`}
              >
                <clipPath id={`bobberClip_${angler.tiktokUid}`}>
                  <circle cx="7" cy="7" r="6" />
                </clipPath>
                <g clipPath={`url(#bobberClip_${angler.tiktokUid})`}>
                  <rect x="0" y="0" width="14" height="7" fill="#ffffff" />
                  <rect x="0" y="7" width="14" height="7" fill="#ff4757" />
                </g>
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                />
              </svg>
            </div>
          );
        })}
      </div>

      {/* 4A. 40 CHARACTERS & RODS LAYER (Depth-sorted by Y so front characters naturally stand in front of back characters) */}
      <div className="absolute inset-0 z-25 pointer-events-none">
        {seatedAnglers.map(({ angler, spot, palette }) => (
          <div
            key={`body_${angler.tiktokUid}`}
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              zIndex: Math.round(spot.y),
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300"
          >
            <Soft3DChibiAnglerBody
              angler={angler}
              spot={spot}
              isCrowded={isCrowded}
              palette={palette}
            />
          </div>
        ))}
      </div>

      {/* 4B. DEDICATED TOP UI LAYER FOR NAMEPLATES, BACK BAIT/TURN CLUSTER & FLOATING MESSAGES (Never covered by character sprites!) */}
      <div className="absolute inset-0 z-35 pointer-events-none">
        {seatedAnglers.map(({ angler, spot }) => (
          <div
            key={`hud_${angler.tiktokUid}`}
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              zIndex: 100 + Math.round(spot.y) + (angler.rodLevel >= 5 ? 20 : 0),
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300"
          >
            <AnglerHudOverlay
              angler={angler}
              spot={spot}
              isCrowded={isCrowded}
              heartBurstTick={heartBursts[angler.tiktokUid] || 0}
            />
          </div>
        ))}
      </div>

      {/* Active Anglers Counter Badge at Bottom-Left */}
      {seatedAnglers.length > 0 && (
        <div className="absolute bottom-2.5 left-3 z-40 game-hud-card rounded-full px-3 py-1 text-[10px] font-display font-bold text-teal-200 flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Đang câu: {seatedAnglers.length}/40 cần thủ</span>
        </div>
      )}

      {/* Empty State Prompt if 0 anglers are active */}
      {seatedAnglers.length === 0 && (
        <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 game-hud-card rounded-2xl px-5 py-3 text-center w-[80%] max-w-xs pointer-events-none">
          <p className="font-display text-amber-300 font-bold text-xs tracking-wide">
            Thả Tim ❤️ hoặc Chat "câu" để ra bờ hồ câu cá!
          </p>
          <p className="text-[10px] text-slate-200 font-semibold mt-0.5">
            Follow kênh mở khóa ngay Cần Trúc Lv2 vĩnh viễn!
          </p>
        </div>
      )}
    </div>
  );
};

interface Soft3DChibiAnglerBodyProps {
  angler: ActiveAnglerState;
  spot: PondSpotConfig;
  isCrowded: boolean;
  palette: {
    id: string;
    capTop: string;
    capBottom: string;
    shirtTop: string;
    shirtBottom: string;
  };
}

const Soft3DChibiAnglerBody: React.FC<Soft3DChibiAnglerBodyProps> = ({
  angler,
  spot,
  isCrowded,
  palette,
}) => {
  const rodConfig = getRodConfigByLevel(angler.rodLevel);
  const flipLeft = spot.facing === 'LEFT';
  const gradUid = `${angler.tiktokUid}_${palette.id}`;
  const isReeling = angler.status === 'REELING';
  const charModel = resolveCharacterModel(angler.rodLevel, angler.tiktokUid);
  const rodTransform = computeCharacterAndRodLayout(
    charModel,
    angler.rodLevel,
    isReeling
  );

  return (
    <div
      className={`relative flex flex-col items-center transition-transform duration-300 ${
        isCrowded ? 'scale-[0.84]' : 'scale-100'
      }`}
    >
      {rodConfig.spriteUrl ? (
        <img
          src={rodConfig.spriteUrl}
          alt={angler.nickname}
          className="w-14 h-16 object-contain"
        />
      ) : (
        <svg
          width={CHAR_SVG_WIDTH}
          height={CHAR_SVG_HEIGHT}
          viewBox="0 0 46 54"
          className={`overflow-visible transition-transform duration-300 ${
            flipLeft ? '-scale-x-100' : ''
          }`}
        >
          <defs>
            <filter
              id={`rodShadow_${gradUid}`}
              x="-40%"
              y="-30%"
              width="180%"
              height="160%"
            >
              {angler.rodLevel >= 5 && (
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation={angler.rodLevel >= 9 ? '1.35' : '0.85'}
                  floodColor={rodConfig.color}
                  floodOpacity={angler.rodLevel >= 9 ? '0.9' : '0.65'}
                />
              )}
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="0.55"
                floodColor="#000000"
                floodOpacity="0.6"
              />
            </filter>
          </defs>

          {/* Ground Shadow */}
          <ellipse
            cx="20.0"
            cy="50.5"
            rx="9.5"
            ry="2.8"
            fill="rgba(0,0,0,0.45)"
          />

          {/* CUSTOM CHARACTER MODEL BY LEVEL (Lv1-4 Random 4 Models, Lv5-10 Dedicated Model + Animated Bling FX!) */}
          {charModel.blingWebpUrl ? (
            <image
              href={charModel.blingWebpUrl}
              x={rodTransform.fxX}
              y={rodTransform.fxY}
              width={rodTransform.fxW}
              height={rodTransform.fxH}
              preserveAspectRatio="none"
            />
          ) : (
            <image
              href={charModel.cleanUrl}
              x={rodTransform.charX}
              y={rodTransform.charY}
              width={rodTransform.cleanW}
              height={rodTransform.cleanH}
              preserveAspectRatio="none"
            />
          )}

          {/* CRISP PNG FISHING ROD LAYER (Anchored 100% into the character's drawn hand/paw!) */}
          {rodConfig.rodSpriteUrl ? (
            <g
              filter={`url(#rodShadow_${gradUid})`}
              transform={`translate(${rodTransform.handX} ${rodTransform.handY}) rotate(${rodTransform.angleDeg})`}
            >
              <image
                href={rodConfig.rodSpriteUrl}
                x={rodTransform.imgX}
                y={rodTransform.imgY}
                width={rodTransform.rodW}
                height={rodTransform.rodH}
                preserveAspectRatio="none"
              />
            </g>
          ) : isReeling ? (
            <path
              d={`M ${rodTransform.handX} ${rodTransform.handY} Q 34 15 ${rodTransform.targetTipX} ${rodTransform.targetTipY}`}
              fill="none"
              stroke={angler.rodLevel >= 3 ? rodConfig.color : '#e8c585'}
              strokeWidth={angler.rodLevel >= 7 ? '2.8' : '2.2'}
              strokeLinecap="round"
            />
          ) : (
            <line
              x1={rodTransform.handX}
              y1={rodTransform.handY}
              x2={rodTransform.targetTipX}
              y2={rodTransform.targetTipY}
              stroke={angler.rodLevel >= 3 ? rodConfig.color : '#e8c585'}
              strokeWidth={angler.rodLevel >= 7 ? '2.6' : '2.1'}
              strokeLinecap="round"
            />
          )}
        </svg>
      )}
    </div>
  );
};

interface AnglerHudOverlayProps {
  angler: ActiveAnglerState;
  spot: PondSpotConfig;
  isCrowded: boolean;
  heartBurstTick: number;
}

const AnglerHudOverlay: React.FC<AnglerHudOverlayProps> = ({
  angler,
  spot,
  isCrowded,
  heartBurstTick,
}) => {
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showGiftFloating, setShowGiftFloating] = useState(false);

  useEffect(() => {
    if (heartBurstTick > 0) {
      setShowHeartPop(true);
      const timer = setTimeout(() => setShowHeartPop(false), 800);
      return () => clearTimeout(timer);
    }
  }, [heartBurstTick]);

  useEffect(() => {
    if (angler.lastGiftAt && Date.now() - angler.lastGiftAt < 4000) {
      setShowGiftFloating(true);
      const timer = setTimeout(() => setShowGiftFloating(false), 3800);
      return () => clearTimeout(timer);
    }
  }, [angler.lastGiftAt, angler.lastGiftFloatingText]);

  const rodConfig = getRodConfigByLevel(angler.rodLevel);
  const baitConfig = getBaitConfigByTier(angler.baitTier);
  const clampedLv = Math.min(10, Math.max(1, angler.rodLevel));
  const nameplateClass = `nameplate-lv${clampedLv}`;

  const labelTx = isCrowded ? spot.labelOffsetX * 0.5 : spot.labelOffsetX * 0.4;
  const scale = isCrowded ? 0.84 : 1.0;

  // Smart horizontal clamping so overhead floating messages near left/right screen edges NEVER get clipped!
  const floatingAlignClass =
    spot.x < 24
      ? 'left-0 translate-x-0'
      : spot.x > 76
      ? 'right-0 translate-x-0'
      : 'left-1/2 -translate-x-1/2';

  // Cluster 2 sits behind the character's back (opposite to the fishing rod direction)
  const isFacingRight = spot.facing === 'RIGHT';

  return (
    <div
      style={{
        width: `${CHAR_SVG_WIDTH * scale}px`,
        height: `${CHAR_SVG_HEIGHT * scale}px`,
      }}
      className="relative pointer-events-none"
    >
      {/* CLUSTER 1: ABOVE HEAD (Ultra-Compact Level-Styled Nameplate + Integrated 1.5px KC Bar + Clamped Floating Bubble) */}
      <div
        style={{
          transform: `translate(calc(-50% + ${labelTx}px), 3px)`,
        }}
        className="absolute bottom-full left-1/2 flex flex-col items-center transition-transform duration-300"
      >
        {/* Shortened Floating Message Bubble (Clamped inside screen bounds!) */}
        {showGiftFloating && angler.lastGiftFloatingText && (
          <div
            className={`absolute bottom-full mb-1 z-50 px-2 py-[2px] rounded-full bg-amber-950/95 border border-amber-300 text-amber-100 font-display font-extrabold text-[9.5px] whitespace-nowrap shadow-xl animate-bounce ${floatingAlignClass}`}
          >
            {angler.lastGiftFloatingText}
          </div>
        )}

        {/* Anti-Spam Floating Heart / Cast +1 Pop */}
        {showHeartPop && !showGiftFloating && (
          <div className="absolute bottom-full mb-0.5 z-50 animate-heart-rise text-rose-400 font-display font-extrabold text-[10px] flex items-center gap-0.5 drop-shadow">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f43f5e">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>+1</span>
          </div>
        )}

        {/* Ultra-Compact Level-Styled Nameplate Pill with integrated 1.5px KC Progress Bar */}
        <div
          className={`relative overflow-hidden rounded-full px-1 pt-[1px] pb-[2.5px] font-display font-extrabold tracking-tighter whitespace-nowrap flex items-center gap-0.5 ${
            isCrowded ? 'text-[7.5px]' : 'text-[8px]'
          } ${nameplateClass}`}
        >
          <span
            style={{ color: rodConfig.color }}
            className="text-[7px] font-black leading-none shrink-0"
          >
            Lv{angler.rodLevel}
          </span>
          <span
            className={`${
              isCrowded ? 'max-w-[38px]' : 'max-w-[44px]'
            } truncate leading-tight`}
          >
            {angler.nickname}
          </span>

          {/* Integrated 1.5px KC Progress Bar at bottom edge of Nameplate */}
          <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-black/55">
            <div
              style={{ width: `${angler.rodProgressPct}%` }}
              className={`h-full transition-all duration-300 ${
                angler.isNearLevelUp
                  ? 'bg-gradient-to-r from-amber-300 to-rose-400 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-400 to-cyan-300'
              }`}
            />
          </div>
        </div>
      </div>

      {/* CLUSTER 2: POSITIONED AT MID-BACK TORSO (Only renders PAID Bait Icon+Count & Pending Turns; hides default bait!) */}
      {((!angler.isDefaultBait && angler.baitCount > 0) ||
        angler.pendingCasts > 0) && (
        <div
          className={`absolute top-[42%] flex flex-col gap-0.5 ${
            isFacingRight
              ? `${spot.x < 9 ? '-left-1' : '-left-2'} items-start`
              : `${spot.x > 91 ? '-right-1' : '-right-2'} items-end`
          }`}
        >
          {/* Paid Bait Icon + Count Badge (Hidden when using default infinite bait) */}
          {!angler.isDefaultBait && angler.baitCount > 0 && (
            <div className="back-stat-pill px-1 py-[1px] rounded-full flex items-center gap-0.5 whitespace-nowrap border-amber-400/80 text-amber-200">
              <img
                src={baitConfig.imageUrl}
                alt={baitConfig.name}
                className="w-3 h-3 object-contain shrink-0"
              />
              <span className="font-display font-black text-[7.5px] leading-none">
                {angler.baitCount}
              </span>
            </div>
          )}

          {/* Pending Turns Badge (+1..+3) */}
          {angler.pendingCasts > 0 && (
            <div className="px-1 py-[1px] rounded-full bg-rose-600/95 border border-rose-200/80 text-white font-display font-black text-[7.5px] leading-none whitespace-nowrap shadow">
              +{angler.pendingCasts}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const VectorFishIcon: React.FC<{ rarity: FishRarity; className?: string }> = ({
  rarity,
  className = 'w-8 h-5',
}) => {
  const colors =
    rarity === 'LEGENDARY'
      ? { body1: '#ffc93c', body2: '#ca8a04', fin: '#f97316' }
      : rarity === 'EPIC'
      ? { body1: '#b07bff', body2: '#7e22ce', fin: '#38bdf8' }
      : rarity === 'RARE'
      ? { body1: '#4fb0ff', body2: '#0284c7', fin: '#bae6fd' }
      : rarity === 'UNCOMMON'
      ? { body1: '#7bd88f', body2: '#16a34a', fin: '#bbf7d0' }
      : { body1: '#9fb4bd', body2: '#64748b', fin: '#e2e8f0' };

  return (
    <svg viewBox="0 0 44 26" className={className}>
      <polygon
        points="8,13 1,5 2,13 1,21"
        fill={colors.fin}
        stroke="#0f172a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M 18 6 Q 23 1 28 6 Z"
        fill={colors.fin}
        stroke="#0f172a"
        strokeWidth="1"
      />
      <ellipse
        cx="23"
        cy="13"
        rx="15"
        ry="7.5"
        fill={colors.body1}
        stroke="#0f172a"
        strokeWidth="1.2"
      />
      <path
        d="M 12 15 Q 23 20 34 15"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.55"
        strokeLinecap="round"
      />
      <path
        d="M 29 9 Q 27 13 29 17"
        fill="none"
        stroke={colors.body2}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="33" cy="11.5" r="2" fill="#ffffff" />
      <circle cx="33.6" cy="11.5" r="1" fill="#0f172a" />
    </svg>
  );
};
