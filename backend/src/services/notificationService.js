const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

function formatUSD(amount) {
    return '$' + parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function sendDepositConfirmation(user, amount, txnId, newBalance) {
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #020617; color: #f8fafc; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0e7490, #1e1b4b); padding: 40px 40px 30px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">⚡</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Deposit Confirmed</h1>
            <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">Your funds are live in your Advisor account</p>
        </div>

        <div style="padding: 35px 40px;">
            <div style="background: rgba(34, 211, 238, 0.08); border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 28px;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Amount Deposited</p>
                <p style="margin: 0; font-size: 40px; font-weight: 900; color: #22d3ee; letter-spacing: -2px;">${formatUSD(amount)}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px;">
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">Account Holder</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #f8fafc;">${user.name}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">Transaction ID</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #22d3ee; font-size: 11px;">${txnId}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">Date & Time</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">New Cash Balance</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 900; font-size: 16px; color: #4ade80;">${formatUSD(newBalance)}</td>
                </tr>
            </table>

            <div style="background: rgba(74, 222, 128, 0.06); border: 1px solid rgba(74, 222, 128, 0.15); border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;"><span style="color: #4ade80; font-weight: 900;">✓ VERIFIED</span> — This transaction was processed securely via PayPal.</p>
            </div>

            <a href="${process.env.APP_URL}/home" style="display: block; background: #22d3ee; color: #000; text-align: center; padding: 16px; border-radius: 12px; font-weight: 900; text-decoration: none; font-size: 14px; letter-spacing: 0.5px; margin-bottom: 24px;">
                OPEN ADVISOR TERMINAL →
            </a>
        </div>

        <div style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #475569;">Advisor Elite Trading Terminal • Auto-generated notification</p>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"ADVISOR Platform" <${process.env.SMTP_FROM}>`,
            to: user.email,
            subject: `✅ Deposit Confirmed: ${formatUSD(amount)} credited to your account`,
            html
        });
    } catch (e) {
        console.error('Email send error (deposit):', e.message);
    }
}

async function sendWithdrawalNotification(user, amount, method, recipientDetails, txnId) {
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #020617; color: #f8fafc; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #7c3aed, #1e1b4b); padding: 40px 40px 30px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">🏦</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Withdrawal Initiated</h1>
            <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">Your request is under review</p>
        </div>

        <div style="padding: 35px 40px;">
            <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 28px;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Withdrawal Requested</p>
                <p style="margin: 0; font-size: 40px; font-weight: 900; color: #fbbf24; letter-spacing: -2px;">${formatUSD(amount)}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px;">
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">Account Holder</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700;">${user.name}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">Transfer Method</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #a78bfa;">${method}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">Sending To</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #f8fafc; font-size: 12px;">${method === 'UPI' ? recipientDetails : '****' + (recipientDetails && recipientDetails.length > 4 ? recipientDetails.slice(-4) : '')}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">Reference ID</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 11px; color: #fbbf24;">${txnId}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; color: #94a3b8; font-weight: 700;">Date Requested</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
                </tr>
            </table>

            <div style="background: rgba(251, 191, 36, 0.06); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;"><span style="color: #fbbf24; font-weight: 900;">⏳ PROCESSING</span> — Withdrawals are typically processed within 1–3 business days.</p>
            </div>

            <a href="${process.env.APP_URL}/home" style="display: block; background: #a78bfa; color: #000; text-align: center; padding: 16px; border-radius: 12px; font-weight: 900; text-decoration: none; font-size: 14px; letter-spacing: 0.5px;">
                VIEW ACCOUNT STATUS →
            </a>
        </div>

        <div style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #475569;">Advisor Elite Trading Terminal • Auto-generated notification</p>
        </div>
    </div>`;

    try {
        await transporter.sendMail({
            from: `"ADVISOR Platform" <${process.env.SMTP_FROM}>`,
            to: user.email,
            subject: `🏦 Withdrawal of ${formatUSD(amount)} is being processed`,
            html
        });
    } catch (e) {
        console.error('Email send error (withdrawal):', e.message);
    }
}

module.exports = { sendDepositConfirmation, sendWithdrawalNotification };
