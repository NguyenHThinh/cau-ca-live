export type FishRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type SeasonId = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type DayPhase = 'DAY' | 'NIGHT';

export type AnglerStatus =
  | 'IDLE'
  | 'CASTING'
  | 'WAITING_BITE'
  | 'REELING'
  | 'SHOW_CATCH'
  | 'ESCAPED';

export interface FishSpecies {
  id: string;
  name: string;
  emoji: string;
  imageUrl: string; // Path to PNG sprite in /assets/fish/
  rarity: FishRarity;
  tierLevel: 1 | 2 | 3 | 4 | 5;
  minWeight: number;
  maxWeight: number;
  dayWeight: number;
  nightWeight: number;
  seasonWeights: Record<SeasonId, number>;
  isSpecialStar?: boolean; // ★ seasonal/night exclusive highlight
  color: string;
  description: string;
}

export interface RodTierConfig {
  id: string; // e.g. 'rod_01_can_tre' .. 'rod_10_can_than_ngu'
  level: number; // 1..10
  name: string;
  requiredKc: number; // Cumulative diamonds (KC) required
  pullStrength: number; // 20..110
  waitMultiplier: number; // 0.92^(Lv-1)
  weightBonus: number; // +0% to +27% (0.00 .. 0.27)
  rarityMultiplier: number; // 1 + 0.03 * (Lv - 1)
  color: string;
  glowColor: string;
  badge: string;
  hatStyle?: 'NON_LA' | 'STRAW_HAT' | 'CAP_PURPLE' | 'CROWN_GOLD' | 'DRAGON_HELM';
  outfitColor?: string;
  spriteUrl?: string;
  rodSpriteUrl: string; // Path to PNG rod sprite in /assets/rods/
}

export interface BaitTierConfig {
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  id: string; // e.g. 'bait_1_giun_dat' .. 'bait_6_moi_vang'
  name: string;
  emoji: string;
  imageUrl: string; // Path to PNG bait sprite in /assets/baits/
  color: string;
  rarityFactor: number; // 1.0, 1.15, 1.3, 1.5, 1.75, 2.0
  minGiftKc: number; // 0, 5, 20, 50, 120, 300
  packCount: number; // Infinity (0), 10, 8, 6, 5, 3
  description: string;
}

export interface GiftPreset {
  id: string;
  name: string;
  emoji: string;
  diamonds: number; // KC
  baitTierGranted: 1 | 2 | 3 | 4 | 5 | 6;
  baitCountGranted: number;
  description: string;
}

export interface CharacterModelConfig {
  id: string;
  level: number;
  name: string;
  cleanUrl: string;
  blingWebpUrl?: string;
  blingPngUrl?: string;
  cleanSize: [number, number];
  fxSize?: [number, number];
  handXFrac: number;
  handYFrac: number;
}

export interface BaitStockEntry {
  count: number;
  expiresAt: number; // Epoch ms (24h after last grant)
}

export type BaitStockMap = Record<number, BaitStockEntry>;

export interface EnvironmentState {
  dayPhase: DayPhase;
  dayPhaseForced?: DayPhase | null;
  season: SeasonId;
  seasonMode: 'daily' | 'manual';
  seasonExpiresAt?: string | null;
  waitMod: number;
  tierMod: [number, number, number, number, number]; // Lv1..Lv5 multipliers
  vietnamTimeStr: string;
}

export interface PlayerProfile {
  tiktokUid: string;
  uniqueId: string;
  nickname: string;
  avatarUrl: string;
  isFollower: boolean;
  diamondsKc: number;
  rodLevel: number;
  baitTier: number;
  baitCount: number;
  baitStock: BaitStockMap;
  pityRare: number; // 0..40
  pityEpic: number; // 0..120
  totalWeight: number;
  totalCatches: number;
  maxFishWeight: number;
  maxFishName: string;
  maxFishEmoji: string;
  maxFishRarity: FishRarity;
  rarestFishName: string;
  rarestFishEmoji: string;
  rarestFishRarity: FishRarity;
  rarestFishWeight: number;
  legendaryCount: number;
  epicCount: number;
  updatedAt: string;
}

