# 🚀 发布指南 — 生存竞技场

## 前置准备

### 1. Supabase 数据库建表

登录 [Supabase 控制台](https://supabase.com/dashboard/project/jafbdgiupihatjfebdvq)，进入 **SQL Editor**，执行 `sql/create_tables.sql` 中的全部内容。

核心建表语句：

```sql
CREATE TABLE IF NOT EXISTS game_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  event_type    TEXT NOT NULL,
  player_id     TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  event_data    JSONB DEFAULT '{}',
  timestamp     TIMESTAMPTZ NOT NULL,
  user_agent    TEXT,
  screen_size   TEXT,
  language      TEXT,
  page_url      TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_type      ON game_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_player     ON game_events (player_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp  ON game_events (timestamp DESC);

ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert" ON game_events FOR INSERT WITH CHECK (true);
```

### 2. 检查 API 配置

确保以下文件中的 Supabase 配置正确：
- `js/supabase-db.js` — `SUPABASE_URL` / `SUPABASE_KEY`
- `js/analytics.js` — 复用上面的全局变量

> ⚠️ 注意：`SUPABASE_KEY` 必须是 **publishable key**（以 `sb_publishable_` 开头），**绝对不能**使用 `secret key`！

---

## 🌍 国际平台（海外用户）

### GitHub Pages（免费 · 全球 CDN）

```bash
git init
git add .
git commit -m "🎮 生存竞技场 v1.0"

# 在 GitHub 创建仓库后：
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main

# GitHub 仓库 → Settings → Pages
#   Source: Deploy from a branch
#   Branch: main → / (root) → Save
# 访问: https://你的用户名.github.io/仓库名/
```

### Vercel（免费 · 自动 HTTPS · 全球加速）

```bash
npm i -g vercel
vercel
# 按提示登录即可，自动获得 https://xxx.vercel.app
```

### Netlify（免费 · 拖拽部署）

访问 [netlify.com](https://netlify.com)，注册后将整个项目文件夹拖拽到页面即可。

### Cloudflare Pages（免费 · 全球节点 · 国内可访问）

1. 将代码推送到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Workers & Pages → Pages → 连接到 Git 仓库
4. 构建设置留空（纯静态），直接部署
5. 自动获得 `https://xxx.pages.dev` 域名

---

## 🇨🇳 国内平台（中国用户优先）

> 以下平台面向国内用户，访问速度快、免备案（部分）。

### Gitee Pages（码云 · 免费 · 国内首选）

[Gitee](https://gitee.com) 是国内的 GitHub 替代品，提供免费的静态页面托管。

```bash
# 1. 注册 Gitee 账号：https://gitee.com

# 2. 创建仓库，将代码推送到 Gitee：
git remote add gitee https://gitee.com/你的用户名/仓库名.git
git push gitee main

# 3. 在 Gitee 仓库页面 → 服务 → Gitee Pages
#    部署分支选 main，部署目录留空
#    点击"启动"

# 4. 访问：https://你的用户名.gitee.io/仓库名/

# 注意：Gitee Pages 需要实名认证才能启用
#      每次推送后需要手动点击"更新"按钮
```

### 腾讯云 COS 静态网站托管（按量付费 · 国内 CDN 加速）

适合有一定预算、需要专业分发的场景。

```
1. 登录腾讯云控制台 → 对象存储 COS
2. 创建存储桶（Bucket），访问权限选择"公有读私有写"
3. 开启"静态网站"功能，索引文档设为 index.html
4. 上传所有项目文件到存储桶根目录
5. （可选）绑定自定义域名 + CDN 加速
6. 获得域名：https://xxx.cos.ap-guangzhou.myqcloud.com/

月费用估算：1000 日活 ≈ 每月 5-15 元
```

### 阿里云 OSS 静态网站托管（按量付费 · 国内 CDN）

```
1. 登录阿里云控制台 → 对象存储 OSS
2. 创建 Bucket，读写权限设为"公共读"
3. 基础设置 → 静态页面 → 默认首页 index.html
4. 上传所有文件到 Bucket
5. （可选）绑定域名 + CDN 加速
6. 获得域名：https://xxx.oss-cn-hangzhou.aliyuncs.com/
```

### 七牛云 Kodo（按量付费 · 国内速度优秀）

```
1. 注册七牛云账号，新建空间（Bucket）
2. 空间权限设为"公开"
3. 上传所有文件
4. 绑定域名即可访问
5. 免费额度：10GB 存储 + 10GB/月 CDN 流量
```

### 又拍云（按量付费 · 国内 CDN）

```
1. 注册又拍云，创建云存储服务
2. 开启静态文件托管
3. 上传文件，绑定域名
4. 支持 HTTPS、自定义域名
```

---

## 📊 平台对比速览

| 平台 | 费用 | 国内速度 | 备案要求 | 推荐场景 |
|------|------|---------|---------|---------|
| **Gitee Pages** | 免费 | ⭐⭐⭐⭐⭐ | 实名认证 | 🥇 个人首选 |
| **GitHub Pages** | 免费 | ⭐⭐ | 无 | 海外用户 |
| **Vercel** | 免费 | ⭐⭐⭐ | 无 | 全球分发 |
| **Cloudflare Pages**| 免费 | ⭐⭐⭐ | 无 | 兼顾国内外 |
| **腾讯云 COS** | 低至¥5/月 | ⭐⭐⭐⭐⭐ | 域名备案 | 专业运营 |
| **阿里云 OSS** | 低至¥5/月 | ⭐⭐⭐⭐⭐ | 域名备案 | 专业运营 |
| **七牛云 Kodo** | 免费额度 | ⭐⭐⭐⭐⭐ | 需绑定域名 | 个人/小型 |
| **又拍云** | 低至¥0.29/GB | ⭐⭐⭐⭐⭐ | 域名备案 | CDN 分发 |

---

## 🎯 推荐策略

**初期引流**：Gitee Pages（主站）+ GitHub Pages（镜像），零成本覆盖国内外

**用户增长后**：迁移到腾讯云 COS / 七牛云，自定义域名 + CDN 加速

**进阶运营**：绑定自己的域名（如 `survival-arena.cn`），配置全站 HTTPS

---

## 📈 数据分析

部署后，游戏会自动追踪以下数据并存入 Supabase `game_events` 表：

| 事件类别 | 追踪内容 |
|---------|---------|
| 👤 用户 | 登录方式、活跃玩家数、会话数 |
| 🎮 游戏 | 开局数、死亡波次、得分、时长、武器选择 |
| 🔄 复活 | 广告/令牌/好友/钻石 — 各方式分布与转化漏斗 |
| 🛒 变现 | 商店购买、皮肤购买、武器升级 — 收入分析 |
| 📅 留存 | 每日签到、连签天数 — 用户粘性 |
| 🏆 成就 | 成就解锁进度 — 用户进阶路径 |

### 数据分析面板

打开 `https://你的域名/dashboard.html` 查看实时数据面板，包含：
- 📈 KPI 指标卡（玩家、对局、复活、变现）
- 🔄 复活转化漏斗可视化
- 💀 死亡波次分布（难度平衡参考）
- 🔫 武器使用率排行
- 🛒 商品购买排行榜
- ⏱️ 今日 / 近7天 / 近30天 / 全部 时间筛选

### 常用 SQL 分析

```sql
-- 📊 每日活跃玩家 (DAU)
SELECT DATE(timestamp) as 日期, COUNT(DISTINCT player_id) as 日活
FROM game_events
GROUP BY 日期 ORDER BY 日期 DESC;

-- 🔄 复活转化率
SELECT
  COUNT(*) FILTER (WHERE event_type='death')  as 死亡次数,
  COUNT(*) FILTER (WHERE event_type='revive') as 复活次数,
  ROUND(COUNT(*) FILTER (WHERE event_type='revive') * 100.0
    / NULLIF(COUNT(*) FILTER (WHERE event_type='death'), 0), 1) as 复活率
FROM game_events;

-- 💰 收入相关（广告 + 钻石消耗）
SELECT
  COUNT(*) FILTER (WHERE event_type='ad_watched') as 广告观看,
  COUNT(*) FILTER (WHERE event_type='purchase')  as 购买次数,
  COUNT(*) FILTER (WHERE event_type='revive'
    AND event_data->>'method' = 'gems')          as 钻石复活
FROM game_events;

-- 🎯 各复活方式使用率
SELECT event_data->>'method' as 复活方式, COUNT(*) as 次数
FROM game_events WHERE event_type='revive'
GROUP BY 复活方式 ORDER BY 次数 DESC;

-- 💀 玩家在哪个波次死最多
SELECT (event_data->>'wave')::int as 死亡波次, COUNT(*) as 死亡数
FROM game_events WHERE event_type='death'
GROUP BY 死亡波次 ORDER BY 死亡波次;

-- 🔫 最受欢迎的武器
SELECT event_data->>'weapon_used' as 武器, COUNT(*) as 使用次数
FROM game_events WHERE event_type='game_end'
GROUP BY 武器 ORDER BY 使用次数 DESC;

-- 📅 7日留存（按首次出现日期分组）
WITH first_seen AS (
  SELECT player_id, MIN(DATE(timestamp)) as 首日
  FROM game_events GROUP BY player_id
)
SELECT 首日, COUNT(DISTINCT e.player_id) as 留存玩家
FROM game_events e
JOIN first_seen f ON e.player_id = f.player_id
WHERE DATE(e.timestamp) = f.首日 + INTERVAL '6 days'
GROUP BY 首日 ORDER BY 首日 DESC;
```

---

## 📁 项目文件清单

```
shooting-game/
├── index.html           # 🎮 主游戏页面
├── dashboard.html       # 📊 数据分析面板（中文）
├── PUBLISH.md           # 📘 发布指南（本文件）
├── css/
│   └── style.css        # 样式表
├── js/
│   ├── game.js          # 游戏主逻辑
│   ├── analytics.js     # 分析埋点模块
│   ├── supabase-db.js   # Supabase 数据库操作
│   └── ads-monetag.js   # Monetag 广告集成
├── sql/
│   └── create_tables.sql # 数据库建表 SQL
├── sw.js                # Service Worker
└── README.md            # 项目说明
```
