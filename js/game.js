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
  coin() { this.play(1200, 'sine', 0.05, 0.06); },
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
  COIN_DROP_CHANCE: 0.4,
  COIN_MAGNET_RANGE: 120,
  AD_DURATION: 15,
  MAX_REVIVES_PER_RUN: 1,
};

// --- Weapon Types ---
const WEAPONS = {
  pistol: {
    id: 'pistol', name: '手枪', icon: '🔫',
    desc: '标准武器，平衡的伤害和射速', stats: '伤害x1 | 射速x1',
    damageMult: 1.0, fireRateMult: 1.0, spread: 0, pellets: 1,
    bulletColor: '#ffeb3b', bulletSize: 3,
    cost: 0, gemCost: 0,
  },
  shotgun: {
    id: 'shotgun', name: '霰弹枪', icon: '💥',
    desc: '5发弹丸扇形散射，近距离威力巨大', stats: '单发x0.35 | 散射x5',
    damageMult: 0.35, fireRateMult: 0.5, spread: 0.15, pellets: 5,
    bulletColor: '#ff9800', bulletSize: 2.5,
    cost: 50, gemCost: 3,
  },
  smg: {
    id: 'smg', name: '冲锋枪', icon: '⚡',
    desc: '极高射速，弹幕压制', stats: '伤害x0.55 | 射速x2.8',
    damageMult: 0.55, fireRateMult: 2.8, spread: 0.06, pellets: 1,
    bulletColor: '#4fc3f7', bulletSize: 2,
    cost: 80, gemCost: 5,
  },
  sniper: {
    id: 'sniper', name: '狙击枪', icon: '🎯',
    desc: '3倍伤害，一击制敌', stats: '伤害x3 | 射速x0.35',
    damageMult: 3.0, fireRateMult: 0.35, spread: 0, pellets: 1,
    bulletColor: '#ff1744', bulletSize: 5,
    cost: 120, gemCost: 8,
  },
};

