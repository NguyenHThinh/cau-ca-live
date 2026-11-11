import {
  BaitTierConfig,
  CharacterModelConfig,
  GiftPreset,
  RodTierConfig,
} from '../types.js';

/**
 * 10 CẤP ĐỘ CẦN CÂU THEO TÍCH LŨY KIM CƯƠNG (KC) — ĐỒNG BỘ 100% VỚI MANIFEST ASSETS
 * Đặc quyền bổ sung: Người xem bấm Follow kênh được mở khóa ngay tối thiểu Cần Lv2 (Cần trúc đen)!
 */
export const ROD_01_CAN_TRE: RodTierConfig = {
  id: 'rod_01_can_tre',
  level: 1,
  name: 'Cần tre',
  requiredKc: 0,
  pullStrength: 20,
  waitMultiplier: 1.0,
  weightBonus: 0.0,
  rarityMultiplier: 1.0,
  color: '#a3e635',
  glowColor: 'rgba(163, 230, 53, 0.25)',
  badge: 'Lv.1',
  hatStyle: 'NON_LA',
  outfitColor: '#78350f',
  rodSpriteUrl: '/assets/rods/rod-01-can-tre.png',
};

export const ROD_02_CAN_TRUC_DEN: RodTierConfig = {
  id: 'rod_02_can_truc_den',
  level: 2,
  name: 'Cần trúc đen',
  requiredKc: 10,
  pullStrength: 30,
  waitMultiplier: 0.92,
  weightBonus: 0.03,
  rarityMultiplier: 1.03,
  color: '#4ade80',
  glowColor: 'rgba(74, 222, 128, 0.35)',
  badge: 'Lv.2',
  hatStyle: 'STRAW_HAT',
  outfitColor: '#15803d',
  rodSpriteUrl: '/assets/rods/rod-02-can-truc-den.png',
};

export const ROD_03_CAN_COMPOSITE: RodTierConfig = {
  id: 'rod_03_can_composite',
  level: 3,
  name: 'Cần composite',
  requiredKc: 30,
  pullStrength: 40,
  waitMultiplier: 0.85,
  weightBonus: 0.06,
  rarityMultiplier: 1.06,
  color: '#38bdf8',
  glowColor: 'rgba(56, 189, 248, 0.4)',
  badge: 'Lv.3',
  hatStyle: 'STRAW_HAT',
  outfitColor: '#0284c7',
  rodSpriteUrl: '/assets/rods/rod-03-can-composite.png',
};

export const ROD_04_CAN_SOI_THUY_TINH: RodTierConfig = {
  id: 'rod_04_can_soi_thuy_tinh',
  level: 4,
  name: 'Cần sợi thủy tinh',
  requiredKc: 70,
  pullStrength: 50,
  waitMultiplier: 0.78,
  weightBonus: 0.09,
  rarityMultiplier: 1.09,
  color: '#60a5fa',
  glowColor: 'rgba(96, 165, 250, 0.45)',
  badge: 'Lv.4',
  hatStyle: 'CAP_PURPLE',
  outfitColor: '#2563eb',
  rodSpriteUrl: '/assets/rods/rod-04-can-soi-thuy-tinh.png',
};

export const ROD_05_CAN_CARBON: RodTierConfig = {
  id: 'rod_05_can_carbon',
  level: 5,
  name: 'Cần carbon',
  requiredKc: 150,
  pullStrength: 60,
  waitMultiplier: 0.72,
  weightBonus: 0.12,
  rarityMultiplier: 1.12,
  color: '#fb923c',
  glowColor: 'rgba(251, 146, 60, 0.5)',
  badge: 'Lv.5',
  hatStyle: 'CAP_PURPLE',
  outfitColor: '#ea580c',
  rodSpriteUrl: '/assets/rods/rod-05-can-carbon.png',
};

