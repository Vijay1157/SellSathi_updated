'use strict';
const { admin, db } = require('../config/firebase');

const IS_DEV = process.env.NODE_ENV !== 'production';
const ALLOW_TEST_UID = IS_DEV || process.env.ALLOW_TEST_UID === 'true';

// In-memory cache for test-user lookups (1 hour TTL)
const _testUserCache = new Map();
const TEST_USER_CACHE_TTL_MS = 60 * 60 * 1000;

// In-memory cache for admin role checks (5 min TTL, promise-coalescing)
const _adminRoleCache = new Map();
const ADMIN_ROLE_CACHE_TTL = 5 * 60 * 1000;

async function _resolveTestUser(testUid) {
    const cached = _testUserCache.get(testUid);
    if (cached && cached.expiresAt > Date.now()) return cached.userData;

    const snap = await db.collection('users').doc(testUid).get();
    let userData;
    if (!snap.exists) {
        const fbUser = await admin.auth().getUser(testUid).catch(() => null);
        if (!fbUser) throw Object.assign(new Error('User not found'), { status: 401 });
        userData = { role: 'CONSUMER', phone: fbUser.phoneNumber || null };
    } else {
        userData = snap.data();
    }
    _testUserCache.set(testUid, { userData, expiresAt: Date.now() + TEST_USER_CACHE_TTL_MS });
    return userData;
}

function _checkIsAdmin(uid) {
    const entry = _adminRoleCache.get(uid);
    if (entry && entry.isAdmin !== undefined && entry.expiresAt > Date.now()) {
        return Promise.resolve(entry.isAdmin);
    }
    if (entry && entry.promise) return entry.promise;

    const promise = db.collection('users').doc(uid).get()
        .then(snap => {
            const isAdmin = snap.exists && snap.data().role === 'ADMIN';
            _adminRoleCache.set(uid, { isAdmin, expiresAt: Date.now() + ADMIN_ROLE_CACHE_TTL });
            return isAdmin;
        })
        .catch(err => { _adminRoleCache.delete(uid); throw err; });
    _adminRoleCache.set(uid, { promise });
    return promise;
}

/**
 * Verifies Firebase ID token or X-Test-UID header (dev only).
 * Attaches decoded user to req.user.
 */
const verifyAuth = async (req, res, next) => {
    try {
        const testUid = req.headers['x-test-uid'];
        if (ALLOW_TEST_UID && testUid) {
            const userData = await _resolveTestUser(testUid);
            req.user = { uid: testUid, phone_number: userData.phone || null, role: userData.role, isTestMode: true };
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Authorization header with Bearer token is required' });
        }
        const idToken = authHeader.split('Bearer ')[1];

        try {
            const decoded = await admin.auth().verifyIdToken(idToken);
            req.user = decoded;
            return next();
        } catch (err) {
            // DEV fallback: decode JWT payload without signature verify
            if (IS_DEV) {
                try {
                    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
                    const uid = payload.user_id || payload.sub;
                    if (!uid) throw new Error('No UID');
                    const fbUser = await admin.auth().getUser(uid).catch(() => null);
                    if (!fbUser) throw new Error('User not in Firebase Auth');
                    req.user = { uid, ...payload, isDevFallback: true };
                    return next();
                } catch (_) { }
            }
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('[verifyAuth] ERROR:', error.message);
        if (error.status === 401) return res.status(401).json({ success: false, message: 'User not found' });
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

/**
 * Verifies that the authenticated user has the ADMIN role.
 * Must be used AFTER verifyAuth.
 */
const verifyAdmin = async (req, res, next) => {
    try {
        if (req.user.isTestMode) {
            if (req.user.role === 'ADMIN') return next();
            return res.status(403).json({ success: false, message: 'Admin access denied' });
        }
        const isAdmin = await _checkIsAdmin(req.user.uid);
        if (isAdmin) return next();
        return res.status(403).json({ success: false, message: 'Admin access denied' });
    } catch (err) {
        console.error('[verifyAdmin] ERROR:', err.message);
        return res.status(403).json({ success: false, message: 'Admin verification failed' });
    }
};

module.exports = { verifyAuth, verifyAdmin };
