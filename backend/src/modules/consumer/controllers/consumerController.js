'use strict';
const { db } = require('../../../config/firebase');

/**
 * Get user cart.
 */
const getCart = async (req, res) => {
    try {
        const { uid } = req.params;
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return res.status(404).json({ success: false, message: "User not found" });
        return res.json({ success: true, cart: userDoc.data().cart || [] });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch cart" });
    }
};

/**
 * Update user cart.
 */
const updateCart = async (req, res) => {
    try {
        const { uid } = req.params;
        const { cart } = req.body;
        await db.collection('users').doc(uid).update({ cart });
        return res.json({ success: true, message: "Cart updated" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update cart" });
    }
};

/**
 * Get user addresses.
 */
const getAddresses = async (req, res) => {
    try {
        const { uid } = req.params;
        const doc = await db.collection('users').doc(uid).get();
        return res.json({ success: true, addresses: doc.data()?.addresses || [] });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch addresses" });
    }
};

/**
 * Save/Update user address.
 */
const saveAddress = async (req, res) => {
    try {
        const { uid } = req.params;
        const { address } = req.body;
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();
        let addresses = doc.data()?.addresses || [];

        if (address.isDefault) addresses = addresses.map(a => ({ ...a, isDefault: false }));

        const existingIdx = addresses.findIndex(a => a.id === address.id);
        if (existingIdx > -1) addresses[existingIdx] = address;
        else addresses.push({ ...address, id: Date.now() });

        await userRef.update({ addresses });
        return res.json({ success: true, message: "Address saved" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to save address" });
    }
};

module.exports = { getCart, updateCart, getAddresses, saveAddress };
