import { FishRarity, FishSpecies, SeasonId } from '../types.js';

export const RARITY_ORDER: Record<FishRarity, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
};

export const ORDERED_RARITIES: FishRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
];

export interface FishTierMeta {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
  baseWeight: number; // Base weight for rarity roll: 60, 25, 10, 4, 1
  escapeDifficulty: number; // Escape difficulty: 10, 30, 55, 80, 105
  minKg: number;
  maxKg: number;
  bgBadge: string;
  border: string;
}

export const RARITY_META: Record<FishRarity, FishTierMeta> = {
  COMMON: {
    level: 1,
    label: 'Thường',
    color: '#9fb4bd',
    baseWeight: 60,
    escapeDifficulty: 10,
    minKg: 0.2,
    maxKg: 1.5,
    bgBadge: 'bg-[#334155] text-[#f1f5f9]',
    border: 'border-[#9fb4bd]',
  },
  UNCOMMON: {
    level: 2,
    label: 'Khá',
    color: '#7bd88f',
    baseWeight: 25,
    escapeDifficulty: 30,
    minKg: 1.0,
    maxKg: 5.0,
    bgBadge: 'bg-[#14532d] text-[#dcfce7]',
    border: 'border-[#7bd88f]',
  },
  RARE: {
    level: 3,
    label: 'Hiếm',
    color: '#4fb0ff',
    baseWeight: 10,
    escapeDifficulty: 55,
    minKg: 3.0,
    maxKg: 15.0,
    bgBadge: 'bg-[#0c4a6e] text-[#e0f2fe]',
    border: 'border-[#4fb0ff]',
  },
  EPIC: {
    level: 4,
    label: 'Sử thi',
    color: '#b07bff',
    baseWeight: 4,
    escapeDifficulty: 80,
    minKg: 10.0,
    maxKg: 40.0,
    bgBadge: 'bg-[#4c1d95] text-[#f3e8ff]',
    border: 'border-[#b07bff]',
  },
  LEGENDARY: {
    level: 5,
    label: 'Huyền thoại',
    color: '#ffc93c',
    baseWeight: 1,
    escapeDifficulty: 105,
    minKg: 25.0,
    maxKg: 100.0,
    bgBadge: 'bg-[#78350f] text-[#fef9c3]',
    border: 'border-[#ffc93c]',
  },
};

export const SEASON_META: Record<
  SeasonId,
  {
    name: string;
    emoji: string;
    waitMod: number;
    tierMod: [number, number, number, number, number];
    signatureFish: string;
    signatureFishImage: string;
    color: string;
  }
> = {
  SPRING: {
    name: 'Mùa Xuân',
    emoji: '🌸',
    waitMod: 0.95,
    tierMod: [1.0, 1.15, 1.15, 1.0, 1.0],
    signatureFish: 'Cá anh đào ★',
    signatureFishImage: '/assets/fish/fish-t5-18-anh-dao.png',
    color: '#f472b6',
  },
  SUMMER: {
    name: 'Mùa Hạ',
    emoji: '☀️',
    waitMod: 0.9,
    tierMod: [1.0, 1.0, 1.0, 1.0, 1.0],
    signatureFish: 'Cá hồng liên ★',
    signatureFishImage: '/assets/fish/fish-t5-19-hong-lien.png',
    color: '#fbbf24',
  },
  AUTUMN: {
    name: 'Mùa Thu',
    emoji: '🍁',
    waitMod: 1.0,
    tierMod: [1.0, 1.0, 1.1, 1.2, 1.0],
    signatureFish: 'Cá phong đỏ ★',
    signatureFishImage: '/assets/fish/fish-t5-20-phong-do.png',
    color: '#fb923c',
  },
  WINTER: {
    name: 'Mùa Đông',
    emoji: '❄️',
    waitMod: 1.15,
    tierMod: [0.85, 1.0, 1.0, 1.1, 1.1],
    signatureFish: 'Cá băng tuyết ★',
    signatureFishImage: '/assets/fish/fish-t5-21-bang-tuyet.png',
    color: '#38bdf8',
  },
};

