const nodemailer = require('nodemailer');

// Email configuration
// NOTE: For production, use environment variables for credentials
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like SendGrid, Mailgun, etc.
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Add to .env file
        pass: process.env.EMAIL_PASSWORD || 'your-app-password' // Use App Password for Gmail
    }
});

// Email templates
const emailTemplates = {
    approved: (shopName) => ({
        subject: '✅ Your Seller Application Has Been Approved!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">🎉 Congratulations!</h1>
                </div>
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h2 style="color: #333;">Dear ${shopName},</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                        We are pleased to inform you that your seller application has been <strong style="color: #4CAF50;">APPROVED</strong> by our admin team!
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                        You can now start listing your products and selling on SellSathi marketplace.
                    </p>
                    <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #555;">
                            <strong>Next Steps:</strong><br>
                            1. Login to your seller dashboard<br>
                            2. Add your products<br>
                            3. Start selling!
                        </p>
                    </div>
                    <p style="font-size: 14px; color: #777; margin-top: 30px;">
                        If you have any questions, feel free to contact our support team.
                    </p>
                    <p style="font-size: 14px; color: #777;">
                        Best regards,<br>
                        <strong>SellSathi Team</strong>
                    </p>
                </div>
            </div>
        `
    }),

    rejected: (shopName, reason = '') => ({
        subject: '❌ Your Seller Application Status',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">Application Update</h1>
                </div>
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h2 style="color: #333;">Dear ${shopName},</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                        We regret to inform you that your seller application has been <strong style="color: #f44336;">REJECTED</strong> by our admin team.
                    </p>
                    ${reason ? `
                    <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #555;">
                            <strong>Reason:</strong> ${reason}
                        </p>
                    </div>
                    ` : ''}
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                        You can reapply after reviewing our seller guidelines and ensuring all requirements are met.
                    </p>
                    <p style="font-size: 14px; color: #777; margin-top: 30px;">
                        If you have any questions or need clarification, please contact our support team.
                    </p>
                    <p style="font-size: 14px; color: #777;">
                        Best regards,<br>
                        <strong>SellSathi Team</strong>
                    </p>
                </div>
            </div>
        `
    }),

    blocked: (shopName, duration) => ({
        subject: '⚠️ Your Seller Account Has Been Blocked',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">⚠️ Account Blocked</h1>
                </div>
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h2 style="color: #333;">Dear ${shopName},</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                        Your seller account has been <strong style="color: #ff9800;">BLOCKED</strong> by our admin team.
                    </p>
                    <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #555;">
                            <strong>Block Duration:</strong> ${duration === 'permanent' ? 'Permanent' : `${duration} day(s)`}
                        </p>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6; color: #555;">
                        ${duration === 'permanent' ? 
                            'Your account has been permanently blocked. Please contact support for more information.' :
                            `Your account will be automatically unblocked after ${duration} day(s).`
                        }
                    </p>
                    <p style="font-size: 14px; color: #777; margin-top: 30px;">
                        If you believe this is a mistake, please contact our support team immediately.
                    </p>
                    <p style="font-size: 14px; color: #777;">
                        Best regards,<br>
                        <strong>SellSathi Team</strong>
                    </p>
                </div>
            </div>
        `
    })
};

// Send email function
async function sendEmail(to, template, data) {
    try {
        // For now, we'll use phone number as identifier
        // In production, you should collect email during registration
        
        // If no email service is configured, just log
        if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
            console.log('📧 EMAIL NOTIFICATION (Not sent - Email service not configured):');
            console.log(`   To: ${to}`);
            console.log(`   Subject: ${template.subject}`);
            console.log(`   Template: ${data}`);
            return { success: true, message: 'Email logged (service not configured)' };
        }

        const mailOptions = {
            from: `"SellSathi" <${process.env.EMAIL_USER}>`,
            to: to, // This should be the seller's email
            subject: template.subject,
            html: template.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendEmail,
    emailTemplates
};
