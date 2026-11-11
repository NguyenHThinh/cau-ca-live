import { BaitTierConfig, FishSpecies, RodTierConfig } from './types.js';
import {
  FISH_CATALOG,
  FISH_T1_01_RO_DONG,
  FISH_T1_02_DIEC,
  FISH_T1_03_TRE_DEN,
  FISH_T1_04_RO_PHI,
  FISH_T2_05_CHEP,
  FISH_T2_06_TRAM_CO,
  FISH_T2_07_ME_TRANG,
  FISH_T2_08_CHIM_TRANG,
  FISH_T3_09_LOC_BONG,
  FISH_T3_10_CHINH,
  FISH_T3_11_DIEU_HONG,
  FISH_T3_12_HOI_VAN,
  FISH_T4_13_TRA_DAU,
  FISH_T4_14_BONG_TUONG,
  FISH_T4_15_LANG,
  FISH_T4_16_KOI_HOA,
  FISH_T5_17_HO,
  FISH_T5_18_ANH_DAO,
  FISH_T5_19_HONG_LIEN,
  FISH_T5_20_PHONG_DO,
  FISH_T5_21_BANG_TUYET,
  FISH_T5_22_TRANG_BAC,
  ORDERED_RARITIES,
  RARITY_META,
  RARITY_ORDER,
  SEASON_META,
} from './definitions/fishDefinitions.js';
import {
  BAIT_1_GIUN_DAT,
  BAIT_2_DE_MEN,
  BAIT_3_TOM_TUOI,
  BAIT_4_CA_CON,
  BAIT_5_MOI_THOM,
  BAIT_6_MOI_VANG,
  BAIT_TIERS,
  CHAR_LV01_BE_NON_ROM,
  CHAR_LV02_CAU_BE_MU_BUCKET,
  CHAR_LV03_BE_AO_MUA_VANG,
  CHAR_LV04_CO_BE_MU_KINH,
  CHAR_LV05_CO_BE_TOC_HONG,
  CHAR_LV06_RAI_CA_AO_PHAO,
  CHAR_LV07_GAU_TRUC_DO,
  CHAR_LV08_MEO_CAM_HOODIE,
  CHAR_LV09_GAU_BAC_CUC,
  CHAR_LV10_CHIM_CANH_CUT,
  CHARACTER_MODELS,
  GIFT_PRESETS,
  resolveCharacterModel,
  ROD_01_CAN_TRE,
  ROD_02_CAN_TRUC_DEN,
  ROD_03_CAN_COMPOSITE,
  ROD_04_CAN_SOI_THUY_TINH,
  ROD_05_CAN_CARBON,
  ROD_06_CAN_CARBON_PRO,
  ROD_07_CAN_TITAN,
  ROD_08_CAN_HOP_KIM_BAC,
  ROD_09_CAN_VANG,
  ROD_10_CAN_THAN_NGU,
  ROD_TIERS,
} from './definitions/vipDefinitions.js';

export {
  FISH_CATALOG,
  FISH_T1_01_RO_DONG,
  FISH_T1_02_DIEC,
  FISH_T1_03_TRE_DEN,
  FISH_T1_04_RO_PHI,
  FISH_T2_05_CHEP,
  FISH_T2_06_TRAM_CO,
  FISH_T2_07_ME_TRANG,
  FISH_T2_08_CHIM_TRANG,
  FISH_T3_09_LOC_BONG,
  FISH_T3_10_CHINH,
  FISH_T3_11_DIEU_HONG,
  FISH_T3_12_HOI_VAN,
  FISH_T4_13_TRA_DAU,
  FISH_T4_14_BONG_TUONG,
  FISH_T4_15_LANG,
  FISH_T4_16_KOI_HOA,
  FISH_T5_17_HO,
  FISH_T5_18_ANH_DAO,
  FISH_T5_19_HONG_LIEN,
  FISH_T5_20_PHONG_DO,
  FISH_T5_21_BANG_TUYET,
  FISH_T5_22_TRANG_BAC,
  ORDERED_RARITIES,
  RARITY_META,
  RARITY_ORDER,
  SEASON_META,
  ROD_TIERS,
  ROD_01_CAN_TRE,
  ROD_02_CAN_TRUC_DEN,
  ROD_03_CAN_COMPOSITE,
  ROD_04_CAN_SOI_THUY_TINH,
  ROD_05_CAN_CARBON,
  ROD_06_CAN_CARBON_PRO,
  ROD_07_CAN_TITAN,
  ROD_08_CAN_HOP_KIM_BAC,
  ROD_09_CAN_VANG,
  ROD_10_CAN_THAN_NGU,
  BAIT_TIERS,
  BAIT_1_GIUN_DAT,
  BAIT_2_DE_MEN,
  BAIT_3_TOM_TUOI,
  BAIT_4_CA_CON,
  BAIT_5_MOI_THOM,
  BAIT_6_MOI_VANG,
  GIFT_PRESETS,
  CHAR_LV01_BE_NON_ROM,
  CHAR_LV02_CAU_BE_MU_BUCKET,
  CHAR_LV03_BE_AO_MUA_VANG,
  CHAR_LV04_CO_BE_MU_KINH,
  CHAR_LV05_CO_BE_TOC_HONG,
  CHAR_LV06_RAI_CA_AO_PHAO,
  CHAR_LV07_GAU_TRUC_DO,
  CHAR_LV08_MEO_CAM_HOODIE,
  CHAR_LV09_GAU_BAC_CUC,
  CHAR_LV10_CHIM_CANH_CUT,
  CHARACTER_MODELS,
  resolveCharacterModel,
};

