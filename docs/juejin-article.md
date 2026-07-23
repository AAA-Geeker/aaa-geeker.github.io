# 🎮 我从零写了一个完整的商业级网页射击游戏，附全栈架构解析

> 纯 JavaScript + Canvas，零框架依赖 · Supabase 后端 · 跨设备好友复活 · 移动端适配 · 数据面板

---

## 项目背景

作为一个全栈开发者，我一直想挑战一个命题：**能不能用最"裸"的技术栈，做出一个有商业水准的网页游戏？**

不用 React，不用 Vue，不用任何框架。就用 HTML + CSS + JavaScript + Canvas。后端用 Supabase 的 REST API 直连，连 SDK 都不引入。

结果就是 **"生存竞技场"** — 一款功能完整的 2D 俯视角波次生存射击游戏。

🔗 试玩地址：[你的链接]

---

## 一、技术全景

```
游戏引擎（Vanilla JS ~4200行）
├── Canvas 2D 渲染层（粒子系统 + 实体系统 + 游戏循环）
├── Supabase REST API（好友复活 + 数据埋点）
├── AdManager 插件化广告（Monetag / 微信 / 模拟）
├── Service Worker（PWA 离线缓存）
└── 响应式 UI（PC + 手机触控 + 深色主题）
```

**关键数字：**
- 0 个 JS 框架依赖
- 4200+ 行游戏引擎代码
- 5 种敌人、4 种武器、6 款皮肤、12 项成就
- 完整的双货币经济系统 + IAP 模拟 + 广告集成

---

## 二、游戏引擎核心实现

### 2.1 实体系统与游戏循环

游戏基于经典的 **Entity-Update-Render** 循环：

```javascript
loop(timestamp) {
  requestAnimationFrame(t => this.loop(t));
  const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
  this.lastTime = timestamp;
  this.update(dt);  // 更新所有实体
  this.render();    // 绘制帧
}
```

关键设计：
- **Delta-time 上限**：用 `Math.min(dt, 0.05)` 防止标签页切换后的大跳帧
- **实体优先级**：Projectile → Enemy → PowerUp → Star → Particle，按重要性处理碰撞

### 2.2 波次生成算法

```javascript
// 敌人数量随波次指数增长
const gruntCount = 4 + waveNum * 3;
const runnerCount = Math.max(0, Math.floor(waveNum * 1.5) - 1);
const tankCount = Math.max(0, Math.floor(waveNum / 3));
const shooterCount = Math.max(0, Math.floor((waveNum - 2) / 2));
```

每 5 波触发 BOSS 战，BOSS 有 3 方向弹幕 + 护卫敌人。敌人 HP 和伤害按 `1 + waveNum * 0.08` 倍率递增。

### 2.3 武器系统

4 种武器各有独立的属性倍率和升级路径：

| 武器 | 伤害倍率 | 射速倍率 | 特殊属性 | 升级维度 |
|------|---------|---------|---------|---------|
| 🔫 手枪 | x1.0 | x1.0 | 平衡 | 伤害 / 射速 / 弹丸数 |
| 💥 霰弹枪 | x0.35 | x0.5 | 5 发散射 | 伤害 / 射速 / 精准 |
| ⚡ 冲锋枪 | x0.55 | x2.8 | 极高射速 | 伤害 / 射速 / 散布 |
| 🎯 狙击枪 | x3.0 | x0.35 | 一击制敌 | 伤害 / 射速 / 穿透 |

武器永久解锁，跨局保留，通过局内星星购买。

---

## 三、跨设备好友复活 — 技术深度解析

这是整个游戏最有技术含量的系统。

### 3.1 业务场景

- Player A 阵亡 → 生成专属分享链接
- Player B（好友）在**不同设备**上点击链接
- Player A 核验成功 → 满血复活 + 双方获得奖励

**挑战**：如何在纯前端架构中，让两个不同设备的浏览器感知彼此的状态？

### 3.2 架构设计

```
Player A (设备1)                 Supabase               Player B (设备2)
      │                             │                         │
      │──①死亡, 生成链接─────────────│                         │
      │  ?ref=A_id&sid=session123   │                         │
      │                             │                         │
      │                             │←──②B点击链接, 登录──────│
      │                             │  INSERT pending_revives │
      │                             │  (from=B, to=A)         │
      │                             │                         │
      │──③核验, 轮询Supabase────────→│                         │
      │  SELECT * WHERE to_player=A │                         │
      │  AND from_player ends with  │                         │
      │  '::session123'            │                         │
      │                             │                         │
      │←──④找到匹配, DELETE记录──────│                         │
      │                             │                         │
      │──⑤满血复活 + 奖励────────────│                         │
```

### 3.3 三个关键技术点

**1. 会话感知的链接生成**

每次死亡生成唯一的 `_reviveSessionId`，嵌入分享 URL：
```
https://game.com/?ref=player_a_id&sid=rs_abc123_def456
```

核验时精确匹配 session ID，防止同一个好友链接被重复使用。

**2. 三层防自刷机制**

```javascript
// Layer 1: 同设备检测
if (refId === Storage.getPlayerId()) return;

// Layer 2: 跨设备检测（手机号/邮箱 hash）
const crossDeviceKey = Auth.getCrossDeviceKey();
if (crossDeviceKey && refId === crossDeviceKey) return;

// Layer 3: 本地历史追踪（跨会话，含隐身模式）
const allLocalIds = Storage.get('allLocalIds', []);
if (allLocalIds.includes(refId)) return;

// Layer 4: 数据库层拦截
if (fromPlayerId === toPlayerId) return;
```

