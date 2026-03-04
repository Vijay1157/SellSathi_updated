'use strict';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const _store = {
    adminStats: { data: null, ts: 0 },
    allSellers: { data: null, ts: 0 },
    adminProducts: { data: null, ts: 0 },
};

/** Returns cached value if still fresh, otherwise null. */
const get = (key) => {
    const entry = _store[key];
    if (entry && entry.data && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
    return null;
};

/** Stores value with current timestamp. */
const set = (key, data) => {
    if (!_store[key]) _store[key] = {};
    _store[key] = { data, ts: Date.now() };
};

/** Invalidates one or more keys (all if none specified). */
const invalidate = (...keys) => {
    const targets = keys.length ? keys : Object.keys(_store);
    targets.forEach(k => { if (_store[k]) _store[k].ts = 0; });
};

module.exports = { get, set, invalidate };