// ==========================================
// BẬC 1 – THƯỜNG (0.2 – 1.5 kg)
// ==========================================
export const FISH_T1_01_RO_DONG: FishSpecies = {
  id: 'fish_t1_01_ro_dong',
  name: 'Cá rô đồng',
  emoji: '🐟',
  imageUrl: '/assets/fish/fish-t1-01-ro-dong.png',
  rarity: 'COMMON',
  tierLevel: 1,
  minWeight: 0.2,
  maxWeight: 1.5,
  dayWeight: 1.2,
  nightWeight: 0.6,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.3, AUTUMN: 1.0, WINTER: 0.6 },
  color: '#9fb4bd',
  description: 'Loài cá quen thuộc ở mọi bờ ao làng quê, hay ăn mạnh vào ban ngày.',
};

export const FISH_T1_02_DIEC: FishSpecies = {
  id: 'fish_t1_02_diec',
  name: 'Cá diếc',
  emoji: '🐠',
  imageUrl: '/assets/fish/fish-t1-02-diec.png',
  rarity: 'COMMON',
  tierLevel: 1,
  minWeight: 0.2,
  maxWeight: 1.5,
  dayWeight: 1.0,
  nightWeight: 1.0,
  seasonWeights: { SPRING: 1.2, SUMMER: 1.0, AUTUMN: 1.2, WINTER: 0.8 },
  color: '#9fb4bd',
  description: 'Vảy bạc lấp lánh, hoạt động đều cả ngày lẫn đêm.',
};

export const FISH_T1_03_TRE_DEN: FishSpecies = {
  id: 'fish_t1_03_tre_den',
  name: 'Cá trê đen',
  emoji: '🐟',
  imageUrl: '/assets/fish/fish-t1-03-tre-den.png',
  rarity: 'COMMON',
  tierLevel: 1,
  minWeight: 0.2,
  maxWeight: 1.5,
  dayWeight: 0.6,
  nightWeight: 1.4,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.3, AUTUMN: 1.1, WINTER: 0.7 },
  color: '#9fb4bd',
  description: 'Săn mồi mạnh mẽ về ban đêm dưới tầng bùn sâu.',
};

export const FISH_T1_04_RO_PHI: FishSpecies = {
  id: 'fish_t1_04_ro_phi',
  name: 'Cá rô phi',
  emoji: '🐡',
  imageUrl: '/assets/fish/fish-t1-04-ro-phi.png',
  rarity: 'COMMON',
  tierLevel: 1,
  minWeight: 0.2,
  maxWeight: 1.5,
  dayWeight: 1.3,
  nightWeight: 0.5,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.5, AUTUMN: 1.0, WINTER: 0.4 },
  color: '#9fb4bd',
  description: 'Ưa nắng ấm mùa hạ, đớp mồi cực nhanh.',
};

// ==========================================
// BẬC 2 – KHÁ (1.0 – 5.0 kg)
// ==========================================
export const FISH_T2_05_CHEP: FishSpecies = {
  id: 'fish_t2_05_chep',
  name: 'Cá chép',
  emoji: '🎏',
  imageUrl: '/assets/fish/fish-t2-05-chep.png',
  rarity: 'UNCOMMON',
  tierLevel: 2,
  minWeight: 1.0,
  maxWeight: 5.0,
  dayWeight: 1.1,
  nightWeight: 0.9,
  seasonWeights: { SPRING: 1.4, SUMMER: 1.0, AUTUMN: 1.2, WINTER: 0.7 },
  color: '#7bd88f',
  description: 'Cá chép béo tròn, xuất hiện nhiều vào mùa xuân và mùa thu.',
};

export const FISH_T2_06_TRAM_CO: FishSpecies = {
  id: 'fish_t2_06_tram_co',
  name: 'Cá trắm cỏ',
  emoji: '🌿',
  imageUrl: '/assets/fish/fish-t2-06-tram-co.png',
  rarity: 'UNCOMMON',
  tierLevel: 2,
  minWeight: 1.0,
  maxWeight: 5.0,
  dayWeight: 1.3,
  nightWeight: 0.6,
  seasonWeights: { SPRING: 1.3, SUMMER: 1.3, AUTUMN: 1.0, WINTER: 0.5 },
  color: '#7bd88f',
  description: 'Thân hình vạm vỡ, kéo dây câu căng tràn mặt nước.',
};

