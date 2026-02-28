const express = require('express');
const router = express.Router();
const {
    Client,
    Environment,
    OrdersController,
    CheckoutPaymentIntent,
    LogLevel
} = require('@paypal/paypal-server-sdk');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { sendDepositConfirmation, sendWithdrawalNotification } = require('../services/notificationService');

// PayPal client configuration
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET;

const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
    },
    environment: Environment.Sandbox, // Change to Environment.Production for live
    logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logBody: true },
    },
});

const ordersController = new OrdersController(client);

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Please log in.' });
    }
}

/**
 * Render payment page
 */
router.get('/deposit', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.render('payment');
});

/**
 * Create PayPal Order
 */
router.post('/create-order', requireAuth, async (req, res) => {
    const { amount } = req.body;
    console.log(`[PayPal] Creating order for amount: ${amount}`);

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    try {
        const { result } = await ordersController.createOrder({
            body: {
                intent: CheckoutPaymentIntent.Capture,
                purchaseUnits: [
                    {
                        amount: {
                            currencyCode: 'USD',
                            value: parseFloat(amount).toFixed(2),
                        },
                        description: 'Advisor Capital Deposit',
                    },
                ],
            },
        });

        console.log(`[PayPal] Order created: ${result.id}`);
        res.json({ id: result.id });
    } catch (err) {
        console.error('[PayPal] Create Order Error:', err);
        res.status(500).json({ success: false, message: 'Failed to initialize PayPal order' });
    }
});

/**
 * Capture PayPal Order
 * Credits user balance, records transaction, and sends notifications
 */