export function getFishByNameOrId(query: string): FishSpecies | undefined {
  const normalized = query.replace('★', '').trim().toLowerCase();
  return FISH_CATALOG.find(
    (f) =>
      f.id.toLowerCase() === normalized ||
      f.name.replace('★', '').trim().toLowerCase() === normalized
  );
}

export function getRodConfigByLevel(level: number): RodTierConfig {
  const clamped = Math.max(1, Math.min(10, Math.round(level)));
  return ROD_TIERS.find((r) => r.level === clamped) || ROD_TIERS[0];
}

/**
 * Calculates Rod Level from cumulative Gift Diamonds (KC),
 * with the special rule: Followed users automatically unlock at least Rod Lv2 (Cần trúc đen)!
 */
export function calculateRodLevelFromKc(
  diamondsKc: number,
  isFollower = false
): number {
  let levelByKc = 1;
  for (const rod of ROD_TIERS) {
    if (diamondsKc >= rod.requiredKc) {
      levelByKc = rod.level;
    }
  }
  return Math.max(levelByKc, isFollower ? 2 : 1);
}

/**
 * Computes progress toward the next rod level for UI progress bars & "Sắp lên cấp" alerts.
 */
export function getRodProgressInfo(diamondsKc: number, rodLevel: number): {
  nextRodKc: number | null;
  kcRemainingForNext: number;
  rodProgressPct: number;
  isNearLevelUp: boolean;
} {
  if (rodLevel >= 10) {
    return {
      nextRodKc: null,
      kcRemainingForNext: 0,
      rodProgressPct: 100,
      isNearLevelUp: false,
    };
  }

  const currentRod = getRodConfigByLevel(rodLevel);
  const nextRod = getRodConfigByLevel(rodLevel + 1);
  const effectiveKc = Math.max(diamondsKc, currentRod.requiredKc);
  const bracketSpan = Math.max(1, nextRod.requiredKc - currentRod.requiredKc);
  const gainedInBracket = Math.max(0, effectiveKc - currentRod.requiredKc);
  const kcRemainingForNext = Math.max(0, nextRod.requiredKc - effectiveKc);
  const rodProgressPct = Math.min(
    99,
    Math.max(0, Math.round((gainedInBracket / bracketSpan) * 100))
  );

  const isNearLevelUp =
    gainedInBracket > 0 &&
    (kcRemainingForNext <= 15 || rodProgressPct >= 80);

  return {
    nextRodKc: nextRod.requiredKc,
    kcRemainingForNext,
    rodProgressPct,
    isNearLevelUp,
  };
}

export function getBaitConfigByTier(tier: number): BaitTierConfig {
  const clamped = Math.max(1, Math.min(6, Math.round(tier)));
  return BAIT_TIERS.find((b) => b.tier === clamped) || BAIT_TIERS[0];
}

export function getDefaultBaitTier(rodLevel: number): 1 | 2 | 3 {
  if (rodLevel >= 5) return 3;
  if (rodLevel >= 3) return 2;
  return 1;
}

export function getCapBaitTier(rodLevel: number): 3 | 4 | 5 | 6 {
  if (rodLevel >= 7) return 6;
  if (rodLevel >= 5) return 5;
  if (rodLevel >= 3) return 4;
  return 3;
}

export function resolveGiftBaitReward(
  giftKc: number,
  rodLevelAfterGift: number
): {
  rawBait: BaitTierConfig;
  grantedBait: BaitTierConfig;
  countGranted: number;
  wasCapped: boolean;
} {
  let rawTier: 1 | 2 | 3 | 4 | 5 | 6 = 2;
  if (giftKc >= 300) rawTier = 6;
  else if (giftKc >= 120) rawTier = 5;
  else if (giftKc >= 50) rawTier = 4;
  else if (giftKc >= 20) rawTier = 3;
  else rawTier = 2;

  const rawBait = getBaitConfigByTier(rawTier);
  const capTier = getCapBaitTier(rodLevelAfterGift);
  const wasCapped = rawTier > capTier;
  const finalTier = wasCapped ? capTier : rawTier;
  const grantedBait = getBaitConfigByTier(finalTier);

  const countGranted =
    giftKc < 5 ? Math.max(1, giftKc * 2) : grantedBait.packCount;

  return {
    rawBait,
    grantedBait,
    countGranted,
    wasCapped,
  };
}
