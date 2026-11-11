import {
  ControlEvent,
  TikTokLiveConnection,
  WebcastEvent,
} from 'tiktok-live-connector';
import { FishingEngine } from './fishingEngine.js';

export interface TikTokConnectorStatus {
  connected: boolean;
  username: string;
  roomId?: string;
  error?: string;
  reconnecting?: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_RECONNECT_DELAY_MS = 3500;
const GIFT_DEDUP_TTL_MS = 60_000;

export class TikTokLiveService {
  private connection: TikTokLiveConnection | null = null;
  private engine: FishingEngine;
  private status: TikTokConnectorStatus = {
    connected: false,
    username: '',
  };
  private onStatusChange: (status: TikTokConnectorStatus) => void;
  private isManualDisconnect = false;
  private isStreamEnded = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private processedGiftKeys = new Map<string, number>();

  constructor(
    engine: FishingEngine,
    onStatusChange: (status: TikTokConnectorStatus) => void
  ) {
    this.engine = engine;
    this.onStatusChange = onStatusChange;
  }

  public getStatus(): TikTokConnectorStatus {
    return this.status;
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cleanupConnectionInstance() {
    if (this.connection) {
      const oldConn = this.connection;
      this.connection = null;
      try {
        oldConn.removeAllListeners();
        oldConn.disconnect().catch(() => {
          // Ignore disconnect errors
        });
      } catch {
        // Ignore disconnect cleanup errors
      }
    }
  }

  public async connect(rawUsername: string, isAutoReconnect = false): Promise<TikTokConnectorStatus> {
    const username = rawUsername.trim().replace(/^@/, '');
    if (!username) {
      throw new Error('Vui lòng nhập @username TikTok hợp lệ');
    }

    this.clearReconnectTimer();
    if (!isAutoReconnect) {
      this.isManualDisconnect = false;
      this.isStreamEnded = false;
      this.reconnectAttempts = 0;
    }

    this.cleanupConnectionInstance();

    // Sử dụng TikTokLiveConnection v2.5+ (enableExtendedGiftInfo: false vì protobuf v3 đã có sẵn data.gift.diamondCount & data.gift.name)
    const signApiKey =
      process.env.SIGN_API_KEY || process.env.EULER_API_KEY || undefined;
    const conn = new TikTokLiveConnection(username, {
      processInitialData: false,
      fetchRoomInfoOnConnect: true,
      enableExtendedGiftInfo: false,
      ...(signApiKey ? { signApiKey } : {}),
    });
    this.connection = conn;

    // Register listeners BEFORE connect() so we never miss early events or errors
    this.registerEventHandlers(conn, username);

    try {
      const state = await conn.connect();
      this.reconnectAttempts = 0;
      this.status = {
        connected: true,
        username,
        roomId: String(state.roomId || conn.roomId || ''),
        reconnecting: false,
      };
      this.onStatusChange(this.status);
      return this.status;
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err || '');
      const message =
        rawMsg.includes("isn't online") ||
        rawMsg.includes('LIVE has ended') ||
        rawMsg.includes('UserOfflineError')
          ? 'Kênh TikTok này hiện đã tắt Live hoặc chưa bắt đầu phiên Live.'
          : rawMsg || 'Không thể kết nối tới phiên TikTok Live này (Kênh chưa bật Live hoặc sai tên).';

      // If this was a background auto-reconnect attempt and stream isn't permanently ended, schedule next retry
      if (isAutoReconnect && !this.isManualDisconnect && !this.isStreamEnded) {
        this.scheduleReconnect(username, message);
        return this.status;
      }

      this.status = {
        connected: false,
        username,
        error: message,
        reconnecting: false,
      };
      this.onStatusChange(this.status);
      throw new Error(message);
    }
  }

  private scheduleReconnect(username: string, reason?: string) {
    if (this.isManualDisconnect || this.isStreamEnded || !username) {
      return;
    }
    this.clearReconnectTimer();

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.status = {
        connected: false,
        username,
        error: reason || 'Mất kết nối TikTok Live sau nhiều lần thử lại. Vui lòng bấm Kết nối lại.',
        reconnecting: false,
      };
      this.onStatusChange(this.status);
      return;
    }

    this.reconnectAttempts += 1;
    const delayMs = Math.min(15000, BASE_RECONNECT_DELAY_MS * this.reconnectAttempts);

