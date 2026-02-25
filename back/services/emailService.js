const nodemailer = require('nodemailer');
const path = require('path');

// Configure credentials (preferably via env variables)
const MAILER_CONFIG = {
    user: process.env.MAILER_GOOGLE_USER_EMAIL || '1by22is075@bmsit.in',
    pass: process.env.MAILER_GOOGLE_USER_PASSWORD || 'fzddfkhhhdhscehp',
    service: 'gmail'
};

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: MAILER_CONFIG.user,
        pass: MAILER_CONFIG.pass
    }
});

exports.sendOrderConfirmation = async (email, order, invoicePath) => {
    try {
        console.log(`📧 Sending order confirmation email to ${email} for order ${order.orderId}`);

        const mailOptions = {
            from: `"Sellsathi Marketplace" <${MAILER_CONFIG.user}>`,
            to: email,
            subject: `Order Confirmed: #${order.orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #2563eb; margin: 0;">Sellsathi</h1>
                        <p style="color: #64748b; margin: 5px 0;">Your Shopping Partner</p>
                    </div>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                        <h2 style="color: #1e293b; margin-top: 0;">Thank you for your order!</h2>
                        <p>Hi <strong>${order.customerName}</strong>,</p>
                        <p>We're excited to let you know that your order <strong>#${order.orderId}</strong> has been received and is being processed.</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                            <h3 style="margin-top: 0; color: #334155; font-size: 16px;">Order Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Order Total:</td>
                                    <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 600;">₹${order.total}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b;">Status:</td>
                                    <td style="padding: 8px 0; text-align: right; color: #059669; font-weight: 600;">Confirmed</td>
                                </tr>
                            </table>
                        </div>

                        <p style="color: #475569; font-size: 14px; margin-bottom: 24px;">
                            We have attached your official invoice to this email. You can also view your order status and manage your account by visiting your dashboard.
                        </p>

                        <div style="text-align: center;">
                            <a href="http://localhost:5173/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                        <p>&copy; 2026 Sellsathi Marketplace. All rights reserved.</p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `Invoice-${order.orderId}.pdf`,
                    path: invoicePath
                }
            ]
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', result.messageId);
        return result;

    } catch (error) {
        console.error('❌ Email Error:', error);
        return null;
    }
};

exports.sendSellerNotification = async (sellerEmail, order, sellerItems) => {
    try {
        console.log(`📧 Sending seller notification to ${sellerEmail}`);

        const mailOptions = {
            from: `"Sellsathi Marketplace" <${MAILER_CONFIG.user}>`,
            to: sellerEmail,
            subject: `New Order Received: #${order.orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">New Order Alert!</h2>
                    <p>You have received a new order for the following items:</p>
                    <ul>
                        ${sellerItems.map(item => `<li>${item.name} x ${item.quantity} - ₹${item.price * item.quantity}</li>`).join('')}
                    </ul>
                    <p><strong>Customer:</strong> ${order.customerName}</p>
                    <p>Please log in to your dashboard to manage this order.</p>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Seller email sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('❌ Seller Email Error:', error);
        return null;
    }
};
