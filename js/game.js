// ============================================================
// SURVIVAL ARENA - Complete Game Engine
// ============================================================

// --- Sound Engine (Web Audio API) ---
const Sound = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  },
  play(freq, type, duration, vol = 0.1, glide = 0) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (glide) osc.frequency.linearRampToValueAtTime(freq + glide, t + duration);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + duration);
    } catch(e) {}
  },
  shoot() { this.play(800, 'square', 0.06, 0.05, -400); },
  hit() { this.play(150, 'sawtooth', 0.1, 0.08); },
  kill() { this.play(300, 'square', 0.15, 0.1, -200); },
  powerup() { this.play(600, 'sine', 0.1, 0.12); this.play(900, 'sine', 0.1, 0.12); },
  waveClear() { this.play(500, 'sine', 0.15, 0.2); setTimeout(()=>this.play(700,'sine',0.15,0.2),100); },
  bossAlert() { this.play(80, 'sawtooth', 0.3, 0.5); },
  dash() { this.play(200, 'triangle', 0.08, 0.08, 400); },
  star() { this.play(1200, 'sine', 0.05, 0.06); },
  death() { this.play(60, 'sawtooth', 0.3, 0.6, -40); },
  revive() { this.play(400, 'sine', 0.15, 0.3); setTimeout(()=>this.play(700,'sine',0.15,0.3),150); },
};

// --- Storage Manager ---
const Storage = {
  get(key, def = null) {
    try { const v = localStorage.getItem('sa_' + key); return v !== null ? JSON.parse(v) : def; }
    catch(e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('sa_' + key, JSON.stringify(val)); } catch(e) {}
  },
  getPlayerId() {
    let id = this.get('playerId');
    if (!id) { id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); this.set('playerId', id); }
    return id;
  }
};

// --- Auth System ---
const Auth = {
  // Simulate server request delay
  _delay(ms = 600) {
    return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 400));
  },

  // Get users database
  _getUsers() {
    return Storage.get('users', []);
  },

  _saveUsers(users) {
    Storage.set('users', users);
  },

  // Get whitelist
  _getWhitelist() {
    return Storage.get('whitelist', ['13800138000', 'admin@game.com']);
  },

  // Get pending verification codes
  _getCodes() {
    return Storage.get('pendingCodes', {});
  },

  _saveCodes(codes) {
    Storage.set('pendingCodes', codes);
  },

  // Check if identifier is a phone number or email
  _idType(identifier) {
    return /^1[3-9]\d{9}$/.test(identifier) ? 'phone' : 'email';
  },

  // Validate identifier format
  validateIdentifier(identifier) {
    if (!identifier.trim()) return { ok: false, error: '请输入手机号或邮箱' };
    const isPhone = /^1[3-9]\d{9}$/.test(identifier.trim());
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
    if (!isPhone && !isEmail) return { ok: false, error: '请输入正确的手机号或邮箱格式' };
    return { ok: true, type: isPhone ? 'phone' : 'email' };
  },

  // Check if user exists in database (simulates server lookup)
  async checkUser(identifier) {
    await this._delay();
    const users = this._getUsers();
    const user = users.find(u => u.phone === identifier || u.email === identifier);
    return { exists: !!user, user: user || null };
  },

  // Check whitelist permission (simulates server permission check)
  async checkPermission(identifier) {
    await this._delay(400);
    const whitelist = this._getWhitelist();
    // Empty whitelist = open for everyone
    if (whitelist.length === 0) return { allowed: true };
    const allowed = whitelist.some(w => {
      if (/^1[3-9]\d{9}$/.test(w)) return identifier === w;
      return identifier.toLowerCase() === w.toLowerCase();
    });
    return { allowed, reason: allowed ? '' : '该账号没有权限登录，请联系管理员' };
  },

  // Register new user
  async register(identifier, password) {
    await this._delay();
    const users = this._getUsers();
    const exists = users.find(u => u.phone === identifier || u.email === identifier);
    if (exists) return { success: false, error: '该账号已被注册' };

    // Check whitelist
    const whitelist = this._getWhitelist();
    if (whitelist.length > 0) {
      const allowed = whitelist.some(w => {
        if (/^1[3-9]\d{9}$/.test(w)) return identifier === w;
        return identifier.toLowerCase() === w.toLowerCase();
      });
      if (!allowed) return { success: false, error: '该账号不在白名单中，无法注册' };
    }

    const user = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      phone: this._idType(identifier) === 'phone' ? identifier : '',
      email: this._idType(identifier) === 'email' ? identifier : '',
      password: btoa(password), // Base64 encode (simulated hashing — use bcrypt in production)
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };
    users.push(user);
    this._saveUsers(users);
    this._setSession(user);
    return { success: true, user };
  },

  // Login
  async login(identifier, password) {
    await this._delay();
    const users = this._getUsers();
    const user = users.find(u => u.phone === identifier || u.email === identifier);
    if (!user) return { success: false, error: '账号不存在，请先注册' };

    // Check whitelist
    const whitelist = this._getWhitelist();
    if (whitelist.length > 0) {
      const allowed = whitelist.some(w => {
        if (/^1[3-9]\d{9}$/.test(w)) return identifier === w;
        return identifier.toLowerCase() === w.toLowerCase();
      });
      if (!allowed) return { success: false, error: '该账号没有权限登录' };
    }

    if (btoa(password) !== user.password) return { success: false, error: '密码错误' };

    user.lastLogin = Date.now();
    this._saveUsers(users);
    this._setSession(user);
    return { success: true, user };
  },

  // Login with verification code (phone only)
  async loginWithCode(phone, code) {
    await this._delay();
    const codes = this._getCodes();
    const entry = codes[phone];
    if (!entry || Date.now() > entry.expires) {
      return { success: false, error: '验证码已过期，请重新获取' };
    }
    if (entry.code !== code) {
      return { success: false, error: '验证码错误' };
    }
    delete codes[phone];
    this._saveCodes(codes);

    // Check if user exists, if not auto-register
    const users = this._getUsers();
    let user = users.find(u => u.phone === phone);
    if (!user) {
      user = {
        id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        phone, email: '',
        password: btoa('default' + phone.slice(-4)),
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };
      users.push(user);
      this._saveUsers(users);
    } else {
      user.lastLogin = Date.now();
      this._saveUsers(users);
    }
    this._setSession(user);
    return { success: true, user };
  },

  // Send verification code (simulates SMS)
  async sendCode(phone) {
    await this._delay(300);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codes = this._getCodes();
    codes[phone] = { code, expires: Date.now() + 300000 }; // 5 minute expiry
    this._saveCodes(codes);
    // In production: POST to real SMS API
    console.log('%c📱 [模拟短信] 验证码: ' + code + ' → ' + phone, 'color:#16c79a;font-size:14px;');
    return { success: true, code }; // Return code in demo for testing; remove in production
  },

  // Session management
  _setSession(user) {
    Storage.set('session', { userId: user.id, identifier: user.phone || user.email, loginTime: Date.now() });
  },

  getCurrentUser() {
    const session = Storage.get('session', null);
    if (!session) return null;
    const users = this._getUsers();
    return users.find(u => u.id === session.userId) || null;
  },

  logout() {
    Storage.set('session', null);
  },
};

// --- Game Constants ---
const CFG = {
  PLAYER_RADIUS: 16,
  PLAYER_SPEED: 4.5,
  PLAYER_MAX_HP: 100,
  PLAYER_DAMAGE: 25,
  PLAYER_FIRE_RATE: 250, // ms between shots
  PLAYER_BULLET_SPEED: 10,
  DASH_SPEED: 15,
  DASH_DURATION: 150,
  DASH_COOLDOWN: 2000,
  IFRAME_DURATION: 500,
  ENEMY_SPAWN_MARGIN: 60,
  WAVE_DELAY: 2000,
  POWERUP_DROP_CHANCE: 0.15,
  STAR_DROP_CHANCE: 0.4,
  MAGNET_RANGE: 120,
  AD_DURATION: 15,
  MAX_REVIVES_PER_RUN: 1,
};

// ============================================================
// AD MANAGER - Pluggable Ad Provider System
// ============================================================
// Supports: Simulated (dev), WeChat Mini Game, Web SDK (Monetag/etc.)
// Usage:
//   AdManager.showRewardedVideo({
//     onComplete: () => { /* reward user */ },
//     onError: (err) => { /* fallback */ },
//     onSkip: () => { /* user skipped */ },
//   });
// ============================================================

const AdManager = {
  _provider: null,       // current provider instance
  _providerName: 'simulated',
  _initialized: false,
  _adInProgress: false,

  // --- Detect environment ---
  detectEnv() {
    if (typeof wx !== 'undefined' && typeof wx.createRewardedVideoAd === 'function') {
      return 'wechat';   // WeChat Mini Game
    }
    // Check for custom web ad SDK (set by integrator)
    if (window.__AD_PROVIDER__ && window.__AD_PROVIDER__.showRewardedVideo) {
      return 'web_sdk';
    }
    return 'simulated';
  },

  // --- Initialize with optional provider override ---
  init(providerName) {
    if (this._initialized) return;
    this._providerName = providerName || this.detectEnv();
    console.log('[AdManager] Initializing provider:', this._providerName);

    switch (this._providerName) {
      case 'wechat':
        this._provider = new WeChatAdProvider();
        break;
      case 'web_sdk':
        this._provider = window.__AD_PROVIDER__;
        break;
      default:
        this._provider = new SimulatedAdProvider();
    }

    this._provider.init();
    this._initialized = true;
  },

  // --- Show rewarded video ad ---
  // callbacks: { onComplete, onError, onSkip, onStart }
  showRewardedVideo(callbacks = {}) {
    if (this._adInProgress) {
      console.warn('[AdManager] Ad already in progress');
      (callbacks.onError || (() => {}))('Ad in progress');
      return;
    }
    if (!this._initialized) this.init();

    this._adInProgress = true;
    const provider = this._provider;

    // Wrap callbacks to manage state
    const wrapped = {
      onStart: () => {
        if (callbacks.onStart) callbacks.onStart();
      },
      onComplete: () => {
        this._adInProgress = false;
        if (callbacks.onComplete) callbacks.onComplete();
      },
      onError: (err) => {
        this._adInProgress = false;
        console.error('[AdManager] Ad error:', err);
        if (callbacks.onError) callbacks.onError(err);
      },
      onSkip: () => {
        this._adInProgress = false;
        if (callbacks.onSkip) callbacks.onSkip();
      },
    };

    provider.showRewardedVideo(wrapped);
  },

  // --- Check if ad is ready ---
  isReady() {
    if (!this._initialized) this.init();
    return this._provider && this._provider.isReady();
  },

  // --- Get provider name ---
  getProviderName() {
    return this._providerName;
  },
};

// ============================================================
// Provider 1: Simulated Ad (Development / Demo)
// ============================================================
class SimulatedAdProvider {
  init() {
    console.log('[SimulatedAd] Ready for dev/testing');
  }

  isReady() { return true; }

  showRewardedVideo(callbacks) {
    // Show the existing ad-modal UI
    const game = window._gameInstance;
    if (game) {
      game.showScreen('ad-modal');
      Sound.init();
      let remaining = CFG.AD_DURATION;
      const fill = document.getElementById('ad-timer-fill');
      const text = document.getElementById('ad-timer-text');

      if (callbacks.onStart) callbacks.onStart();

      const interval = setInterval(() => {
        remaining--;
        const pct = ((CFG.AD_DURATION - remaining) / CFG.AD_DURATION) * 100;
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = '剩余 ' + remaining + ' 秒';

        if (remaining <= 0) {
          clearInterval(interval);
          document.getElementById('ad-modal').classList.add('hidden');
          callbacks.onComplete();
        }
      }, 1000);

      // Store interval for cleanup
      this._interval = interval;
    } else {
      // Fallback: no UI available, just delay
      setTimeout(() => callbacks.onComplete(), CFG.AD_DURATION * 1000);
    }
  }
}

// ============================================================
// Provider 2: WeChat Mini Game Ad (Production - WeChat)
// ============================================================
// Integration guide:
//   1. Deploy to WeChat Mini Game platform
//   2. Configure ad unit ID in WeChat MP backend
//   3. Set AD_WECHAT_UNIT_ID below
// ============================================================
const AD_WECHAT_UNIT_ID = 'adunit-xxxxxxxxxxxxxxxx'; // <-- Replace with real ID

class WeChatAdProvider {
  constructor() {
    this._rewardedVideoAd = null;
    this._callbacks = null;
  }

  init() {
    if (typeof wx === 'undefined') {
      console.warn('[WeChatAd] wx not found, falling back to simulated');
      return;
    }
    try {
      this._rewardedVideoAd = wx.createRewardedVideoAd({
        adUnitId: AD_WECHAT_UNIT_ID,
      });

      this._rewardedVideoAd.onLoad(() => {
        console.log('[WeChatAd] Rewarded video loaded');
      });

      this._rewardedVideoAd.onError((err) => {
        console.error('[WeChatAd] Error:', err);
        if (this._callbacks && this._callbacks.onError) {
          this._callbacks.onError(err.errMsg || 'Ad load failed');
        }
      });

      this._rewardedVideoAd.onClose((res) => {
        if (res && res.isEnded) {
          // User watched the full ad
          if (this._callbacks && this._callbacks.onComplete) {
            this._callbacks.onComplete();
          }
        } else {
          // User closed before finishing
          if (this._callbacks && this._callbacks.onSkip) {
            this._callbacks.onSkip();
          }
        }
      });

      console.log('[WeChatAd] Initialized');
    } catch (e) {
      console.error('[WeChatAd] Init failed:', e);
    }
  }

  isReady() {
    return this._rewardedVideoAd !== null;
  }

  showRewardedVideo(callbacks) {
    this._callbacks = callbacks;
    if (!this._rewardedVideoAd) {
      callbacks.onError('WeChat Ad not initialized');
      return;
    }
    this._rewardedVideoAd.show().catch(() => {
      // Ad not loaded yet, try to load first
      this._rewardedVideoAd.load().then(() => {
        return this._rewardedVideoAd.show();
      }).catch((err) => {
        callbacks.onError(err.errMsg || 'Ad show failed');
      });
    });
  }
}

// ============================================================
// Provider 3: Web SDK Ad (Monetag / PropellerAds / Custom)
// ============================================================
// Integration guide:
//   1. Register at monetag.com or propellerads.com
//   2. Add their JS SDK script to index.html <head>
//   3. Set window.__AD_PROVIDER__ with your adapter
//
// Example Monetag adapter:
//   window.__AD_PROVIDER__ = {
//     init() { monetag.init('YOUR_SITE_ID'); },
//     isReady() { return true; },
//     showRewardedVideo(cb) {
//       monetag.showRewardedVideo({
//         onComplete: cb.onComplete,
//         onClose: cb.onSkip,
//         onError: cb.onError,
//       });
//     }
//   };
// ============================================================

// --- Auto-init on script load ---
AdManager.init();

// --- Store game instance reference for SimulatedAdProvider ---
// Set by game.init()

// ============================================================
// --- Rank Tiers ---
const RANK_TIERS = [
  { id: 'bronze',  name: '青铜战士', icon: '🥉', minWave: 1,  color: '#cd7f32' },
  { id: 'silver',  name: '白银骑士', icon: '🥈', minWave: 5,  color: '#c0c0c0' },
  { id: 'gold',    name: '黄金勇士', icon: '🥇', minWave: 10, color: '#ffd700' },
  { id: 'diamond', name: '钻石英雄', icon: '💎', minWave: 15, color: '#b9f2ff' },
  { id: 'legend',  name: '传说至尊', icon: '👑', minWave: 20, color: '#ff4500' },
];

