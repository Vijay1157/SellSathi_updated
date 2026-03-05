'use strict';
const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Parse from stringified JSON environment variable
        serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : process.env.FIREBASE_SERVICE_ACCOUNT;
    } else {
        // Fallback to local file for development
        serviceAccount = require('../../serviceAccountKey.json');
    }

    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
} catch (error) {
    console.error('❌ Failed to load Firebase Service Account Credentials:', error.message);
    console.error('Please ensure serviceAccountKey.json exists locally or FIREBASE_SERVICE_ACCOUNT env var is set in production (Render).');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'sellsathi-94ede',
    });
}

const db = admin.firestore();

module.exports = { admin, db };
