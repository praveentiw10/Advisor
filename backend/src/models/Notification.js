const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['DEPOSIT', 'WITHDRAWAL', 'SYSTEM'], default: 'SYSTEM' },
    icon: { type: String, default: 'fa-bell' },
    read: { type: Boolean, default: false },
    amount: { type: Number, default: null },
    recipient: { type: String } // Who user paid to / received from (e.g., "PayPal", "example@upi")
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