**3. 轮询核验 + 后台拉取**

- **主动核验**：好友弹窗中，8 次轮询 Supabase（每次 1.5s 间隔），共 12 秒窗口
- **后台拉取**：游戏进行中每 15 秒自动查询一次，有新 revive 时弹出 Toast 通知
- **自动认领**：阵亡时自动检查并消费 pending revives，支持会话匹配

### 3.4 为什么不用 WebSocket？

选择轮询而非 WebSocket 的原因：
1. **零成本部署**：Supabase REST API 不需要额外的实时服务
2. **可靠性**：轮询天然容忍网络波动，不会因连接断开丢失事件
3. **够用**：好友复活的时延容忍度在秒级，15 秒拉取间隔完全满足

---

## 四、移动端适配策略

### 4.1 触控系统

```
┌──────────────────────────────┐
│  📱 横屏游戏区域              │
│                              │
│   [虚拟摇杆]     [触控瞄准区]  │
│   (左 1/3)      (右 2/3)     │
│                              │
│   💨闪避 🔄武器  🔫射击 ⏸暂停 │
└──────────────────────────────┘
```

- **虚拟摇杆**：左半屏触控，映射 WASD 键盘事件
- **触控瞄准**：右半屏触控移动准星 + 自动射击
- **滑动手势**：快速滑动触发闪避（>50px 在 <300ms 内）
- **按键共存**：两种方式同时可用

### 4.2 性能优化

```javascript
// 移动端自动降采样
const isNarrow = canvas.width < 768;
const gridSize = isNarrow ? 70 : 50;        // 减少网格线绘制
if (!isNarrow) { /* 径向渐变背景 */ }       // 跳过昂贵的渐变
if (!isNarrow) { /* 准星绘制 */ }           // 手指遮挡，不需要准星
if (window.innerWidth < 768 && particles.length > 100) return; // 粒子上限
```

### 4.3 其他细节
- **安全区适配**：`env(safe-area-inset-*)` 支持刘海屏
- **横屏提示**：竖屏游戏时显示旋转建议
- **触摸目标**：所有按钮 ≥ 44px（WCAG 标准）
- **防缩放**：`user-scalable=no` + `touch-action: manipulation`

---

## 五、广告集成 & 变现设计

### 5.1 插件化 AdManager

```javascript
// 三种广告模式自动检测切换
AdManager → detectEnv() → {
  wechat:   WeChatAdProvider    // 微信小游戏激励视频
  web_sdk:  MonetagAdProvider   // Monetag 插屏广告
  default:  SimulatedAdProvider // 15 秒倒计时模拟
}
```

### 5.2 反作弊保护

```javascript
// Monetag 广告 + 计时器双重保障
showRewardedVideo(callbacks) {
  // 1. 尝试展示真实广告（best-effort）
  showFn().then(() => resolveAd(callbacks)).catch(() => {});

  // 2. 计时器始终运行（anti-abuse）
  let remaining = 15;
  setInterval(() => {
    remaining--;
    if (remaining <= 0 && !adResolved) resolveAd(callbacks);
  }, 1000);
}
```

即使用户拦截了广告，也必须等待 15 秒才能获得复活奖励。这保护了广告变现的商业模型。

---

## 六、数据埋点 & 分析

### 6.1 事件追踪

```javascript
Analytics.track('game_end', {
  score, wave, kills, starsEarned,
  duration_sec, weapon_used, revived, reviveMethod
});
```

### 6.2 批量上报

```javascript
// 非关键事件 5 秒批量发送
_flushTimer = setInterval(() => this._flush(), 5000);

// 关键事件（purchase, death, login）立即发送
if (criticalEvents.includes(eventType)) this._flush(true);
```

### 6.3 实时数据面板

`dashboard.html` 提供独立的数据分析面板：
- KPI 卡片：活跃玩家、对局数、死亡/复活率、广告填充率
- 转化漏斗：开局 → 死亡 → 广告复活 → 好友复活
- 玩法数据：死亡波次分布、武器使用率
- 时间筛选：今日 / 近7天 / 近30天 / 全部

---

## 七、经验总结

### ✅ 做对了什么
1. **零框架是正确的选择** — Vanilla JS 在这种规模的项目中完全可控，没有构建工具链的负担
2. **Supabase REST API 足够好用** — 不需要 WebSocket，轮询在秒级延迟场景中表现得很好
3. **Canvas 性能在移动端也足够** — 通过简单的降采样优化，中低端手机也能跑 60fps

### ⚠️ 踩过的坑
1. **移动端触控** — iOS Safari 的 `touch-action` 和 `visualViewport` 行为与 Android Chrome 不同，需要大量调试
2. **跨设备状态同步** — localStorage 只在同设备有效，需要 Supabase 作为"云端信使"
3. **广告填充率** — Monetag 在某些地区填充率低，计时器 fallback 机制是必要的

### 🔮 未来规划
- WebSocket 实时多人联机合作模式
- 更多 BOSS 设计和攻击模式
- Unity/WebGL 迁移路径探索
- 完整的音效系统（背景音乐 + 更多音效）

---

## 链接

- 🎮 [立即试玩](你的链接)
- 📊 [数据面板](你的链接/dashboard.html)
- 📦 [GitHub 仓库](你的 GitHub 链接)

---

> 如果你觉得这个项目有意思，欢迎 ⭐ Star 和分享给朋友！有任何问题或建议，欢迎提 Issue。