export const ROD_06_CAN_CARBON_PRO: RodTierConfig = {
  id: 'rod_06_can_carbon_pro',
  level: 6,
  name: 'Cần carbon Pro',
  requiredKc: 280,
  pullStrength: 70,
  waitMultiplier: 0.66,
  weightBonus: 0.15,
  rarityMultiplier: 1.15,
  color: '#e2e8f0',
  glowColor: 'rgba(226, 232, 240, 0.6)',
  badge: 'Lv.6',
  hatStyle: 'CAP_PURPLE',
  outfitColor: '#64748b',
  rodSpriteUrl: '/assets/rods/rod-06-can-carbon-pro.png',
};

export const ROD_07_CAN_TITAN: RodTierConfig = {
  id: 'rod_07_can_titan',
  level: 7,
  name: 'Cần titan',
  requiredKc: 480,
  pullStrength: 80,
  waitMultiplier: 0.61,
  weightBonus: 0.18,
  rarityMultiplier: 1.18,
  color: '#facc15',
  glowColor: 'rgba(250, 204, 21, 0.7)',
  badge: 'Lv.7',
  hatStyle: 'CROWN_GOLD',
  outfitColor: '#ca8a04',
  rodSpriteUrl: '/assets/rods/rod-07-can-titan.png',
};

export const ROD_08_CAN_HOP_KIM_BAC: RodTierConfig = {
  id: 'rod_08_can_hop_kim_bac',
  level: 8,
  name: 'Cần hợp kim bạc',
  requiredKc: 780,
  pullStrength: 90,
  waitMultiplier: 0.56,
  weightBonus: 0.21,
  rarityMultiplier: 1.21,
  color: '#c084fc',
  glowColor: 'rgba(192, 132, 252, 0.75)',
  badge: 'Lv.8',
  hatStyle: 'CROWN_GOLD',
  outfitColor: '#7e22ce',
  rodSpriteUrl: '/assets/rods/rod-08-can-hop-kim-bac.png',
};

export const ROD_09_CAN_VANG: RodTierConfig = {
  id: 'rod_09_can_vang',
  level: 9,
  name: 'Cần vàng',
  requiredKc: 1200,
  pullStrength: 100,
  waitMultiplier: 0.51,
  weightBonus: 0.24,
  rarityMultiplier: 1.24,
  color: '#f43f5e',
  glowColor: 'rgba(244, 63, 94, 0.8)',
  badge: 'Lv.9',
  hatStyle: 'DRAGON_HELM',
  outfitColor: '#e11d48',
  rodSpriteUrl: '/assets/rods/rod-09-can-vang.png',
};

export const ROD_10_CAN_THAN_NGU: RodTierConfig = {
  id: 'rod_10_can_than_ngu',
  level: 10,
  name: 'Cần Thần Ngư',
  requiredKc: 1900,
  pullStrength: 110,
  waitMultiplier: 0.47,
  weightBonus: 0.27,
  rarityMultiplier: 1.27,
  color: '#ffc93c',
  glowColor: 'rgba(255, 201, 60, 0.9)',
  badge: 'Lv.10',
  hatStyle: 'DRAGON_HELM',
  outfitColor: '#be123c',
  rodSpriteUrl: '/assets/rods/rod-10-can-than-ngu.png',
};

export const ROD_TIERS: RodTierConfig[] = [
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
];

/**
 * 6 LOẠI MỒI CÂU — ĐỒNG BỘ 100% VỚI MANIFEST ASSETS (/assets/baits/)
 */
export const BAIT_1_GIUN_DAT: BaitTierConfig = {
  tier: 1,
  id: 'bait_1_giun_dat',
  name: 'Giun đất',
  emoji: '🪱',
  imageUrl: '/assets/baits/bait-1-giun-dat.png',
  color: '#9fb4bd',
  rarityFactor: 1.0,
  minGiftKc: 0,
  packCount: 0, // Vô hạn (Mặc định Cần Lv1–2)
  description: 'Mồi mặc định vô hạn của Cần Lv1–2 (Hệ số hiếm x1.0)',
};

