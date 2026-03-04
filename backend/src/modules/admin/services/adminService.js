'use strict';
const { admin, db } = require('../../../config/firebase');
const cache = require('../../../utils/cache');
const emailService = require('../../../shared/services/emailService');

/**
 * Service to handle admin-related business logic.
 */
class AdminService {
    /**
     * Approves a seller application and sends a notification email.
     * @param {string} uid - The unique ID of the seller.
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async approveSeller(uid) {
        try {
            const sellerRef = db.collection("sellers").doc(uid);
            const userRef = db.collection("users").doc(uid);

            const [sellerSnap, userSnap] = await Promise.all([
                sellerRef.get(),
                userRef.get()
            ]);

            if (!sellerSnap.exists) {
                return { success: false, message: "Seller profile not found" };
            }

            const sellerData = sellerSnap.data();
            const userData = userSnap.exists ? userSnap.data() : {};

            // Update database status
            await Promise.all([
                sellerRef.update({
                    sellerStatus: "APPROVED",
                    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
                    isBlocked: false // Ensure it's not blocked if re-approving
                }),
                userRef.update({ role: "SELLER" })
            ]);

            // Invalidate admin caches
            cache.invalidate('adminStats', 'allSellers');

            // Send Email Notification (Background task, don't await if you want max speed, but user asked for "immediately after")
            // We'll wrap in try-catch to ensure main process doesn't fail.
            const recipientEmail = userData.email || sellerData.email || sellerData.phone;
            const sellerName = userData.fullName || sellerData.shopName || "Seller";

            if (recipientEmail && recipientEmail.includes('@')) {
                emailService.sendSellerApprovalEmail(recipientEmail, sellerName, sellerData.shopName)
                    .catch(err => console.error(`[AdminService] Email failed for ${uid}:`, err));
            } else {
                console.warn(`[AdminService] No valid email for seller ${uid}, skipping notification.`);
            }

            return { success: true, message: "Seller approved successfully" };
        } catch (error) {
            console.error("[AdminService.approveSeller] ERROR:", error);
            throw error;
        }
    }

    /**
     * Rejects a seller application and sends a notification email.
     * @param {string} uid - The unique ID of the seller.
     * @param {string} reason - The reason for rejection (optional).
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async rejectSeller(uid, reason = "Application did not meet our requirements") {
        try {
            const sellerRef = db.collection("sellers").doc(uid);
            const userRef = db.collection("users").doc(uid);

            const [sellerSnap, userSnap] = await Promise.all([
                sellerRef.get(),
                userRef.get()
            ]);

            if (!sellerSnap.exists) {
                return { success: false, message: "Seller profile not found" };
            }

            const sellerData = sellerSnap.data();
            const userData = userSnap.exists ? userSnap.data() : {};

            // Update database status
            await sellerRef.update({
                sellerStatus: "REJECTED",
                rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
                rejectionReason: reason
            });

            // Invalidate admin caches
            cache.invalidate('adminStats', 'allSellers');

            // Send Email Notification
            const recipientEmail = userData.email || sellerData.email || sellerData.phone;
            const sellerName = userData.fullName || sellerData.shopName || "Seller";

            if (recipientEmail && recipientEmail.includes('@')) {
                emailService.sendSellerRejectionEmail(recipientEmail, sellerName, sellerData.shopName, reason)
                    .catch(err => console.error(`[AdminService] Rejection email failed for ${uid}:`, err));
            }

            return { success: true, message: "Seller rejected successfully" };
        } catch (error) {
            console.error("[AdminService.rejectSeller] ERROR:", error);
            throw error;
        }
    }
}

module.exports = new AdminService();