export const FISH_T2_07_ME_TRANG: FishSpecies = {
  id: 'fish_t2_07_me_trang',
  name: 'Cá mè trắng',
  emoji: '🐟',
  imageUrl: '/assets/fish/fish-t2-07-me-trang.png',
  rarity: 'UNCOMMON',
  tierLevel: 2,
  minWeight: 1.0,
  maxWeight: 5.0,
  dayWeight: 1.2,
  nightWeight: 0.8,
  seasonWeights: { SPRING: 1.2, SUMMER: 1.4, AUTUMN: 1.0, WINTER: 0.6 },
  color: '#7bd88f',
  description: 'Hay bơi ở tầng nước mặt khi trời ấm áp.',
};

export const FISH_T2_08_CHIM_TRANG: FishSpecies = {
  id: 'fish_t2_08_chim_trang',
  name: 'Cá chim trắng',
  emoji: '🐠',
  imageUrl: '/assets/fish/fish-t2-08-chim-trang.png',
  rarity: 'UNCOMMON',
  tierLevel: 2,
  minWeight: 1.0,
  maxWeight: 5.0,
  dayWeight: 1.0,
  nightWeight: 1.1,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.2, AUTUMN: 1.3, WINTER: 0.8 },
  color: '#7bd88f',
  description: 'Thân dẹt ánh bạc, sức giật rất khỏe khi mắc câu.',
};

// ==========================================
// BẬC 3 – HIẾM (3.0 – 15.0 kg)
// ==========================================
export const FISH_T3_09_LOC_BONG: FishSpecies = {
  id: 'fish_t3_09_loc_bong',
  name: 'Cá lóc bông',
  emoji: '🐍',
  imageUrl: '/assets/fish/fish-t3-09-loc-bong.png',
  rarity: 'RARE',
  tierLevel: 3,
  minWeight: 3.0,
  maxWeight: 15.0,
  dayWeight: 0.9,
  nightWeight: 1.2,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.4, AUTUMN: 1.1, WINTER: 0.6 },
  color: '#4fb0ff',
  description: 'Kẻ săn mồi hung dữ vùng đầm lầy.',
};

export const FISH_T3_10_CHINH: FishSpecies = {
  id: 'fish_t3_10_chinh',
  name: 'Cá chình',
  emoji: '⚡',
  imageUrl: '/assets/fish/fish-t3-10-chinh.png',
  rarity: 'RARE',
  tierLevel: 3,
  minWeight: 3.0,
  maxWeight: 15.0,
  dayWeight: 0.2,
  nightWeight: 1.8,
  seasonWeights: { SPRING: 0.9, SUMMER: 0.9, AUTUMN: 1.3, WINTER: 1.3 },
  color: '#4fb0ff',
  description: 'Sát thủ bóng đêm! Rất hiếm gặp vào ban ngày.',
};

export const FISH_T3_11_DIEU_HONG: FishSpecies = {
  id: 'fish_t3_11_dieu_hong',
  name: 'Cá diêu hồng',
  emoji: '🌺',
  imageUrl: '/assets/fish/fish-t3-11-dieu-hong.png',
  rarity: 'RARE',
  tierLevel: 3,
  minWeight: 3.0,
  maxWeight: 15.0,
  dayWeight: 1.3,
  nightWeight: 0.7,
  seasonWeights: { SPRING: 1.2, SUMMER: 1.3, AUTUMN: 1.1, WINTER: 0.7 },
  color: '#4fb0ff',
  description: 'Lớp vảy ánh hồng rực rỡ dưới nắng.',
};