export const BAIT_2_DE_MEN: BaitTierConfig = {
  tier: 2,
  id: 'bait_2_de_men',
  name: 'Dế mèn',
  emoji: '🦗',
  imageUrl: '/assets/baits/bait-2-de-men.png',
  color: '#7bd88f',
  rarityFactor: 1.15,
  minGiftKc: 5,
  packCount: 10,
  description: 'Mặc định Cần Lv3–4 hoặc Quà ≥5 KC nhận 10 lượt (x1.15)',
};

export const BAIT_3_TOM_TUOI: BaitTierConfig = {
  tier: 3,
  id: 'bait_3_tom_tuoi',
  name: 'Tôm tươi',
  emoji: '🦐',
  imageUrl: '/assets/baits/bait-3-tom-tuoi.png',
  color: '#4fb0ff',
  rarityFactor: 1.3,
  minGiftKc: 20,
  packCount: 8,
  description: 'Mặc định Cần Lv5–10 hoặc Quà ≥20 KC nhận 8 lượt (x1.30)',
};

export const BAIT_4_CA_CON: BaitTierConfig = {
  tier: 4,
  id: 'bait_4_ca_con',
  name: 'Cá con',
  emoji: '🐟',
  imageUrl: '/assets/baits/bait-4-ca-con.png',
  color: '#38bdf8',
  rarityFactor: 1.5,
  minGiftKc: 50,
  packCount: 6,
  description: 'Quà ≥50 KC nhận 6 lượt (Yêu cầu Cần ≥Lv3, x1.50)',
};

export const BAIT_5_MOI_THOM: BaitTierConfig = {
  tier: 5,
  id: 'bait_5_moi_thom',
  name: 'Mồi thơm',
  emoji: '🌾',
  imageUrl: '/assets/baits/bait-5-moi-thom.png',
  color: '#b07bff',
  rarityFactor: 1.75,
  minGiftKc: 120,
  packCount: 5,
  description: 'Quà ≥120 KC nhận 5 lượt (Yêu cầu Cần ≥Lv5, x1.75)',
};

export const BAIT_6_MOI_VANG: BaitTierConfig = {
  tier: 6,
  id: 'bait_6_moi_vang',
  name: 'Mồi vàng',
  emoji: '🌟',
  imageUrl: '/assets/baits/bait-6-moi-vang.png',
  color: '#ffc93c',
  rarityFactor: 2.0,
  minGiftKc: 300,
  packCount: 3,
  description: 'Quà ≥300 KC nhận 3 lượt (Yêu cầu Cần ≥Lv7, x2.00)',
};

export const BAIT_TIERS: BaitTierConfig[] = [
  BAIT_1_GIUN_DAT,
  BAIT_2_DE_MEN,
  BAIT_3_TOM_TUOI,
  BAIT_4_CA_CON,
  BAIT_5_MOI_THOM,
  BAIT_6_MOI_VANG,
];

/**
 * DANH SÁCH QUÀ TẶNG MẪU TRÊN TIKTOK LIVE KHỚP VỚI CÁC MỐC MỒI & KC
 */
export const GIFT_PRESETS: GiftPreset[] = [
  {
    id: 'rose',
    name: 'Hoa Hồng (1 KC)',
    emoji: '🌹',
    diamonds: 1,
    baitTierGranted: 2,
    baitCountGranted: 2,
    description: '+1 KC tích lũy lên Cần & tặng nhẹ 2 lượt Dế mèn 🦗',
  },
  {
    id: 'finger_heart',
    name: 'Tim Tay (5 KC)',
    emoji: '🫰',
    diamonds: 5,
    baitTierGranted: 2,
    baitCountGranted: 10,
    description: '+5 KC lên Cần & +10 lượt mồi Dế mèn 🦗 (x1.15)',
  },
  {
    id: 'perfume',
    name: 'Nước Hoa (20 KC)',
    emoji: '🧴',
    diamonds: 20,
    baitTierGranted: 3,
    baitCountGranted: 8,
    description: '+20 KC lên Cần & +8 lượt mồi Tôm tươi 🦐 (x1.30)',
  },
  {
    id: 'doughnut',
    name: 'Cà Phê / Donut (50 KC)',
    emoji: '🍩',
    diamonds: 50,
    baitTierGranted: 4,
    baitCountGranted: 6,
    description: '+50 KC lên Cần & +6 lượt mồi Cá con 🐟 (x1.50)',
  },
  {
    id: 'sunglasses',
    name: 'Kính Mát / Mũ (120 KC)',
    emoji: '🕶️',
    diamonds: 120,
    baitTierGranted: 5,
    baitCountGranted: 5,
    description: '+120 KC lên Cần & +5 lượt Mồi thơm 🌾 (x1.75)',
  },
  {
    id: 'supercar',
    name: 'Siêu Xe / Ngân Hà (300 KC)',
    emoji: '🏎️',
    diamonds: 300,
    baitTierGranted: 6,
    baitCountGranted: 3,
    description: '+300 KC lên Cần & +3 lượt Mồi vàng 🌟 (x2.00)',
  },
];

