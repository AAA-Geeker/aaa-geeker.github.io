# Survival Arena - 生存竞技场

A feature-rich top-down wave survival shooter built with vanilla HTML5 Canvas. Deployable directly to GitHub Pages.

## Play Now

Just open `index.html` in any modern browser, or deploy to GitHub Pages.

## GitHub Pages Deployment

1. Push this folder to a GitHub repository
2. Go to Settings → Pages
3. Set source to `main` branch, root folder
4. Save — your game is live!

## Game Features

### Core Gameplay
- **WASD movement** + **mouse aiming** with auto-fire
- **Space dash** for emergency evasion
- **5 enemy types**: Grunts, Runners, Tanks, Shooters, and Bosses
- **Boss waves** every 5 waves with projectile patterns
- **Screen shake** and particle effects for impactful combat

### Progression System
- **6 upgrade paths**: Max HP, Speed, Damage, Fire Rate, Coin Gain
- **Unlockable skins** with premium (diamond) currency
- **Daily reward system** (7-day streak with escalating rewards)
- **Combo system** — chain kills for bonus score and coins

### Power-ups
- ❤️ Health restore
- ⚡ Speed boost
- 💥 Double damage
- 🛡️ Shield
- 🧲 Coin magnet
- 💰 Coin bag
- 💎 Rare gem drop

### Viral Mechanics (Spread & Retention)
- **Friend referral system**: Share a unique link, friends get 50 bonus coins on join
- **Revive tokens**: Earned when friends join via your link
- **Multiple revive options** on death:
  - 📺 Watch an ad (simulated countdown, free)
  - 🎫 Use a revive token (earned via referrals)
  - 👥 Invite a friend to revive you
  - 💎 Spend premium diamonds

### Monetization Hooks
- **Dual currency**: Coins (earned in-game) + Diamonds (premium)
- **Skin shop**: Cosmetic skins purchasable with diamonds
- **Revive tokens**: Sold for diamonds in the shop
- **Diamond packs**: Simulated IAP ($6 for 50 diamonds + 2 tokens)
- **Ad placements**: Simulated 15-second ad for free revive

## File Structure

```
shooting-game/
├── index.html      # Main HTML with all UI screens
├── css/
│   └── style.css   # Game styling and animations
├── js/
│   └── game.js     # Complete game engine
└── README.md
```

## Customization

- **Ad duration**: Change `CFG.AD_DURATION` in `js/game.js`
- **Enemy stats**: Modify `ENEMY_TYPES` object
- **Shop prices**: Edit costs in `showShop()` method
- **Add real ads**: Replace the ad countdown logic with your ad SDK
- **Add real payments**: Replace the confirm-based purchase simulation with Stripe/WeChat Pay

## Tech Stack

- HTML5 Canvas for rendering
- Web Audio API for sound effects
- localStorage for persistence
- Zero dependencies