    this.status = {
      connected: false,
      username,
      roomId: this.status.roomId,
      error: `Mất kết nối tạm thời, đang tự kết nối lại (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
      reconnecting: true,
    };
    this.onStatusChange(this.status);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isManualDisconnect || this.isStreamEnded) return;
      this.connect(username, true).catch(() => {
        // Handled inside connect()
      });
    }, delayMs);
  }

  public disconnect() {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.cleanupConnectionInstance();
    this.status = {
      connected: false,
      username: this.status.username,
      reconnecting: false,
    };
    this.onStatusChange(this.status);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractUserFields(data: Record<string, any>) {
    const user = data?.user || data || {};
    const userIdentity = data?.userIdentity || {};

    const tiktokUid = String(
      user.id || user.idStr || user.userId || user.displayId || user.uniqueId || 'unknown'
    );
    const uniqueId = String(user.displayId || user.uniqueId || tiktokUid);
    const nickname = String(user.nickname || uniqueId);

    const avatarFromProto =
      user.avatarThumb?.urlList?.[0] ||
      user.avatarMedium?.urlList?.[0] ||
      user.avatarLarge?.urlList?.[0] ||
      user.profilePictureUrl ||
      '';
    const avatarUrl = String(
      avatarFromProto ||
        `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(uniqueId)}`
    );

    const followStatusNum = Number(
      user.followInfo?.followStatus ?? user.followStatus ?? data.followRole ?? 0
    );
    const isFollower =
      followStatusNum >= 1 ||
      Boolean(user.isFollower) ||
      Boolean(userIdentity.isFollowerOfAnchor) ||
      Boolean(userIdentity.isMutualFollowingWithAnchor);

    return { tiktokUid, uniqueId, nickname, avatarUrl, isFollower };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isDuplicateGiftEvent(data: Record<string, any>, tiktokUid: string, giftId: string, repeatCount: number): boolean {
    const now = Date.now();
    for (const [k, exp] of this.processedGiftKeys.entries()) {
      if (exp <= now) {
        this.processedGiftKeys.delete(k);
      }
    }

    const groupId = String(data.groupId || '');
    const msgId = String(data.common?.msgId || data.msgId || '');
    const dedupKey = groupId
      ? `grp:${tiktokUid}:${giftId}:${groupId}:${repeatCount}`
      : msgId
        ? `msg:${msgId}`
        : '';

    if (!dedupKey) return false;
    if (this.processedGiftKeys.has(dedupKey)) {
      return true;
    }
    this.processedGiftKeys.set(dedupKey, now + GIFT_DEDUP_TTL_MS);
    return false;
  }

  private registerEventHandlers(conn: TikTokLiveConnection, username: string) {
    // 0. Control & Error Events (Ngăn crash Node process & Tự động kết nối lại khi WebSocket rớt mạng)
    conn.on(ControlEvent.ERROR, (err: unknown) => {
      const detail =
        err && typeof err === 'object' && 'info' in err
          ? `${String((err as Record<string, unknown>).info || 'TikTok Error')}`
          : err instanceof Error
            ? err.message
            : String(err);
      console.warn(`[TikTokLiveService] Warning/Error (@${username}):`, detail);
    });

    conn.on(ControlEvent.DISCONNECTED, () => {
      if (this.connection !== conn) return;
      if (!this.isManualDisconnect && !this.isStreamEnded) {
        console.warn(`[TikTokLiveService] Disconnected from @${username}, scheduling auto-reconnect...`);
        this.scheduleReconnect(username);
      }
    });

    // 1. Like Event (Thả tim -> Quăng câu với chống spam, tự nhận diện Follower -> Cần Lv2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conn.on(WebcastEvent.LIKE, (data: any) => {
      try {
        const u = this.extractUserFields(data);
        const rawLikes = Number(data.count ?? data.likeCount ?? 1);
        const likeCount = Number.isFinite(rawLikes) && rawLikes > 0 ? rawLikes : 1;

        this.engine.handleLikeEvent({
          ...u,
          likeCount,
        });
      } catch (err) {
        console.error('[TikTokLiveService] Error in like handler:', err);
      }
    });

    // 2. Follow Event (Follow kênh -> Lên ngay Cần trúc Lv2 vĩnh viễn!)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conn.on(WebcastEvent.FOLLOW, (data: any) => {
      try {
        const u = this.extractUserFields(data);
        this.engine.handleFollowEvent(u);
      } catch (err) {
        console.error('[TikTokLiveService] Error in follow handler:', err);
      }
    });

    // Fallback cho sự kiện social nếu action === '1' hoặc describe/key chứa 'follow'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conn.on(WebcastEvent.SOCIAL, (data: any) => {
      try {
        const displayKey = String(data.common?.displayText?.key || data.displayType || '').toLowerCase();
        const describe = String(data.common?.describe || data.label || '').toLowerCase();
        const action = String(data.action || '');
        if (action === '1' || displayKey.includes('follow') || describe.includes('follow')) {
          const u = this.extractUserFields(data);
          this.engine.handleFollowEvent(u);
        }
      } catch (err) {
        console.error('[TikTokLiveService] Error in social handler:', err);
      }
    });

    // 3. Gift Event (Tặng quà -> Tích lũy KC lên 10 cấp Cần Vĩnh Viễn + Nhận gói Mồi theo capBait)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conn.on(WebcastEvent.GIFT, (data: any) => {
      try {
        const giftObj = data.gift || data.giftDetails || {};
        const giftType = Number(giftObj.type ?? giftObj.giftType ?? data.giftType ?? 0);
        const isComboGift = giftType === 1 || Boolean(giftObj.combo);
        const isRepeatEnd = Boolean(data.repeatEnd);

        // Nếu là quà có combo liên tiếp (giftType === 1 / combo), chỉ xử lý khi chuỗi combo kết thúc (repeatEnd === 1/true)
        if (isComboGift && !isRepeatEnd) {
          return;
        }

        const u = this.extractUserFields(data);
        const extended = data.extendedGiftInfo as Record<string, unknown> | undefined;
        const giftName = String(
          giftObj.name ||
            giftObj.giftName ||
            data.giftName ||
            extended?.name ||
            giftObj.describe ||
            data.common?.describe ||
            `Gift #${data.giftId || 0}`
        );
        const giftId = String(data.giftId || giftObj.id || giftName.toLowerCase().replace(/\s+/g, '_'));
        const rawDiamonds = Number(
          giftObj.diamondCount ??
            data.diamondCount ??
            extended?.diamond_count ??
            1
        );
        const diamonds = Number.isFinite(rawDiamonds) && rawDiamonds > 0 ? rawDiamonds : 1;
        const rawRepeat = Number(data.repeatCount ?? data.comboCount ?? 1);
        const repeatCount = Number.isFinite(rawRepeat) && rawRepeat > 0 ? rawRepeat : 1;

