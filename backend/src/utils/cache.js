'use strict';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// Dynamic cache store — supports arbitrary keys with configurable TTLs
const _store = new Map();

/** Returns cached value if still fresh, otherwise null. */
const get = (key) => {
    const entry = _store.get(key);
    if (entry && entry.data !== null && Date.now() - entry.ts < (entry.ttl || DEFAULT_TTL)) {
        return entry.data;
    }
    return null;
};

/** Stores value with current timestamp and optional TTL. */
const set = (key, data, ttl = DEFAULT_TTL) => {
    _store.set(key, { data, ts: Date.now(), ttl });
};

/** Invalidates one or more keys (all if none specified). */
const invalidate = (...keys) => {
    if (keys.length === 0) {
        _store.clear();
    } else {
        keys.forEach(k => _store.delete(k));
    }
};

/** Invalidate all keys matching a prefix (e.g. 'products_' clears all product caches). */
const invalidatePrefix = (prefix) => {
    for (const key of _store.keys()) {
        if (key.startsWith(prefix)) _store.delete(key);
    }
};

module.exports = { get, set, invalidate, invalidatePrefix };