export const FISH_T3_12_HOI_VAN: FishSpecies = {
  id: 'fish_t3_12_hoi_van',
  name: 'Cá hồi vân',
  emoji: '🍣',
  imageUrl: '/assets/fish/fish-t3-12-hoi-van.png',
  rarity: 'RARE',
  tierLevel: 3,
  minWeight: 3.0,
  maxWeight: 15.0,
  dayWeight: 1.2,
  nightWeight: 0.7,
  seasonWeights: { SPRING: 1.2, SUMMER: 0.3, AUTUMN: 1.2, WINTER: 1.6 },
  color: '#4fb0ff',
  description: 'Loài cá quý ưa dòng nước mát lạnh mùa đông.',
};

// ==========================================
// BẬC 4 – SỬ THI (10.0 – 40.0 kg)
// ==========================================
export const FISH_T4_13_TRA_DAU: FishSpecies = {
  id: 'fish_t4_13_tra_dau',
  name: 'Cá tra dầu',
  emoji: '🐋',
  imageUrl: '/assets/fish/fish-t4-13-tra-dau.png',
  rarity: 'EPIC',
  tierLevel: 4,
  minWeight: 10.0,
  maxWeight: 40.0,
  dayWeight: 0.8,
  nightWeight: 1.2,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.4, AUTUMN: 1.2, WINTER: 0.8 },
  color: '#b07bff',
  description: 'Khổng lồ vùng sông sâu với sức kéo kinh hoàng!',
};

export const FISH_T4_14_BONG_TUONG: FishSpecies = {
  id: 'fish_t4_14_bong_tuong',
  name: 'Cá bống tượng',
  emoji: '👑',
  imageUrl: '/assets/fish/fish-t4-14-bong-tuong.png',
  rarity: 'EPIC',
  tierLevel: 4,
  minWeight: 10.0,
  maxWeight: 40.0,
  dayWeight: 0.6,
  nightWeight: 1.4,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.1, AUTUMN: 1.5, WINTER: 0.9 },
  color: '#b07bff',
  description: 'Đặc sản quý hiếm ẩn mình dưới tầng đá sâu.',
};

export const FISH_T4_15_LANG: FishSpecies = {
  id: 'fish_t4_15_lang',
  name: 'Cá lăng',
  emoji: '🦈',
  imageUrl: '/assets/fish/fish-t4-15-lang.png',
  rarity: 'EPIC',
  tierLevel: 4,
  minWeight: 10.0,
  maxWeight: 40.0,
  dayWeight: 0.5,
  nightWeight: 1.5,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.0, AUTUMN: 1.4, WINTER: 1.2 },
  color: '#b07bff',
  description: 'Chúa tể săn đêm vùng nước xoáy.',
};

export const FISH_T4_16_KOI_HOA: FishSpecies = {
  id: 'fish_t4_16_koi_hoa',
  name: 'Cá Koi hoa',
  emoji: '锦',
  imageUrl: '/assets/fish/fish-t4-16-koi-hoa.png',
  rarity: 'EPIC',
  tierLevel: 4,
  minWeight: 10.0,
  maxWeight: 40.0,
  dayWeight: 1.4,
  nightWeight: 0.6,
  seasonWeights: { SPRING: 1.6, SUMMER: 1.0, AUTUMN: 1.4, WINTER: 0.6 },
  color: '#b07bff',
  description: 'Tuyệt sắc giai nhân của hồ thần, rực rỡ dưới nắng xuân thu.',
};

// ==========================================
// BẬC 5 – HUYỀN THOẠI (25.0 – 100.0 kg)
// ==========================================
export const FISH_T5_17_HO: FishSpecies = {
  id: 'fish_t5_17_ho',
  name: 'Cá hô',
  emoji: '🐉',
  imageUrl: '/assets/fish/fish-t5-17-ho.png',
  rarity: 'LEGENDARY',
  tierLevel: 5,
  minWeight: 25.0,
  maxWeight: 100.0,
  dayWeight: 1.5,
  nightWeight: 1.3,
  seasonWeights: { SPRING: 1.2, SUMMER: 1.2, AUTUMN: 1.2, WINTER: 1.2 },
  color: '#ffc93c',
  description: 'Vua cá khổng lồ với lớp vảy vàng óng ánh quanh năm!',
};

