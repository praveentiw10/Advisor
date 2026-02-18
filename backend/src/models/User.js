const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null }
}, { timestamps: true });

// Hash password before saving (only when password is modified)
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
