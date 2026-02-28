const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true, uppercase: true },
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['FILLED', 'CANCELLED'], default: 'FILLED' },
  realizedGain: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