/**
 * 10 MẪU NHÂN VẬT THEO LEVEL (ĐỒNG BỘ 100% VỚI `/assets/characters/manifest.json`):
 * - Cấp 1 -> 4: Random 1 trong 4 nhân vật khởi đầu (`CHAR_LV01`..`CHAR_LV04`) theo user
 * - Cấp 5 -> 10: Dùng đúng model nhân vật của cấp đó (`CHAR_LV05`..`CHAR_LV10`) kèm hiệu ứng Bling FX!
 */
export const CHAR_LV01_BE_NON_ROM: CharacterModelConfig = {
  id: 'char_lv01_be_non_rom',
  level: 1,
  name: 'Bé nón rơm, giỏ đan',
  cleanUrl: '/assets/characters/clean/lv01-be-non-rom.png',
  cleanSize: [165, 296],
  handXFrac: 0.76,
  handYFrac: 0.54,
};

export const CHAR_LV02_CAU_BE_MU_BUCKET: CharacterModelConfig = {
  id: 'char_lv02_cau_be_mu_bucket',
  level: 2,
  name: 'Cậu bé mũ bucket',
  cleanUrl: '/assets/characters/clean/lv02-cau-be-mu-bucket.png',
  cleanSize: [181, 344],
  handXFrac: 0.9,
  handYFrac: 0.55,
};

export const CHAR_LV03_BE_AO_MUA_VANG: CharacterModelConfig = {
  id: 'char_lv03_be_ao_mua_vang',
  level: 3,
  name: 'Bé áo mưa vàng',
  cleanUrl: '/assets/characters/clean/lv03-be-ao-mua-vang.png',
  cleanSize: [153, 298],
  handXFrac: 0.78,
  handYFrac: 0.55,
};

export const CHAR_LV04_CO_BE_MU_KINH: CharacterModelConfig = {
  id: 'char_lv04_co_be_mu_kinh',
  level: 4,
  name: 'Cô bé mũ lưỡi trai, kính',
  cleanUrl: '/assets/characters/clean/lv04-co-be-mu-kinh.png',
  cleanSize: [177, 335],
  handXFrac: 0.9,
  handYFrac: 0.54,
};

export const CHAR_LV05_CO_BE_TOC_HONG: CharacterModelConfig = {
  id: 'char_lv05_co_be_toc_hong',
  level: 5,
  name: 'Cô bé tóc hồng, ghi lê',
  cleanUrl: '/assets/characters/clean/lv05-co-be-toc-hong.png',
  blingWebpUrl: '/assets/characters/fx/lv05-co-be-toc-hong-bling.webp',
  blingPngUrl: '/assets/characters/fx/lv05-co-be-toc-hong-bling.png',
  cleanSize: [153, 296],
  fxSize: [301, 444],
  handXFrac: 0.78,
  handYFrac: 0.56,
};

export const CHAR_LV06_RAI_CA_AO_PHAO: CharacterModelConfig = {
  id: 'char_lv06_rai_ca_ao_phao',
  level: 6,
  name: 'Rái cá áo phao',
  cleanUrl: '/assets/characters/clean/lv06-rai-ca-ao-phao.png',
  blingWebpUrl: '/assets/characters/fx/lv06-rai-ca-ao-phao-bling.webp',
  blingPngUrl: '/assets/characters/fx/lv06-rai-ca-ao-phao-bling.png',
  cleanSize: [204, 313],
  fxSize: [360, 469],
  handXFrac: 0.91,
  handYFrac: 0.52,
};

