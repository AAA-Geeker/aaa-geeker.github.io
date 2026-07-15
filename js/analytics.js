// ============================================================
// 游戏分析统计模块 — 基于 Supabase REST API
// ============================================================
// 追踪所有关键事件，发送到 game_events 表
// ============================================================

const ANALYTICS_TABLE = 'game_events';

const Analytics = {
  _base: SUPABASE_URL + '/rest/v1/' + ANALYTICS_TABLE,
  _buffer: [],
  _flushTimer: null,
  _sessionId: null,
  _enabled: true,

  // ---- 初始化 ----
  init() {
    this._sessionId = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    // 每 5 秒批量发送一次
    this._flushTimer = setInterval(() => this._flush(), 5000);
    // 页面关闭前发送剩余事件
    window.addEventListener('beforeunload', () => this._flush(true));
    // 可见性变化时也发送
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._flush(true);
    });
    console.log('[Analytics] ✅ Ready — session:', this._sessionId);
  },

  _headers() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    };
  },

  // ---- 追踪事件 ----
  track(eventType, data = {}) {
    if (!this._enabled) return;

    const event = {
      event_type: eventType,
      player_id: Storage.getPlayerId ? Storage.getPlayerId() : 'anonymous',
      session_id: this._sessionId,
      event_data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
      // 客户端元数据（用于分析设备和地域）
      user_agent: navigator.userAgent.substring(0, 200),
      screen_size: window.innerWidth + 'x' + window.innerHeight,
      language: navigator.language,
      page_url: window.location.href.substring(0, 500),
    };

    this._buffer.push(event);
    console.log('%c[Analytics] %c' + eventType + '%c →', 'color:#16c79a', 'color:#fff', 'color:#888', data);

    // 关键事件立即发送
    const criticalEvents = ['game_end', 'death', 'purchase', 'login', 'error'];
    if (criticalEvents.includes(eventType)) {
      this._flush(true);
    } else if (this._buffer.length >= 10) {
      this._flush();
    }
  },

  // ---- 批量发送到 Supabase ----
  async _flush(sync = false) {
    if (this._buffer.length === 0) return;

    const batch = this._buffer.splice(0);
    const sendOne = async (event) => {
      try {
        const res = await fetch(this._base, {
          method: 'POST',
          headers: { ...this._headers(), 'Prefer': 'return=minimal' },
          body: JSON.stringify(event),
        });
        if (!res.ok && res.status !== 409) {
          console.warn('[Analytics] Send failed:', res.status);
        }
      } catch (e) {
        // 静默失败，不影响游戏体验
      }
    };

    if (sync) {
      // 关键事件：串行发送确保不丢失
      for (const event of batch) {
        await sendOne(event);
      }
    } else {
      // 普通事件：并发发送
      Promise.all(batch.map(sendOne)).catch(() => {});
    }
  },

  // ---- 便捷方法 ----
  trackLogin(method) {
    this.track('login', { method }); // method: 'password' | 'code'
  },

  trackGameStart(wave, weaponType) {
    this.track('game_start', {
      wave: wave || 1,
      weapon: weaponType || 'pistol',
      coins: Storage.get('coins', 0),
      gems: Storage.get('gems', 0),
      stars: Storage.get('stars', 0),
    });
  },

  trackGameEnd(result) {
    this.track('game_end', {
      score: result.score || 0,
      wave: result.wave || 1,
      kills: result.kills || 0,
      stars_earned: result.starsEarned || 0,
      duration_sec: result.duration || 0,
      weapon_used: result.weapon || 'pistol',
      revived: result.revived || false,
      revive_method: result.reviveMethod || null,
    });
  },

  trackDeath(cause) {
    this.track('death', {
      cause: cause || 'enemy',
      wave: window.game ? window.game.wave : 0,
      score: window.game ? window.game.score : 0,
    });
  },

  trackRevive(method) {
    this.track('revive', { method }); // method: 'ad' | 'token' | 'friend' | 'gems'
  },

  trackShopPurchase(item, currency, amount) {
    this.track('purchase', {
      item: item,
      currency: currency, // 'coins' | 'gems' | 'stars'
      amount: amount,
    });
  },

  trackAdWatched(type, completed) {
    this.track('ad_watched', {
      type: type || 'rewarded', // 'rewarded' | 'interstitial'
      completed: completed !== false,
    });
  },

  trackDailyClaim(day, reward) {
    this.track('daily_claim', {
      day: day,
      coins: reward?.coins || reward?.coinAmount || 0,
      gems: reward?.gems || 0,
      streak: window.game ? window.game.dailyStreak : 0,
    });
  },

  trackWeaponUpgrade(weaponId, path, newLevel) {
    this.track('weapon_upgrade', {
      weapon: weaponId,
      path: path,
      level: newLevel,
    });
  },

  trackSkinSelect(skinId) {
    this.track('skin_select', { skin: skinId });
  },

  trackAchievement(achievementId) {
    this.track('achievement_unlock', { achievement: achievementId });
  },

  trackError(context, message) {
    this.track('error', { context, message: String(message).substring(0, 300) });
  },

  trackPageView(screen) {
    this.track('page_view', { screen: screen });
  },
};

// 初始化
Analytics.init();
