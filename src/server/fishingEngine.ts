import {
  ActiveAnglerState,
  CatchResult,
  DayPhase,
  EnvironmentState,
  FishRarity,
  FishSpecies,
  LeaderboardBundle,
  LiveEventAlert,
  PlayerProfile,
  SeasonId,
} from '../shared/types.js';
import {
  FISH_CATALOG,
  GIFT_PRESETS,
  getBaitConfigByTier,
  getDefaultBaitTier,
  getRodConfigByLevel,
  getRodProgressInfo,
  ORDERED_RARITIES,
  RARITY_META,
  SEASON_META,
} from '../shared/gameConfig.js';
import { GameDatabase } from './db.js';

export interface EngineCallbacks {
  onAnglerUpdated: (angler: ActiveAnglerState) => void;
  onAnglerLeft?: (payload: { tiktokUid: string }) => void;
  onAnglerLiked: (payload: {
    tiktokUid: string;
    nickname: string;
    likeCount: number;
    pendingCasts: number;
    status: ActiveAnglerState['status'];
  }) => void;
  onCatchCompleted: (payload: {
    angler: ActiveAnglerState;
    catchResult: CatchResult;
    leaderboards: LeaderboardBundle;
  }) => void;
  onAlertTriggered: (alert: LiveEventAlert) => void;
  onLeaderboardsUpdated: (leaderboards: LeaderboardBundle) => void;
  onEnvironmentUpdated: (env: EnvironmentState) => void;
}

