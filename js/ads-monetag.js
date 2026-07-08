// ============================================================
// MONETAG AD PROVIDER — Real Rewarded Interstitial Ads for Web
// ============================================================
// This file sets window.__AD_PROVIDER__ before game.js loads.
// AdManager.detectEnv() picks it up and switches to web_sdk mode.
//
// HOW IT WORKS:
//   Monetag provides a "vignette" script that creates a global
//   show_<zoneId>() function returning a Promise.
//     → Promise resolves = user completed the ad
//     → Promise rejects  = no fill / error
//
//   This provider loads the vignette script dynamically in init(),
//   then calls show_<zoneId>() when the user requests a rewarded ad.
//   A 15-second countdown timer ALWAYS runs as fallback — this is
//   the anti-abuse guarantee: users must either watch a real ad OR
//   wait the full duration to get a reward.
//
// SETUP:
//   1. Register at https://monetag.com
//   2. Add your site, get a Zone ID (number) and delivery domain
//   3. Set AD_CONFIG.zoneId below
//   4. Set AD_CONFIG.domain below (from your Monetag dashboard)
//   5. Update zoneId in sw.js to match
// ============================================================

const AD_CONFIG = {
  // --- REQUIRED: Your Monetag zone ID (number, not string) ---
  zoneId: 11255315,

  // --- Monetag delivery domain (from dashboard > Sites > Site Settings) ---
  domain: 'n6wxm.com',

  // --- Timer fallback duration in seconds (must match CFG.AD_DURATION) ---
  adDuration: 15,

  // --- Master kill switch: false = timer-only dev mode ---
  monetagEnabled: true,
};