// --- Achievements ---
const ACHIEVEMENTS = [
  { id: 'kill_50',    name: '初次狩猎',   desc: '累计击杀50个敌人',    icon: '🎯', check: (s) => s.totalKills >= 50 },
  { id: 'kill_500',   name: '屠戮机器',   desc: '累计击杀500个敌人',   icon: '⚔️', check: (s) => s.totalKills >= 500 },
  { id: 'kill_2000',  name: '死神降临',   desc: '累计击杀2000个敌人',  icon: '💀', check: (s) => s.totalKills >= 2000 },
  { id: 'wave_5',     name: '初露锋芒',   desc: '到达第5波',          icon: '🌊', check: (s) => s.highestWave >= 5 },
  { id: 'wave_10',    name: '身经百战',   desc: '到达第10波',         icon: '🔥', check: (s) => s.highestWave >= 10 },
  { id: 'wave_20',    name: '无双战将',   desc: '到达第20波',         icon: '⚡', check: (s) => s.highestWave >= 20 },
  { id: 'score_1k',   name: '千分猎手',   desc: '单局得分突破1000',    icon: '🏆', check: (s) => s.highScore >= 1000 },
  { id: 'score_5k',   name: '精英杀手',   desc: '单局得分突破5000',    icon: '🌟', check: (s) => s.highScore >= 5000 },
  { id: 'combo_10',   name: '连杀高手',   desc: '达成10连杀',         icon: '💥', check: (s) => (s._maxComboEver || 0) >= 10 },
  { id: 'combo_30',   name: '战场风暴',   desc: '达成30连杀',         icon: '🌪️', check: (s) => s._maxComboEver >= 30 },
  { id: 'weapon_all', name: '武器大师',   desc: '解锁全部4种武器',     icon: '🔫', check: (s) => Object.values(s.ownedWeapons||{}).filter(w=>w.owned).length >= 4 },
  { id: 'daily_7',    name: '坚持不懈',   desc: '连续签到7天',         icon: '📅', check: (s) => s.dailyStreak >= 6 },
];

// --- Weapon Types ---
const WEAPONS = {
  pistol: {
    id: 'pistol', name: '手枪', icon: '🔫',
    desc: '标准武器，平衡的伤害和射速', stats: '伤害x1 | 射速x1',
    damageMult: 1.0, fireRateMult: 1.0, spread: 0, pellets: 1,
    bulletColor: '#ffeb3b', bulletSize: 3,
    cost: 0, gemCost: 0,
    unlockCost: 0, unlockGemCost: 0,  // pistol always free
    upgradePaths: [
      { id: 'damageLvl', name: '伤害', icon: '💥', maxLevel: 10, perLevel: 0.08, desc: '+8% 伤害/级' },
      { id: 'fireRateLvl', name: '射速', icon: '🎯', maxLevel: 10, perLevel: 0.06, desc: '+6% 射速/级' },
      { id: 'ammoLvl', name: '弹药', icon: '🔫', maxLevel: 10, perLevel: 1, desc: '+1 弹丸/级' },
    ],
  },
  shotgun: {
    id: 'shotgun', name: '霰弹枪', icon: '💥',
    desc: '5发弹丸扇形散射，近距离威力巨大', stats: '单发x0.35 | 散射x5',
    damageMult: 0.35, fireRateMult: 0.5, spread: 0.15, pellets: 5,
    bulletColor: '#ff9800', bulletSize: 2.5,
    cost: 50, gemCost: 3,
    unlockCost: 200, unlockGemCost: 8,
    upgradePaths: [
      { id: 'damageLvl', name: '伤害', icon: '💥', maxLevel: 10, perLevel: 0.08, desc: '+8% 伤害/级' },
      { id: 'fireRateLvl', name: '射速', icon: '🎯', maxLevel: 10, perLevel: 0.05, desc: '+5% 射速/级' },
      { id: 'spreadLvl', name: '精准', icon: '🎯', maxLevel: 10, perLevel: 0.06, desc: '-6% 散射/级' },
    ],
  },
  smg: {
    id: 'smg', name: '冲锋枪', icon: '⚡',
    desc: '极高射速，弹幕压制', stats: '伤害x0.55 | 射速x2.8',
    damageMult: 0.55, fireRateMult: 2.8, spread: 0.06, pellets: 1,
    bulletColor: '#4fc3f7', bulletSize: 2,
    cost: 80, gemCost: 5,
    unlockCost: 350, unlockGemCost: 12,
    upgradePaths: [
      { id: 'damageLvl', name: '伤害', icon: '💥', maxLevel: 10, perLevel: 0.07, desc: '+7% 伤害/级' },
      { id: 'fireRateLvl', name: '射速', icon: '🎯', maxLevel: 10, perLevel: 0.07, desc: '+7% 射速/级' },
      { id: 'accuracyLvl', name: '精度', icon: '🎯', maxLevel: 10, perLevel: 0.08, desc: '-8% 散布/级' },
    ],
  },
  sniper: {
    id: 'sniper', name: '狙击枪', icon: '🎯',
    desc: '3倍伤害，一击制敌', stats: '伤害x3 | 射速x0.35',
    damageMult: 3.0, fireRateMult: 0.35, spread: 0, pellets: 1,
    bulletColor: '#ff1744', bulletSize: 5,
    cost: 120, gemCost: 8,
    unlockCost: 500, unlockGemCost: 20,
    upgradePaths: [
      { id: 'damageLvl', name: '伤害', icon: '💥', maxLevel: 10, perLevel: 0.10, desc: '+10% 伤害/级' },
      { id: 'fireRateLvl', name: '射速', icon: '🎯', maxLevel: 10, perLevel: 0.05, desc: '+5% 射速/级' },
      { id: 'pierceLvl', name: '穿透', icon: '💢', maxLevel: 10, perLevel: 0.15, desc: '+15% 子弹/级' },
    ],
  },
};

// --- In-Run Power-Up Shop Items ---
const IN_RUN_POWERUPS = [
  { id: 'health',  name: '生命恢复', desc: '立即恢复 30 HP',            icon: '❤️',  cost: 30,  apply: (p) => { p.heal(30); } },
  { id: 'shield',  name: '护盾',      desc: '获得 10 秒护盾保护',       icon: '🛡️',  cost: 45,  apply: (p) => { p.shieldActive = 10000; } },
  { id: 'speed',   name: '速度提升',  desc: '8 秒内移动速度 +50%',      icon: '⚡',  cost: 30,  apply: (p) => { p.speedBoost = 8000; } },
  { id: 'damage',  name: '双倍伤害',  desc: '8 秒内造成双倍伤害',       icon: '💥',  cost: 60,  apply: (p) => { p.damageBoost = 8000; } },
  { id: 'magnet',  name: '星星磁铁',  desc: '10 秒内自动吸取附近星星',  icon: '🧲',  cost: 40,  apply: (p) => { p.magnetActive = 10000; } },
];

// --- Utility Functions ---
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rng() { return Math.random(); }

// --- Particle System ---
class Particle {
  constructor(x, y, vx, vy, life, color, size = 3) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.size = size;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
  }
  get alpha() { return clamp(this.life / this.maxLife, 0, 1); }
  get dead() { return this.life <= 0; }
  draw(ctx) {
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

let particles = [];

function spawnParticles(x, y, count, color, spread = 3, life = 0.4) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(0.5, spread);
    particles.push(new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s, rand(life*0.5, life), color, rand(1.5, 4)));
  }
}

// --- Projectile ---
class Projectile {
  constructor(x, y, vx, vy, damage, color = '#fff', isEnemy = false, radius = 0) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.isEnemy = isEnemy;
    this.radius = radius > 0 ? radius : (isEnemy ? 4 : 3);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
  get offScreen() {
    return this.x < -50 || this.x > canvas.width + 50 || this.y < -50 || this.y > canvas.height + 50;
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

let projectiles = [];

// --- Power-Up ---
const POWERUP_TYPES = [
  { id: 'health', icon: '❤️', color: '#ff5252', effect: (p) => { p.hp = Math.min(p.maxHp, p.hp + 30); }, text: '+30 HP' },
  { id: 'speed', icon: '⚡', color: '#ffeb3b', effect: (p) => { p.speedBoost = 5000; }, text: '加速!' },
  { id: 'damage', icon: '💥', color: '#ff9800', effect: (p) => { p.damageBoost = 5000; }, text: '伤害x2!' },
  { id: 'shield', icon: '🛡️', color: '#4fc3f7', effect: (p) => { p.shieldActive = 4000; }, text: '护盾!' },
  { id: 'magnet', icon: '🧲', color: '#ba68c8', effect: (p) => { p.magnetActive = 8000; }, text: '吸金!' },
  { id: 'starbag', icon: '💰', color: '#ffd700', effect: (p,g) => { g.stars += 25; }, text: '+25 星星' },
  { id: 'gem', icon: '💎', color: '#a855f7', effect: (p,g) => { g.gems += 1; }, text: '+1 钻石', rare: true },
];

class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type;
    this.radius = 12;
    this.life = 12000; // 12 seconds before disappearing
    this.elapsed = 0;
    this.bobOffset = rand(0, Math.PI * 2);
  }
  update(dt) {
    this.elapsed += dt * 1000;
    this.bobOffset += dt * 3;
  }
  get dead() { return this.elapsed >= this.life; }
  get blinkWarning() { return this.elapsed > this.life * 0.7; }
  draw(ctx) {
    const alpha = this.blinkWarning ? 0.4 + Math.sin(this.elapsed * 0.03) * 0.3 : 1;
    ctx.globalAlpha = alpha;
    const yOff = Math.sin(this.bobOffset) * 3;
    // Glow
    ctx.shadowColor = this.type.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = this.type.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y + yOff, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Icon
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.icon, this.x, this.y + yOff);
    ctx.globalAlpha = 1;
  }
}

let powerups = [];

// --- Star ---
class Star {
  constructor(x, y, value = 1) {
    this.x = x; this.y = y;
    this.value = value;
    this.radius = 8;
    this.life = 15000;
    this.elapsed = 0;
    this.rotation = rand(0, Math.PI * 2);
    this.bobOffset = rand(0, Math.PI * 2);
  }
  update(dt) {
    this.elapsed += dt * 1000;
    this.rotation += dt * 2.5;
    this.bobOffset += dt * 3;
  }
  get dead() { return this.elapsed >= this.life; }
  get blinkWarning() { return this.elapsed > this.life * 0.7; }
  draw(ctx) {
    const alpha = this.blinkWarning ? 0.3 + Math.sin(this.elapsed * 0.04) * 0.3 : 1;
    const yBob = Math.sin(this.bobOffset) * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y + yBob);
    ctx.rotate(this.rotation);

    // Draw 5-pointed star
    const spikes = 5;
    const outerR = this.radius + (this.value > 5 ? 3 : 0);
    const innerR = outerR * 0.45;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10 + (this.value > 5 ? 6 : 0);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / spikes - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();

    // White core highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, innerR * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Value text for large stars
    if (this.value >= 10) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.value, 0, 0);
    }

    ctx.restore();
  }
}

let starsArr = [];

// --- Enemy Types ---
const ENEMY_TYPES = {
  grunt: {
    name: '小兵', radius: 14, hp: 20, speed: 1.6, damage: 10,
    color: '#e94560', color2: '#c0392b',
    score: 10, shape: 'circle',
  },
  runner: {
    name: '疾行者', radius: 10, hp: 12, speed: 3.2, damage: 5,
    color: '#f39c12', color2: '#e67e22',
    score: 15, shape: 'triangle',
  },
  tank: {
    name: '重装兵', radius: 22, hp: 70, speed: 0.9, damage: 22,
    color: '#8e44ad', color2: '#6c3483',
    score: 30, shape: 'hexagon',
  },
  shooter: {
    name: '射手', radius: 13, hp: 18, speed: 1.0, damage: 8,
    color: '#e91e63', color2: '#880e4f',
    score: 20, shape: 'diamond', shoots: true, fireRate: 2000, bulletSpeed: 4,
  },
  boss: {
    name: 'BOSS', radius: 38, hp: 400, speed: 1.0, damage: 30,
    color: '#ff1744', color2: '#b71c1c',
    score: 200, shape: 'star', shoots: true, fireRate: 1200, bulletSpeed: 3.5,
  },
};

class Enemy {
  constructor(typeKey, x, y, waveNum) {
    const t = ENEMY_TYPES[typeKey];
    this.typeKey = typeKey;
    this.x = x; this.y = y;
    this.radius = t.radius;
    this.hp = t.hp * (1 + waveNum * 0.08);
    this.maxHp = this.hp;
    this.speed = t.speed * (1 + waveNum * 0.02);
    this.damage = t.damage * (1 + waveNum * 0.05);
    this.color = t.color;
    this.color2 = t.color2;
    this.score = t.score;
    this.shape = t.shape;
    this.hitFlash = 0;
    this.lastShot = rand(0, 2000); // Stagger initial shots
    this.shoots = t.shoots || false;
    this.fireRate = t.fireRate || 0;
    this.bulletSpeed = t.bulletSpeed || 0;
  }
  update(player, dt) {
    const a = angle(this, player);
    this.x += Math.cos(a) * this.speed * 60 * dt;
    this.y += Math.sin(a) * this.speed * 60 * dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    // Enemy shooting
    if (this.shoots) {
      this.lastShot += dt * 1000;
      if (this.lastShot >= this.fireRate) {
        this.lastShot = 0;
        const bx = this.x + Math.cos(a) * (this.radius + 4);
        const by = this.y + Math.sin(a) * (this.radius + 4);
        const spread = (this.typeKey === 'boss') ? 0.3 : 0.15;
        for (let i = -1; i <= 1; i++) {
          const sa = a + i * spread;
          projectiles.push(new Projectile(bx, by, Math.cos(sa) * this.bulletSpeed, Math.sin(sa) * this.bulletSpeed, this.damage * 0.7, this.color, true));
        }
      }
    }
  }
  takeDamage(dmg) {
    this.hp -= dmg;
    this.hitFlash = 0.08;
    Sound.hit();
  }
  get dead() { return this.hp <= 0; }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Hit flash
    const flashColor = this.hitFlash > 0 ? '#fff' : this.color;

    // Glow for boss
    if (this.typeKey === 'boss') {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 20 + Math.sin(Date.now() * 0.005) * 8;
    }

    // Body
    ctx.fillStyle = flashColor;
    ctx.strokeStyle = this.color2;
    ctx.lineWidth = 2;
    ctx.beginPath();

    switch (this.shape) {
      case 'circle':
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        break;
      case 'triangle':
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
          if (i === 0) ctx.moveTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
          else ctx.lineTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
        }
        ctx.closePath();
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
          if (i === 0) ctx.moveTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
          else ctx.lineTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
        }
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? this.radius : this.radius * 0.5;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        break;
    }

    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-this.radius*0.25, -this.radius*0.2, this.radius*0.22, 0, Math.PI*2);
    ctx.arc(this.radius*0.25, -this.radius*0.2, this.radius*0.22, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }
  // HP bar drawn separately
  drawHpBar(ctx) {
    if (this.hp >= this.maxHp) return;
    const w = this.radius * 2;
    const h = 5;
    const yOff = -this.radius - 10;
    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - w/2, this.y + yOff, w, h);
    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.3 ? '#00e676' : '#ff5252';
    ctx.fillRect(this.x - w/2, this.y + yOff, w * pct, h);
  }
}

let enemies = [];

// --- Player ---
class Player {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = 0; this.y = 0; // set in init
    this.radius = CFG.PLAYER_RADIUS;
    this.speed = CFG.PLAYER_SPEED;
    this.maxHp = CFG.PLAYER_MAX_HP;
    this.hp = this.maxHp;
    this.baseDamage = CFG.PLAYER_DAMAGE;
    this.fireRate = CFG.PLAYER_FIRE_RATE;
    this.lastShot = 0;
    this.alive = true;
    this.weaponType = 'pistol';

    // Buffs
    this.speedBoost = 0;
    this.damageBoost = 0;
    this.shieldActive = 0;
    this.magnetActive = 0;

    // Dash
    this.dashing = false;
    this.dashDx = 0; this.dashDy = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;

    // I-frames
    this.iframeTimer = 0;