// --- In-Run Power-Up Shop Items ---
const IN_RUN_POWERUPS = [
  { id: 'health',  name: '生命恢复', desc: '立即恢复 30 HP',            icon: '❤️',  cost: 25,  apply: (p) => { p.heal(30); } },
  { id: 'shield',  name: '护盾',      desc: '获得 10 秒护盾保护',       icon: '🛡️',  cost: 40,  apply: (p) => { p.shieldActive = 10000; } },
  { id: 'speed',   name: '速度提升',  desc: '8 秒内移动速度 +50%',      icon: '⚡',  cost: 25,  apply: (p) => { p.speedBoost = 8000; } },
  { id: 'damage',  name: '双倍伤害',  desc: '8 秒内造成双倍伤害',       icon: '💥',  cost: 50,  apply: (p) => { p.damageBoost = 8000; } },
  { id: 'magnet',  name: '金币磁铁',  desc: '10 秒内自动吸取附近金币',  icon: '🧲',  cost: 35,  apply: (p) => { p.magnetActive = 10000; } },
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
  { id: 'coinbag', icon: '💰', color: '#ffd700', effect: (p,g) => { g.coins += 25; }, text: '+25 金币' },
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

// --- Coin ---
class Coin {
  constructor(x, y, value = 1) {
    this.x = x; this.y = y;
    this.value = value;
    this.radius = 6;
    this.life = 15000;
    this.elapsed = 0;
  }
  update(dt) {
    this.elapsed += dt * 1000;
  }
  get dead() { return this.elapsed >= this.life; }
  get blinkWarning() { return this.elapsed > this.life * 0.7; }
  draw(ctx) {
    const alpha = this.blinkWarning ? 0.3 + Math.sin(this.elapsed * 0.04) * 0.3 : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

let coins = [];

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
    const baseAngle = angle(this, target);
    const totalDmg = this.baseDamage * this.damageMult * weapon.damageMult;

    // Fire pellets with spread
    for (let i = 0; i < weapon.pellets; i++) {
      let pelletAngle = baseAngle;
      if (weapon.spread > 0 && weapon.pellets > 1) {
        // Even fan spread for multi-pellet weapons
        const offset = (i - (weapon.pellets - 1) / 2) * weapon.spread;
        pelletAngle = baseAngle + offset;
      } else if (weapon.spread > 0) {
        // Random inaccuracy for single-pellet spread weapons
        pelletAngle = baseAngle + (Math.random() - 0.5) * weapon.spread * 2;
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
        weapon.bulletSize
      ));
    }
    Sound.shoot();
  }

  tryShoot(target) {
    const now = performance.now();
    const weapon = WEAPONS[this.weaponType] || WEAPONS.pistol;
    const effectiveFireRate = this.fireRate / weapon.fireRateMult;
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
  coinsEarned: 0,
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
  totalCoins: 0,
  totalKills: 0,

  // Daily
  dailyStreak: 0,
  lastDailyClaim: '',

  // Revive tokens
  reviveTokens: 0,

  // Weapon ownership this run & active pause tab
  ownedWeaponsThisRun: new Set(['pistol']),
  activePauseTab: 'weapons',
  autoFire: false,

  init() {
    // Load saved data
    this.upgrades = Storage.get('upgrades', {
      maxHp: 0, speed: 0, damage: 0, fireRate: 0, coinGain: 0
    });
    this.equippedSkin = Storage.get('equippedSkin', 'default');
    this.highScore = Storage.get('highScore', 0);
    this.totalCoins = Storage.get('totalCoins', 0);
    this.totalKills = Storage.get('totalKills', 0);
    this.gems = Storage.get('gems', 0);
    this.dailyStreak = Storage.get('dailyStreak', 0);
    this.lastDailyClaim = Storage.get('lastDailyClaim', '');
    this.reviveTokens = Storage.get('reviveTokens', 0);

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
    coins = [];
    this.wave = 0;
    this.score = 0;
    this.coinsEarned = 0;
    this.kills = 0;
    this.state = 'playing';
    this.reviveUsed = false;
    this.adWatched = false;
    this.ownedWeaponsThisRun = new Set(['pistol']);
    this.activePauseTab = 'weapons';
    this.autoFire = false;
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
      this.coinsEarned += comboBonus;
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

    // Drop coin
    if (rng() < CFG.COIN_DROP_CHANCE) {
      const coinVal = enemy.typeKey === 'boss' ? 10 : 1;
      coins.push(new Coin(enemy.x, enemy.y, coinVal));
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
      // Bonus coins for wave clear
      const bonus = this.wave * 5;
      this.coinsEarned += bonus;
      this.score += bonus;
      coins.push(new Coin(canvas.width/2, canvas.height/2 - 40, bonus));

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
    this.totalCoins += this.coinsEarned;
    this.totalKills += this.kills;
    if (this.score > this.highScore) this.highScore = this.score;
    Storage.set('totalCoins', this.totalCoins);
    Storage.set('totalKills', this.totalKills);
    Storage.set('highScore', this.highScore);
    Storage.set('gems', this.gems);
    Storage.set('reviveTokens', this.reviveTokens);
    this.showScreen('main-menu');
    this.updateMenuStats();
  },

  // --- Referral System ---
  checkReferral() {
    const params = new URLSearchParams(window.location.search);
    const refId = params.get('ref');
    if (refId && refId !== Storage.getPlayerId()) {
      // Check if already claimed
      const claimedRefs = Storage.get('claimedRefs', []);
      if (!claimedRefs.includes(refId)) {
        // Give bonus to new player
        this.totalCoins = Storage.get('totalCoins', 0) + 50;
        Storage.set('totalCoins', this.totalCoins);
        this.showToast('🎉 通过好友链接加入！获得 50 金币奖励！');

        // Store that someone used this referral
        // In a real app, this would be server-side
        // For now, store locally that we claimed this ref
        claimedRefs.push(refId);
        Storage.set('claimedRefs', claimedRefs);

        // The referrer's revive token would be handled server-side in production
        // For local demo, we store a pending revive for the referrer
        const pendingRevives = Storage.get('pendingRevives', []);
        pendingRevives.push({ from: Storage.getPlayerId(), to: refId, time: Date.now() });
        Storage.set('pendingRevives', pendingRevives);
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
      { coins: 50 },
      { coins: 100 },
      { coins: 150, gems: 1 },
      { coins: 200 },
      { coins: 250, gems: 2 },
      { coins: 300 },
      { coins: 500, gems: 5, reviveToken: 1 },
    ];
    return rewards[this.dailyStreak];
  },

  claimDaily() {
    const today = new Date().toDateString();
    if (this.lastDailyClaim === today) return null;
    const reward = this.getDailyReward();
    if (reward.coins) this.totalCoins += reward.coins;
    if (reward.gems) this.gems += reward.gems;
    if (reward.reviveToken) this.reviveTokens += reward.reviveToken;
    this.lastDailyClaim = today;
    Storage.set('totalCoins', this.totalCoins);
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

    // Click coin/gem displays to open shop
    document.getElementById('menu-coins').style.cursor = 'pointer';
    document.getElementById('menu-coins').addEventListener('click', () => this.showShop());
    document.getElementById('menu-gems').style.cursor = 'pointer';
    document.getElementById('menu-gems').addEventListener('click', () => this.showShop());
    document.getElementById('coin-display-hud').style.cursor = 'pointer';
    document.getElementById('coin-display-hud').addEventListener('click', () => {
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
      this.totalCoins += this.coinsEarned;
      this.totalKills += this.kills;
      if (this.score > this.highScore) this.highScore = this.score;
      Storage.set('totalCoins', this.totalCoins);
      Storage.set('totalKills', this.totalKills);
      Storage.set('highScore', this.highScore);
      Storage.set('gems', this.gems);
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

    // Friend modal
    document.getElementById('btn-copy-link').addEventListener('click', () => {
      const link = this.generateShareLink();
      document.getElementById('share-link').value = link;
      navigator.clipboard.writeText(link).then(() => this.showToast('📋 链接已复制！'));
    });
    document.getElementById('btn-share-wechat').addEventListener('click', () => {
      const link = this.generateShareLink();
      document.getElementById('share-link').value = link;
      this.showToast('💬 请复制链接发送给微信好友');
    });
    document.getElementById('btn-share-qq').addEventListener('click', () => {
      const link = this.generateShareLink();
      document.getElementById('share-link').value = link;
      this.showToast('🐧 请复制链接发送给QQ好友');
    });
    document.getElementById('btn-friend-back').addEventListener('click', () => this.showScreen('death-screen'));

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

  watchAd() {
    this.showScreen('ad-modal');
    Sound.init();
    let remaining = CFG.AD_DURATION;
    const fill = document.getElementById('ad-timer-fill');
    const text = document.getElementById('ad-timer-text');

    const interval = setInterval(() => {
      remaining--;
      const pct = ((CFG.AD_DURATION - remaining) / CFG.AD_DURATION) * 100;
      fill.style.width = pct + '%';
      text.textContent = `剩余 ${remaining} 秒`;

      if (remaining <= 0) {
        clearInterval(interval);
        this.adWatched = true;
        this.revive();
        this.showToast('📺 广告观看完成！已复活');
        document.getElementById('ad-modal').classList.add('hidden');
      }
    }, 1000);
  },

  showFriendModal() {
    document.getElementById('share-link').value = this.generateShareLink();
    this.showScreen('friend-modal');
  },

  // --- Pause Menu ---
  renderPauseContent() {
    document.getElementById('pause-coins').textContent = this.coinsEarned;
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
    const owned = this.ownedWeaponsThisRun;
    const equipped = this.player.weaponType;
    const coins = this.coinsEarned;
    const gems = this.gems;
    const waveCompleted = this.wave > 1 || this.enemiesRemaining <= 0;
    const autoFireUnlocked = waveCompleted;
    let html = '';

    // Auto-fire module card
    if (this.autoFire) {
      html += `<div class="weapon-card equipped" data-autofire="owned">
        <span class="weapon-icon">🤖</span>
        <div class="weapon-info">
          <div class="weapon-name">自动射击模块</div>
          <div class="weapon-desc">武器自动向鼠标方向射击，解放双手</div>
          <div class="weapon-stats"><span>持续射击</span></div>
        </div>
        <div class="weapon-status">✅ 已激活</div>
      </div>`;
    } else if (autoFireUnlocked) {
      const canBuyCoins = coins >= 100;
      const canBuyGems = gems >= 6;
      html += `<div class="weapon-card" data-autofire="buy">
        <span class="weapon-icon">🤖</span>
        <div class="weapon-info">
          <div class="weapon-name">自动射击模块</div>
          <div class="weapon-desc">武器自动向鼠标方向射击，解放双手</div>
          <div class="weapon-stats"><span>持续射击</span></div>
        </div>
        <div class="btn-dual-group">
          <button class="btn-buy-sm btn-buy-coin" data-action="buy-autofire-coin"
            ${!canBuyCoins ? 'disabled' : ''}>🪙 100</button>
          <button class="btn-buy-sm btn-buy-gem" data-action="buy-autofire-gem"
            ${!canBuyGems ? 'disabled' : ''}>💎 6</button>
        </div>
      </div>`;
    } else {
      html += `<div class="weapon-card" style="opacity:0.5">
        <span class="weapon-icon">🔒</span>
        <div class="weapon-info">
          <div class="weapon-name">自动射击模块</div>
          <div class="weapon-desc">武器自动向鼠标方向射击，解放双手</div>
          <div class="weapon-stats"><span>完成第1波后解锁</span></div>
        </div>
        <div class="weapon-status">🔒 锁定</div>
      </div>`;
    }

    Object.values(WEAPONS).forEach(w => {
      const isOwned = owned.has(w.id);
      const isEquipped = equipped === w.id;
      const canBuyCoins = !isOwned && coins >= w.cost && w.cost > 0;
      const canBuyGems = !isOwned && gems >= w.gemCost && w.gemCost > 0;

      html += `<div class="weapon-card ${isEquipped ? 'equipped' : ''}" data-weapon="${w.id}">
        <span class="weapon-icon">${w.icon}</span>
        <div class="weapon-info">
          <div class="weapon-name">${w.name}</div>
          <div class="weapon-desc">${w.desc}</div>
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
          <button class="btn-buy-sm btn-buy-coin" data-action="buy-coin" data-weapon="${w.id}"
            ${!canBuyCoins ? 'disabled' : ''}>🪙 ${w.cost}</button>
          <button class="btn-buy-sm btn-buy-gem" data-action="buy-gem" data-weapon="${w.id}"
            ${!canBuyGems ? 'disabled' : ''}>💎 ${w.gemCost}</button>
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
        } else if (action === 'buy-coin') {
          this.buyWeapon(weaponId, 'coins');
        } else if (action === 'buy-gem') {
          this.buyWeapon(weaponId, 'gems');
        }
      });
    });
  },

  _renderItemsTab() {
    const coins = this.coinsEarned;
    let html = '';

    IN_RUN_POWERUPS.forEach(pu => {
      const canBuy = coins >= pu.cost;
      html += `<div class="powerup-card" data-powerup="${pu.id}">
        <span class="powerup-icon">${pu.icon}</span>
        <div class="powerup-info">
          <div class="powerup-name">${pu.name}</div>
          <div class="powerup-desc">${pu.desc}</div>
        </div>
        <button class="btn-buy-sm btn-buy-coin" data-action="buy-powerup" data-powerup="${pu.id}"
          ${!canBuy ? 'disabled' : ''}>🪙 ${pu.cost}</button>
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
    const coins = this.totalCoins;

    const shopItems = [
      { id: 'maxHp',   name: '最大生命值 +10', desc: '提升生存能力',    icon: '❤️',  cost: 100, level: this.upgrades.maxHp,    maxLevel: 20 },
      { id: 'speed',   name: '移动速度 +6%',   desc: '更灵活地走位',    icon: '👟',  cost: 150, level: this.upgrades.speed,    maxLevel: 15 },
      { id: 'damage',  name: '攻击力 +10%',    desc: '更快消灭敌人',    icon: '⚔️',  cost: 150, level: this.upgrades.damage,   maxLevel: 20 },
      { id: 'fireRate',name: '射速 +8%',       desc: '更高频率射击',    icon: '🎯',  cost: 200, level: this.upgrades.fireRate, maxLevel: 15 },
      { id: 'coinGain',name: '金币加成 +10%',   desc: '获得更多金币',    icon: '🪙',  cost: 100, level: this.upgrades.coinGain, maxLevel: 20 },
    ];

    let html = '';
    shopItems.forEach(item => {
      const cost = Math.floor(item.cost + item.level * item.cost * 0.5);
      const canBuy = coins >= cost;
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
    return html;
  },

  _bindUpgradeEvents() {
    document.querySelectorAll('#pause-tab-content button[data-shop]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.shop;
        const cost = parseInt(btn.dataset.cost);
        this.buyUpgrade(id, cost, true);
      });
    });
  },

  buyWeapon(weaponId, currency) {
    const weapon = WEAPONS[weaponId];
    if (!weapon || weapon.cost === 0) return;
    if (this.ownedWeaponsThisRun.has(weaponId)) return;

    if (currency === 'coins') {
      if (this.coinsEarned < weapon.cost) return;
      this.coinsEarned -= weapon.cost;
    } else {
      if (this.gems < weapon.gemCost) return;
      this.gems -= weapon.gemCost;
      Storage.set('gems', this.gems);
    }

    this.ownedWeaponsThisRun.add(weaponId);
    this.player.weaponType = weaponId;
    Sound.powerup();
    this.showToast('✅ 装备了 ' + weapon.name + '！');
    this.updateHUD();
    this.renderPauseContent();
  },

  equipWeapon(weaponId) {
    if (!this.ownedWeaponsThisRun.has(weaponId)) return;
    this.player.weaponType = weaponId;
    Sound.powerup();
    this.showToast('✅ 切换到 ' + WEAPONS[weaponId].name);
    this.updateHUD();
    this.renderPauseContent();
  },

  buyAutoFire(currency) {
    if (this.autoFire) return;
    if (currency === 'coins') {
      if (this.coinsEarned < 100) return;
      this.coinsEarned -= 100;
    } else {
      if (this.gems < 6) return;
      this.gems -= 6;
      Storage.set('gems', this.gems);
    }
    this.autoFire = true;
    Sound.powerup();
    this.showToast('🤖 自动射击已激活！');
    this.updateHUD();
    this.renderPauseContent();
  },

  buyInRunPowerUp(powerupId) {
    const pu = IN_RUN_POWERUPS.find(p => p.id === powerupId);
    if (!pu) return;
    if (this.coinsEarned < pu.cost) return;

    this.coinsEarned -= pu.cost;
    pu.apply(this.player);
    Sound.powerup();
    spawnParticles(this.player.x, this.player.y, 10, '#ffd700', 4, 0.4);
    this.showToast('✅ ' + pu.desc);
    this.updateHUD();
    this.renderPauseContent();
  },

  showShop() {
    const coins = this.totalCoins;
    const gems = this.gems;
    document.getElementById('shop-coins').textContent = coins;
    document.getElementById('shop-gems').textContent = gems;

    // Upgrade items
    const shopItems = [
      { id: 'maxHp', name: '最大生命值 +10', desc: '提升生存能力', icon: '❤️', cost: 100, currency: 'coins', level: this.upgrades.maxHp, maxLevel: 20 },
      { id: 'speed', name: '移动速度 +6%', desc: '更灵活地走位', icon: '👟', cost: 150, currency: 'coins', level: this.upgrades.speed, maxLevel: 15 },
      { id: 'damage', name: '攻击力 +10%', desc: '更快消灭敌人', icon: '⚔️', cost: 150, currency: 'coins', level: this.upgrades.damage, maxLevel: 20 },
      { id: 'fireRate', name: '射速 +8%', desc: '更高频率射击', icon: '🎯', cost: 200, currency: 'coins', level: this.upgrades.fireRate, maxLevel: 15 },
      { id: 'coinGain', name: '金币加成 +10%', desc: '获得更多金币', icon: '🪙', cost: 100, currency: 'coins', level: this.upgrades.coinGain, maxLevel: 20 },
    ];

    let html = '';
    shopItems.forEach(item => {
      const cost = item.cost + item.level * item.cost * 0.5;
      const canBuy = item.currency === 'coins' ? coins >= cost : gems >= cost;
      const atMax = item.level >= item.maxLevel;
      html += `<div class="shop-item">
        <span style="font-size:1.5rem">${item.icon}</span>
        <div class="info">
          <div class="name">${item.name}</div>
          <div class="desc">${item.desc}</div>
          <div class="level">等级 ${item.level}/${item.maxLevel}</div>
        </div>
        <button class="btn-buy-coin" data-shop="${item.id}" data-cost="${Math.floor(cost)}"
          ${(!canBuy || atMax) ? 'disabled' : ''}>
          ${atMax ? '已满级' : '🪙 ' + Math.floor(cost)}
        </button>
      </div>`;
    });

    document.getElementById('shop-items').innerHTML = html;

    // Premium items
    document.getElementById('premium-items').innerHTML = `
      <div class="shop-item">
        <span style="font-size:1.5rem">🎫</span>
        <div class="info">
          <div class="name">复活令牌</div>
          <div class="desc">阵亡后可用于复活</div>
        </div>
        <button class="btn-buy-gem" id="btn-buy-token">
          💎 10
        </button>
      </div>
      <div class="shop-item">
        <span style="font-size:1.5rem">💎</span>
        <div class="info">
          <div class="name">钻石礼包</div>
          <div class="desc">50 钻石 + 2 复活令牌</div>
        </div>
        <button class="btn-buy-gem" id="btn-buy-gempack">
          💰 ¥6.00
        </button>
      </div>
    `;

    // Bind events
    document.querySelectorAll('#shop-items button[data-shop]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.shop;
        const cost = parseInt(btn.dataset.cost);
        this.buyUpgrade(id, cost);
      });
    });

    document.getElementById('btn-buy-token').addEventListener('click', () => {
      if (this.gems >= 10) {
        this.gems -= 10;
        this.reviveTokens += 1;
        Storage.set('gems', this.gems);
        Storage.set('reviveTokens', this.reviveTokens);
        this.showToast('🎫 获得 1 个复活令牌！');
        this.showShop();
      } else {
        this.showToast('💎 钻石不足！');
      }
    });

    document.getElementById('btn-buy-gempack').addEventListener('click', () => {
      // Simulate purchase
      if (confirm('模拟购买：钻石礼包 ¥6.00\n\n（在实际部署中，这里将接入支付SDK）\n\n点击确定模拟购买成功')) {
        this.gems += 50;
        this.reviveTokens += 2;
        Storage.set('gems', this.gems);
        Storage.set('reviveTokens', this.reviveTokens);
        this.showToast('✅ 购买成功！获得 50 钻石 + 2 复活令牌');
        this.showShop();
      }
    });

    // Coin shop items
    const coinShopItems = [
      { coins: 100, cost: 5, icon: '🪙', label: '100 金币' },
      { coins: 300, cost: 12, icon: '💰', label: '300 金币' },
      { coins: 800, cost: 28, icon: '💎', label: '800 金币' },
      { coins: 2000, cost: 60, icon: '👑', label: '2000 金币' },
    ];

    document.getElementById('coin-shop-items').innerHTML = coinShopItems.map((item, idx) => `
      <div class="shop-item">
        <span style="font-size:1.5rem">${item.icon}</span>
        <div class="info">
          <div class="name">${item.label}</div>
          <div class="desc">消耗 ${item.cost} 钻石</div>
        </div>
        <button class="btn-buy-gem" id="btn-buy-coins-${idx}">
          💎 ${item.cost}
        </button>
      </div>
    `).join('');

    coinShopItems.forEach((item, idx) => {
      document.getElementById('btn-buy-coins-' + idx).addEventListener('click', () => {
        if (this.gems >= item.cost) {
          this.gems -= item.cost;
          this.totalCoins += item.coins;
          Storage.set('gems', this.gems);
          Storage.set('totalCoins', this.totalCoins);
          Sound.powerup();
          this.showToast(`✅ 获得 ${item.coins} 金币！`);
          this.showShop();
        } else {
          this.showToast('💎 钻石不足！');
        }
      });
    });

    this.showScreen('shop-screen');
  },

  buyUpgrade(id, cost, fromPause = false) {
    if (this.totalCoins < cost) return;
    this.totalCoins -= cost;
    this.upgrades[id] = (this.upgrades[id] || 0) + 1;
    Storage.set('totalCoins', this.totalCoins);
    Storage.set('upgrades', this.upgrades);
    this.applyUpgrades();
    Sound.powerup();
    this.showToast('✅ 升级成功！');
    if (fromPause) {
      this.updateMenuStats();
      this.renderPauseContent();
    } else {
      this.showShop();
    }
  },

  showDaily() {
    const today = new Date().toDateString();
    const claimed = this.lastDailyClaim === today;
    const rewards = [
      { coins: 50, icon: '🪙' },
      { coins: 100, icon: '🪙' },
      { coins: 150, gems: 1, icon: '💎' },
      { coins: 200, icon: '🪙' },
      { coins: 250, gems: 2, icon: '💎' },
      { coins: 300, icon: '🪙' },
      { coins: 500, gems: 5, reviveToken: 1, icon: '🎁' },
    ];

    let html = '';
    rewards.forEach((r, i) => {
      let cls = '';
      if (i < this.dailyStreak) cls = 'claimed';
      if (i === this.dailyStreak && !claimed) cls = 'today';
      if (i > this.dailyStreak) cls = '';
      if (claimed && i === this.dailyStreak) cls = 'claimed';

      let label = '';
      if (r.coins) label += r.coins + '🪙';
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
        if (reward.coins) msg += reward.coins + ' 金币 ';
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
    document.getElementById('menu-coins').textContent = this.totalCoins;
    document.getElementById('menu-gems').textContent = this.gems;
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
    document.getElementById('weapon-indicator').textContent = weapon.icon + ' ' + weapon.name;
    document.getElementById('wave-display').textContent = `第 ${this.wave} 波`;
    document.getElementById('enemy-count').textContent = `敌人: ${this.enemiesRemaining}`;
    document.getElementById('score-display').textContent = this.score;
    document.getElementById('coin-display-hud').textContent = this.coinsEarned;
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

    // Update coins
    for (let i = coins.length - 1; i >= 0; i--) {
      coins[i].update(dt);
      if (coins[i].dead) {
        coins.splice(i, 1);
        continue;
      }
      const d = dist(coins[i], p);
      const pickupRange = 20 + (p.magnetActive > 0 ? CFG.COIN_MAGNET_RANGE : 0);
      if (d < coins[i].radius + pickupRange) {
        // Magnet pull
        if (p.magnetActive > 0 && d > 20) {
          const a = angle(coins[i], p);
          coins[i].x += Math.cos(a) * 300 * dt;
          coins[i].y += Math.sin(a) * 300 * dt;
        }
        if (d < coins[i].radius + 20) {
          const coinGainMult = 1 + (this.upgrades.coinGain || 0) * 0.1;
          const val = Math.round(coins[i].value * coinGainMult);
          this.coinsEarned += val;
          this.score += val;
          Sound.coin();
          coins.splice(i, 1);
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
      document.getElementById('death-coins').textContent = this.coinsEarned;
      document.getElementById('revive-token-count').textContent = this.reviveTokens + '个';
      document.getElementById('btn-revive-ad').style.display = this.adWatched ? 'none' : 'block';
      document.getElementById('btn-revive-token').style.display = this.reviveTokens > 0 ? 'block' : 'none';
      document.getElementById('death-hint').textContent = this.reviveUsed
        ? '本局已复活过一次，再次阵亡无法复活'
        : '';
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
      // Draw coins
      coins.forEach(c => c.draw(ctx));

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

// Check for pending revives (would be server-side in production)
const pendingRevives = Storage.get('pendingRevives', []);
if (pendingRevives.length > 0) {
  // In production, check if any pending revive is for this player
  // For demo, we just note it
  const myId = Storage.getPlayerId();
  const myRevives = pendingRevives.filter(r => r.to === myId);
  if (myRevives.length > 0 && game.reviveTokens <= 0) {
    game.reviveTokens += myRevives.length;
    Storage.set('reviveTokens', game.reviveTokens);
    // Clear processed
    Storage.set('pendingRevives', pendingRevives.filter(r => r.to !== myId));
  }
}

console.log('%c🎮 生存竞技场已就绪 %c| %cPlayer ID: ' + Storage.getPlayerId(),
  'font-size:16px;color:#e94560', '', 'color:#888');
console.log('%c💡 提示: %c邀请好友通过你的链接加入，可以获得复活令牌！',
  'color:#f0c040', 'color:#888');
console.log('%c🔗 你的分享链接: %c' + game.generateShareLink(),
  'color:#3498db', 'color:#888');