// ============================================================
// MonetagAdProvider
// ============================================================
const MonetagAdProvider = {
  _initialized: false,
  _sdkReady: false,
  _sdkFailed: false,
  _sdkFnName: '',
  _interval: null,
  _adResolved: false,

  // --- Initialize: dynamically load Monetag vignette script ---
  init() {
    this._initialized = true;
    this._sdkFnName = 'show_' + AD_CONFIG.zoneId;

    if (!AD_CONFIG.monetagEnabled) {
      console.log('[MonetagAd] monetagEnabled=false — timer-only mode');
      return;
    }

    // Check if vignette script is already loaded (e.g. cached page)
    if (typeof window[this._sdkFnName] === 'function') {
      this._sdkReady = true;
      console.log('[MonetagAd] Vignette function already available:', this._sdkFnName);
      return;
    }

    // Build the vignette script URL
    const scriptUrl = 'https://' + AD_CONFIG.domain + '/vignette.min.js';
    console.log('[MonetagAd] Loading vignette SDK:', scriptUrl);

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.dataset.zone = String(AD_CONFIG.zoneId);
    script.dataset.sdk = this._sdkFnName;
    script.async = true;

    script.onload = () => {
      // Verify the global function was created
      if (typeof window[this._sdkFnName] === 'function') {
        this._sdkReady = true;
        console.log('[MonetagAd] ✅ Vignette SDK ready —', this._sdkFnName);
      } else {
        console.warn(
          '[MonetagAd] ⚠️ Vignette script loaded but %s not found — timer-only mode',
          this._sdkFnName
        );
      }
    };

    script.onerror = () => {
      this._sdkFailed = true;
      console.warn('[MonetagAd] ⚠️ Vignette SDK failed to load — timer-only mode');
    };

    document.head.appendChild(script);
  },

  // --- Always ready: timer fallback guarantees availability ---
  isReady() {
    return true;
  },

  // --- Show rewarded ad experience ---
  // callbacks: { onStart, onComplete, onError, onSkip }
  showRewardedVideo(callbacks) {
    const game = window._gameInstance;
    this._adResolved = false;

    // Notify game that ad experience started
    if (callbacks.onStart) callbacks.onStart();

    // Pause the game loop
    if (game && typeof game.pause === 'function') {
      game.pause();
    }

    // --- Handle missing game instance (simple timer fallback) ---
    if (!game) {
      console.warn('[MonetagAd] No game instance, using simple timer');
      setTimeout(() => {
        if (!this._adResolved && callbacks.onComplete) {
          this._adResolved = true;
          callbacks.onComplete();
        }
      }, AD_CONFIG.adDuration * 1000);
      return;
    }

    // --- Show the ad-modal UI ---
    game.showScreen('ad-modal');

    // Get DOM elements
    const fill = document.getElementById('ad-timer-fill');
    const text = document.getElementById('ad-timer-text');
    const placeholder = document.querySelector('.ad-placeholder');

    // Update placeholder content
    if (placeholder) {
      placeholder.innerHTML = `
        <p style="font-size:1.5rem;margin-bottom:8px;">🎮 广告播放中...</p>
        <p style="font-size:0.85rem;color:#888;">请勿关闭此页面</p>
        <p class="small" style="margin-top:16px;">赞助商广告位</p>
      `;
    }

    // ============================================================
    // Attempt to show real Monetag vignette ad (best-effort)
    // ============================================================
    if (this._sdkReady && AD_CONFIG.monetagEnabled) {
      const showFn = window[this._sdkFnName];
      if (typeof showFn === 'function') {
        console.log('[MonetagAd] 📺 Calling', this._sdkFnName + '()');

        showFn()
          .then(() => {
            // User completed the real ad
            console.log('[MonetagAd] ✅ Real ad completed');
            if (!this._adResolved) {
              this._resolveAd(callbacks);
            }
          })
          .catch((err) => {
            // No fill or error — normal, timer fallback handles it
            console.log('[MonetagAd] ℹ️ Ad no-fill or error:', err?.message || err);
          });
      }
    } else if (AD_CONFIG.monetagEnabled && !this._sdkReady && !this._sdkFailed) {
      // SDK still loading — give it a few seconds, then fall back
      console.log('[MonetagAd] ⏳ SDK still loading, will try in 2s...');
      const sdkFnName = this._sdkFnName;
      const self = this;
      setTimeout(() => {
        if (!self._adResolved && typeof window[sdkFnName] === 'function') {
          console.log('[MonetagAd] 📺 SDK now ready, calling', sdkFnName + '()');
          window[sdkFnName]()
            .then(() => {
              if (!self._adResolved) self._resolveAd(callbacks);
            })
            .catch(() => {}); // fallback handled by timer
        }
      }, 2000);
    }

    // ============================================================
    // Start countdown timer (ALWAYS runs — anti-abuse enforcement)
    // ============================================================
    let remaining = AD_CONFIG.adDuration;
    if (text) text.textContent = '剩余 ' + remaining + ' 秒';
    if (fill) fill.style.width = '0%';

    this._interval = setInterval(() => {
      remaining--;
      const pct = ((AD_CONFIG.adDuration - remaining) / AD_CONFIG.adDuration) * 100;
      if (fill) fill.style.width = pct + '%';
      if (text) text.textContent = '剩余 ' + remaining + ' 秒';

      if (remaining <= 0) {
        // Timer expired — reward user (if not already rewarded by real ad)
        if (!this._adResolved) {
          this._resolveAd(callbacks);
        }
      }
    }, 1000);
  },

  // --- Internal: grant reward and clean up ---
  _resolveAd(callbacks) {
    this._adResolved = true;

    // Clear the countdown timer
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }

    // Hide the ad modal
    const modal = document.getElementById('ad-modal');
    if (modal) modal.classList.add('hidden');

    // Resume game if paused
    const game = window._gameInstance;
    if (game && typeof game.resume === 'function') {
      game.resume();
    }

    // Grant reward
    if (callbacks.onComplete) callbacks.onComplete();
  },

  // --- Cleanup ---
  destroy() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this._adResolved = false;
  },
};

// ============================================================
// Register the provider with AdManager
// AdManager.detectEnv() checks for window.__AD_PROVIDER__.showRewardedVideo
// ============================================================
window.__AD_PROVIDER__ = MonetagAdProvider;

console.log('[MonetagAd] Provider registered — AdManager will auto-detect on init');
