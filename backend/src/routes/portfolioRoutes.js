const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Holding = require('../models/Holding');
const Order = require('../models/Order');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Please log in.' });
  }
}

function getFinnhubSymbol(symbol) {
  return symbol === 'BTC' ? 'BINANCE:BTCUSDT' : symbol;
}

async function getQuote(symbol) {
  const fetchSym = getFinnhubSymbol(symbol);
  const url = `https://finnhub.io/api/v1/quote?symbol=${fetchSym}&token=${process.env.FINNHUB_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.c != null ? data.c : null;
}

// GET /api/portfolio – portfolio summary + holdings with live prices
router.get('/portfolio', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    let user = await User.findById(userId).select('cashBalance');
    if (user && user.cashBalance == null) {
      user.cashBalance = 100000;
      await user.save();
    }
    const holdings = await Holding.find({ userId, quantity: { $gt: 0 } });

    let totalInvested = 0;
    let totalValue = 0;
    const holdingsWithPrices = [];

    for (const h of holdings) {
      const price = await getQuote(h.symbol);
      const currentPrice = price || h.avgCost;
      const value = h.quantity * currentPrice;
      const costBasis = h.quantity * h.avgCost;
      const pnl = value - costBasis;
      totalInvested += costBasis;
      totalValue += value;
      holdingsWithPrices.push({
        symbol: h.symbol,
        quantity: h.quantity,
        avgCost: h.avgCost,
        ltp: currentPrice,
        value,
        pnl,
        pnlPercent: costBasis > 0 ? ((pnl / costBasis) * 100) : 0,
      });
    }

    const cash = user?.cashBalance ?? 100000;
    const portfolioValue = totalValue + cash;

    res.json({
      success: true,
      portfolio: {
        cashBalance: cash,
        totalInvested,
        totalValue,
        portfolioValue,
        unrealizedPnl: totalValue - totalInvested,
        unrealizedPnlPercent: totalInvested > 0 ? (((totalValue - totalInvested) / totalInvested) * 100) : 0,
        holdings: holdingsWithPrices,
      },
    });
  } catch (err) {
    console.error('Portfolio error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/trade – buy or sell
router.post('/trade', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { symbol, side, quantity } = req.body;
    const sym = (symbol || '').toUpperCase().trim();

    if (!sym || !side || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Symbol, side (BUY/SELL), and positive quantity required.' });
    }
    if (!['BUY', 'SELL'].includes(side.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Side must be BUY or SELL.' });
    }

    const price = await getQuote(sym);
    if (price == null) {
      return res.status(400).json({ success: false, message: 'Could not fetch price for ' + sym + '.' });
    }

    const qty = Math.floor(Number(quantity));
    const amount = qty * price;

    let user = await User.findById(userId);
    if (user && user.cashBalance == null) {
      user.cashBalance = 100000;
      await user.save();
    }
    let cash = user?.cashBalance ?? 100000;

    if (side.toUpperCase() === 'BUY') {
      if (cash < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient cash. You need $' + amount.toFixed(2) + '.' });
      }
      cash -= amount;

      let holding = await Holding.findOne({ userId, symbol: sym });
      if (holding) {
        const totalCost = holding.quantity * holding.avgCost + amount;
        holding.quantity += qty;
        holding.avgCost = totalCost / holding.quantity;
        await holding.save();
      } else {
        holding = await Holding.create({
          userId,
          symbol: sym,
          quantity: qty,
          avgCost: price,
        });
      }

      await User.updateOne({ _id: userId }, { cashBalance: cash });
      await Order.create({
        userId,
        symbol: sym,
        side: 'BUY',
        quantity: qty,
        price,
        amount,
        status: 'FILLED',
      });

      return res.json({
        success: true,
        message: `Bought ${qty} ${sym} @ $${price.toFixed(2)}`,
        order: { symbol: sym, side: 'BUY', quantity: qty, price, amount },
      });
    }

    if (side.toUpperCase() === 'SELL') {
      const holding = await Holding.findOne({ userId, symbol: sym });
      if (!holding || holding.quantity < qty) {
        return res.status(400).json({ success: false, message: 'Insufficient shares. You own ' + (holding?.quantity || 0) + ' of ' + sym + '.' });
      }

      holding.quantity -= qty;
      if (holding.quantity <= 0) {
        await Holding.deleteOne({ _id: holding._id });
      } else {
        await holding.save();
      }

      const costBasis = qty * holding.avgCost;
      const realizedGain = amount - costBasis;
      cash += amount;
      await User.updateOne({ _id: userId }, { cashBalance: cash });
      await Order.create({
        userId,
        symbol: sym,
        side: 'SELL',
        quantity: qty,
        price,
        amount,
        status: 'FILLED',
        realizedGain,
      });

      return res.json({
        success: true,
        message: `Sold ${qty} ${sym} @ $${price.toFixed(2)}`,
        order: { symbol: sym, side: 'SELL', quantity: qty, price, amount },
      });
    }
  } catch (err) {
    console.error('Trade error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/watchlist – user's watchlist symbols
router.get('/watchlist', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).select('watchlist');
    let list = user?.watchlist;
    if (!Array.isArray(list) || list.length === 0) {
      list = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'BTC'];
      await User.updateOne({ _id: userId }, { watchlist: list });
    }
    res.json({ success: true, watchlist: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/watchlist – add symbol to watchlist
router.post('/watchlist', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const symbol = (req.body.symbol || '').trim().toUpperCase();
    if (!symbol) return res.status(400).json({ success: false, message: 'Symbol required.' });
    const user = await User.findById(userId);
    let list = user?.watchlist || ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'BTC'];
    if (list.includes(symbol)) return res.json({ success: true, watchlist: list });
    list = [...list, symbol];
    await User.updateOne({ _id: userId }, { watchlist: list });
    res.json({ success: true, watchlist: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/watchlist/:symbol – remove from watchlist
router.delete('/watchlist/:symbol', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const symbol = (req.params.symbol || '').trim().toUpperCase();
    const user = await User.findById(userId);
    let list = user?.watchlist || ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'BTC'];
    list = list.filter(s => s !== symbol);
    if (list.length < 1) list = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'BTC'];
    await User.updateOne({ _id: userId }, { watchlist: list });
    res.json({ success: true, watchlist: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders – order history
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      orders: orders.map(o => ({
        id: o._id,
        symbol: o.symbol,
        side: o.side,
        quantity: o.quantity,
        price: o.price,
        amount: o.amount,
        status: o.status,
        realizedGain: o.realizedGain ?? 0,
        date: o.createdAt,
      })),
    });
  } catch (err) {
    console.error('Orders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/tax-summary – realized gains for tax report
router.get('/tax-summary', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const sells = await Order.find({ userId, side: 'SELL' }).lean();
    let totalRealized = 0;
    let totalLTCG = 0;
    let totalSTCG = 0;
    const now = new Date();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    for (const o of sells) {
      const realized = o.realizedGain ?? 0;
      totalRealized += realized;
      const orderDate = new Date(o.createdAt);
      if (now - orderDate >= oneYearMs) totalLTCG += realized;
      else totalSTCG += realized;
    }
    res.json({
      success: true,
      tax: {
        totalRealized,
        ltcg: totalLTCG,
        stcg: totalSTCG,
        ltcgTax: totalLTCG * 0.10,
        stcgTax: totalSTCG * 0.15,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