export interface CatchResult {
  id: string;
  playerUid: string;
  nickname: string;
  avatarUrl: string;
  fishId: string;
  fishName: string;
  fishEmoji: string;
  rarity: FishRarity;
  tierLevel: number;
  weight: number;
  rodLevelUsed: number;
  baitTierUsed: number;
  escaped?: boolean;
  escapeChancePct?: number;
  isNewPersonalBest: boolean;
  isGlobalRecord: boolean;
  caughtAt: string;
}

export interface ActiveAnglerState {
  tiktokUid: string;
  uniqueId: string;
  nickname: string;
  avatarUrl: string;
  isFollower: boolean;
  diamondsKc: number;
  nextRodKc: number | null; // Cumulative KC needed for Lv+1 (null if Lv10)
  kcRemainingForNext: number; // Remaining KC to reach Lv+1
  rodProgressPct: number; // 0..100 progress within current rod level bracket
  isNearLevelUp: boolean; // true if <= 20% or <= 15 KC remaining
  rodLevel: number;
  baitTier: number;
  baitCount: number; // 0 if using infinite default bait
  isDefaultBait: boolean;
  slotIndex: number; // Position around the pond (0..39)
  status: AnglerStatus;
  pendingCasts: number; // Anti-spam queue (max 3)
  totalLikesInSession: number;
  lastLikePopAt: number;
  lastTwitchAt?: number; // Timestamp of fake bobber twitch (0..2 times per wait)
  lastGiftFloatingText?: string; // Floating "+X KC, cần LvY..." text
  lastGiftAt?: number;
  lastCatch?: CatchResult;
  statusUpdatedAt: number;
}

export interface LeaderboardBundle {
  /** 1. Người câu cá nặng nhất (Best single fish weight) */
  biggestCatch: Array<{
    rank: number;
    tiktokUid: string;
    nickname: string;
    avatarUrl: string;
    rodLevel: number;
    maxFishWeight: number;
    maxFishName: string;
    maxFishEmoji: string;
    maxFishRarity: FishRarity;
  }>;
  /** 2. Cá xịn nhất mọi thời đại (Highest tier -> highest weight) */
  bestTierCatch: Array<{
    rank: number;
    tiktokUid: string;
    nickname: string;
    avatarUrl: string;
    rodLevel: number;
    rarestFishRarity: FishRarity;
    rarestFishName: string;
    rarestFishEmoji: string;
    rarestFishWeight: number;
  }>;
  /** 3. Thợ săn cá xịn (Total Sử thi + Huyền thoại -> total cumulative weight) */
  epicLegendHunter: Array<{
    rank: number;
    tiktokUid: string;
    nickname: string;
    avatarUrl: string;
    rodLevel: number;
    epicLegendCount: number;
    legendaryCount: number;
    epicCount: number;
    totalWeight: number;
  }>;
}

export interface LiveEventAlert {
  id: string;
  type:
    | 'GIFT_UPGRADE'
    | 'RARE_CATCH'
    | 'RECORD_BREAKER'
    | 'ROD_CHECK'
    | 'FOLLOW_BONUS'
    | 'SYSTEM';
  title: string;
  subtitle: string;
  avatarUrl?: string;
  nickname?: string;
  emoji: string;
  imageUrl?: string;
  rarity?: FishRarity;
  createdAt: number;
}

export interface ServerToClientEvents {
  stateSync: (payload: {
    anglers: ActiveAnglerState[];
    leaderboards: LeaderboardBundle;
    recentCatches: CatchResult[];
    environment: EnvironmentState;
    tiktokStatus: {
      connected: boolean;
      username: string;
      roomId?: string;
      error?: string;
    };
  }) => void;
  anglerUpdated: (angler: ActiveAnglerState) => void;
  anglerLeft: (payload: { tiktokUid: string }) => void;
  anglerLiked: (payload: {
    tiktokUid: string;
    nickname: string;
    likeCount: number;
    pendingCasts: number;
    status: AnglerStatus;
  }) => void;
  catchCompleted: (payload: {
    angler: ActiveAnglerState;
    catchResult: CatchResult;
    leaderboards: LeaderboardBundle;
  }) => void;
  alertTriggered: (alert: LiveEventAlert) => void;
  leaderboardsUpdated: (leaderboards: LeaderboardBundle) => void;
  environmentUpdated: (env: EnvironmentState) => void;
}