    // Visual
    this.facingAngle = 0;
  }
  get speedMult() { return this.speedBoost > 0 ? 1.5 : 1; }
  get damageMult() { return this.damageBoost > 0 ? 2 : 1; }
  get hasShield() { return this.shieldActive > 0; }

  update(dt, keys, mouse) {
    if (!this.alive) return;

    const dtMs = dt * 1000;

    // Timers
    if (this.speedBoost > 0) this.speedBoost -= dtMs;
    if (this.damageBoost > 0) this.damageBoost -= dtMs;
    if (this.shieldActive > 0) this.shieldActive -= dtMs;
    if (this.magnetActive > 0) this.magnetActive -= dtMs;
    if (this.iframeTimer > 0) this.iframeTimer -= dtMs;
    if (this.dashCooldown > 0) this.dashCooldown -= dtMs;

    // Dash
    if (this.dashing) {
      this.dashTimer -= dtMs;
      this.x += this.dashDx * 60 * dt;
      this.y += this.dashDy * 60 * dt;
      if (this.dashTimer <= 0) { this.dashing = false; }
    } else {
      // Movement
      let mx = 0, my = 0;
      if (keys['KeyW'] || keys['ArrowUp']) my -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) my += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        mx /= len; my /= len;
        this.x += mx * this.speed * this.speedMult * 60 * dt;
        this.y += my * this.speed * this.speedMult * 60 * dt;
      }

      // Dash start
      if (keys['Space'] && (mx !== 0 || my !== 0) && this.dashCooldown <= 0 && !this.dashing) {
        this.dashing = true;
        this.dashTimer = CFG.DASH_DURATION;
        this.dashCooldown = CFG.DASH_COOLDOWN;
        this.dashDx = mx * CFG.DASH_SPEED;
        this.dashDy = my * CFG.DASH_SPEED;
        Sound.dash();
        spawnParticles(this.x, this.y, 8, '#4fc3f7', 4, 0.25);
      }
    }

    // Clamp to canvas
    this.x = clamp(this.x, this.radius, canvas.width - this.radius);
    this.y = clamp(this.y, this.radius, canvas.height - this.radius);

    // Face mouse
    this.facingAngle = angle(this, mouse);

    // Manual shoot - handled by mousedown event
  }

  shoot(target) {
    const weapon = WEAPONS[this.weaponType] || WEAPONS.pistol;
    const eff = game.getEffectiveWeaponStats(this.weaponType);
    const baseAngle = angle(this, target);
    const totalDmg = this.baseDamage * this.damageMult * eff.damageMult;
    const pellets = eff.pellets;
    const spread = eff.spread;
    const bulletSize = eff.bulletSize;

    // Fire pellets with spread
    for (let i = 0; i < pellets; i++) {
      let pelletAngle = baseAngle;
      if (spread > 0 && pellets > 1) {
        // Even fan spread for multi-pellet weapons
        const offset = (i - (pellets - 1) / 2) * spread;
        pelletAngle = baseAngle + offset;
      } else if (spread > 0) {
        // Random inaccuracy for single-pellet spread weapons
        pelletAngle = baseAngle + (Math.random() - 0.5) * spread * 2;
      }
      const bx = this.x + Math.cos(pelletAngle) * (this.radius + 4);
      const by = this.y + Math.sin(pelletAngle) * (this.radius + 4);
      projectiles.push(new Projectile(
        bx, by,
        Math.cos(pelletAngle) * CFG.PLAYER_BULLET_SPEED,
        Math.sin(pelletAngle) * CFG.PLAYER_BULLET_SPEED,
        totalDmg,
        weapon.bulletColor,
        false,
        bulletSize
      ));
    }
    Sound.shoot();
  }

  tryShoot(target) {
    const now = performance.now();
    const eff = game.getEffectiveWeaponStats(this.weaponType);
    const effectiveFireRate = this.fireRate / eff.fireRateMult;
    if (now - this.lastShot >= effectiveFireRate) {
      this.shoot(target);
      this.lastShot = now;
    }
  }

  takeDamage(dmg) {
    if (this.iframeTimer > 0 || this.dashing || !this.alive) return;
    if (this.hasShield) { this.shieldActive = 0; spawnParticles(this.x, this.y, 12, '#4fc3f7', 5, 0.5); return; }
    this.hp -= dmg;
    this.iframeTimer = CFG.IFRAME_DURATION;
    spawnParticles(this.x, this.y, 6, '#ff5252', 3, 0.3);
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  }

  heal(amt) { this.hp = Math.min(this.maxHp, this.hp + amt); }

  draw(ctx) {
    if (!this.alive) return;
    const blink = this.iframeTimer > 0 && Math.floor(this.iframeTimer / 60) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Shield glow
    if (this.hasShield) {
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Dash trail
    if (this.dashing) {
      ctx.fillStyle = 'rgba(79,195,247,0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body - use selected skin
    const skin = game.getCurrentSkin();
    ctx.fillStyle = skin.color;
    ctx.strokeStyle = skin.outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gun barrel
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(Math.cos(this.facingAngle) * this.radius * 0.4, Math.sin(this.facingAngle) * this.radius * 0.4);
    ctx.lineTo(Math.cos(this.facingAngle) * (this.radius + 12), Math.sin(this.facingAngle) * (this.radius + 12));
    ctx.stroke();
    ctx.lineWidth = 1;

    // Inner dot
    ctx.fillStyle = skin.outline;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- Game State ---
const game = {
  player: new Player(),
  wave: 0,
  score: 0,
  starsEarned: 0,   // in-run stars (reset each game)
  gems: 0,
  kills: 0,
  state: 'menu', // menu, playing, paused, dead
  waveTransition: false,
  waveTimer: 0,
  waveCountdown: 0,
  waveCountdownAction: null, // 'startNextWave' | 'spawnWave'
  enemiesRemaining: 0,
  totalEnemiesThisWave: 0,
  reviveUsed: false,
  adWatched: false,

  // Screen shake
  shakeX: 0, shakeY: 0, shakeIntensity: 0,

  // Combo
  comboCount: 0, comboTimer: 0, maxCombo: 0,

  // Upgrades (persistent)
  upgrades: {},

  // Skins
  skins: [],
  equippedSkin: 'default',

  // Stats
  highScore: 0,
  coins: 0,
  totalKills: 0,
  scoreHistory: [],      // [{score, wave, kills, date}] top records
  achievements: [],      // unlocked achievement IDs
  highestWave: 0,        // personal best wave

  // Daily
  dailyStreak: 0,
  lastDailyClaim: '',
  dailyTarget: 0,        // daily challenge score target
  dailyTargetClaimed: false,

  // Revive tokens
  reviveTokens: 0,

  // Persistent weapon system
  ownedWeapons: {},      // { pistol: {owned:true,level:1}, shotgun: {owned:false,level:1}, ... }
  weaponUpgrades: {},    // per-weapon sub-stat levels
  autoFireOwned: false,  // persistent auto-fire
  equippedWeapon: 'pistol', // which weapon to start next run with
  activePauseTab: 'weapons',
  autoFire: false,       // runtime auto-fire state (loaded from autoFireOwned each run)

  init() {
    // Load saved data
    this.upgrades = Storage.get('upgrades', {
      maxHp: 0, speed: 0, damage: 0, fireRate: 0, coinGain: 0
    });
    this.equippedSkin = Storage.get('equippedSkin', 'default');
    this.highScore = Storage.get('highScore', 0);
    this.coins = Storage.get('coins', 0);
    this.totalKills = Storage.get('totalKills', 0);
    this.gems = Storage.get('gems', 0);
    this.dailyStreak = Storage.get('dailyStreak', 0);
    this.lastDailyClaim = Storage.get('lastDailyClaim', '');
    this.reviveTokens = Storage.get('reviveTokens', 0);
    this._pendingStarBonus = Storage.get('pendingStarBonus', 0);

    // --- Migration: old totalCoins -> stars ---
    if (Storage.get('totalCoins', null) !== null && Storage.get('coins', null) === null) {
      this.coins = Storage.get('totalCoins', 0);
      Storage.set('coins', this.coins);
      // We keep the old key for safety, but won't read it again
      this.showToast('⭐ 经济系统已升级！金币已转换为星星');
    }

    // --- Load persistent weapon system ---
    this.ownedWeapons = Storage.get('ownedWeapons', {
      pistol:  { owned: true,  level: 1 },
      shotgun: { owned: false, level: 1 },
      smg:     { owned: false, level: 1 },
      sniper:  { owned: false, level: 1 },
    });
    this.weaponUpgrades = Storage.get('weaponUpgrades', {
      pistol:  { damageLvl: 0, fireRateLvl: 0, ammoLvl: 0 },
      shotgun: { damageLvl: 0, fireRateLvl: 0, spreadLvl: 0 },
      smg:     { damageLvl: 0, fireRateLvl: 0, accuracyLvl: 0 },
      sniper:  { damageLvl: 0, fireRateLvl: 0, pierceLvl: 0 },
    });
    this.autoFireOwned = Storage.get('autoFireOwned', false);
    this.equippedWeapon = Storage.get('equippedWeapon', 'pistol');

    // Leaderboard & achievements
    this.scoreHistory = Storage.get('scoreHistory', []);
    this.achievements = Storage.get('achievements', []);
    this.highestWave = Storage.get('highestWave', 0);
    this._maxComboEver = Storage.get('maxComboEver', 0);
    this.dailyTarget = Storage.get('dailyTarget', 0);
    this.dailyTargetClaimed = Storage.get('dailyTargetClaimed', false);
    this._dailyTargetDate = Storage.get('dailyTargetDate', '');
    this.generateDailyTarget();

    this.skins = Storage.get('skins', [
      { id: 'default', name: '默认战士', color: '#3498db', outline: '#2980b9', owned: true, price: 0 },
      { id: 'flame', name: '烈焰使者', color: '#e74c3c', outline: '#c0392b', owned: false, price: 50 },
      { id: 'shadow', name: '暗影刺客', color: '#2c3e50', outline: '#1a252f', owned: false, price: 50 },
      { id: 'gold', name: '黄金骑士', color: '#f1c40f', outline: '#d4a017', owned: false, price: 100 },
      { id: 'neon', name: '霓虹战士', color: '#00ff88', outline: '#00cc6a', owned: false, price: 75 },
      { id: 'void', name: '虚空领主', color: '#8e44ad', outline: '#6c3483', owned: false, price: 150 },
    ]);

    // Check referral
    this.checkReferral();

    // Check daily reset
    this.checkDailyReset();

    // Apply upgrades
    this.applyUpgrades();

    // Init canvas
    // Register game instance for AdManager
    window._gameInstance = this;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Init sound on first interaction
    document.addEventListener('click', () => Sound.init(), { once: true });
    document.addEventListener('keydown', () => Sound.init(), { once: true });

    // Setup UI
    this.setupUI();
    this.initLoginScreen();

    // Check session: logged in → main menu, otherwise → login screen
    const currentUser = Auth.getCurrentUser();
    if (currentUser) {
      const display = currentUser.phone || currentUser.email;
      document.getElementById('menu-user-display').textContent = '👤 ' + display;
      document.getElementById('btn-logout').style.display = 'inline-block';
      this.showScreen('main-menu');
    } else {
      this.showScreen('login-screen');
    }

    // Start render loop (always running for BG effects)
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },

  resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Keep player in bounds
    if (this.player.x === 0 && this.player.y === 0) {
      this.player.x = canvas.width / 2;
      this.player.y = canvas.height / 2;
    }
  },

  applyUpgrades() {
    const u = this.upgrades;
    this.player.maxHp = CFG.PLAYER_MAX_HP + u.maxHp * 10;
    this.player.speed = CFG.PLAYER_SPEED * (1 + u.speed * 0.06);
    this.player.baseDamage = CFG.PLAYER_DAMAGE * (1 + u.damage * 0.1);
    this.player.fireRate = CFG.PLAYER_FIRE_RATE / (1 + u.fireRate * 0.08);
  },

  getCurrentSkin() {
    return this.skins.find(s => s.id === this.equippedSkin) || this.skins[0];
  },

  startGame() {
    this.player.reset();
    this.applyUpgrades();
    this.player.x = canvas.width / 2;
    this.player.y = canvas.height / 2;
    projectiles = [];
    enemies = [];
    particles = [];
    powerups = [];
    starsArr = [];
    this.wave = 0;
    this.score = 0;
    // Apply pending star bonus from shop purchases
    this._pendingStarBonus = Storage.get('pendingStarBonus', 0);
    this.starsEarned = this._pendingStarBonus;
    this._pendingStarBonus = 0;
    Storage.set('pendingStarBonus', 0);
    this.kills = 0;
    this.state = 'playing';
    this.reviveUsed = false;
    this.adWatched = false;
    this.activePauseTab = 'weapons';
    // Load persistent equipment
    this.autoFire = this.autoFireOwned;
    // Equip the selected weapon (must be owned, fallback to pistol)
    if (this.ownedWeapons[this.equippedWeapon]?.owned) {
      this.player.weaponType = this.equippedWeapon;
    } else {
      this.player.weaponType = 'pistol';
      this.equippedWeapon = 'pistol';
    }
    this.waveCountdown = 0;
    this.waveCountdownAction = null;
    this.waveTransition = false;
    this.shakeIntensity = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.startNextWave();
    this.showScreen('game-screen');
    Sound.init();
  },

  startNextWave() {
    this.wave++;
    this.waveTransition = true;
    this.waveTimer = CFG.WAVE_DELAY;

    // Show wave announce
    const isBossWave = this.wave % 5 === 0;
    const announce = document.getElementById('wave-announce');
    if (isBossWave) {
      announce.textContent = `⚠️ 第 ${this.wave} 波 - BOSS来袭！`;
      announce.style.color = '#ff1744';
    } else {
      announce.textContent = `第 ${this.wave} 波`;
      announce.style.color = '#fff';
    }
    announce.classList.remove('hidden');
    announce.style.animation = 'none';
    announce.offsetHeight;
    announce.style.animation = 'waveAnnounce 1.5s ease forwards';

    // Start countdown to spawn enemies (pauses when game is paused)
    this.waveCountdown = CFG.WAVE_DELAY;
    this.waveCountdownAction = 'spawnWave';

    this.updateHUD();
  },

  spawnWave(waveNum) {
    const isBossWave = waveNum % 5 === 0;
    enemies = []; // Clear any remaining (shouldn't be any)

    if (isBossWave) {
      // Boss + escorts
      this.spawnEnemy('boss', waveNum);
      const escortCount = 3 + Math.floor(waveNum / 5);
      for (let i = 0; i < escortCount; i++) {
        this.spawnEnemy('tank', waveNum);
      }
      for (let i = 0; i < escortCount * 2; i++) {
        this.spawnEnemy('grunt', waveNum);
      }
      for (let i = 0; i < escortCount; i++) {
        this.spawnEnemy('shooter', waveNum);
      }
    } else {
      // Normal wave scaling
      const gruntCount = 4 + waveNum * 3;
      const runnerCount = Math.max(0, Math.floor(waveNum * 1.5) - 1);
      const tankCount = Math.max(0, Math.floor(waveNum / 3));
      const shooterCount = Math.max(0, Math.floor((waveNum - 2) / 2));

      for (let i = 0; i < gruntCount; i++) this.spawnEnemy('grunt', waveNum);
      for (let i = 0; i < runnerCount; i++) this.spawnEnemy('runner', waveNum);
      for (let i = 0; i < tankCount; i++) this.spawnEnemy('tank', waveNum);
      for (let i = 0; i < shooterCount; i++) this.spawnEnemy('shooter', waveNum);
    }

    this.totalEnemiesThisWave = enemies.length;
    this.enemiesRemaining = this.totalEnemiesThisWave;
  },

  spawnEnemy(typeKey, waveNum) {
    const margin = CFG.ENEMY_SPAWN_MARGIN;
    let x, y;
    const side = randInt(0, 3);
    switch (side) {
      case 0: x = rand(-margin, canvas.width + margin); y = -margin; break; // top
      case 1: x = rand(-margin, canvas.width + margin); y = canvas.height + margin; break; // bottom
      case 2: x = -margin; y = rand(-margin, canvas.height + margin); break; // left
      case 3: x = canvas.width + margin; y = rand(-margin, canvas.height + margin); break; // right
    }
    enemies.push(new Enemy(typeKey, x, y, waveNum));
  },

  killEnemy(enemy, idx) {
    this.score += enemy.score;
    this.kills++;
    this.enemiesRemaining--;

    // Combo
    this.comboCount++;
    this.comboTimer = 2000;
    if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
    const comboBonus = Math.floor(this.comboCount / 5);
    if (comboBonus > 0) {
      this.score += comboBonus;
      this.starsEarned += comboBonus;
    }

    Sound.kill();
    spawnParticles(enemy.x, enemy.y, 10, enemy.color, 5, 0.5);

    // Screen shake for bigger enemies
    if (enemy.typeKey === 'boss' || enemy.typeKey === 'tank') {
      this.shakeIntensity = Math.max(this.shakeIntensity, enemy.typeKey === 'boss' ? 12 : 5);
    }

    // Show damage number
    const comboText = comboBonus > 0 ? ` x${this.comboCount} combo!` : '';
    this.showFloatingText(enemy.x, enemy.y, `+${enemy.score}${comboText}`, '#ffd700');

    // Drop star
    if (rng() < CFG.STAR_DROP_CHANCE) {
      const starVal = enemy.typeKey === 'boss' ? 15 : 1;
      starsArr.push(new Star(enemy.x, enemy.y, starVal));
    }

    // Drop power-up
    const dropChance = enemy.typeKey === 'boss' ? 1.0 : CFG.POWERUP_DROP_CHANCE;
    if (rng() < dropChance) {
      let type = POWERUP_TYPES[randInt(0, POWERUP_TYPES.length - 1)];
      // Reroll rare ones
      if (type.rare && rng() > 0.15) type = POWERUP_TYPES[randInt(0, POWERUP_TYPES.length - 2)];
      powerups.push(new PowerUp(enemy.x, enemy.y, type));
    }

    enemies.splice(idx, 1);

    // Check wave complete
    if (this.enemiesRemaining <= 0 && this.state === 'playing') {
      Sound.waveClear();
      this.showFloatingText(canvas.width/2, canvas.height/2, `第 ${this.wave} 波 完成！`, '#00e676', 28);
      // Bonus stars for wave clear
      const bonus = this.wave * 8;
      this.starsEarned += bonus;
      this.score += bonus;
      starsArr.push(new Star(canvas.width/2, canvas.height/2 - 40, bonus));

      // Start countdown to next wave (pauses when game is paused)
      this.waveCountdown = 2000;
      this.waveCountdownAction = 'startNextWave';
    }

    this.updateHUD();
  },

  showFloatingText(x, y, text, color, size = 16) {
    const container = document.getElementById('damage-numbers');
    const el = document.createElement('div');
    el.className = 'dmg-num';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    if (size !== 16) el.style.fontSize = size + 'px';
    container.appendChild(el);
    setTimeout(() => el.remove(), 800);
  },

  collectPowerUp(pu) {
    const p = this.player;
    pu.type.effect(p, this);
    Sound.powerup();
    spawnParticles(pu.x, pu.y, 10, pu.type.color, 4, 0.4);
    this.showToast(pu.type.text);
  },

  revive() {
    // Enforce MAX_REVIVES_PER_RUN — one revive per game session
    if (this.reviveUsed) {
      this.showToast('⚠️ 本局已复活过一次，无法再次复活');
      return;
    }
    this.player.alive = true;
    this.player.hp = this.player.maxHp;
    this.player.iframeTimer = 1500;
    this.player.x = canvas.width / 2;
    this.player.y = canvas.height / 2;
    this.state = 'playing';
    this.reviveUsed = true;
    Sound.revive();
    spawnParticles(this.player.x, this.player.y, 20, '#16c79a', 8, 1);
    this.showScreen('game-screen');
    this.updateHUD();
  },

  endRun() {
    this.state = 'menu';
    // Stars already in persistent balance (no conversion needed)
    this.totalKills += this.kills;
    if (this.score > this.highScore) this.highScore = this.score;
    Storage.set('coins', this.coins);
    Storage.set('totalKills', this.totalKills);
    Storage.set('highScore', this.highScore);
    Storage.set('gems', this.gems);
    Storage.set('reviveTokens', this.reviveTokens);

    // Record score + check achievements + daily target
    this.addScoreRecord();
    const targetReward = this.claimDailyTarget();
    if (targetReward) {
      this.showToast(`🎯 每日挑战达成！获得 ${targetReward.coins}🪙 + ${targetReward.gems}💎`);
    }

    this.showScreen('main-menu');
    this.updateMenuStats();
  },

  // --- Referral System ---
  async checkReferral() {
    const params = new URLSearchParams(window.location.search);
    const refId = params.get('ref');
    if (refId && refId !== Storage.getPlayerId()) {
      // Check if already claimed (local + server dedup)
      const claimedRefs = Storage.get('claimedRefs', []);
      if (!claimedRefs.includes(refId)) {
        // Give bonus to new player
        this.coins = Storage.get('coins', 0) + 50;
        Storage.set('coins', this.coins);
        this.showToast('🎉 通过好友链接加入！获得 50 金币奖励！');

        // Mark as claimed locally (prevents duplicate claims)
        claimedRefs.push(refId);
        Storage.set('claimedRefs', claimedRefs);

        // ✅ Write to Supabase so Player A can verify on THEIR device
        try {
          await SupabaseDB.addRevive(Storage.getPlayerId(), refId);
          console.log('[Referral] ✅ Revive token sent to Supabase for player:', refId);
        } catch (err) {
          console.warn('[Referral] Supabase unreachable, using localStorage fallback:', err.message);
          const pendingRevives = Storage.get('pendingRevives', []);
          pendingRevives.push({ from: Storage.getPlayerId(), to: refId, time: Date.now() });
          Storage.set('pendingRevives', pendingRevives);
        }
      }
    }
  },

  generateShareLink() {
    const id = Storage.getPlayerId();
    const url = new URL(window.location.href);
    url.searchParams.set('ref', id);
    return url.toString();
  },

  // --- Daily Rewards ---
  checkDailyReset() {
    const today = new Date().toDateString();
    if (this.lastDailyClaim !== today) {
      // New day
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (this.lastDailyClaim === yesterday) {
        this.dailyStreak = Math.min(this.dailyStreak + 1, 6);
      } else if (this.lastDailyClaim !== today) {
        this.dailyStreak = 0;
      }
      Storage.set('dailyStreak', this.dailyStreak);
    }
  },

  getDailyReward() {
    const rewards = [
      { coinAmount: 50 },
      { coinAmount: 100 },
      { coinAmount: 150, gems: 1 },
      { coinAmount: 200 },
      { coinAmount: 250, gems: 2 },
      { coinAmount: 300 },
      { coinAmount: 500, gems: 5, reviveToken: 1 },
    ];
    return rewards[this.dailyStreak];
  },

  claimDaily() {
    const today = new Date().toDateString();
    if (this.lastDailyClaim === today) return null;
    const reward = this.getDailyReward();
    if (reward.coinAmount) this.coins += reward.coinAmount;
    if (reward.gems) this.gems += reward.gems;
    if (reward.reviveToken) this.reviveTokens += reward.reviveToken;
    this.lastDailyClaim = today;
    Storage.set('coins', this.coins);
    Storage.set('gems', this.gems);
    Storage.set('reviveTokens', this.reviveTokens);
    Storage.set('lastDailyClaim', this.lastDailyClaim);
    Storage.set('dailyStreak', this.dailyStreak);
    return reward;
  },

  // --- UI ---
  setupUI() {
    // Menu buttons
    document.getElementById('btn-play').addEventListener('click', () => this.startGame());
    document.getElementById('btn-shop-menu').addEventListener('click', () => this.showShop());
    document.getElementById('btn-daily').addEventListener('click', () => this.showDaily());
    document.getElementById('btn-skins').addEventListener('click', () => this.showSkins());
    document.getElementById('btn-leaderboard').addEventListener('click', () => this.showLeaderboard());

    // Click star/gem displays to open shop
    document.getElementById('menu-coins').style.cursor = 'pointer';
    document.getElementById('menu-coins').addEventListener('click', () => this.showShop());
    document.getElementById('menu-gems').style.cursor = 'pointer';
    document.getElementById('menu-gems').addEventListener('click', () => this.showShop());
    document.getElementById('star-display-hud').style.cursor = 'pointer';
    document.getElementById('star-display-hud').addEventListener('click', () => {
      if (this.state === 'playing') {
        this.activePauseTab = 'items';
        this.pause();
      }
    });
    document.getElementById('gem-display-hud').style.cursor = 'pointer';
    document.getElementById('gem-display-hud').addEventListener('click', () => {
      if (this.state === 'playing') {
        this.activePauseTab = 'weapons';
        this.pause();
      }
    });

    // Pause - ESC or P
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
      }
    });

    // Pause screen
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.querySelectorAll('.pause-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchPauseTab(tab.dataset.pauseTab));
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
      this.state = 'menu';
      // Stars already in persistent balance
      this.totalKills += this.kills;
      if (this.score > this.highScore) this.highScore = this.score;
      Storage.set('coins', this.coins);
      Storage.set('totalKills', this.totalKills);
      Storage.set('highScore', this.highScore);
      Storage.set('gems', this.gems);
      this.addScoreRecord();
      this.showScreen('main-menu');
      this.updateMenuStats();
    });

    // Death screen buttons
    document.getElementById('btn-revive-ad').addEventListener('click', () => this.watchAd());
    document.getElementById('btn-revive-token').addEventListener('click', () => {
      if (this.reviveTokens > 0) {
        this.reviveTokens--;
        Storage.set('reviveTokens', this.reviveTokens);
        this.revive();
      }
    });
    document.getElementById('btn-revive-friend').addEventListener('click', () => this.showFriendModal());
    document.getElementById('btn-revive-gems').addEventListener('click', () => {
      if (this.gems >= 5) {
        this.gems -= 5;
        Storage.set('gems', this.gems);
        this.revive();
      } else {
        this.showToast('💎 钻石不足！需要 5 钻石');
      }
    });
    document.getElementById('btn-death-quit').addEventListener('click', () => this.endRun());

    // Friend modal - Two-step verification flow
    document.getElementById('btn-copy-link').addEventListener('click', () => {
      const link = this.generateShareLink();
      document.getElementById('share-link').value = link;
      navigator.clipboard.writeText(link).then(() => {
        this.markShareCompleted('copy');
        this.showToast('📋 链接已复制！分享给好友吧');
      }).catch(() => {
        // Fallback for non-HTTPS or permission denied
        document.getElementById('share-link').select();
        this.markShareCompleted('copy');
        this.showToast('📋 请手动复制链接分享给好友');
      });
    });

    // WeChat share button
    document.getElementById('btn-share-wechat').addEventListener('click', () => {
      const link = this.generateShareLink();
      document.getElementById('share-link').value = link;
      this.markShareCompleted('wechat');
      // Trigger WeChat share or show copy instructions
      navigator.clipboard.writeText(link).then(() => {
        this.showToast('💬 链接已复制！请打开微信发送给好友');
      }).catch(() => {
        document.getElementById('share-link').select();
        this.showToast('💬 请复制链接并打开微信发送给好友');
      });
    });

    // QQ share button
    document.getElementById('btn-share-qq').addEventListener('click', () => {
      const link = this.generateShareLink();
      document.getElementById('share-link').value = link;
      this.markShareCompleted('qq');
      navigator.clipboard.writeText(link).then(() => {
        this.showToast('🐧 链接已复制！请打开QQ发送给好友');
      }).catch(() => {
        document.getElementById('share-link').select();
        this.showToast('🐧 请复制链接并打开QQ发送给好友');
      });
    });

    // Next step button
    document.getElementById('btn-next-step').addEventListener('click', () => {
      this.goToVerifyStep();
    });

    // Previous step button
    document.getElementById('btn-prev-step').addEventListener('click', () => {
      this.goToShareStep();
    });

    // Verify share button
    document.getElementById('btn-verify-share').addEventListener('click', () => {
      this.verifyShareRevive();
    });

    // Revive success button
    document.getElementById('btn-revive-success').addEventListener('click', () => {
      this.confirmReviveFromShare();
    });

    // Back button returns to death screen
    document.getElementById('btn-friend-back').addEventListener('click', () => {
      this.resetFriendModal();
      this.showScreen('death-screen');
    });

    // Shop back
    document.getElementById('btn-shop-back').addEventListener('click', () => {
      this.showScreen('main-menu');
      this.updateMenuStats();
    });
    document.getElementById('btn-daily-back').addEventListener('click', () => {
      this.showScreen('main-menu');
      this.updateMenuStats();
    });
    document.getElementById('btn-skins-back').addEventListener('click', () => {
      this.showScreen('main-menu');
      this.updateMenuStats();
    });
    document.getElementById('btn-leaderboard-back').addEventListener('click', () => {
      this.showScreen('main-menu');
      this.updateMenuStats();
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
      Auth.logout();
      document.getElementById('menu-user-display').textContent = '';
      document.getElementById('btn-logout').style.display = 'none';
      this.showScreen('login-screen');
    });

    this.updateMenuStats();
  },

  // --- Login System UI ---
  initLoginScreen() {
    const self = this;
    let currentTab = 'login';
    let currentType = 'phone';

    const loginScreen = document.getElementById('login-screen');
    const loginTabs = loginScreen.querySelectorAll('.login-tab');
    const typeBtns = loginScreen.querySelectorAll('.type-btn');
    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');
    const confirmGroup = document.getElementById('confirm-group');
    const confirmInput = document.getElementById('login-confirm');
    const codeGroup = document.getElementById('code-group');
    const codeInput = document.getElementById('login-code');
    const sendCodeBtn = document.getElementById('btn-send-code');
    const submitBtn = document.getElementById('btn-login-submit');
    const formFooter = document.getElementById('form-footer');
    const identifierHint = document.getElementById('identifier-hint');

    const switchTab = (tab) => {
      currentTab = tab;
      loginTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      submitBtn.textContent = tab === 'login' ? '登录' : '注册';
      confirmGroup.style.display = tab === 'register' ? 'block' : 'none';
      codeGroup.style.display = (tab === 'login' && currentType === 'phone') ? 'block' : 'none';
      formFooter.innerHTML = tab === 'login'
        ? '还没有账号？<span class="link" data-tab="register">立即注册</span>'
        : '已有账号？<span class="link" data-tab="login">立即登录</span>';
      self._clearStatus();
    };

    // Footer link delegation (single listener, no duplicates)
    formFooter.addEventListener('click', (e) => {
      if (e.target.classList.contains('link')) {
        switchTab(e.target.dataset.tab);
      }
    });

    loginTabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Input type toggle
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        currentType = btn.dataset.type;
        typeBtns.forEach(b => b.classList.toggle('active', b === btn));
        if (currentType === 'phone') {
          identifierInput.placeholder = '请输入手机号';
          identifierInput.maxLength = 11;
          identifierHint.textContent = '';
          codeGroup.style.display = currentTab === 'login' ? 'block' : 'none';
          passwordInput.placeholder = currentTab === 'login' ? '请输入密码或使用验证码登录' : '请输入密码';
        } else {
          identifierInput.placeholder = '请输入邮箱地址';
          identifierInput.maxLength = 50;
          identifierHint.textContent = '';
          codeGroup.style.display = 'none';
          passwordInput.placeholder = '请输入密码';
        }
        self._clearStatus();
      });
    });

    // Send verification code
    sendCodeBtn.addEventListener('click', async () => {
      const phone = identifierInput.value.trim();
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        self._showStatus('error', '请输入正确的手机号');
        return;
      }
      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = '发送中...';
      const result = await Auth.sendCode(phone);
      if (result.success) {
        self._showStatus('success', '验证码已发送至 ' + phone + '（模拟：' + result.code + '）');
        let countdown = 60;
        const timer = setInterval(() => {
          countdown--;
          sendCodeBtn.textContent = countdown + 's 后重发';
          if (countdown <= 0) {
            clearInterval(timer);
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = '获取验证码';
          }
        }, 1000);
      } else {
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '获取验证码';
        self._showStatus('error', '发送失败，请重试');
      }
    });

    // Submit
    submitBtn.addEventListener('click', () => self._handleLoginSubmit(currentTab, currentType));
    identifierInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') passwordInput.focus(); });
    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') self._handleLoginSubmit(currentTab, currentType); });
    confirmInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') self._handleLoginSubmit(currentTab, currentType); });
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') self._handleLoginSubmit(currentTab, currentType); });
  },

  _showStatus(type, msg) {
    const el = document.getElementById('form-status');
    el.className = 'form-status ' + type;
    el.textContent = msg;
    el.classList.remove('hidden');
  },

  _clearStatus() {
    const el = document.getElementById('form-status');
    el.classList.add('hidden');
    el.textContent = '';
  },

  async _handleLoginSubmit(tab, type) {
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    const code = document.getElementById('login-code').value.trim();

    // Validate identifier
    const valId = Auth.validateIdentifier(identifier);
    if (!valId.ok) { this._showStatus('error', valId.error); return; }

    // If phone login with code
    if (tab === 'login' && type === 'phone' && code.length === 6) {
      this._showStatus('success', '验证中...');
      const result = await Auth.loginWithCode(identifier, code);
      if (result.success) {
        this._showStatus('success', '登录成功！');
        setTimeout(() => this._onLoginSuccess(result.user), 500);
      } else {
        this._showStatus('error', result.error);
      }
      return;
    }

    // Validate password
    if (!password) { this._showStatus('error', '请输入密码'); return; }

    if (tab === 'register') {
      const confirm = document.getElementById('login-confirm').value;
      if (password.length < 6) { this._showStatus('error', '密码至少6位'); return; }
      if (password !== confirm) { this._showStatus('error', '两次密码输入不一致'); return; }

      this._showStatus('success', '正在注册...');
      // Check permission first
      const perm = await Auth.checkPermission(identifier);
      if (!perm.allowed) { this._showStatus('error', perm.reason); return; }

      const result = await Auth.register(identifier, password);
      if (result.success) {
        this._showStatus('success', '注册成功！');
        setTimeout(() => this._onLoginSuccess(result.user), 500);
      } else {
        this._showStatus('error', result.error);
      }
    } else {
      // Login
      this._showStatus('success', '正在登录...');
      const perm = await Auth.checkPermission(identifier);
      if (!perm.allowed) { this._showStatus('error', perm.reason); return; }

      const result = await Auth.login(identifier, password);
      if (result.success) {
        this._showStatus('success', '登录成功！');
        setTimeout(() => this._onLoginSuccess(result.user), 500);
      } else {
        this._showStatus('error', result.error);
      }
    }
  },

  _onLoginSuccess(user) {
    const display = user.phone || user.email;
    document.getElementById('menu-user-display').textContent = '👤 ' + display;
    document.getElementById('btn-logout').style.display = 'inline-block';
    this.showScreen('main-menu');
    this.updateMenuStats();
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.remove('hidden');
  },

  pause() {
    this.state = 'paused';
    this.showScreen('pause-screen');
    this.renderPauseContent();
  },

  resume() {
    this.state = 'playing';
    this.showScreen('game-screen');
    this.lastTime = performance.now();
  },

  // --- Ad System (supports simulated / WeChat / Web SDK) ---
  watchAd() {
    AdManager.showRewardedVideo({
      onStart: () => {
        // Ad is now showing (modal already displayed by provider)
      },
      onComplete: () => {
        // User watched the full ad -> give reward
        this.adWatched = true;
        this.revive();
        this.showToast('📺 广告观看完成！已复活');
        document.getElementById('ad-modal').classList.add('hidden');
      },
      onSkip: () => {
        // User closed the ad early -> no reward
        document.getElementById('ad-modal').classList.add('hidden');
        this.showToast('⚠️ 需要观看完整广告才能复活');
      },
      onError: (err) => {
        // Catastrophic ad system failure (not normal no-fill)
        // The MonetagAdProvider handles normal no-fill internally with timer
        console.error('[Ad] 广告系统故障:', err);
        document.getElementById('ad-modal').classList.add('hidden');
        this.showToast('⚠️ 广告暂不可用，请稍后重试');
        // DO NOT auto-revive — preserves revenue model integrity
      },
    });
  },

  // --- Friend Revive Modal (Two-Step Verification Flow) ---

  showFriendModal() {
    // Reset modal state
    this._shareCompleted = false;
    this._shareMethod = null;
    this._verifyChecked = false;
    this._verificationPollTimer = null;

    // Reset UI
    document.getElementById('share-link').value = this.generateShareLink();
    document.getElementById('share-step-1').classList.remove('hidden');
    document.getElementById('share-step-2').classList.add('hidden');
    document.getElementById('btn-next-step').classList.remove('hidden');
    document.getElementById('btn-next-step').disabled = true;
    document.getElementById('btn-prev-step').classList.add('hidden');
    document.getElementById('btn-verify-share').disabled = false;
    document.getElementById('btn-verify-text').textContent = '🔍 核验分享';
    document.getElementById('btn-verify-share').classList.remove('checking', 'verified');
    document.getElementById('verify-status').classList.remove('checking');
    document.getElementById('verify-status').querySelector('.verify-status-text').textContent = '等待核验中...';
    document.getElementById('verify-icon').textContent = '🔍';
    document.getElementById('verify-result').classList.add('hidden');
    const reviveBtn = document.getElementById('btn-revive-success');
    reviveBtn.disabled = true;
    reviveBtn.textContent = '🔒 请先完成核验';
    document.getElementById('share-status').classList.remove('done');
    document.getElementById('share-status').querySelector('.status-icon').textContent = '⏳';
    document.getElementById('share-status').querySelector('.status-icon').nextSibling.textContent = ' 请完成分享后进入下一步';

    // Reset share action buttons
    document.querySelectorAll('.btn-share-action').forEach(b => b.classList.remove('shared'));
    document.getElementById('btn-copy-link').classList.remove('copied');

    // Reset step indicators
    document.querySelectorAll('.verify-step').forEach(s => {
      s.classList.remove('active', 'done');
    });
    document.querySelector('.verify-step[data-step="1"]').classList.add('active');
    document.querySelectorAll('.step-line').forEach(l => l.classList.remove('done'));

    this.showScreen('friend-modal');
  },

  // Mark a share action as completed
  markShareCompleted(method) {
    this._shareCompleted = true;
    this._shareMethod = method;

    // Update UI feedback
    const statusEl = document.getElementById('share-status');
    statusEl.classList.add('done');
    statusEl.querySelector('.status-icon').textContent = '✅';
    statusEl.querySelector('.status-icon').nextSibling.textContent = ' 分享已完成！可以进入下一步';

    // Highlight the used share method
    document.querySelectorAll('.btn-share-action').forEach(b => {
      if (b.dataset.share === method) b.classList.add('shared');
    });
    if (method === 'copy') {
      document.getElementById('btn-copy-link').classList.add('copied');
    }

    // Enable next step button
    document.getElementById('btn-next-step').disabled = false;

    // Store pending verification (would be server-side in production)
    const pendingVerifications = Storage.get('pendingVerifications', {});
    pendingVerifications[Storage.getPlayerId()] = {
      time: Date.now(),
      method: method,
      linkUsed: false,
    };
    Storage.set('pendingVerifications', pendingVerifications);
  },

  // Navigate to step 2 (verify step)
  goToVerifyStep() {
    if (!this._shareCompleted) {
      this.showToast('⚠️ 请先完成分享');
      return;
    }

    // Update step indicators
    document.querySelector('.verify-step[data-step="1"]').classList.remove('active');
    document.querySelector('.verify-step[data-step="1"]').classList.add('done');
    document.querySelector('.verify-step[data-step="2"]').classList.add('active');
    document.querySelectorAll('.step-line')[0].classList.add('done');

    // Switch content
    document.getElementById('share-step-1').classList.add('hidden');
    document.getElementById('share-step-2').classList.remove('hidden');
    document.getElementById('btn-next-step').classList.add('hidden');
    document.getElementById('btn-prev-step').classList.remove('hidden');
  },

  // Navigate back to step 1
  goToShareStep() {
    // Update step indicators
    document.querySelector('.verify-step[data-step="2"]').classList.remove('active');
    document.querySelector('.verify-step[data-step="1"]').classList.add('active');
    document.querySelector('.verify-step[data-step="1"]').classList.remove('done');
    document.querySelectorAll('.step-line')[0].classList.remove('done');

    // Switch content
    document.getElementById('share-step-2').classList.add('hidden');
    document.getElementById('share-step-1').classList.remove('hidden');
    document.getElementById('btn-next-step').classList.remove('hidden');
    document.getElementById('btn-prev-step').classList.add('hidden');
  },

  // Verify if a friend clicked the shared link
  verifyShareRevive() {
    const btnVerify = document.getElementById('btn-verify-share');
    const btnText = document.getElementById('btn-verify-text');
    const verifyStatusEl = document.getElementById('verify-status');
    const verifyIconEl = document.getElementById('verify-icon');
    const verifyResultEl = document.getElementById('verify-result');
    const btnReviveSuccess = document.getElementById('btn-revive-success');

    // Prevent double-click
    if (this._verifyChecked) return;

    // Start checking animation
    btnVerify.disabled = true;
    btnVerify.classList.add('checking');
    btnText.innerHTML = '<span class="verify-spinner"></span> 正在核验...';
    verifyStatusEl.classList.add('checking');
    verifyStatusEl.querySelector('.verify-status-text').textContent = '正在检查好友是否已进入游戏...';
    verifyIconEl.textContent = '🔄';

    // ✅ Real verification via Supabase with polling
    let checkCount = 0;
    const maxChecks = 5;
    const self = this;

    const doCheck = async function() {
      checkCount++;
      const myId = Storage.getPlayerId();
      let foundRevive = null;

      // ✅ Query Supabase for pending revive
      try {
        const data = await SupabaseDB.checkRevives(myId);
        if (data && data.length > 0) {
          foundRevive = data[0];
        }
      } catch (err) {
        console.warn('[Verify] Supabase query failed, trying localStorage:', err.message);
        const pendingRevives = Storage.get('pendingRevives', []);
        foundRevive = pendingRevives.find(function(r) { return r.to === myId; });
      }

      if (foundRevive) {
        // SUCCESS! Friend clicked the link
        self._verifyChecked = true;
        btnVerify.classList.remove('checking');
        btnVerify.classList.add('verified');
        btnVerify.disabled = true;
        btnText.textContent = '✅ 核验通过！';
        verifyStatusEl.classList.remove('checking');
        verifyStatusEl.querySelector('.verify-status-text').textContent = '🎉 检测到好友已通过你的链接进入游戏！';
        verifyIconEl.textContent = '✅';
        verifyResultEl.classList.remove('hidden', 'fail');
        verifyResultEl.classList.add('success');
        verifyResultEl.querySelector('.verify-result-icon').textContent = '🎊';
        verifyResultEl.querySelector('.verify-result-text').textContent = '核验成功！好友已确认，现在可以复活了！';
        btnReviveSuccess.disabled = false;
        btnReviveSuccess.textContent = '🎉 确认复活！';

        // Mark step 2 as done
        document.querySelector('.verify-step[data-step="2"]').classList.add('done');
        document.querySelector('.verify-step[data-step="2"]').classList.remove('active');

        // Clean up localStorage fallback records (always, regardless of Supabase)
        const pendingRevives = Storage.get('pendingRevives', []);
        const remaining = pendingRevives.filter(function(r) { return r.to !== myId; });
        if (remaining.length !== pendingRevives.length) {
          Storage.set('pendingRevives', remaining);
        }

        // Remove the used pending revive from Supabase
        try {
          await SupabaseDB.deleteRevives(myId);
        } catch (e) {
          console.warn('[Verify] Supabase delete failed:', e.message);
        }

        Sound.powerup();
      } else if (checkCount < maxChecks) {
        // Retry with delay (real server polling)
        verifyStatusEl.querySelector('.verify-status-text').textContent =
          '正在核验中... (' + checkCount + '/' + maxChecks + ')';
        self._verificationPollTimer = setTimeout(doCheck, 1200);
      } else {
        // All checks failed
        btnVerify.disabled = false;
        btnVerify.classList.remove('checking');
        btnText.textContent = '🔄 重新核验';
        verifyStatusEl.classList.remove('checking');
        verifyStatusEl.querySelector('.verify-status-text').textContent =
          '⚠️ 暂未检测到好友进入，请确认好友已点击链接';
        verifyIconEl.textContent = '⚠️';
        verifyResultEl.classList.remove('hidden', 'success');
        verifyResultEl.classList.add('fail');
        verifyResultEl.querySelector('.verify-result-icon').textContent = '⏳';
        verifyResultEl.querySelector('.verify-result-text').textContent =
          '未检测到好友点击。请让好友通过链接进入游戏后再试，或重新分享链接。';
        btnReviveSuccess.disabled = true;
        btnReviveSuccess.textContent = '🔒 请先完成核验';

        // Allow retry
        self._verifyChecked = false;

        // Offer to go back to share step
        setTimeout(function() {
          if (!self._verifyChecked) {
            verifyStatusEl.querySelector('.verify-status-text').textContent =
              '💡 提示：可以返回上一步重新分享链接';
          }
        }, 1500);
      }
    };

    // Start first check after short delay
    setTimeout(doCheck, 600);
  },

  // Confirm revive from share verification
  confirmReviveFromShare() {
    // Guard: must pass verification first
    if (!this._verifyChecked) {
      this.showToast('⚠️ 请先完成核验');
      return;
    }

    // Clear polling timer if active
    if (this._verificationPollTimer) {
      clearTimeout(this._verificationPollTimer);
      this._verificationPollTimer = null;
    }

    // Award bonus rewards for share revive
    this.coins += 50;
    this.gems += 5;
    Storage.set('coins', this.coins);
    Storage.set('gems', this.gems);
    this.showToast('🎉 好友助力复活成功！获得 +50金币 +5钻石 奖励！');

    // Reset modal state
    this.resetFriendModal();

    // Revive the player
    this.revive();

    // Extended 3-second invincibility shield for share revive
    this.player.iframeTimer = 3000; // 3 seconds in ms
  },

  // Reset friend modal state
  resetFriendModal() {
    if (this._verificationPollTimer) {
      clearTimeout(this._verificationPollTimer);
      this._verificationPollTimer = null;
    }
    this._shareCompleted = false;
    this._shareMethod = null;
    this._verifyChecked = false;
  },

  // --- Pause Menu ---
  renderPauseContent() {
    document.getElementById('pause-stars').textContent = this.starsEarned;
    document.getElementById('pause-coins').textContent = this.coins;
    document.getElementById('pause-gems').textContent = this.gems;

    document.querySelectorAll('.pause-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.pauseTab === this.activePauseTab);
    });

    const container = document.getElementById('pause-tab-content');
    switch (this.activePauseTab) {
      case 'weapons': container.innerHTML = this._renderWeaponsTab(); this._bindWeaponEvents(); break;
      case 'items':   container.innerHTML = this._renderItemsTab();   this._bindItemEvents();   break;
      case 'upgrades':container.innerHTML = this._renderUpgradesTab(); this._bindUpgradeEvents();break;
    }
  },

  switchPauseTab(tab) {
    this.activePauseTab = tab;
    this.renderPauseContent();
  },

  _renderWeaponsTab() {
    const equipped = this.player.weaponType;
    const starsLocal = this.starsEarned;
    const gems = this.gems;
    let html = '';

    // Auto-fire module card (persistent)
    if (this.autoFireOwned) {
      html += `<div class="weapon-card equipped" data-autofire="owned">
        <span class="weapon-icon">🤖</span>
        <div class="weapon-info">
          <div class="weapon-name">自动射击模块 <span class="perm-badge">永久</span></div>
          <div class="weapon-desc">武器自动向鼠标方向射击</div>
          <div class="weapon-stats"><span>持续射击</span></div>
        </div>
        <div class="weapon-status">✅ 已激活</div>
      </div>`;
    } else {
      const canBuyCoins = this.coins >= 400;
      const canBuyGems = gems >= 15;
      html += `<div class="weapon-card" data-autofire="buy">
        <span class="weapon-icon">🤖</span>
        <div class="weapon-info">
          <div class="weapon-name">自动射击模块 <span class="perm-badge">永久</span></div>
          <div class="weapon-desc">武器自动向鼠标方向射击，一次性购买永久使用</div>
          <div class="weapon-stats"><span>持续射击 · 跨局保留</span></div>
        </div>
        <div class="btn-dual-group">
          <button class="btn-buy-sm btn-buy-coin" data-action="buy-autofire-coin"
            ${!canBuyCoins ? 'disabled' : ''}>🪙 400</button>
          <button class="btn-buy-sm btn-buy-gem" data-action="buy-autofire-gem"
            ${!canBuyGems ? 'disabled' : ''}>💎 15</button>
        </div>
      </div>`;
    }

    Object.values(WEAPONS).forEach(w => {
      const ownedData = this.ownedWeapons[w.id];
      const isOwned = ownedData?.owned;
      const isEquipped = equipped === w.id;
      const wLevel = ownedData?.level || 1;
      const canBuyStars = !isOwned && starsLocal >= w.unlockCost && w.unlockCost > 0;
      const canBuyGems = !isOwned && gems >= w.unlockGemCost && w.unlockGemCost > 0;

      html += `<div class="weapon-card ${isEquipped ? 'equipped' : ''}" data-weapon="${w.id}">
        <span class="weapon-icon">${w.icon}</span>
        <div class="weapon-info">
          <div class="weapon-name">${w.name} ${isOwned ? '<span class="lvl-badge">Lv.' + wLevel + '</span>' : ''}</div>
          <div class="weapon-desc">${w.desc} ${isOwned ? '<br/><small>永久拥有 · 跨局保留</small>' : ''}</div>
          <div class="weapon-stats">
            ${w.stats.split('|').map(s => '<span>' + s.trim() + '</span>').join('')}
          </div>
        </div>`;

      if (isEquipped) {
        html += '<div class="weapon-status">✅ 装备中</div>';
      } else if (isOwned) {
        html += `<button class="btn-buy-sm btn-buy-coin" data-action="equip" data-weapon="${w.id}">🔄 装备</button>`;
      } else {
        html += `<div class="btn-dual-group">
          <button class="btn-buy-sm btn-buy-coin" data-action="buy-star" data-weapon="${w.id}"
            ${!canBuyStars ? 'disabled' : ''}>⭐ ${w.unlockCost}</button>
          <button class="btn-buy-sm btn-buy-gem" data-action="buy-gem" data-weapon="${w.id}"
            ${!canBuyGems ? 'disabled' : ''}>💎 ${w.unlockGemCost}</button>
        </div>`;
      }
      html += '</div>';
    });
    return html;
  },

  _bindWeaponEvents() {
    // Auto-fire buy buttons
    document.querySelectorAll('#pause-tab-content button[data-action^="buy-autofire"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'buy-autofire-coin') {
          this.buyAutoFire('coins');
        } else if (action === 'buy-autofire-gem') {
          this.buyAutoFire('gems');
        }
      });
    });

    document.querySelectorAll('#pause-tab-content button[data-weapon]').forEach(btn => {
      btn.addEventListener('click', () => {
        const weaponId = btn.dataset.weapon;
        const action = btn.dataset.action;
        if (action === 'equip') {
          this.equipWeapon(weaponId);
        } else if (action === 'buy-star') {
          this.buyWeapon(weaponId, 'stars');
        } else if (action === 'buy-gem') {
          this.buyWeapon(weaponId, 'gems');
        }
      });
    });
  },

  _renderItemsTab() {
    const starsLocal = this.starsEarned;
    let html = '';

    IN_RUN_POWERUPS.forEach(pu => {
      const canBuy = starsLocal >= pu.cost;
      html += `<div class="powerup-card" data-powerup="${pu.id}">
        <span class="powerup-icon">${pu.icon}</span>
        <div class="powerup-info">
          <div class="powerup-name">${pu.name}</div>
          <div class="powerup-desc">${pu.desc}</div>
        </div>
        <button class="btn-buy-sm btn-buy-coin" data-action="buy-powerup" data-powerup="${pu.id}"
          ${!canBuy ? 'disabled' : ''}>⭐ ${pu.cost}</button>
      </div>`;
    });

    if (!html) html = '<p style="color:var(--text-dim);padding:20px;">暂无可用道具</p>';
    return html;
  },

  _bindItemEvents() {
    document.querySelectorAll('#pause-tab-content button[data-powerup]').forEach(btn => {
      btn.addEventListener('click', () => {
        const powerupId = btn.dataset.powerup;
        this.buyInRunPowerUp(powerupId);
      });
    });
  },

  _renderUpgradesTab() {
    const coinsLocal = this.coins;

    // Character upgrades
    const shopItems = [
      { id: 'maxHp',   name: '最大生命值 +10', desc: '提升生存能力',    icon: '❤️',  cost: 100, level: this.upgrades.maxHp,    maxLevel: 20 },
      { id: 'speed',   name: '移动速度 +6%',   desc: '更灵活地走位',    icon: '👟',  cost: 150, level: this.upgrades.speed,    maxLevel: 15 },
      { id: 'damage',  name: '攻击力 +10%',    desc: '更快消灭敌人',    icon: '⚔️',  cost: 150, level: this.upgrades.damage,   maxLevel: 20 },
      { id: 'fireRate',name: '射速 +8%',       desc: '更高频率射击',    icon: '🎯',  cost: 200, level: this.upgrades.fireRate, maxLevel: 15 },
      { id: 'coinGain',name: '金币加成 +10%',   desc: '获得更多金币',    icon: '🪙',  cost: 100, level: this.upgrades.coinGain, maxLevel: 20 },
    ];

    let html = '<h4 style="margin-bottom:8px;color:var(--accent)">🧑 角色属性</h4>';
    shopItems.forEach(item => {
      const cost = Math.floor(item.cost + item.level * item.cost * 0.5);
      const canBuy = coinsLocal >= cost;
      const atMax = item.level >= item.maxLevel;
      html += `<div class="shop-item">
        <span style="font-size:1.5rem">${item.icon}</span>
        <div class="info">
          <div class="name">${item.name}</div>
          <div class="desc">${item.desc}</div>
          <div class="level">等级 ${item.level}/${item.maxLevel}</div>
        </div>
        <button class="btn-buy-coin" data-shop="${item.id}" data-cost="${cost}"
          ${(!canBuy || atMax) ? 'disabled' : ''}>
          ${atMax ? '已满级' : '🪙 ' + cost}
        </button>
      </div>`;
    });

    // Weapon upgrades section
    const equippedWeaponId = this.player.weaponType;
    const weapon = WEAPONS[equippedWeaponId];
    if (weapon && this.ownedWeapons[equippedWeaponId]?.owned) {
      const wUps = this.weaponUpgrades[equippedWeaponId] || {};
      html += `<h4 style="margin:12px 0 8px;color:var(--gold)">🔫 ${weapon.name} 升级</h4>`;
      weapon.upgradePaths.forEach(path => {
        const currentLvl = wUps[path.id] || 0;
        const atMax = currentLvl >= path.maxLevel;
        const cost = 120 + currentLvl * 60;
        const canBuy = this.starsEarned >= cost;
        html += `<div class="shop-item">
          <span style="font-size:1.3rem">${path.icon}</span>
          <div class="info">
            <div class="name">${path.name} Lv.${currentLvl}/${path.maxLevel}</div>
            <div class="desc">${path.desc}</div>
          </div>
          <button class="btn-buy-coin" data-wpn-upgrade="${equippedWeaponId}" data-stat="${path.id}" data-cost="${cost}"
            ${(!canBuy || atMax) ? 'disabled' : ''}>
            ${atMax ? '已满级' : '⭐ ' + cost}
          </button>
        </div>`;
      });
    }

    return html;
  },

  _bindUpgradeEvents() {
    const container = document.getElementById('pause-tab-content');
    // Character upgrade buttons
    container.querySelectorAll('button[data-shop]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.shop;
        const cost = parseInt(btn.dataset.cost);
        this.buyUpgrade(id, cost, true);
      });
    });
    // Weapon upgrade buttons
    container.querySelectorAll('button[data-wpn-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const weaponId = btn.dataset.wpnUpgrade;
        const statId = btn.dataset.stat;
        this.buyWeaponUpgrade(weaponId, statId);
      });
    });
  },

  // --- Persistent Weapon System ---

  // Compute effective weapon stats from upgrades
  getEffectiveWeaponStats(weaponId) {
    const base = WEAPONS[weaponId];
    if (!base) return { damageMult: 1, fireRateMult: 1, spread: 0, pellets: 1, bulletSize: 3 };
    const ups = this.weaponUpgrades[weaponId] || {};
    const paths = base.upgradePaths || [];

    // Find the special upgrade key for this weapon
    const specialKey = paths.length > 2 ? paths[2].id : null;

    const dmgBonus = 1 + (ups.damageLvl || 0) * (paths[0]?.perLevel || 0.08);
    const frBonus = 1 + (ups.fireRateLvl || 0) * (paths[1]?.perLevel || 0.06);
    let spread = base.spread || 0;
    let pellets = base.pellets || 1;
    let bulletSize = base.bulletSize || 3;

    if (specialKey === 'ammoLvl') {
      pellets = base.pellets + (ups.ammoLvl || 0);
    } else if (specialKey === 'spreadLvl') {
      spread = base.spread * Math.max(0.05, 1 - (ups.spreadLvl || 0) * 0.06);
    } else if (specialKey === 'accuracyLvl') {
      spread = base.spread * Math.max(0.05, 1 - (ups.accuracyLvl || 0) * 0.08);
    } else if (specialKey === 'pierceLvl') {
      bulletSize = base.bulletSize * (1 + (ups.pierceLvl || 0) * 0.15);
    }

    // Compute weapon level from sum of sub-stats
    const totalLvl = (ups.damageLvl || 0) + (ups.fireRateLvl || 0) + (ups[specialKey] || 0);
    const level = Math.min(20, Math.floor(totalLvl / 3) + 1);

    return { damageMult: base.damageMult * dmgBonus, fireRateMult: base.fireRateMult * frBonus, spread, pellets, bulletSize, level };
  },

  // Buy weapon PERSISTENTLY (unlock with stars)
  buyWeapon(weaponId, currency) {
    const weapon = WEAPONS[weaponId];
    if (!weapon || weapon.unlockCost === 0) return;
    if (this.ownedWeapons[weaponId]?.owned) return;

    const cost = currency === 'stars' ? weapon.unlockCost : weapon.unlockGemCost;
    if (currency === 'stars') {
      if (this.starsEarned < cost) { this.showToast('⭐ 星星不足！还需要 ' + (cost - this.starsEarned) + ' ⭐'); return; }
      this.starsEarned -= cost;
    } else {
      if (this.gems < cost) { this.showToast('💎 钻石不足！'); return; }
      this.gems -= cost;
      Storage.set('gems', this.gems);
    }

    this.ownedWeapons[weaponId] = { owned: true, level: 1 };
    Storage.set('ownedWeapons', this.ownedWeapons);
    this.equippedWeapon = weaponId;
    Storage.set('equippedWeapon', weaponId);
    this.player.weaponType = weaponId;
    Sound.powerup();
    this.showToast('🔓 永久解锁 ' + weapon.name + '！');
    this.updateHUD();
    this.renderPauseContent();
  },

  // Buy weapon sub-stat upgrade
  buyWeaponUpgrade(weaponId, statId) {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return;
    const ups = this.weaponUpgrades[weaponId];
    if (!ups) return;

    const currentLvl = ups[statId] || 0;
    const maxLvl = 10;
    if (currentLvl >= maxLvl) { this.showToast('已达到最大等级！'); return; }

    const cost = 120 + currentLvl * 60;
    if (this.starsEarned < cost) { this.showToast('⭐ 星星不足！需要 ' + cost + ' ⭐'); return; }

    this.starsEarned -= cost;
    ups[statId] = currentLvl + 1;
    Storage.set('weaponUpgrades', this.weaponUpgrades);

    // Update weapon level in ownedWeapons
    const totalLvl = (ups.damageLvl || 0) + (ups.fireRateLvl || 0) + (ups[this._getSpecialKey(weaponId)] || 0);
    const level = Math.min(20, Math.floor(totalLvl / 3) + 1);
    if (this.ownedWeapons[weaponId]) {
      this.ownedWeapons[weaponId].level = level;
      Storage.set('ownedWeapons', this.ownedWeapons);
    }

    Sound.powerup();
    this.showToast('⬆️ ' + weapon.name + ' 升级！Lv.' + level);
    this.renderPauseContent();
  },

  _getSpecialKey(weaponId) {
    const paths = WEAPONS[weaponId]?.upgradePaths || [];
    return paths.length > 2 ? paths[2].id : null;
  },

  equipWeapon(weaponId) {
    if (!this.ownedWeapons[weaponId]?.owned) {
      this.showToast('🔒 未解锁的武器！先解锁吧');
      return;
    }
    this.player.weaponType = weaponId;
    this.equippedWeapon = weaponId;
    Storage.set('equippedWeapon', weaponId);
    Sound.powerup();
    this.showToast('✅ 切换到 ' + WEAPONS[weaponId].name);
    this.updateHUD();
    this.renderPauseContent();
  },

  buyAutoFire(currency) {
    if (this.autoFireOwned) return;
    const coinCost = 400;
    const gemCost = 15;
    if (currency === 'coins') {
      if (this.coins < coinCost) { this.showToast('🪙 金币不足！需要 ' + coinCost); return; }
      this.coins -= coinCost;
      Storage.set('coins', this.coins);
    } else {
      if (this.gems < gemCost) { this.showToast('💎 钻石不足！需要 ' + gemCost); return; }
      this.gems -= gemCost;
      Storage.set('gems', this.gems);
    }
    this.autoFireOwned = true;
    this.autoFire = true;
    Storage.set('autoFireOwned', true);
    Sound.powerup();
    this.showToast('🤖 自动射击模块永久解锁！');
    this.updateHUD();
    this.renderPauseContent();
  },

  buyInRunPowerUp(powerupId) {
    const pu = IN_RUN_POWERUPS.find(p => p.id === powerupId);
    if (!pu) return;
    if (this.coins < pu.cost) return;

    this.coins -= pu.cost;
    pu.apply(this.player);
    Sound.powerup();
    spawnParticles(this.player.x, this.player.y, 10, '#ffd700', 4, 0.4);
    this.showToast('✅ ' + pu.desc);
    this.updateHUD();
    this.renderPauseContent();
  },

  showShop() {
    const coinsLocal = this.coins;
    const gems = this.gems;
    document.getElementById('shop-coins').textContent = coinsLocal;
    document.getElementById('shop-gems').textContent = gems;

    // ====== Section 1: IAP - Diamond Top-up ======
    const iapItems = [
      { id:'pack6',  name:'小袋钻石',   desc:'60钻石',             icon:'💎', price:6,   gems:60,   bonus:'' },
      { id:'pack30', name:'中袋钻石',   desc:'300钻石 + 赠30',      icon:'💎', price:30,  gems:330,  bonus:'+30' },
      { id:'pack68', name:'大袋钻石',   desc:'680钻石 + 赠100',     icon:'💎', price:68,  gems:780,  bonus:'+100' },
      { id:'pack128',name:'超值钻石',   desc:'1280钻石 + 赠300',    icon:'👑', price:128, gems:1580, bonus:'+300' },
    ];
    document.getElementById('shop-iap').innerHTML =
      '<h3>💎 钻石充值 <span style="font-size:0.7rem;color:var(--text-dim)">1 = 10</span></h3>' +
      iapItems.map(p => {
        const rate = (p.price / p.gems).toFixed(3);
        return '<div class="shop-item">' +
          '<span style="font-size:1.5rem">' + p.icon + '</span>' +
          '<div class="info">' +
            '<div class="name">' + p.name + (p.bonus ? ' <span style="color:var(--accent);font-size:0.7rem">' + p.bonus + '</span>' : '') + '</div>' +
            '<div class="desc">' + p.desc + ' · ' + rate + '/钻</div>' +
          '</div>' +
          '<button class="btn-buy-gem" id="btn-iap-' + p.id + '">' + p.price + '</button>' +
        '</div>';
      }).join('');

    iapItems.forEach(p => {
      document.getElementById('btn-iap-' + p.id).addEventListener('click', () => {
        if (confirm('模拟购买：' + p.name + ' ' + p.price + '\n\n实际部署接入支付SDK\n点击确定模拟购买成功')) {
          this.gems += p.gems;
          Storage.set('gems', this.gems);
          Sound.powerup();
          this.showToast('支付成功！获得 ' + p.gems + ' 钻石');
          this.showShop();
        }
      });
    });

    // ====== Section 2: Coin Exchange ======
    const coinExchange = [
      { coins:100,  cost:5,  rate:'20/钻' },
      { coins:300,  cost:12, rate:'25/钻' },
      { coins:800,  cost:28, rate:'28.6/钻' },
      { coins:2000, cost:60, rate:'33.3/钻' },
    ];
    document.getElementById('shop-coin-exchange').innerHTML =
      '<h3>🪙 金币兑换 <span style="font-size:0.7rem;color:var(--text-dim)">钻石换金币</span></h3>' +
      coinExchange.map((item, idx) =>
        '<div class="shop-item">' +
          '<span style="font-size:1.5rem">🪙</span>' +
          '<div class="info">' +
            '<div class="name">' + item.coins + ' 金币</div>' +
            '<div class="desc">汇率: ' + item.rate + '</div>' +
          '</div>' +
          '<button class="btn-buy-gem" id="btn-buy-coin-' + idx + '">' + item.cost + '</button>' +
        '</div>'
      ).join('');

    coinExchange.forEach((item, idx) => {
      document.getElementById('btn-buy-coin-' + idx).addEventListener('click', () => {
        if (this.gems >= item.cost) {
          this.gems -= item.cost;
          this.coins += item.coins;
          Storage.set('gems', this.gems);
          Storage.set('coins', this.coins);
          Sound.powerup();
          this.showToast('获得 ' + item.coins + ' 金币！');
          this.showShop();
        } else { this.showToast('钻石不足！'); }
      });
    });

    // ====== Section 3: Character Upgrades ======
    const shopItems = [
      { id:'maxHp',   name:'最大生命值 +10', desc:'提升生存能力',   icon:'❤️', cost:100, level:this.upgrades.maxHp,   maxLevel:20 },
      { id:'speed',   name:'移动速度 +6%',   desc:'更灵活地走位',   icon:'👟', cost:150, level:this.upgrades.speed,   maxLevel:15 },
      { id:'damage',  name:'攻击力 +10%',    desc:'更快消灭敌人',   icon:'⚔️', cost:150, level:this.upgrades.damage,  maxLevel:20 },
      { id:'fireRate',name:'射速 +8%',       desc:'更高频率射击',   icon:'🎯', cost:200, level:this.upgrades.fireRate,maxLevel:15 },
      { id:'coinGain',name:'金币加成 +10%',   desc:'获得更多金币',   icon:'🪙', cost:100, level:this.upgrades.coinGain,maxLevel:20 },
    ];
    document.getElementById('shop-upgrades').innerHTML =
      '<h3>⬆️ 角色升级 <span style="font-size:0.7rem;color:var(--text-dim)">消耗金币</span></h3>' +
      shopItems.map(item => {
        const cost = Math.floor(item.cost + item.level * item.cost * 0.5);
        const canBuy = coinsLocal >= cost;
        const atMax = item.level >= item.maxLevel;
        return '<div class="shop-item">' +
          '<span style="font-size:1.5rem">' + item.icon + '</span>' +
          '<div class="info">' +
            '<div class="name">' + item.name + '</div>' +
            '<div class="desc">' + item.desc + '</div>' +
            '<div class="level">等级 ' + item.level + '/' + item.maxLevel + '</div>' +
          '</div>' +
          '<button class="btn-buy-coin" data-shop="' + item.id + '" data-cost="' + cost + '"' +
            ((!canBuy || atMax) ? ' disabled' : '') + '>' +
            (atMax ? '已满级' : cost + '') +
          '</button>' +
        '</div>';
      }).join('');

    // ====== Section 4: Star Exchange ======
    const starExchange = [
      { stars:50,  cost:3,  rate:'16.7/钻' },
      { stars:150, cost:8,  rate:'18.8/钻' },
      { stars:400, cost:18, rate:'22.2/钻' },
      { stars:900, cost:35, rate:'25.7/钻' },
    ];
    document.getElementById('shop-star-exchange').innerHTML =
      '<h3>⭐ 星星兑换 <span style="font-size:0.7rem;color:var(--text-dim)">钻石换星星 · 开局发放</span></h3>' +
      starExchange.map((item, idx) =>
        '<div class="shop-item">' +
          '<span style="font-size:1.5rem">⭐</span>' +
          '<div class="info">' +
            '<div class="name">' + item.stars + ' 星星</div>' +
            '<div class="desc">汇率: ' + item.rate + ' · 下局自动发放</div>' +
          '</div>' +
          '<button class="btn-buy-gem" id="btn-buy-star-' + idx + '">' + item.cost + '</button>' +
        '</div>'
      ).join('');

    starExchange.forEach((item, idx) => {
      document.getElementById('btn-buy-star-' + idx).addEventListener('click', () => {
        if (this.gems >= item.cost) {
          this.gems -= item.cost;
          this._pendingStarBonus = (this._pendingStarBonus || 0) + item.stars;
          Storage.set('gems', this.gems);
          Storage.set('pendingStarBonus', this._pendingStarBonus);
          Sound.powerup();
          this.showToast('获得 ' + item.stars + ' 星星！下局自动发放');
          this.showShop();
        } else { this.showToast('钻石不足！'); }
      });
    });

    // ====== Section 5: Weapon Status ======
    document.getElementById('shop-weapons').innerHTML =
      '<h3>🔫 武器状态 <span style="font-size:0.7rem;color:var(--text-dim)">局内用⭐解锁</span></h3>' +
      Object.values(WEAPONS).map(w => {
        const owned = this.ownedWeapons[w.id]?.owned;
        const wLvl = this.ownedWeapons[w.id]?.level || 1;
        if (owned) {
          return '<div class="shop-item" style="border:1px solid rgba(22,199,154,0.3)">' +
            '<span style="font-size:1.5rem">' + w.icon + '</span>' +
            '<div class="info">' +
              '<div class="name">' + w.name + ' <span class="lvl-badge">Lv.' + wLvl + '</span></div>' +
              '<div class="desc">已解锁 · 局内升级</div>' +
            '</div>' +
            '<button class="btn-buy-coin" data-equip-shop="' + w.id + '">装备</button>' +
          '</div>';
        } else {
          let valMsg = '';
          if (w.unlockCost <= 200) valMsg = ' (约2-3局)';
          else if (w.unlockCost <= 350) valMsg = ' (约3-4局)';
          else valMsg = ' (约5-6局)';
          return '<div class="shop-item" style="opacity:0.7">' +
            '<span style="font-size:1.5rem">' + w.icon + '</span>' +
            '<div class="info">' +
              '<div class="name">' + w.name + '</div>' +
              '<div class="desc">局内用 ' + w.unlockCost + ' 星星解锁' + valMsg + '</div>' +
            '</div>' +
          '</div>';
        }
      }).join('');

    // ====== Section 6: Premium Items ======
    document.getElementById('shop-premium').innerHTML =
      '<h3>🎫 道具商店 <span style="font-size:0.7rem;color:var(--text-dim)">消耗钻石</span></h3>' +
      '<div class="shop-item">' +
        '<span style="font-size:1.5rem">🎫</span>' +
        '<div class="info">' +
          '<div class="name">复活令牌</div>' +
          '<div class="desc">阵亡后可用于复活</div>' +
        '</div>' +
        '<button class="btn-buy-gem" id="btn-buy-token">10</button>' +
      '</div>';

    // --- Event Bindings ---
    // Upgrade buttons
    document.querySelectorAll('#shop-upgrades button[data-shop]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.buyUpgrade(btn.dataset.shop, parseInt(btn.dataset.cost));
      });
    });
    // Weapon equip buttons
    document.querySelectorAll('#shop-weapons button[data-equip-shop]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.equipWeapon(btn.dataset.equipShop);
        this.showShop();
      });
    });
    // Revive token
    document.getElementById('btn-buy-token').addEventListener('click', () => {
      if (this.gems >= 10) {
        this.gems -= 10;
        this.reviveTokens += 1;
        Storage.set('gems', this.gems);
        Storage.set('reviveTokens', this.reviveTokens);
        this.showToast('获得 1 个复活令牌！');
        this.showShop();
      } else { this.showToast('钻石不足！'); }
    });

    this.showScreen('shop-screen');
  },

  showDaily() {
    const today = new Date().toDateString();
    const claimed = this.lastDailyClaim === today;
    const rewards = [
      { coinAmount: 50, icon: '🪙' },
      { coinAmount: 100, icon: '🪙' },
      { coinAmount: 150, gems: 1, icon: '💎' },
      { coinAmount: 200, icon: '🪙' },
      { coinAmount: 250, gems: 2, icon: '💎' },
      { coinAmount: 300, icon: '🪙' },
      { coinAmount: 500, gems: 5, reviveToken: 1, icon: '🎁' },
    ];

    let html = '';
    rewards.forEach((r, i) => {
      let cls = '';
      if (i < this.dailyStreak) cls = 'claimed';
      if (i === this.dailyStreak && !claimed) cls = 'today';
      if (i > this.dailyStreak) cls = '';
      if (claimed && i === this.dailyStreak) cls = 'claimed';

      let label = '';
      if (r.coinAmount) label += r.coinAmount + '🪙';
      if (r.gems) label += ' +' + r.gems + '💎';
      if (r.reviveToken) label += ' +🎫';

      html += `<div class="daily-day ${cls}">
        <span class="day-num">第${i+1}天</span>
        <span class="reward-icon">${r.icon}</span>
        <span>${label}</span>
      </div>`;
    });

    document.getElementById('daily-grid').innerHTML = html;

    const claimBtn = document.getElementById('btn-claim-daily');
    claimBtn.disabled = claimed;
    claimBtn.textContent = claimed ? '✅ 今日已领取' : '🎁 领取奖励';
    claimBtn.onclick = () => {
      const reward = this.claimDaily();
      if (reward) {
        let msg = '🎁 获得: ';
        if (reward.coinAmount) msg += reward.coinAmount + ' 金币 ';
        if (reward.gems) msg += reward.gems + ' 钻石 ';
        if (reward.reviveToken) msg += '复活令牌x1 ';
        this.showToast(msg);
        this.updateMenuStats();
        this.showDaily();
      }
    };

    this.showScreen('daily-screen');
  },

  showSkins() {
    let html = '';
    this.skins.forEach(skin => {
      const owned = skin.owned;
      const equipped = this.equippedSkin === skin.id;
      const canBuy = this.gems >= skin.price && !owned;
      html += `<div class="skin-card ${equipped ? 'selected' : ''} ${(!owned) ? 'locked' : ''}"
        data-skin="${skin.id}">
        <div class="skin-preview" style="background:${skin.color}; border:3px solid ${skin.outline}"></div>
        <div class="skin-name">${skin.name}</div>
        <div class="skin-price">${owned ? (equipped ? '使用中' : '点击装备') : '💎 ' + skin.price}</div>
      </div>`;
    });

    document.getElementById('skins-grid').innerHTML = html;

    document.querySelectorAll('.skin-card').forEach(card => {
      card.addEventListener('click', () => {
        const skinId = card.dataset.skin;
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin) return;
        if (!skin.owned && this.gems >= skin.price) {
          if (confirm(`购买皮肤 "${skin.name}" 花费 ${skin.price} 钻石？`)) {
            this.gems -= skin.price;
            skin.owned = true;
            Storage.set('gems', this.gems);
            Storage.set('skins', this.skins);
            this.showToast('✅ 皮肤购买成功！');
            this.showSkins();
          }
        } else if (!skin.owned) {
          this.showToast('💎 钻石不足！');
        } else {
          this.equippedSkin = skinId;
          Storage.set('equippedSkin', skinId);
          this.showToast('✅ 皮肤已装备！');
          this.showSkins();
        }
      });
    });

    this.showScreen('skins-screen');
  },

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.animation = 'none';
    toast.offsetHeight;
    toast.style.animation = 'toastIn 0.3s ease, toastOut 0.3s ease 2s forwards';
    setTimeout(() => toast.classList.add('hidden'), 2300);
  },

  updateMenuStats() {
    document.getElementById('menu-high-score').textContent = this.highScore;
    document.getElementById('menu-coins').textContent = this.coins;
    document.getElementById('menu-gems').textContent = this.gems;
    // Update rank display
    const rank = this.getRankTier();
    const rankEl = document.getElementById('menu-rank');
    if (rankEl) rankEl.innerHTML = `${rank.icon} ${rank.name}`;
  },

  // --- Rank & Achievement System ---

  getRankTier() {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
      if (this.highestWave >= RANK_TIERS[i].minWave) return RANK_TIERS[i];
    }
    return RANK_TIERS[0];
  },

  getNextRank() {
    const current = this.getRankTier();
    const idx = RANK_TIERS.indexOf(current);
    return idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
  },

  getRankProgress() {
    const current = this.getRankTier();
    const next = this.getNextRank();
    if (!next) return 100;
    const currentMin = current.minWave;
    const nextMin = next.minWave;
    return Math.min(100, Math.round((this.highestWave - currentMin) / (nextMin - currentMin) * 100));
  },

  checkAchievements() {
    const newlyUnlocked = [];
    ACHIEVEMENTS.forEach(a => {
      if (!this.achievements.includes(a.id) && a.check(this)) {
        this.achievements.push(a.id);
        newlyUnlocked.push(a);
      }
    });
    if (newlyUnlocked.length > 0) {
      Storage.set('achievements', this.achievements);
      newlyUnlocked.forEach(a => {
        this.showToast(`🏆 成就解锁: ${a.icon} ${a.name}！`);
      });
    }
  },

  addScoreRecord() {
    const record = {
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      maxCombo: this.maxCombo,
      date: new Date().toLocaleDateString('zh-CN'),
      weaponsOwned: Object.values(this.ownedWeapons || {}).filter(w => w.owned).length,
    };
    this.scoreHistory.push(record);
    // Keep top 20, sorted by score desc
    this.scoreHistory.sort((a, b) => b.score - a.score);
    if (this.scoreHistory.length > 20) this.scoreHistory = this.scoreHistory.slice(0, 20);
    Storage.set('scoreHistory', this.scoreHistory);

    // Track max combo ever
    if (this.maxCombo > (this._maxComboEver || 0)) {
      this._maxComboEver = this.maxCombo;
      Storage.set('maxComboEver', this._maxComboEver);
    }

    // Track highest wave
    if (this.wave > this.highestWave) {
      this.highestWave = this.wave;
      Storage.set('highestWave', this.highestWave);
    }

    // Check achievements
    this.checkAchievements();
  },

  // Simulated percentile: "You beat X% of warriors"
  getSimulatedPercentile() {
    if (this.highScore >= 5000) return 99;
    if (this.highScore >= 3000) return 95;
    if (this.highScore >= 1500) return 85;
    if (this.highScore >= 800)  return 70;
    if (this.highScore >= 400)  return 50;
    if (this.highScore >= 150)  return 30;
    return 10;
  },

  generateDailyTarget() {
    const today = new Date().toDateString();
    if (this._dailyTargetDate === today) return;
    this._dailyTargetDate = today;
    // Generate a score target based on player's skill
    const base = Math.max(100, this.highScore * 0.6);
    const target = Math.floor(base / 50) * 50 + 50; // round to nearest 50
    this.dailyTarget = Math.max(100, target);
    this.dailyTargetClaimed = false;
    Storage.set('dailyTarget', this.dailyTarget);
    Storage.set('dailyTargetClaimed', false);
    Storage.set('dailyTargetDate', today);
  },

  claimDailyTarget() {
    if (this.dailyTargetClaimed) return null;
    if (this.score < this.dailyTarget) return null;
    this.dailyTargetClaimed = true;
    Storage.set('dailyTargetClaimed', true);
    const reward = { coins: Math.floor(this.dailyTarget / 5), gems: 1 };
    this.coins += reward.coins;
    this.gems += reward.gems;
    Storage.set('coins', this.coins);
    Storage.set('gems', this.gems);
    return reward;
  },

  showLeaderboard() {
    this.showScreen('leaderboard-screen');

    // Rank display
    const rank = this.getRankTier();
    const nextRank = this.getNextRank();
    const progress = this.getRankProgress();
    const percentile = this.getSimulatedPercentile();
    document.getElementById('rank-display').innerHTML = `${rank.icon} ${rank.name} <span style="font-size:0.7rem;color:var(--text-dim)">— 超越 ${percentile}% 战士</span>`;
    document.getElementById('rank-progress-bar').style.width = progress + '%';
    if (nextRank) {
      document.getElementById('rank-progress-text').textContent = `距 ${nextRank.icon}${nextRank.name} 还需 ${nextRank.minWave - this.highestWave} 波`;
    } else {
      document.getElementById('rank-progress-text').textContent = '已达最高段位！';
    }

    // Personal bests
    document.getElementById('lb-high-score').textContent = this.highScore;
    document.getElementById('lb-high-wave').textContent = this.highestWave;
    document.getElementById('lb-total-kills').textContent = this.totalKills;
    document.getElementById('lb-streak').textContent = this.dailyStreak;

    // Score history
    const histEl = document.getElementById('lb-history');
    if (this.scoreHistory.length === 0) {
      histEl.innerHTML = '<p class="lb-empty">还没有战绩，快去战斗吧！⚔️</p>';
    } else {
      histEl.innerHTML = this.scoreHistory.slice(0, 10).map((r, i) => {
        const medals = ['🥇','🥈','🥉'];
        const rankIcon = i < 3 ? medals[i] : `${i + 1}`;
        return `<div class="lb-record">
          <span class="lb-rank">${rankIcon}</span>
          <span class="lb-detail">🏆${r.score} · 🌊${r.wave}波 · 💀${r.kills}杀</span>
          <span class="lb-score">${r.date}</span>
        </div>`;
      }).join('');
    }

    // Achievements
    const achEl = document.getElementById('lb-achievements');
    achEl.innerHTML = ACHIEVEMENTS.map(a => {
      const unlocked = this.achievements.includes(a.id);
      return `<div class="lb-achievement ${unlocked ? 'unlocked' : 'locked'}">
        <span class="ach-icon">${unlocked ? a.icon : '🔒'}</span>
        <span class="ach-name">${a.name}</span>
      </div>`;
    }).join('');

    // Daily challenge
    this.generateDailyTarget();
    const dEl = document.getElementById('lb-daily-info');
    if (this.dailyTargetClaimed) {
      dEl.innerHTML = `✅ 今日已完成！目标 ${this.dailyTarget} 分 — 已领取奖励`;
    } else {
      dEl.innerHTML = `🎯 今日目标: <strong>${this.dailyTarget}</strong> 分 — 达成奖励 🪙${Math.floor(this.dailyTarget/5)} + 💎1`;
    }
  },

  updateHUD() {
    if (this.state !== 'playing') return;
    const p = this.player;
    const hpPct = (p.hp / p.maxHp) * 100;
    const hpBar = document.getElementById('hp-bar');
    hpBar.style.width = hpPct + '%';
    if (hpPct < 30) hpBar.classList.add('danger'); else hpBar.classList.remove('danger');
    document.getElementById('hp-text').textContent = Math.ceil(p.hp) + '/' + p.maxHp;
    document.getElementById('shield-indicator').classList.toggle('hidden', !p.hasShield);
    const weapon = WEAPONS[this.player.weaponType] || WEAPONS.pistol;
    const wData = this.ownedWeapons[this.player.weaponType];
    const wLvl = wData?.level || 1;
    document.getElementById('weapon-indicator').textContent = weapon.icon + ' ' + weapon.name + ' Lv.' + wLvl;
    document.getElementById('wave-display').textContent = `第 ${this.wave} 波`;
    document.getElementById('enemy-count').textContent = `敌人: ${this.enemiesRemaining}`;
    document.getElementById('score-display').textContent = this.score;
    document.getElementById('star-display-hud').textContent = this.starsEarned;
    document.getElementById('gem-display-hud').textContent = this.gems;

    // Active effects
    const fx = [];
    if (this.autoFire) fx.push({ icon: '🤖', time: 'ON' });
    if (p.speedBoost > 0) fx.push({ icon: '⚡', time: Math.ceil(p.speedBoost/1000) + 's' });
    if (p.damageBoost > 0) fx.push({ icon: '💥', time: Math.ceil(p.damageBoost/1000) + 's' });
    if (p.shieldActive > 0) fx.push({ icon: '🛡️', time: Math.ceil(p.shieldActive/1000) + 's' });
    if (p.magnetActive > 0) fx.push({ icon: '🧲', time: Math.ceil(p.magnetActive/1000) + 's' });
    document.getElementById('active-effects').innerHTML = fx.map(f =>
      `<span class="effect-tag">${f.icon} ${f.time}</span>`
    ).join('');

    // Wave progress
    if (this.totalEnemiesThisWave > 0) {
      const killed = this.totalEnemiesThisWave - this.enemiesRemaining;
      const pct = (killed / this.totalEnemiesThisWave) * 100;
      document.getElementById('wave-progress').style.width = pct + '%';
    }
  },

  // --- Main Loop ---
  loop(timestamp) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // Cap delta
    this.lastTime = timestamp;

    this.update(dt);
  },

  update(dt) {
    if (this.state === 'playing') {
      this.updateGameplay(dt);
    }
    this.render();
  },

  updateGameplay(dt) {
    const p = this.player;
    const dtMs = dt * 1000;

    // Wave countdown (pauses naturally when game is paused)
    if (this.waveCountdown > 0) {
      this.waveCountdown -= dtMs;
      if (this.waveCountdown <= 0) {
        this.waveCountdown = 0;
        const action = this.waveCountdownAction;
        this.waveCountdownAction = null;
        if (action === 'startNextWave') {
          this.startNextWave();
        } else if (action === 'spawnWave') {
          this.spawnWave(this.wave);
          this.waveTransition = false;
          if (this.wave % 5 === 0) {
            const bossAlert = document.getElementById('boss-alert');
            bossAlert.classList.remove('hidden');
            setTimeout(() => bossAlert.classList.add('hidden'), 2000);
            Sound.bossAlert();
          }
        }
      }
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dtMs;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    // Screen shake decay
    if (this.shakeIntensity > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= Math.pow(0.05, dt);
      if (this.shakeIntensity < 0.3) { this.shakeIntensity = 0; this.shakeX = 0; this.shakeY = 0; }
    }

    // Update player
    p.update(dt, keys, mouse);

    // Auto-fire
    if (this.autoFire && p.alive) {
      p.tryShoot(mouse);
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      projectiles[i].update();
      if (projectiles[i].offScreen) {
        projectiles.splice(i, 1);
        continue;
      }
      // Enemy projectile hits player
      if (projectiles[i].isEnemy && p.alive && dist(projectiles[i], p) < projectiles[i].radius + p.radius) {
        p.takeDamage(projectiles[i].damage);
        spawnParticles(projectiles[i].x, projectiles[i].y, 5, '#ff5252', 2, 0.2);
        projectiles.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      enemies[i].update(p, dt);

      // Enemy-player collision
      if (dist(enemies[i], p) < enemies[i].radius + p.radius) {
        p.takeDamage(enemies[i].damage);
        // Push enemy back
        const a = angle(p, enemies[i]);
        enemies[i].x += Math.cos(a) * 20;
        enemies[i].y += Math.sin(a) * 20;
      }

      // Check projectile hits on enemy
      for (let j = projectiles.length - 1; j >= 0; j--) {
        const proj = projectiles[j];
        if (proj.isEnemy) continue; // Enemy bullets
        if (dist(proj, enemies[i]) < proj.radius + enemies[i].radius) {
          enemies[i].takeDamage(proj.damage);
          projectiles.splice(j, 1);
          if (enemies[i].dead) {
            this.killEnemy(enemies[i], i);
            break;
          }
        }
      }
    }

    // Update power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      powerups[i].update(dt);
      if (powerups[i].dead) {
        powerups.splice(i, 1);
        continue;
      }
      // Player pickup
      if (dist(powerups[i], p) < powerups[i].radius + p.radius + 8) {
        this.collectPowerUp(powerups[i]);
        powerups.splice(i, 1);
      }
    }

    // Update stars
    for (let i = starsArr.length - 1; i >= 0; i--) {
      starsArr[i].update(dt);
      if (starsArr[i].dead) {
        starsArr.splice(i, 1);
        continue;
      }
      const d = dist(starsArr[i], p);
      const pickupRange = 20 + (p.magnetActive > 0 ? CFG.MAGNET_RANGE : 0);
      if (d < starsArr[i].radius + pickupRange) {
        // Magnet pull
        if (p.magnetActive > 0 && d > 20) {
          const a = angle(starsArr[i], p);
          starsArr[i].x += Math.cos(a) * 300 * dt;
          starsArr[i].y += Math.sin(a) * 300 * dt;
        }
        if (d < starsArr[i].radius + 20) {
          const starGainMult = 1 + (this.upgrades.coinGain || 0) * 0.1;
          const val = Math.round(starsArr[i].value * starGainMult);
          this.starsEarned += val;
          this.score += val;
          Sound.star();
          starsArr.splice(i, 1);
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(dt);
      if (particles[i].dead) particles.splice(i, 1);
    }

    // Check player death
    if (!p.alive && this.state === 'playing') {
      Sound.death();
      spawnParticles(p.x, p.y, 25, '#ff5252', 8, 1);
      document.getElementById('death-score').textContent = this.score;
      document.getElementById('death-wave').textContent = this.wave;
      document.getElementById('death-kills').textContent = `${this.kills} (最大连杀 ${this.maxCombo})`;
      document.getElementById('death-stars').textContent = this.starsEarned;
      document.getElementById('revive-token-count').textContent = this.reviveTokens + '个';
      // If already revived this run, hide all revive options
      if (this.reviveUsed) {
        document.getElementById('btn-revive-ad').style.display = 'none';
        document.getElementById('btn-revive-token').style.display = 'none';
        document.getElementById('btn-revive-friend').style.display = 'none';
        document.getElementById('btn-revive-gems').style.display = 'none';
        document.getElementById('death-hint').textContent = '本局已复活过一次，再次阵亡无法复活';
      } else {
        document.getElementById('btn-revive-ad').style.display = this.adWatched ? 'none' : 'block';
        document.getElementById('btn-revive-token').style.display = this.reviveTokens > 0 ? 'block' : 'none';
        document.getElementById('btn-revive-friend').style.display = 'block';
        document.getElementById('btn-revive-gems').style.display = 'block';
        document.getElementById('death-hint').textContent = '';
      }

      // "One more game" progression hook
      const deathProgEl = document.getElementById('death-progress');
      if (deathProgEl) {
        const rank = this.getRankTier();
        const nextRank = this.getNextRank();
        // Find next unowned weapon to hint at progression
        const nextWpn = Object.values(WEAPONS).find(w =>
          w.unlockCost > 0 && !this.ownedWeapons[w.id]?.owned
        );
        let msg = `${rank.icon} ${rank.name} · 本局获得 <strong>${this.starsEarned}⭐</strong>`;
        if (nextWpn) {
          const pct = Math.min(100, Math.round(this.starsEarned / nextWpn.unlockCost * 100));
          msg += `<br/>解锁 ${nextWpn.name} 需要 <strong>${nextWpn.unlockCost}⭐</strong> · 本局进度 ${pct}%`;
        }
        if (nextRank && this.wave >= nextRank.minWave - 3) {
          msg += `<br/><span style="color:${nextRank.color}">🔥 距${nextRank.name}还差 ${nextRank.minWave - this.wave} 波！</span>`;
        }
        deathProgEl.innerHTML = msg;
        deathProgEl.classList.remove('hidden');
      }

      this.showScreen('death-screen');
      this.state = 'dead';
    }

    // Update HUD
    this.updateHUD();
  },

  render() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply screen shake
    ctx.save();
    if (this.shakeIntensity > 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }

    if (this.state === 'menu') {
      this.drawBackground(ctx);
      ctx.restore();
      return;
    }

    // Background grid
    this.drawBackground(ctx);

    if (this.state === 'playing' || this.state === 'dead' || this.state === 'paused') {
      // Draw stars
      starsArr.forEach(c => c.draw(ctx));

      // Draw power-ups
      powerups.forEach(pu => pu.draw(ctx));

      // Draw enemies
      enemies.forEach(e => {
        e.draw(ctx);
        e.drawHpBar(ctx);
      });

      // Draw projectiles
      projectiles.forEach(p => p.draw(ctx));

      // Draw player
      this.player.draw(ctx);

      // Draw particles
      particles.forEach(p => p.draw(ctx));

      // Combo display
      if (this.comboCount >= 5 && this.comboTimer > 0) {
        ctx.fillStyle = `rgba(255,215,0,${Math.min(1, this.comboTimer / 500)})`;
        ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.comboCount} COMBO!`, canvas.width / 2, canvas.height - 60);
      }
    }

    ctx.restore();
  },

  drawBackground(ctx) {
    // Dark background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Border glow
    const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.3, canvas.width/2, canvas.height/2, canvas.width*0.7);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, 'rgba(233,69,96,0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw player crosshair if in game
    if (this.state === 'playing' || this.state === 'paused') {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      const s = 15;
      // crosshair at mouse position
      ctx.beginPath();
      ctx.moveTo(mouse.x - s, mouse.y);
      ctx.lineTo(mouse.x - s/3, mouse.y);
      ctx.moveTo(mouse.x + s/3, mouse.y);
      ctx.lineTo(mouse.x + s, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - s);
      ctx.lineTo(mouse.x, mouse.y - s/3);
      ctx.moveTo(mouse.x, mouse.y + s/3);
      ctx.lineTo(mouse.x, mouse.y + s);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, s*0.6, 0, Math.PI*2);
      ctx.stroke();
    }
  },
};

// --- Input Handling ---
const keys = {};
const mouse = { x: 0, y: 0 };

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  // Prevent default for game keys
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('mousedown', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (e.button === 0 && game.state === 'playing' && game.player.alive) {
    game.player.tryShoot(mouse);
  }
  if (e.target.tagName === 'CANVAS') e.preventDefault();
});

// --- Canvas ---
const canvas = document.getElementById('game-canvas');

// --- Initialize ---
game.init();

// ✅ Check for pending revives from Supabase (cross-device)
(async function checkPendingRevives() {
  const myId = Storage.getPlayerId();
  let foundRevives = 0;

  // ✅ Check Supabase for pending revives
  // ✅ Query Supabase for ALL pending revives (no limit, unlike checkRevives)
  try {
    const data = await SupabaseDB.checkAllRevives(myId);
    if (data && data.length > 0) {
      foundRevives = data.length;
      await SupabaseDB.deleteRevives(myId);
      console.log('[Revive] ✅ Found ' + foundRevives + ' pending revive(s) in Supabase');
    }
  } catch (err) {
    console.log('[Revive] Supabase not available for page-load check:', err.message);
  }

  // Fallback: check localStorage too (for offline or error cases)
  const localRevives = Storage.get('pendingRevives', []);
  if (localRevives.length > 0) {
    const myLocalRevives = localRevives.filter(r => r.to === myId);
    if (myLocalRevives.length > 0) {
      foundRevives += myLocalRevives.length;
      Storage.set('pendingRevives', localRevives.filter(r => r.to !== myId));
    }
  }

  // Award revive tokens
  if (foundRevives > 0 && game.reviveTokens <= 0) {
    game.reviveTokens += foundRevives;
    Storage.set('reviveTokens', game.reviveTokens);
    console.log('[Revive] 🎫 Awarded ' + foundRevives + ' revive token(s)!');
  }
})();

console.log('%c🎮 生存竞技场已就绪 %c| %cPlayer ID: ' + Storage.getPlayerId(),
  'font-size:16px;color:#e94560', '', 'color:#888');
console.log('%c💡 提示: %c邀请好友通过你的链接加入，可以获得复活令牌！',
  'color:#f0c040', 'color:#888');
console.log('%c🔗 你的分享链接: %c' + game.generateShareLink(),
  'color:#3498db', 'color:#888');
