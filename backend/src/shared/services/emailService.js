const nodemailer = require('nodemailer');
const path = require('path');

// Configure credentials via env variables
const MAILER_CONFIG = {
    user: process.env.MAILER_GOOGLE_USER_EMAIL,
    pass: process.env.MAILER_GOOGLE_USER_PASSWORD,
    service: 'gmail'
};

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: MAILER_CONFIG.service,
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

exports.sendSellerBlockedEmail = async (sellerEmail, sellerName, shopName, blockReason = 'Policy violation') => {
    try {
        console.log(`📧 Sending seller blocked notification to ${sellerEmail}`);

        const mailOptions = {
            from: `"Sellsathi Marketplace" <${MAILER_CONFIG.user}>`,
            to: sellerEmail,
            subject: `Account Blocked - Action Required`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #dc2626; margin: 0;">Sellsathi</h1>
                        <p style="color: #64748b; margin: 5px 0;">Your Shopping Partner</p>
                    </div>
                    <div style="background: white; border: 2px solid #fca5a5; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                        <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                            <h2 style="color: #dc2626; margin: 0; font-size: 24px;">🚫 Account Blocked</h2>
                        </div>
                        
                        <p>Dear <strong>${sellerName}</strong>,</p>
                        
                        <p>We regret to inform you that your seller account for <strong>${shopName}</strong> has been temporarily blocked by our admin team.</p>
                        
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #92400e;"><strong>Reason:</strong> ${blockReason}</p>
                        </div>

                        <h3 style="color: #1e293b; font-size: 18px; margin-top: 24px;">What This Means:</h3>
                        <ul style="color: #475569; line-height: 1.8;">
                            <li>Your products are no longer visible to customers</li>
                            <li>You cannot list new products</li>
                            <li>You cannot process orders</li>
                            <li>Your account access is restricted</li>
                        </ul>

                        <h3 style="color: #1e293b; font-size: 18px; margin-top: 24px;">Next Steps:</h3>
                        <ol style="color: #475569; line-height: 1.8;">
                            <li>Review our <a href="http://localhost:5173/terms" style="color: #2563eb;">Terms of Service</a> and <a href="http://localhost:5173/seller-policies" style="color: #2563eb;">Seller Policies</a></li>
                            <li>Contact our support team to discuss the block</li>
                            <li>Provide any necessary documentation or clarification</li>
                            <li>Wait for admin review and potential unblock</li>
                        </ol>

                        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; color: #334155; font-size: 14px;">
                                <strong>Need Help?</strong><br>
                                Contact our support team at <a href="mailto:support@sellsathi.com" style="color: #2563eb;">support@sellsathi.com</a><br>
                                or call us at <strong>+91-XXXX-XXXXXX</strong>
                            </p>
                        </div>

                        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                            We take these actions seriously to maintain the quality and trust of our marketplace. If you believe this is a mistake, please contact us immediately.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                        <p>&copy; 2026 Sellsathi Marketplace. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Seller blocked email sent successfully:', result.messageId);
        return result;

    } catch (error) {
        console.error('❌ Seller Blocked Email Error:', error);
        return null;
    }
};

exports.sendSellerUnblockedEmail = async (sellerEmail, sellerName, shopName) => {
    try {
        console.log(`📧 Sending seller unblocked notification to ${sellerEmail}`);

        const mailOptions = {
            from: `"Sellsathi Marketplace" <${MAILER_CONFIG.user}>`,
            to: sellerEmail,
            subject: `Account Unblocked - Pending Re-approval`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #2563eb; margin: 0;">Sellsathi</h1>
                        <p style="color: #64748b; margin: 5px 0;">Your Shopping Partner</p>
                    </div>
                    <div style="background: white; border: 2px solid #86efac; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                        <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                            <h2 style="color: #16a34a; margin: 0; font-size: 24px;">✅ Account Unblocked</h2>
                        </div>
                        
                        <p>Dear <strong>${sellerName}</strong>,</p>
                        
                        <p>Good news! Your seller account for <strong>${shopName}</strong> has been unblocked by our admin team.</p>
                        
                        <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #1e40af;"><strong>Current Status:</strong> Pending Re-approval</p>
                        </div>

                        <h3 style="color: #1e293b; font-size: 18px; margin-top: 24px;">What Happens Next:</h3>
                        <ol style="color: #475569; line-height: 1.8;">
                            <li>Your account has been moved to <strong>Pending Approvals</strong></li>
                            <li>Our admin team will review your account again</li>
                            <li>Once approved, you can resume selling on our platform</li>
                            <li>You will receive another email when your account is approved</li>
                        </ol>

                        <h3 style="color: #1e293b; font-size: 18px; margin-top: 24px;">Important Reminders:</h3>
                        <ul style="color: #475569; line-height: 1.8;">
                            <li>Please ensure compliance with all <a href="http://localhost:5173/seller-policies" style="color: #2563eb;">Seller Policies</a></li>
                            <li>Maintain high-quality product listings</li>
                            <li>Provide excellent customer service</li>
                            <li>Respond promptly to customer inquiries</li>
                            <li>Ship orders on time</li>
                        </ul>

                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #92400e;">
                                <strong>⚠️ Please Note:</strong> Future violations may result in permanent account suspension. We encourage you to review our policies carefully.
                            </p>
                        </div>

                        <div style="text-align: center; margin: 24px 0;">
                            <a href="http://localhost:5173/seller/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Seller Dashboard</a>
                        </div>

                        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; color: #334155; font-size: 14px;">
                                <strong>Questions?</strong><br>
                                Contact our support team at <a href="mailto:support@sellsathi.com" style="color: #2563eb;">support@sellsathi.com</a><br>
                                or call us at <strong>+91-XXXX-XXXXXX</strong>
                            </p>
                        </div>

                        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                            Thank you for your patience and understanding. We look forward to having you back as an active seller on our platform!
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                        <p>&copy; 2026 Sellsathi Marketplace. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Seller unblocked email sent successfully:', result.messageId);
        return result;

    } catch (error) {
        console.error('❌ Seller Unblocked Email Error:', error);
        return null;
    }
};

exports.sendSellerApprovalEmail = async (sellerEmail, sellerName, shopName) => {
    try {
        console.log(`📧 Sending seller approval notification to ${sellerEmail}`);

        const mailOptions = {
            from: `"Sellsathi Marketplace" <${MAILER_CONFIG.user}>`,
            to: sellerEmail,
            subject: `🎉 Congratulations! Your Seller Account is Approved`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #2563eb; margin: 0;">Sellsathi</h1>
                        <p style="color: #64748b; margin: 5px 0;">Your Shopping Partner</p>
                    </div>
                    <div style="background: white; border: 2px solid #86efac; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                        <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                            <h2 style="color: #16a34a; margin: 0; font-size: 24px;">🎉 Account Approved!</h2>
                        </div>
                        
                        <p>Dear <strong>${sellerName}</strong>,</p>
                        
                        <p>Congratulations! We're thrilled to inform you that your seller account for <strong>${shopName}</strong> has been approved by our admin team!</p>
                        
                        <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #1e40af;"><strong>Status:</strong> ✅ APPROVED - You can now start selling!</p>
                        </div>

                        <h3 style="color: #1e293b; font-size: 18px; margin-top: 24px;">What You Can Do Now:</h3>
                        <ul style="color: #475569; line-height: 1.8;">
                            <li>✅ List your products on our marketplace</li>
                            <li>✅ Manage your inventory and pricing</li>
                            <li>✅ Receive and process customer orders</li>
                            <li>✅ Track your sales and earnings</li>
                            <li>✅ Access seller analytics and reports</li>
                        </ul>

                        <h3 style="color: #1e293b; font-size: 18px; margin-top: 24px;">Getting Started:</h3>
                        <ol style="color: #475569; line-height: 1.8;">
                            <li>Log in to your seller dashboard</li>
                            <li>Complete your shop profile</li>
                            <li>Add your first products</li>
                            <li>Set up your payment and shipping details</li>
                            <li>Start receiving orders!</li>
                        </ol>

                        <div style="text-align: center; margin: 24px 0;">
                            <a href="http://localhost:5173/seller/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Seller Dashboard</a>
                        </div>

                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #92400e;">
                                <strong>📋 Important:</strong> Please review our <a href="http://localhost:5173/seller-policies" style="color: #2563eb;">Seller Policies</a> and <a href="http://localhost:5173/terms" style="color: #2563eb;">Terms of Service</a> to ensure compliance.
                            </p>
                        </div>

                        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; color: #334155; font-size: 14px;">
                                <strong>Need Help?</strong><br>
                                Our support team is here to help you succeed!<br>
                                Email: <a href="mailto:support@sellsathi.com" style="color: #2563eb;">support@sellsathi.com</a><br>
                                Phone: <strong>+91-XXXX-XXXXXX</strong>
                            </p>
                        </div>

                        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                            Welcome to the Sellsathi family! We're excited to have you as a seller and look forward to your success on our platform.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                        <p>&copy; 2026 Sellsathi Marketplace. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Seller approval email sent successfully:', result.messageId);
        return result;

    } catch (error) {
        console.error('❌ Seller Approval Email Error:', error);
        return null;
    }
};

exports.sendSellerRejectionEmail = async (sellerEmail, sellerName, shopName, rejectionReason = 'Application did not meet our requirements') => {
    try {
        console.log(`📧 Sending seller rejection notification to ${sellerEmail}`);

        const mailOptions = {
            from: `"Sellsathi Marketplace" <${MAILER_CONFIG.user}>`,
            to: sellerEmail,
            subject: `Application Status Update - Sellsathi Marketplace`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #2563eb; margin: 0;">Sellsathi</h1>
                        <p style="color: #64748b; margin: 5px 0;">Your Shopping Partner</p>
                    </div>
                    <div style="background: white; border: 2px solid #fca5a5; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                        <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                            <h2 style="color: #dc2626; margin: 0; font-size: 24px;">Application Status Update</h2>
                        </div>
                        
                        <p>Dear <strong>${sellerName}</strong>,</p>
                        
                        <p>Thank you for your interest in becoming a seller on Sellsathi Marketplace. After careful review of your application for <strong>${shopName}</strong>, we regret to inform you that we are unable to approve your seller account at this time.</p>
                        
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #92400e;"><strong>Reason:</strong> ${rejectionReason}</p>
                        </div>

                        <h3 style="color: #1e293b; font-size: 18px; margin-top: 24px;">What This Means:</h3>
                        <ul style="color: #475569; line-height: 1.8;">
                            <li>Your seller application has not been approved</li>
                            <li>You cannot list products on our marketplace</li>
                            <li>Your account remains as a regular customer account</li>
                            <li>You can still shop on our platform</li>
                        </ul>

                        <h3 style="color: #1e293b; font-size: 18px; margin-top: 24px;">Next Steps:</h3>
                        <p style="color: #475569;">If you believe this decision was made in error or if you would like to reapply in the future, please:</p>
                        <ol style="color: #475569; line-height: 1.8;">
                            <li>Review our <a href="http://localhost:5173/seller-requirements" style="color: #2563eb;">Seller Requirements</a></li>
                            <li>Ensure all documentation is complete and accurate</li>
                            <li>Contact our support team for clarification</li>
                            <li>Consider reapplying after addressing the concerns</li>
                        </ol>

                        <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0; color: #1e40af;">
                                <strong>💡 Tip:</strong> Make sure your business documentation is complete, your product categories are clear, and your shop information is accurate before reapplying.
                            </p>
                        </div>

                        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0; color: #334155; font-size: 14px;">
                                <strong>Questions?</strong><br>
                                Contact our support team for more information:<br>
                                Email: <a href="mailto:support@sellsathi.com" style="color: #2563eb;">support@sellsathi.com</a><br>
                                Phone: <strong>+91-XXXX-XXXXXX</strong>
                            </p>
                        </div>

                        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                            We appreciate your interest in Sellsathi and hope to work with you in the future. Thank you for your understanding.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                        <p>&copy; 2026 Sellsathi Marketplace. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Seller rejection email sent successfully:', result.messageId);
        return result;

    } catch (error) {
        console.error('❌ Seller Rejection Email Error:', error);
        return null;
    }
};