export const CHAR_LV07_GAU_TRUC_DO: CharacterModelConfig = {
  id: 'char_lv07_gau_truc_do',
  level: 7,
  name: 'Gấu trúc đỏ',
  cleanUrl: '/assets/characters/clean/lv07-gau-truc-do.png',
  blingWebpUrl: '/assets/characters/fx/lv07-gau-truc-do-bling.webp',
  blingPngUrl: '/assets/characters/fx/lv07-gau-truc-do-bling.png',
  cleanSize: [218, 315],
  fxSize: [374, 471],
  handXFrac: 0.91,
  handYFrac: 0.53,
};

export const CHAR_LV08_MEO_CAM_HOODIE: CharacterModelConfig = {
  id: 'char_lv08_meo_cam_hoodie',
  level: 8,
  name: 'Mèo cam hoodie',
  cleanUrl: '/assets/characters/clean/lv08-meo-cam-hoodie.png',
  blingWebpUrl: '/assets/characters/fx/lv08-meo-cam-hoodie-bling.webp',
  blingPngUrl: '/assets/characters/fx/lv08-meo-cam-hoodie-bling.png',
  cleanSize: [131, 298],
  fxSize: [279, 446],
  handXFrac: 0.81,
  handYFrac: 0.55,
};

export const CHAR_LV09_GAU_BAC_CUC: CharacterModelConfig = {
  id: 'char_lv09_gau_bac_cuc',
  level: 9,
  name: 'Gấu Bắc Cực',
  cleanUrl: '/assets/characters/clean/lv09-gau-bac-cuc.png',
  blingWebpUrl: '/assets/characters/fx/lv09-gau-bac-cuc-bling.webp',
  blingPngUrl: '/assets/characters/fx/lv09-gau-bac-cuc-bling.png',
  cleanSize: [212, 352],
  fxSize: [420, 560],
  handXFrac: 0.9,
  handYFrac: 0.56,
};

export const CHAR_LV10_CHIM_CANH_CUT: CharacterModelConfig = {
  id: 'char_lv10_canh_cut',
  level: 10,
  name: 'Chim cánh cụt',
  cleanUrl: '/assets/characters/clean/lv10-canh-cut.png',
  blingWebpUrl: '/assets/characters/fx/lv10-canh-cut-bling.webp',
  blingPngUrl: '/assets/characters/fx/lv10-canh-cut-bling.png',
  cleanSize: [134, 305],
  fxSize: [318, 489],
  handXFrac: 0.82,
  handYFrac: 0.55,
};

export const CHARACTER_MODELS: CharacterModelConfig[] = [
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
];

const starterCharacterRandomCache = new Map<string, number>();

/**
 * Resolves the character model for a viewer:
 * - Level 1..4: Uses true Math.random() to pick 1 of the 4 starter characters (cached per user session so it doesn't flicker between frames)
 * - Level 5..10: Uses the exact VIP character model corresponding to that rod level (`CHAR_LV05`..`CHAR_LV10`)!
 */
export function resolveCharacterModel(
  rodLevel: number,
  tiktokUid = ''
): CharacterModelConfig {
  const clampedLv = Math.max(1, Math.min(10, Math.round(rodLevel)));
  if (clampedLv >= 5) {
    return (
      CHARACTER_MODELS.find((m) => m.level === clampedLv) ||
      CHAR_LV05_CO_BE_TOC_HONG
    );
  }

  const key = tiktokUid || `anon_${Math.random()}`;
  let starterIdx = starterCharacterRandomCache.get(key);
  if (starterIdx === undefined) {
    starterIdx = Math.floor(Math.random() * 4);
    starterCharacterRandomCache.set(key, starterIdx);
  }
  return CHARACTER_MODELS[starterIdx] || CHAR_LV01_BE_NON_ROM;
}