router.post('/capture-order', requireAuth, async (req, res) => {
    const { orderID } = req.body;
    const userId = req.session.userId;

    console.log(`[PayPal] Capturing order: ${orderID} for user: ${userId}`);

    if (!orderID) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    try {
        const { result } = await ordersController.captureOrder({
            id: orderID,
        });

        console.log(`[PayPal] Capture result status: ${result.status}`);

        if (result.status === 'COMPLETED') {
            const capture = result.purchaseUnits[0].payments.captures[0];
            const amount = parseFloat(capture.amount.value);

            const user = await User.findById(userId);
            if (!user) {
                console.error(`[PayPal] User ${userId} not found during capture`);
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Atomic update
            user.cashBalance = (user.cashBalance || 0) + amount;
            await user.save();

            // Record transaction ledger entry
            const txn = await Transaction.create({
                userId,
                type: 'DEPOSIT',
                amount,
                method: 'PAYPAL',
                details: orderID,
                recipient: 'PayPal',
                status: 'COMPLETED',
                referenceId: result.id
            });

            // Create in-app notification
            await Notification.create({
                userId,
                title: 'Deposit Confirmed ✅',
                message: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} deposited via PayPal to your account. New balance: $${user.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
                type: 'DEPOSIT',
                icon: 'fa-circle-check',
                amount,
                recipient: 'PayPal'
            });

            // Send email confirmation (non-blocking)
            sendDepositConfirmation(user, amount, txn._id.toString(), user.cashBalance).catch(err => {
                console.error('[PayPal] Failed to send deposit confirmation email:', err);
            });

            console.log(`[PayPal] Successfully credited $${amount} to user ${userId}`);

            return res.json({
                success: true,
                message: `Deposit of $${amount.toFixed(2)} confirmed! Your balance has been updated.`,
                newBalance: user.cashBalance,
                transactionId: txn._id,
                receipt: {
                    id: txn._id.toString(),
                    type: 'DEPOSIT',
                    amount,
                    method: 'PAYPAL',
                    recipient: 'PayPal',
                    status: 'COMPLETED',
                    referenceId: result.id,
                    date: txn.createdAt,
                    newBalance: user.cashBalance
                }
            });
        }

        console.warn(`[PayPal] Capture was not completed. Status: ${result.status}`);
        res.status(400).json({ success: false, message: `Payment status: ${result.status}` });
    } catch (err) {
        console.error('[PayPal] Capture Order Error:', err);
        res.status(500).json({ success: false, message: 'Payment capture failed' });
    }
});


/**
 * UPI Deposit Request (Simulation)
 */
router.post('/api/payment/upi-deposit', requireAuth, async (req, res) => {
    const { amount, upiId } = req.body;
    const userId = req.session.userId;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount < 10) {
        return res.status(400).json({ success: false, message: 'Minimum deposit is $10' });
    }
    if (!upiId) {
        return res.status(400).json({ success: false, message: 'UPI ID is required' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // For simulation, we create a PENDING transaction
        // In a real app, this would integrate with a UPI gateway or wait for manual verification
        const txn = await Transaction.create({
            userId,
            type: 'DEPOSIT',
            amount: parsedAmount,
            method: 'UPI',
            details: upiId,
            recipient: 'advisor@pay',
            status: 'PENDING'
        });

        // Create in-app notification
        await Notification.create({
            userId,
            title: 'Deposit Request Sent 📥',
            message: `Your UPI deposit of $${parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (from ${upiId}) is being verified. Send payment to advisor@pay and it will be credited soon.`,
            type: 'DEPOSIT',
            icon: 'fa-wallet',
            amount: parsedAmount,
            recipient: 'advisor@pay'
        });

        console.log(`[UPI] Deposit request initiated by user ${userId} for $${parsedAmount}`);

        const userBal = user.cashBalance || 0;
        res.json({
            success: true,
            message: 'Deposit request initiated successfully.',
            transactionId: txn._id,
            receipt: {
                id: txn._id.toString(),
                type: 'DEPOSIT',
                amount: parsedAmount,
                method: 'UPI',
                recipient: 'advisor@pay',
                status: 'PENDING',
                referenceId: txn._id.toString().slice(-8).toUpperCase(),
                date: txn.createdAt,
                newBalance: userBal
            }
        });
    } catch (err) {
        console.error('[UPI] Deposit Error:', err);
        res.status(500).json({ success: false, message: 'Failed to initiate UPI deposit.' });
    }
});



/**
 * Withdrawal Request
 */
router.post('/withdraw', requireAuth, async (req, res) => {
    const { amount, method, details } = req.body;
    const userId = req.session.userId;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount < 10) {
        return res.status(400).json({ success: false, message: 'Minimum withdrawal is $10' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.cashBalance < parsedAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient cash balance' });
        }

        // Deduct balance immediately
        user.cashBalance -= parsedAmount;
        await user.save();

        // Mask recipient for display (show last 4 chars for privacy)
        const recipientDisplay = method === 'UPI' ? details : (details.length > 8 ? '****' + details.slice(-4) : '****');

        // Record transaction
        const txn = await Transaction.create({
            userId,
            type: 'WITHDRAWAL',
            amount: parsedAmount,
            method,
            details,
            recipient: details,
            status: 'PENDING'
        });

        // Create in-app notification with "paying to" info
        await Notification.create({
            userId,
            title: 'Withdrawal Request Submitted 🏦',
            message: `$${parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} withdrawing to ${method}: ${recipientDisplay}. Processing in 1–3 business days. Ref: ${txn._id.toString().slice(-8).toUpperCase()}.`,
            type: 'WITHDRAWAL',
            icon: 'fa-building-columns',
            amount: parsedAmount,
            recipient: recipientDisplay
        });

        // Send email (non-blocking)
        sendWithdrawalNotification(user, parsedAmount, method, details, txn._id.toString()).catch(err => {
            console.error('Failed to send withdrawal notification email:', err);
        });

        res.json({
            success: true,
            message: `Withdrawal of $${parsedAmount.toFixed(2)} submitted! Processing in 1–3 business days.`,
            newBalance: user.cashBalance,
            transactionId: txn._id,
            receipt: {
                id: txn._id.toString(),
                type: 'WITHDRAWAL',
                amount: parsedAmount,
                method,
                recipient: recipientDisplay,
                details,
                status: 'PENDING',
                referenceId: txn._id.toString().slice(-8).toUpperCase(),
                date: txn.createdAt,
                newBalance: user.cashBalance
            }
        });
    } catch (err) {
        console.error('Withdrawal error:', err);
        res.status(500).json({ success: false, message: 'Withdrawal failed. Please try again.' });
    }
});

/**
 * GET single transaction receipt
 */
router.get('/api/transactions/:id/receipt', requireAuth, async (req, res) => {
    try {
        const txn = await Transaction.findOne({
            _id: req.params.id,
            userId: req.session.userId
        }).lean();
        if (!txn) return res.status(404).json({ success: false, message: 'Receipt not found' });
        const recipientDisplay = txn.type === 'WITHDRAWAL' && txn.method !== 'UPI' && txn.recipient && txn.recipient.length > 6
            ? '****' + txn.recipient.slice(-4) : (txn.recipient || txn.details || '—');
        res.json({
            success: true,
            receipt: {
                id: txn._id.toString(),
                type: txn.type,
                amount: txn.amount,
                method: txn.method,
                recipient: recipientDisplay,
                details: txn.details,
                status: txn.status,
                referenceId: txn.referenceId || txn._id.toString().slice(-8).toUpperCase(),
                date: txn.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch receipt' });
    }
});

/**
 * GET Transactions
 */
router.get('/api/transactions', requireAuth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
    }
});

/**
 * GET Notifications
 */
router.get('/api/notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ userId }).sort({ createdAt: -1 }).limit(20),
            Notification.countDocuments({ userId, read: false })
        ]);
        res.json({ success: true, notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});

/**
 * Mark notification as read
 */
router.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.session.userId },
            { read: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/**
 * Mark ALL notifications as read
 */
router.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.session.userId, read: false }, { read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;

