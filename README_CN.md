# 🔥 生存竞技场 Survival Arena

> 一款从零手写的 2D 俯视角波次生存射击游戏，浏览器即玩，手机电脑双端通用。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Mobile-brightgreen.svg)]()
[![Tech](https://img.shields.io/badge/tech-Vanilla%20JS%20%2B%20Canvas-orange.svg)]()

---

## 🎮 立刻游玩

👉 **在线地址**: [https://your-game-url.com](https://your-game-url.com)

直接用现代浏览器打开 `index.html`，或部署到 GitHub Pages 即可开始游戏。手机浏览器也能玩！

---

## ✨ 游戏特色

### 🎯 核心玩法
- **WASD + 鼠标** 操控，支持自动射击模块
- **空格冲刺** 紧急闪避，手机端支持**滑动手势闪避**
- **5 种敌人**：小兵、疾行者、重装兵、射手、BOSS
- **每 5 波 BOSS 战**，弹幕攻击 + 护卫敌人
- **屏幕震动 + 粒子特效**，爽快战斗反馈
- **4 种武器**：手枪、霰弹枪、冲锋枪、狙击枪 — 各有独立升级树

### 📱 双端完美适配
- **PC 端**：键鼠操作，精准瞄准
- **手机端**：虚拟摇杆 + 触控瞄准 + 自动射击 + 滑动手势闪避
- **自适应布局**：横屏/竖屏、刘海屏安全区、响应式 UI
- **Canvas GPU 优化**：移动端自动降采样，保证 60fps 流畅体验

### 👥 社交裂变 — 好友复活系统
游戏最大的特色机制！跨设备、跨平台的好友复活：
1. 阵亡后生成**专属分享链接**（含唯一会话 ID）
2. 好友点击链接进入游戏 → 自动写入 Supabase 云端
3. 核验通过即可**满血复活 + 3 秒无敌护盾**
4. 复活双方均获**50 金币 + 5 钻石**奖励
5. **三层防自刷机制**：设备 ID · 账号哈希 · 本地历史记录

### 🏆 段位 & 成就
- **5 大段位**：🥉 青铜 → 🥈 白银 → 🥇 黄金 → 💎 钻石 → 👑 传说
- **12 项成就**：击杀、波次、连杀、武器收集、签到等
- **每日挑战**：每天随机分数目标，达成领钻

### 💰 双货币经济系统
- **星星 ⭐**：局内获取，用于解锁武器和道具
- **金币 🪙**：跨局积累，用于属性升级
- **钻石 💎**：高级货币，用于皮肤、复活令牌、金币兑换

### 🎨 6 款可解锁皮肤
默认战士 · 烈焰使者 · 暗影刺客 · 黄金骑士 · 霓虹战士 · 虚空领主

---

## 🏗️ 技术架构

```
shooting-game/
├── index.html          # 单一 HTML，包含全部 UI 界面
├── css/
│   └── style.css       # 完整响应式样式 + 触控布局
├── js/
│   ├── game.js         # 完整游戏引擎 (~4200 行)
│   ├── supabase-db.js  # Supabase REST API（零依赖）
│   ├── analytics.js    # 数据埋点 & 批量上报
│   └── ads-monetag.js  # Monetag 广告集成
├── sql/
│   └── create_pending_revives.sql  # 跨设备复活数据库表
├── dashboard.html      # 独立数据分析面板
├── sw.js               # Service Worker（广告缓存）
└── CNAME               # 自定义域名
```

### 技术亮点

| 特性 | 实现 |
|------|------|
| **零框架依赖** | 纯 Vanilla JS，无 React/Vue/jQuery |
| **Canvas 2D 渲染** | 自研粒子系统、实体系统、游戏循环 |
| **Supabase 后端** | REST API 直连，无 SDK 依赖 |
| **插件化广告** | AdManager 支持模拟/微信/Web SDK 三种模式 |
| **跨设备数据同步** | 基于 Supabase 的好友复活 + URL 参数传递 |
| **移动端触控** | 虚拟摇杆 + 触控瞄准 + 滑动手势 |
| **数据分析** | 事件埋点 → Supabase → 实时 Dashboard |
| **PWA 支持** | Service Worker + 离线缓存 |

### 商业化设计
- **广告变现**：Monetag 插屏广告（15 秒倒计时 + 反作弊保护）
- **IAP 内购**：钻石充值模拟（6 档礼包，¥6-¥128）
- **社交裂变**：好友复活机制驱动自然增长
- **留存设计**：7 天签到、每日挑战、段位爬升、成就系统

---

## 🚀 部署指南

### GitHub Pages（推荐）
```bash
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/shooting-game.git
git push -u origin main
# Settings → Pages → Source: main branch → Save
```

### 配置 Supabase
1. 注册 [supabase.com](https://supabase.com)，创建项目
2. 在 SQL Editor 中执行 `sql/create_pending_revives.sql`
3. 在 `js/supabase-db.js` 中更新 `SUPABASE_URL` 和 `SUPABASE_KEY`
4. 同样更新 `dashboard.html` 中的 Supabase 配置
5. （可选）执行 `sql/create_tables.sql` 创建事件分析表

### 配置 Monetag 广告
1. 注册 [monetag.com](https://monetag.com)，添加站点
2. 在 `js/ads-monetag.js` 中更新 `AD_CONFIG.zoneId` 和 `AD_CONFIG.domain`
3. 在 `sw.js` 和 `index.html` 的 meta 标签中更新 zone ID

---

## 🔧 自定义

- **游戏参数**：修改 `js/game.js` 顶部的 `CFG` 对象
- **敌人属性**：修改 `ENEMY_TYPES` 对象
- **武器系统**：修改 `WEAPONS` 对象
- **商店价格**：修改 `showShop()` 方法
- **接入真实支付**：将 `confirm()` 模拟替换为 Stripe / 微信支付 SDK
- **统计面板**：打开 `dashboard.html` 查看实时数据分析

---

## 📣 分享 & 推广

### 朋友圈/微信群 短文案
```
🔥 推荐一个可以在浏览器直接玩的射击游戏！
手机电脑都能玩，支持好友复活，来挑战我的最高分吧！
👉 [你的游戏链接]
```

### 开发者社区（掘金）
> 纯 JavaScript + Canvas 打造商业级网页射击游戏，附全栈架构解析。
> 零框架 · Supabase 后端 · 跨设备好友复活 · 移动端适配 · 数据面板。

### 游戏社区（其乐/Keylol）
> 【独立游戏】生存竞技场 - 浏览器即玩的 Roguelike 射击游戏
> 免费在线游玩，支持好友跨设备复活，冲击排行榜！

---

## 📄 License

MIT — 自由使用、修改和分发。
