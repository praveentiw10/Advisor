const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/email');


const OTP_EXPIRY_MINUTES = 10;
const JWT_EXPIRY = '7d';
const JWT_EXPIRY_SHORT = '24h';

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const emailNorm = (email || '').trim().toLowerCase();
        if (!name || !emailNorm || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }
        const existing = await User.findOne({ email: emailNorm });
        if (existing) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }
        const user = new User({ name, email: emailNorm, password });
        await user.save();

        // Send welcome email asynchronously
        console.log(`Attempting to send welcome email to: ${user.email}`);
        sendWelcomeEmail(user.email, user.name)
            .then(res => console.log('Welcome email send result:', res))
            .catch(err => {
                console.error('Failed to send welcome email:', err);
            });


        // Set session so redirect to /home works (session-based page auth)
        if (req.session) {
            req.session.userId = user._id;
            req.session.userName = user.name;
        }
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY_SHORT }
        );
        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });

    } catch (err) {
        console.error('Signup error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }
        res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
    }
});

// POST /api/login – returns JWT. Accepts email or name (for original login UI).
router.post('/login', async (req, res) => {
    try {
        const { email, name, password, rememberMe } = req.body;
        const loginId = (email || name || '').trim();
        if (!loginId || !password) {
            return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
        }
        const isEmail = loginId.includes('@');
        const user = isEmail
            ? await User.findOne({ email: loginId.toLowerCase() })
            : await User.findOne({ name: loginId });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        // Set session so /home (requireAuth) allows access when user is redirected
        if (req.session) {
            req.session.userId = user._id;
            req.session.userName = user.name;
        }
        const expiresIn = rememberMe ? JWT_EXPIRY : JWT_EXPIRY_SHORT;
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email },
            JWT_SECRET,
            { expiresIn }
        );
        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
    }
});

// POST /api/forgot-password – check email, generate OTP, save to DB, send email
router.post('/forgot-password', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: true, message: 'If an account exists with this email, an OTP has been sent.' });
        }
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Update user bypasses validation to avoid issues with required fields like password
        await User.updateOne({ _id: user._id }, { otp, otpExpiry });

        // Always log OTP so you can use it from terminal if email fails
        console.log('[OTP]', email, '→', otp, '(valid', OTP_EXPIRY_MINUTES, 'min)');

        const result = await sendOTPEmail(email, otp);
        const emailSent = result.sent === true;

        const message = emailSent
            ? 'OTP sent to your email. Enter it below to reset your password.'
            : 'OTP created. Check your email, or use the code shown in the server terminal. Enter it below.';
        return res.json({ success: true, message });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
    }
});

// POST /api/verify-otp – verify OTP and expiry
router.post('/verify-otp', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const otp = (req.body.otp || '').trim();
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }
        const user = await User.findOne({ email });
        if (!user || !user.otp || !user.otpExpiry) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }
        if (new Date() > user.otpExpiry) {
            user.otp = null;
            user.otpExpiry = null;
            await user.save({ validateBeforeSave: false });
            return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }
        res.json({ success: true, message: 'OTP verified. You can now reset your password.' });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
    }
});

// POST /api/reset-password – verify OTP again, hash new password, update DB, clear OTP
router.post('/reset-password', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const otp = (req.body.otp || '').trim();
        const newPassword = req.body.newPassword;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, OTP and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }
        const user = await User.findOne({ email });
        if (!user || !user.otp || !user.otpExpiry) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Request a new one.' });
        }
        if (new Date() > user.otpExpiry) {
            user.otp = null;
            user.otpExpiry = null;
            await user.save({ validateBeforeSave: false });
            return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }
        user.password = newPassword;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        // Auto-login: generate token
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY_SHORT }
        );

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email },
            message: 'Password updated. Redirecting to home...'
        });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
    }
});

// Protected route example – GET /api/me (dashboard can use this to validate token)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -otp -otpExpiry');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