export const FISH_T5_18_ANH_DAO: FishSpecies = {
  id: 'fish_t5_18_anh_dao',
  name: 'Cá anh đào',
  emoji: '🌸',
  imageUrl: '/assets/fish/fish-t5-18-anh-dao.png',
  rarity: 'LEGENDARY',
  tierLevel: 5,
  minWeight: 30.0,
  maxWeight: 100.0,
  dayWeight: 1.0,
  nightWeight: 0.9,
  seasonWeights: { SPRING: 0.35, SUMMER: 0.0, AUTUMN: 0.0, WINTER: 0.0 },
  isSpecialStar: true,
  color: '#ffc93c',
  description: 'Thần ngư Mùa Xuân! Chỉ xuất hiện cực hiếm khi hoa anh đào nở.',
};

export const FISH_T5_19_HONG_LIEN: FishSpecies = {
  id: 'fish_t5_19_hong_lien',
  name: 'Cá hồng liên',
  emoji: '🪷',
  imageUrl: '/assets/fish/fish-t5-19-hong-lien.png',
  rarity: 'LEGENDARY',
  tierLevel: 5,
  minWeight: 30.0,
  maxWeight: 100.0,
  dayWeight: 1.0,
  nightWeight: 0.8,
  seasonWeights: { SPRING: 0.0, SUMMER: 0.35, AUTUMN: 0.0, WINTER: 0.0 },
  isSpecialStar: true,
  color: '#ffc93c',
  description: 'Thần ngư Mùa Hạ! Hóa thân cực hiếm từ đóa sen hồng giữa hồ.',
};

export const FISH_T5_20_PHONG_DO: FishSpecies = {
  id: 'fish_t5_20_phong_do',
  name: 'Cá phong đỏ',
  emoji: '🍁',
  imageUrl: '/assets/fish/fish-t5-20-phong-do.png',
  rarity: 'LEGENDARY',
  tierLevel: 5,
  minWeight: 30.0,
  maxWeight: 100.0,
  dayWeight: 1.0,
  nightWeight: 1.0,
  seasonWeights: { SPRING: 0.0, SUMMER: 0.0, AUTUMN: 0.35, WINTER: 0.0 },
  isSpecialStar: true,
  color: '#ffc93c',
  description: 'Thần ngư Mùa Thu! Rực cháy sắc lá phong đỏ cực hiếm.',
};

export const FISH_T5_21_BANG_TUYET: FishSpecies = {
  id: 'fish_t5_21_bang_tuyet',
  name: 'Cá băng tuyết',
  emoji: '❄️',
  imageUrl: '/assets/fish/fish-t5-21-bang-tuyet.png',
  rarity: 'LEGENDARY',
  tierLevel: 5,
  minWeight: 30.0,
  maxWeight: 100.0,
  dayWeight: 0.9,
  nightWeight: 1.1,
  seasonWeights: { SPRING: 0.0, SUMMER: 0.0, AUTUMN: 0.0, WINTER: 0.35 },
  isSpecialStar: true,
  color: '#ffc93c',
  description: 'Thần ngư Mùa Đông! Kết tinh cực hiếm từ băng giá ngàn năm.',
};

export const FISH_T5_22_TRANG_BAC: FishSpecies = {
  id: 'fish_t5_22_trang_bac',
  name: 'Cá trăng bạc',
  emoji: '🌙',
  imageUrl: '/assets/fish/fish-t5-22-trang-bac.png',
  rarity: 'LEGENDARY',
  tierLevel: 5,
  minWeight: 30.0,
  maxWeight: 100.0,
  dayWeight: 0.0, // CHỈ BAN ĐÊM
  nightWeight: 0.45,
  seasonWeights: { SPRING: 1.0, SUMMER: 1.0, AUTUMN: 1.1, WINTER: 1.1 },
  isSpecialStar: true,
  color: '#ffc93c',
  description: 'Huyền thoại độc quyền cực hiếm dưới ánh trăng ban đêm!',
};

export const FISH_CATALOG: FishSpecies[] = [
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
];