        if (this.isDuplicateGiftEvent(data, u.tiktokUid, giftId, repeatCount)) {
          return;
        }

        this.engine.handleGiftEvent({
          tiktokUid: u.tiktokUid,
          uniqueId: u.uniqueId,
          nickname: u.nickname,
          avatarUrl: u.avatarUrl,
          giftId,
          giftName,
          diamonds,
          repeatCount,
        });
      } catch (err) {
        console.error('[TikTokLiveService] Error in gift handler:', err);
      }
    });

    // 4. Chat Command:
    // - "cần" / "!can" -> Kiểm tra cấp cần, KC tích lũy & mồi hiện tại (Mục 4.2, có cooldown 8s)
    // - "câu" / "!cau" / "!fish" -> Quăng cần câu cá (tương đương thả tim)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conn.on(WebcastEvent.CHAT, (data: any) => {
      try {
        const rawText = String(data.content ?? data.comment ?? '');
        const comment = rawText.normalize('NFC').trim().toLowerCase();
        if (!comment) return;

        const u = this.extractUserFields(data);

        if (
          comment === 'cần' ||
          comment === 'can' ||
          comment === '!can' ||
          comment === '!cần' ||
          comment === '/can' ||
          comment === '/cần'
        ) {
          this.engine.handleRodCheckCommand(u);
          return;
        }

        if (
          comment === 'câu' ||
          comment === 'cau' ||
          comment === 'câu cá' ||
          comment === 'cau ca' ||
          comment.startsWith('!câu') ||
          comment.startsWith('!cau') ||
          comment.startsWith('!fish') ||
          comment.startsWith('/cau') ||
          comment.startsWith('/câu') ||
          comment.startsWith('câu ') ||
          comment.startsWith('cau ')
        ) {
          this.engine.handleCastChatCommand(u);
        }
      } catch (err) {
        console.error('[TikTokLiveService] Error in chat handler:', err);
      }
    });

    conn.on(WebcastEvent.STREAM_END, () => {
      if (this.connection !== conn) return;
      this.isStreamEnded = true;
      this.clearReconnectTimer();
      this.status = {
        connected: false,
        username: this.status.username,
        error: 'Phiên TikTok Live đã kết thúc.',
        reconnecting: false,
      };
      this.onStatusChange(this.status);
    });
  }
}