const MAX_ACTIVE_SLOTS = 40;
const MAX_PENDING_CASTS_PER_USER = 3;
const ROD_CHECK_COOLDOWN_MS = 8000;
const IDLE_SEAT_TIMEOUT_MS = 30_000; // Tự động rời chỗ ngồi nếu > 30s không tương tác
const ANCHOR_DATE_STR = '2026-01-01';
const SEASONS_ORDER: SeasonId[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

/**
 * Tier Gate Multipliers by Rod Level [COMMON, UNCOMMON, RARE, EPIC, LEGENDARY]:
 * Low-level rods (Lv1-Lv2) have ultra-small jackpot odds for EPIC (~0.15%) and LEGENDARY (~0.01%),
 * gradually unlocking through Lv3-Lv4, and reaching 100% full potential at Lv5-Lv10!
 */
const ROD_TIER_GATE_MULTIPLIERS: Record<number, [number, number, number, number, number]> = {
  1: [1.0, 0.85, 0.35, 0.035, 0.01],
  2: [1.0, 0.95, 0.55, 0.08, 0.025],
  3: [1.0, 1.0, 0.8, 0.28, 0.08],
  4: [1.0, 1.0, 0.95, 0.55, 0.22],
  5: [1.0, 1.0, 1.0, 1.0, 1.0],
  6: [1.0, 1.0, 1.0, 1.0, 1.0],
  7: [1.0, 1.0, 1.0, 1.0, 1.0],
  8: [1.0, 1.0, 1.0, 1.0, 1.0],
  9: [1.0, 1.0, 1.0, 1.0, 1.0],
  10: [1.0, 1.0, 1.0, 1.0, 1.0],
};

/**
 * Maximum Safe Fish Weight (kg) per Rod Level before line-overload escape penalty kicks in:
 */
const ROD_MAX_SAFE_KG: Record<number, number> = {
  1: 2.5,
  2: 5.0,
  3: 10.0,
  4: 16.0,
  5: 25.0,
  6: 35.0,
  7: 50.0,
  8: 70.0,
  9: 95.0,
  10: 130.0,
};

export class FishingEngine {
  private db: GameDatabase;
  private callbacks: EngineCallbacks;
  private anglers: Map<string, ActiveAnglerState> = new Map();
  private timers: Map<string, NodeJS.Timeout[]> = new Map();
  private idleTimers: Map<string, NodeJS.Timeout> = new Map();
  private rodCheckCooldowns: Map<string, number> = new Map();

  // Environment Config (Section 7)
  private seasonMode: 'daily' | 'manual' = 'daily';
  private manualSeason: SeasonId = 'SPRING';
  private seasonExpiresAt: string | null = null;
  private dayPhaseForced: DayPhase | null = null;

  constructor(db: GameDatabase, callbacks: EngineCallbacks) {
    this.db = db;
    this.callbacks = callbacks;
  }

  public getActiveAnglers(): ActiveAnglerState[] {
    return Array.from(this.anglers.values()).sort(
      (a, b) => a.slotIndex - b.slotIndex
    );
  }

  public clearActiveAnglers(): void {
    for (const uid of this.anglers.keys()) {
      this.clearUserTimers(uid);
      this.clearIdleTimer(uid);
    }
    this.anglers.clear();
  }

  /**
   * Computes current Vietnam Time (Asia/Ho_Chi_Minh), Day/Night phase, and Active Season (Section 7).
   */
  public getEnvironment(): EnvironmentState {
    const now = new Date();
    const vnFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = vnFormatter.formatToParts(now);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    const hour = Number(partMap.hour || 12) % 24;
    const minute = partMap.minute || '00';
    const vnDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const vietnamTimeStr = `${String(hour).padStart(2, '0')}:${minute}`;

    const autoDayPhase: DayPhase = hour >= 6 && hour < 18 ? 'DAY' : 'NIGHT';
    const dayPhase: DayPhase = this.dayPhaseForced || autoDayPhase;

    // Check if manual season has expired
    if (
      this.seasonMode === 'manual' &&
      this.seasonExpiresAt &&
      Date.now() > new Date(this.seasonExpiresAt).getTime()
    ) {
      this.seasonMode = 'daily';
      this.seasonExpiresAt = null;
    }

    let season: SeasonId = this.manualSeason;
    if (this.seasonMode === 'daily') {
      const anchorMs = Date.parse(`${ANCHOR_DATE_STR}T00:00:00+07:00`);
      const currentDayMs = Date.parse(`${vnDateStr}T00:00:00+07:00`);
      const diffDays = Math.max(
        0,
        Math.floor((currentDayMs - anchorMs) / (24 * 3600 * 1000))
      );
      season = SEASONS_ORDER[diffDays % 4];
    }

    // Day/Night Modifiers (Section 7.1)
    const dayWaitMod = dayPhase === 'DAY' ? 1.0 : 1.1;
    const dayTierMod: [number, number, number, number, number] =
      dayPhase === 'DAY'
        ? [1.0, 1.0, 1.0, 1.0, 1.0]
        : [0.85, 1.0, 1.0, 1.15, 1.25];

    // Season Modifiers (Section 7.2)
    const sMeta = SEASON_META[season];
    const waitMod = Number((dayWaitMod * sMeta.waitMod).toFixed(3));
    const tierMod: [number, number, number, number, number] = [
      Number((dayTierMod[0] * sMeta.tierMod[0]).toFixed(3)),
      Number((dayTierMod[1] * sMeta.tierMod[1]).toFixed(3)),
      Number((dayTierMod[2] * sMeta.tierMod[2]).toFixed(3)),
      Number((dayTierMod[3] * sMeta.tierMod[3]).toFixed(3)),
      Number((dayTierMod[4] * sMeta.tierMod[4]).toFixed(3)),
    ];

    return {
      dayPhase,
      dayPhaseForced: this.dayPhaseForced,
      season,
      seasonMode: this.seasonMode,
      seasonExpiresAt: this.seasonExpiresAt,
      waitMod,
      tierMod,
      vietnamTimeStr,
    };
  }

  /**
   * Allows Host to switch between 'daily' auto-rotation and 'manual' season or override Day/Night.
   */
  public setEnvironmentConfig(params: {
    seasonMode?: 'daily' | 'manual';
    season?: SeasonId;
    dayPhaseForced?: DayPhase | null;
  }): EnvironmentState {
    if (params.seasonMode) {
      this.seasonMode = params.seasonMode;
    }
    if (params.season) {
      this.manualSeason = params.season;
    }
    if (params.dayPhaseForced !== undefined) {
      this.dayPhaseForced = params.dayPhaseForced;
    }
    const env = this.getEnvironment();
    this.callbacks.onEnvironmentUpdated(env);
    return env;
  }

  private allocateSlotIndex(existingSlot?: number): number {
    if (existingSlot !== undefined && existingSlot >= 0) {
      return existingSlot;
    }
    const usedSlots = new Set(
      Array.from(this.anglers.values()).map((a) => a.slotIndex)
    );
    for (let i = 0; i < MAX_ACTIVE_SLOTS; i++) {
      if (!usedSlots.has(i)) {
        return i;
      }
    }
    // If all 40 slots are full, evict the oldest IDLE angler
    const idleAnglers = Array.from(this.anglers.values())
      .filter((a) => a.status === 'IDLE')
      .sort((a, b) => a.statusUpdatedAt - b.statusUpdatedAt);

    if (idleAnglers.length > 0) {
      const evicted = idleAnglers[0];
      const freedSlot = evicted.slotIndex;
      this.clearUserTimers(evicted.tiktokUid);
      this.clearIdleTimer(evicted.tiktokUid);
      this.anglers.delete(evicted.tiktokUid);
      this.callbacks.onAnglerLeft?.({ tiktokUid: evicted.tiktokUid });
      return freedSlot;
    }

    return Math.floor(Math.random() * MAX_ACTIVE_SLOTS);
  }

  private syncAnglerWithProfile(
    profile: PlayerProfile,
    existing?: ActiveAnglerState
  ): ActiveAnglerState {
    const progress = getRodProgressInfo(profile.diamondsKc, profile.rodLevel);
    const isDefaultBait = profile.baitCount <= 0;
    const now = Date.now();

    if (!existing) {
      const created: ActiveAnglerState = {
        tiktokUid: profile.tiktokUid,
        uniqueId: profile.uniqueId,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        isFollower: profile.isFollower,
        diamondsKc: profile.diamondsKc,
        nextRodKc: progress.nextRodKc,
        kcRemainingForNext: progress.kcRemainingForNext,
        rodProgressPct: progress.rodProgressPct,
        isNearLevelUp: progress.isNearLevelUp,
        rodLevel: profile.rodLevel,
        baitTier: profile.baitTier,
        baitCount: profile.baitCount,
        isDefaultBait,
        slotIndex: this.allocateSlotIndex(),
        status: 'IDLE',
        pendingCasts: 0,
        totalLikesInSession: 0,
        lastLikePopAt: now,
        statusUpdatedAt: now,
      };
      this.anglers.set(profile.tiktokUid, created);
      return created;
    }

    existing.nickname = profile.nickname;
    existing.avatarUrl = profile.avatarUrl;
    existing.isFollower = profile.isFollower;
    existing.diamondsKc = profile.diamondsKc;
    existing.nextRodKc = progress.nextRodKc;
    existing.kcRemainingForNext = progress.kcRemainingForNext;
    existing.rodProgressPct = progress.rodProgressPct;
    existing.isNearLevelUp = progress.isNearLevelUp;
    existing.rodLevel = profile.rodLevel;
    existing.baitTier = profile.baitTier;
    existing.baitCount = profile.baitCount;
    existing.isDefaultBait = isDefaultBait;
    return existing;
  }

  /**
   * 1. Like Event -> Spawns character and starts Cast Cycle (with anti-spam queue max 3).
   */
  public handleLikeEvent(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
    likeCount?: number;
    isFollower?: boolean;
  }): ActiveAnglerState {
    const likeCount = Math.max(1, params.likeCount || 1);
    const profile = this.db.getOrCreatePlayer({
      tiktokUid: params.tiktokUid,
      uniqueId: params.uniqueId,
      nickname: params.nickname,
      avatarUrl: params.avatarUrl,
      isFollower: params.isFollower,
    });

    const angler = this.syncAnglerWithProfile(
      profile,
      this.anglers.get(params.tiktokUid)
    );
    this.clearIdleTimer(angler.tiktokUid);
    angler.totalLikesInSession += likeCount;
    angler.lastLikePopAt = Date.now();

    if (angler.status === 'IDLE') {
      this.startCastCycle(angler.tiktokUid);
      this.callbacks.onAnglerLiked({
        tiktokUid: angler.tiktokUid,
        nickname: angler.nickname,
        likeCount,
        pendingCasts: angler.pendingCasts,
        status: angler.status,
      });
    } else {
      if (angler.pendingCasts < MAX_PENDING_CASTS_PER_USER) {
        angler.pendingCasts += 1;
      }
      this.callbacks.onAnglerLiked({
        tiktokUid: angler.tiktokUid,
        nickname: angler.nickname,
        likeCount,
        pendingCasts: angler.pendingCasts,
        status: angler.status,
      });
      this.callbacks.onAnglerUpdated(angler);
    }

    return angler;
  }

  /**
   * 1b. Chat Command "câu" -> Behaves identically to Like: spawns/casts, shows +1 pop, and queues up to max 3 turns with anti-spam.
   */
  public handleCastChatCommand(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
    isFollower?: boolean;
  }): ActiveAnglerState {
    return this.handleLikeEvent({
      ...params,
      likeCount: 1,
    });
  }

  /**
   * 2. Follow Event -> Unlocks Rod Lv2 (Cần trúc) immediately for Followed users!
   */
  public handleFollowEvent(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
  }): { player: PlayerProfile; angler: ActiveAnglerState; leveledUp: boolean } {
    const { player, leveledUp } = this.db.applyFollowBonus(params);
    const angler = this.syncAnglerWithProfile(
      player,
      this.anglers.get(params.tiktokUid)
    );
    this.clearIdleTimer(angler.tiktokUid);

    if (leveledUp) {
      const rodLv2 = getRodConfigByLevel(player.rodLevel);
      angler.lastGiftFloatingText = `💚 Follow ➔ Cần Lv2!`;
      angler.lastGiftAt = Date.now();
      this.callbacks.onAlertTriggered({
        id: `follow_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'FOLLOW_BONUS',
        title: `💚 CẢM ƠN FOLLOW! MỞ KHÓA ${rodLv2.name.toUpperCase()} LV.2!`,
        subtitle: `${player.nickname} vừa Follow kênh ➔ Nhận ngay ${rodLv2.name} Lv2 vĩnh viễn!`,
        avatarUrl: player.avatarUrl,
        nickname: player.nickname,
        emoji: '🎍',
        imageUrl: rodLv2.rodSpriteUrl,
        createdAt: Date.now(),
      });
    }

    if (angler.status === 'IDLE') {
      this.startCastCycle(angler.tiktokUid);
    } else {
      this.callbacks.onAnglerUpdated(angler);
    }

    return { player, angler, leveledUp };
  }

  /**
   * 3. Gift Event -> Adds cumulative KC to Rod + Grants Bait Pack (with capBait auto-conversion & UX floating text).
   * Big banner only triggers when totalDiamonds > 20 or leveledUp!
   */
  public handleGiftEvent(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
    giftId: string;
    giftName?: string;
    diamonds?: number;
    repeatCount?: number;
  }) {
    const repeatCount = Math.max(1, params.repeatCount || 1);
    const preset = GIFT_PRESETS.find((g) => g.id === params.giftId);
    const unitDiamonds = params.diamonds ?? preset?.diamonds ?? 1;
    const totalDiamonds = Math.max(1, unitDiamonds * repeatCount);
    const giftDisplayName = params.giftName || preset?.name || 'Quà TikTok';
    const giftEmoji = preset?.emoji || '🎁';

    const upgrade = this.db.applyGiftUpgrade({
      tiktokUid: params.tiktokUid,
      uniqueId: params.uniqueId,
      nickname: params.nickname,
      avatarUrl: params.avatarUrl,
      giftId: params.giftId,
      giftName: giftDisplayName,
      diamonds: totalDiamonds,
    });

    const { player, leveledUp, previousRodLevel } = upgrade;
    const angler = this.syncAnglerWithProfile(
      player,
      this.anglers.get(params.tiktokUid)
    );
    this.clearIdleTimer(angler.tiktokUid);

    const rodConfig = getRodConfigByLevel(player.rodLevel);
    const remainText =
      angler.nextRodKc !== null
        ? `còn ${angler.kcRemainingForNext} KC lên Lv${player.rodLevel + 1}`
        : `Đạt cấp tối đa Lv10!`;

    // Concise icon-based floating text over character head
    const defTier = getDefaultBaitTier(player.rodLevel);
    const isPaidBaitHigherThanDefault = upgrade.grantedBaitTier > defTier;
    const baitPart = isPaidBaitHigherThanDefault
      ? ` • ${upgrade.grantedBaitEmoji}x${upgrade.grantedBaitCount}`
      : '';
    const remainShort =
      angler.nextRodKc !== null ? ` (-${angler.kcRemainingForNext}💎)` : '';
    angler.lastGiftFloatingText = leveledUp
      ? `🎉 Lên Lv${player.rodLevel}! +${totalDiamonds}💎${baitPart}`
      : `+${totalDiamonds}💎${baitPart}${remainShort}`;
    angler.lastGiftAt = Date.now();

    // Only show big AlertOverlay banner when gift > 20 KC or player leveled up their rod
    if (totalDiamonds > 20 || leveledUp) {
      const activeBaitCfg = getBaitConfigByTier(player.baitTier);
      const baitNotice = !isPaidBaitHigherThanDefault
        ? `Ưu tiên dùng mồi cấp cao hiện có (${activeBaitCfg.name} ${activeBaitCfg.emoji}) • ${remainText}`
        : upgrade.wasBaitCapped
        ? `Cần Lv${player.rodLevel} tối đa dùng ${upgrade.grantedBaitName} ➔ Quy đổi +${upgrade.grantedBaitCount} lượt ${upgrade.grantedBaitEmoji} (Nâng cần để mở ${upgrade.rawBaitName}!)`
        : `Nhận +${upgrade.grantedBaitCount} lượt mồi ${upgrade.grantedBaitName} ${upgrade.grantedBaitEmoji} • ${remainText}`;

      const grantedBaitCfg = getBaitConfigByTier(
        isPaidBaitHigherThanDefault ? upgrade.grantedBaitTier : player.baitTier
      );

      this.callbacks.onAlertTriggered({
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'GIFT_UPGRADE',
        title: leveledUp
          ? `🎉 LÊN CẤP CẦN LV.${player.rodLevel}: ${rodConfig.name.toUpperCase()}!`
          : angler.isNearLevelUp
          ? `🔥 SẮP LÊN CẤP! +${totalDiamonds} KC (${remainText.toUpperCase()})`
          : `🎁 +${totalDiamonds} KC TÍCH LŨY CẦN & MỒI ${upgrade.grantedBaitName.toUpperCase()}!`,
        subtitle: `${player.nickname} tặng ${giftEmoji} (+${totalDiamonds} KC) ➔ ${baitNotice}`,
        avatarUrl: player.avatarUrl,
        nickname: player.nickname,
        emoji: leveledUp ? '⚡' : giftEmoji,
        imageUrl: leveledUp ? rodConfig.rodSpriteUrl : grantedBaitCfg.imageUrl,
        createdAt: Date.now(),
      });
    }

    if (angler.status === 'IDLE') {
      this.startCastCycle(angler.tiktokUid);
    } else {
      this.callbacks.onAnglerUpdated(angler);
    }

    return {
      player,
      angler,
      leveledUp,
      previousRodLevel,
      wasBaitCapped: upgrade.wasBaitCapped,
    };
  }

  /**
   * 4. Chat Command "cần" -> Shows compact floating bubble above character's head ONLY (no big banner) with anti-spam cooldown.
   */
  public handleRodCheckCommand(params: {
    tiktokUid: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
  }) {
    const now = Date.now();
    const lastCheckAt = this.rodCheckCooldowns.get(params.tiktokUid) || 0;
    const profile = this.db.getOrCreatePlayer(params);
    const angler = this.syncAnglerWithProfile(
      profile,
      this.anglers.get(params.tiktokUid)
    );
    this.clearIdleTimer(angler.tiktokUid);
    if (angler.status === 'IDLE') {
      this.scheduleIdleEviction(angler.tiktokUid);
    }

    if (now - lastCheckAt < ROD_CHECK_COOLDOWN_MS) {
      return { profile, angler, throttled: true };
    }
    this.rodCheckCooldowns.set(params.tiktokUid, now);

    const bait = getBaitConfigByTier(profile.baitTier);
    const kcProgressStr =
      angler.nextRodKc !== null
        ? `${profile.diamondsKc}/${angler.nextRodKc}💎`
        : `${profile.diamondsKc}💎 MAX`;
    const baitShortStr = angler.isDefaultBait
      ? `${bait.emoji}∞`
      : `${bait.emoji}x${profile.baitCount}`;

    angler.lastGiftFloatingText = `🎣 Lv${profile.rodLevel} • ${kcProgressStr} • ${baitShortStr}`;
    angler.lastGiftAt = now;
    this.callbacks.onAnglerUpdated(angler);

    return { profile, angler, throttled: false };
  }

  /**
   * Cast Cycle (Section 1 & Section 10):
   * - CASTING (0.5s)
   * - WAITING_BITE: waitSec in [4s, 15s] = clamp(10 * 0.92^(Lv-1) * rand(0.5, 1.5) * env.waitMod, 4, 15)
   *   with 0..2 random fake bobber twitches before the real bite!
   * - REELING (0.8s)
   * - SHOW_CATCH or ESCAPED (2.5s rest before next cast, then 30s IDLE seat timeout)
   */
  private startCastCycle(tiktokUid: string) {
    const angler = this.anglers.get(tiktokUid);
    if (!angler) return;

    this.clearUserTimers(tiktokUid);
    this.clearIdleTimer(tiktokUid);
    const userTimers: NodeJS.Timeout[] = [];
    this.timers.set(tiktokUid, userTimers);

    // Phase 1: CASTING (500ms)
    angler.status = 'CASTING';
    angler.statusUpdatedAt = Date.now();
    this.callbacks.onAnglerUpdated(angler);

    const env = this.getEnvironment();
    const rod = getRodConfigByLevel(angler.rodLevel);
    const randFactor = 0.5 + Math.random(); // rand(0.5, 1.5)
    const waitSec = Math.min(
      15,
      Math.max(4, 10 * Math.pow(0.92, rod.level - 1) * randFactor * env.waitMod)
    );
    const waitMs = Math.round(waitSec * 1000);

    const tCast = setTimeout(() => {
      const current = this.anglers.get(tiktokUid);
      if (!current) return;

      // Phase 2: WAITING_BITE (with 0..2 fake bobber twitches!)
      current.status = 'WAITING_BITE';
      current.statusUpdatedAt = Date.now();
      this.callbacks.onAnglerUpdated(current);

      const fakeTwitchCount = Math.floor(Math.random() * 3); // 0, 1, or 2
      for (let i = 1; i <= fakeTwitchCount; i++) {
        const twitchDelay = Math.round(
          (waitMs * (i + 0.15 * (Math.random() - 0.5))) / (fakeTwitchCount + 1)
        );
        const tTwitch = setTimeout(() => {
          const twitchAngler = this.anglers.get(tiktokUid);
          if (!twitchAngler || twitchAngler.status !== 'WAITING_BITE') return;
          twitchAngler.lastTwitchAt = Date.now();
          this.callbacks.onAnglerUpdated(twitchAngler);
        }, twitchDelay);
        userTimers.push(tTwitch);
      }

      // Real Bite after waitMs
      const tBite = setTimeout(() => {
        const cur2 = this.anglers.get(tiktokUid);
        if (!cur2) return;

        // Phase 3: REELING (800ms)
        cur2.status = 'REELING';
        cur2.statusUpdatedAt = Date.now();
        this.callbacks.onAnglerUpdated(cur2);

        const tReel = setTimeout(() => {
          this.completeCatch(tiktokUid);
        }, 800);
        userTimers.push(tReel);
      }, waitMs);
      userTimers.push(tBite);
    }, 500);

    userTimers.push(tCast);
  }

  private completeCatch(tiktokUid: string) {
    const angler = this.anglers.get(tiktokUid);
    if (!angler) return;

    const profileBefore = this.db.getOrCreatePlayer({
      tiktokUid: angler.tiktokUid,
      uniqueId: angler.uniqueId,
      nickname: angler.nickname,
      avatarUrl: angler.avatarUrl,
    });

    // 1. Pick active bait & consume 1 charge (or use defaultBait(rodLv))
    const baitConsumption = this.db.consumeBaitCharge(tiktokUid);
    const rodLevelUsed = profileBefore.rodLevel;
    const baitTierUsed = baitConsumption.baitTierUsed;

    // 2. Roll Fish Tier, Species, Weight & Escape Check (Section 2, 3, 6, 8)
    const outcome = this.rollBiteOutcome({
      rodLevel: rodLevelUsed,
      baitTier: baitTierUsed,
      pityRare: profileBefore.pityRare,
      pityEpic: profileBefore.pityEpic,
    });

    // 3. Record Pity & Catch / Escape in SQLite
    const { player, catchResult } = this.db.recordBiteOutcome({
      tiktokUid: angler.tiktokUid,
      uniqueId: angler.uniqueId,
      nickname: angler.nickname,
      avatarUrl: angler.avatarUrl,
      fishId: outcome.species.id,
      fishName: outcome.species.name,
      fishEmoji: outcome.species.emoji,
      rarity: outcome.species.rarity,
      tierLevel: outcome.species.tierLevel,
      weight: outcome.weight,
      rodLevelUsed,
      baitTierUsed,
      escaped: outcome.escaped,
      escapeChancePct: outcome.escapeChancePct,
    });

    this.syncAnglerWithProfile(player, angler);
    angler.lastCatch = catchResult;
    angler.status = outcome.escaped ? 'ESCAPED' : 'SHOW_CATCH';
    angler.statusUpdatedAt = Date.now();

    const leaderboards = this.db.getLeaderboards(5);

    if (outcome.escaped) {
      this.callbacks.onAnglerUpdated(angler);
    } else {
      this.callbacks.onCatchCompleted({
        angler,
        catchResult,
        leaderboards,
      });

      // Trigger Banner Alert for EPIC (Lv4), LEGENDARY (Lv5), or Global Record
      if (
        catchResult.rarity === 'LEGENDARY' ||
        catchResult.rarity === 'EPIC' ||
        catchResult.isGlobalRecord
      ) {
        const tierLabel = RARITY_META[catchResult.rarity].label.toUpperCase();
        this.callbacks.onAlertTriggered({
          id: `catch_alert_${catchResult.id}`,
          type: catchResult.isGlobalRecord ? 'RECORD_BREAKER' : 'RARE_CATCH',
          title: catchResult.isGlobalRecord
            ? `👑 PHÁ KỶ LỤC HỒ CÂU: ${catchResult.weight} KG!`
            : `🔥 CÂU TRÚNG CÁ ${tierLabel}: ${catchResult.fishName.toUpperCase()}!`,
          subtitle: `${angler.nickname} (Cần Lv${rodLevelUsed}) vừa kéo lên ${catchResult.fishName} nặng ${catchResult.weight} kg!`,
          avatarUrl: angler.avatarUrl,
          nickname: angler.nickname,
          emoji: catchResult.fishEmoji,
          imageUrl: outcome.species.imageUrl,
          rarity: catchResult.rarity,
          createdAt: Date.now(),
        });
      }
    }

    // Rest 2.5 seconds before next cast or entering IDLE (with 30s inactivity seat eviction)
    const tRest = setTimeout(() => {
      const afterRest = this.anglers.get(tiktokUid);
      if (!afterRest) return;

      if (afterRest.pendingCasts > 0) {
        afterRest.pendingCasts -= 1;
        this.startCastCycle(tiktokUid);
      } else {
        afterRest.status = 'IDLE';
        afterRest.statusUpdatedAt = Date.now();
        this.callbacks.onAnglerUpdated(afterRest);
        this.scheduleIdleEviction(tiktokUid);
      }
    }, 2500);

    const existingTimers = this.timers.get(tiktokUid) || [];
    existingTimers.push(tRest);
    this.timers.set(tiktokUid, existingTimers);
  }

  /**
   * Exact Mathematical Formulas from Section 2, 3, 6, 8, 10 of `co-che-cau-ca.md`:
   * - Combined Rarity Multiplier: k = bait.rarityFactor * rod.rarityMultiplier
   * - Tier Weight i (0..4): baseWeight[i] * (k ^ i) * env.tierMod[i]
   * - Pity System: 40 casts -> Rare+ (Lv3+), 120 casts -> Epic+ (Lv4+)
   * - Species Weight: (dayPhase === 'DAY' ? dayWeight : nightWeight) * seasonWeights[season]
   * - Fish Weight: (min + (max - min) * u^1.8) * (1 + rod.weightBonus)
   * - Escape Chance: clamp((tierDifficulty - rod.pullStrength) / 100 + 0.10, 0.02, 0.90)
   */
  public rollBiteOutcome(params: {
    rodLevel: number;
    baitTier: number;
    pityRare?: number;
    pityEpic?: number;
  }): {
    species: FishSpecies;
    weight: number;
    escaped: boolean;
    escapeChancePct: number;
  } {
    const rod = getRodConfigByLevel(params.rodLevel);
    const bait = getBaitConfigByTier(params.baitTier);
    const env = this.getEnvironment();

    const k = bait.rarityFactor * rod.rarityMultiplier;
    const minTierIndex =
      (params.pityEpic || 0) >= 120
        ? 3 // Guarantee EPIC (Lv4) or LEGENDARY (Lv5)
        : (params.pityRare || 0) >= 40
        ? 2 // Guarantee RARE (Lv3)+
        : 0;

    const weightedTiers: Array<{ rarity: FishRarity; weight: number }> = [];
    let totalTierWeight = 0;
    const gateMultipliers =
      ROD_TIER_GATE_MULTIPLIERS[rod.level] || ROD_TIER_GATE_MULTIPLIERS[1];

    ORDERED_RARITIES.forEach((rarity, idx) => {
      if (idx < minTierIndex) return;
      const meta = RARITY_META[rarity];
      const gateMod = minTierIndex > 0 ? 1.0 : gateMultipliers[idx];
      const w = meta.baseWeight * Math.pow(k, idx) * env.tierMod[idx] * gateMod;
      if (w > 0) {
        weightedTiers.push({ rarity, weight: w });
        totalTierWeight += w;
      }
    });

    let rollT = Math.random() * totalTierWeight;
    let chosenRarity: FishRarity =
      weightedTiers[0]?.rarity || ORDERED_RARITIES[minTierIndex];

    for (const item of weightedTiers) {
      if (rollT <= item.weight) {
        chosenRarity = item.rarity;
        break;
      }
      rollT -= item.weight;
    }

    // Roll specific fish species within chosenRarity using Day/Night & Season weights
    const tierCandidates = FISH_CATALOG.filter((f) => f.rarity === chosenRarity);
    const weightedSpecies: Array<{ species: FishSpecies; weight: number }> = [];
    let totalSpeciesWeight = 0;

    for (const sp of tierCandidates) {
      const timeW = env.dayPhase === 'DAY' ? sp.dayWeight : sp.nightWeight;
      const seasonW = sp.seasonWeights[env.season] ?? 1.0;
      const finalSpW = timeW * seasonW;
      if (finalSpW > 0) {
        weightedSpecies.push({ species: sp, weight: finalSpW });
        totalSpeciesWeight += finalSpW;
      }
    }

    let chosenSpecies = tierCandidates[0] || FISH_CATALOG[0];
    if (totalSpeciesWeight > 0) {
      let rollS = Math.random() * totalSpeciesWeight;
      for (const item of weightedSpecies) {
        if (rollS <= item.weight) {
          chosenSpecies = item.species;
          break;
        }
        rollS -= item.weight;
      }
    }

    // Weight formula: low-level rods skew toward lighter specimens (exponent 2.45 -> 1.55)
    const u = Math.random();
    const weightExponent = Math.max(1.55, 2.45 - (rod.level - 1) * 0.1);
    const rawWeight =
      chosenSpecies.minWeight +
      (chosenSpecies.maxWeight - chosenSpecies.minWeight) *
        Math.pow(u, weightExponent);
    const finalWeight = Number(
      (rawWeight * (1 + rod.weightBonus)).toFixed(2)
    );

    // Escape check: Base Tier Difficulty + Species Size Ratio Penalty + Rod Safe Kg Overload Penalty
    const tierDifficulty = RARITY_META[chosenRarity].escapeDifficulty;
    const baseEscape = (tierDifficulty - rod.pullStrength) / 100 + 0.1;

    // 1. Within-species relative weight penalty (up to +12% escape for max-size monsters)
    const speciesSpan = Math.max(
      0.1,
      chosenSpecies.maxWeight - chosenSpecies.minWeight
    );
    const sizeRatio = Math.max(
      0,
      Math.min(1, (rawWeight - chosenSpecies.minWeight) / speciesSpan)
    );
    const sizePenalty = sizeRatio * 0.12;

    // 2. Rod safe-load overload penalty (if fish weight exceeds ROD_MAX_SAFE_KG[rod.level])
    const maxSafeKg = ROD_MAX_SAFE_KG[rod.level] || 2.5;
    const overloadRatio =
      finalWeight > maxSafeKg ? (finalWeight - maxSafeKg) / maxSafeKg : 0;
    const overloadPenalty = Math.min(0.45, overloadRatio * 0.18);

    const rawEscape = baseEscape + sizePenalty + overloadPenalty;
    const escapeChance = Math.max(0.02, Math.min(0.98, rawEscape));
    const escaped = Math.random() < escapeChance;

    return {
      species: chosenSpecies,
      weight: finalWeight,
      escaped,
      escapeChancePct: Math.round(escapeChance * 100),
    };
  }

  private clearUserTimers(tiktokUid: string) {
    const list = this.timers.get(tiktokUid);
    if (list) {
      for (const t of list) {
        clearTimeout(t);
      }
      this.timers.delete(tiktokUid);
    }
  }

  private clearIdleTimer(tiktokUid: string) {
    const t = this.idleTimers.get(tiktokUid);
    if (t) {
      clearTimeout(t);
      this.idleTimers.delete(tiktokUid);
    }
  }

  /**
   * Automatically removes angler from their pond seat if they remain IDLE with no interaction for > 30s.
   * Player profile (Rod Level, KC, Bait, Leaderboard stats) stays persisted in DB.
   */
  private scheduleIdleEviction(tiktokUid: string) {
    this.clearIdleTimer(tiktokUid);
    const tIdle = setTimeout(() => {
      this.idleTimers.delete(tiktokUid);
      const current = this.anglers.get(tiktokUid);
      if (!current) return;
      if (current.status === 'IDLE' && current.pendingCasts === 0) {
        this.clearUserTimers(tiktokUid);
        this.anglers.delete(tiktokUid);
        this.callbacks.onAnglerLeft?.({ tiktokUid });
      }
    }, IDLE_SEAT_TIMEOUT_MS);
    this.idleTimers.set(tiktokUid, tIdle);
  }
}
