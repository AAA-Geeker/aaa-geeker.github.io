// ============================================================
// Supabase 数据库操作 — 纯 REST API (零依赖, 无 SDK)
// ============================================================
// URL & Key 从 Supabase Dashboard → Settings → API 获取
// ============================================================

const SUPABASE_URL = 'https://jafbdgiupihatjfebdvq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HB7mHMXkvM6-I7ALRhMxXw_KAHAacNx';
const TABLE = 'pending_revives';

const SupabaseDB = {
  _base: SUPABASE_URL + '/rest/v1/' + TABLE,

  _headers() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    };
  },

  // ---- 写入复活令牌 ----
  async addRevive(fromPlayerId, toPlayerId) {
    const body = JSON.stringify({
      from_player: fromPlayerId,
      to_player: toPlayerId,
      time: Date.now(),
    });

    console.log('[DB] INSERT →', { from_player: fromPlayerId, to_player: toPlayerId });

    const res = await fetch(this._base, {
      method: 'POST',
      headers: { ...this._headers(), 'Prefer': 'return=representation' },
      body: body,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[DB] INSERT failed:', res.status, errText);
      throw new Error('HTTP ' + res.status + ': ' + errText);
    }

    const data = await res.json();
    console.log('[DB] ✅ INSERT success, id:', data[0]?.id || '?');
    return data;
  },

  // ---- 查询我的复活令牌 ----
  async checkRevives(playerId) {
    const url = this._base + '?to_player=eq.' + encodeURIComponent(playerId) + '&order=time.desc&limit=1';

    console.log('[DB] SELECT → to_player=' + playerId);

    const res = await fetch(url, {
      method: 'GET',
      headers: this._headers(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[DB] SELECT failed:', res.status, errText);
      throw new Error('HTTP ' + res.status + ': ' + errText);
    }

    const data = await res.json();
    console.log('[DB] ✅ SELECT found', data.length, 'record(s)');
    return data;
  },

  // ---- 查询全部复活令牌（无条数限制，页面加载自动认领用） ----
  async checkAllRevives(playerId) {
    const url = this._base + '?to_player=eq.' + encodeURIComponent(playerId) + '&order=time.desc';

    console.log('[DB] SELECT ALL → to_player=' + playerId);

    const res = await fetch(url, {
      method: 'GET',
      headers: this._headers(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[DB] SELECT ALL failed:', res.status, errText);
      throw new Error('HTTP ' + res.status + ': ' + errText);
    }

    const data = await res.json();
    console.log('[DB] ✅ SELECT ALL found', data.length, 'record(s)');
    return data;
  },

  // ---- 删除已使用的复活令牌 ----
  async deleteRevives(playerId) {
    const url = this._base + '?to_player=eq.' + encodeURIComponent(playerId);

    console.log('[DB] DELETE → to_player=' + playerId);

    const res = await fetch(url, {
      method: 'DELETE',
      headers: this._headers(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[DB] DELETE failed:', res.status, errText);
      throw new Error('HTTP ' + res.status + ': ' + errText);
    }

    console.log('[DB] ✅ DELETE success');
  },
};

console.log('[SupabaseDB] REST API ready — endpoint:', SUPABASE_URL + '/rest/v1/' + TABLE);
