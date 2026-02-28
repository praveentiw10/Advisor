const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['DEPOSIT', 'WITHDRAWAL'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    method: { type: String, required: true }, // e.g., 'PAYPAL', 'UPI', 'CARD'
    details: { type: String }, // Transaction ID, UPI ID, or recipient details
    recipient: { type: String }, // Who user is paying to / receiving from (e.g., "PayPal", "example@upi")
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
    referenceId: { type: String } // PayPal Order ID or internal ref
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', TransactionSchema);
module.exports = Transaction;
