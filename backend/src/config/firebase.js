'use strict';
const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = require('../../serviceAccountKey.json');
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'sellsathi-94ede',
    });
}

const db = admin.firestore();

module.exports = { admin, db };
