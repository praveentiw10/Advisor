const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const app = express();
const finnhub = require("finnhub");
const bcrypt = require("bcryptjs");


app.use(express.static(path.join(__dirname, '../../frontend/public')));

const hbs = require("hbs");
const mongoose = require("./config/db");
const User = require("./models/User");

const templatePath = path.join(__dirname, "../../frontend/views");

const authApiRoutes = require("./routes/authApiRoutes");
const authRoutes = require("./routes/authRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const session = require("express-session");

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "hbs");
app.set("views", templatePath);

// Session Routes (for forms)
app.use("/", authRoutes);

// Auth API: POST /api/auth/login, forgot-password, verify-otp, reset-password, GET /api/auth/me
app.use("/api/auth", authApiRoutes);

// Portfolio API: GET /api/portfolio, POST /api/trade, GET /api/orders
app.use("/api", portfolioRoutes);

// Payment API: GET /deposit, POST /api/payment/create-order, capture-order
app.use("/", paymentRoutes);


app.get("/status", (req, res) => {
  const status = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  res.json({
    server: "running",
    database: status,
    mongodb_state: mongoose.connection.readyState
  });
});

app.get("/home", (req, res) => { res.render("home"); });

// Symbol/quote page (public)
app.get("/symbol/:ticker", (req, res) => {
  const ticker = (req.params.ticker || "").toUpperCase().trim();
  if (!ticker) return res.redirect("/");
  res.render("symbol", { ticker });
});

const FINNHUB = process.env.FINNHUB_API_KEY;

app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "API Error" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 1) return res.json({ count: 0, result: [] });
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB}`;
    const response = await fetch(url);
    const data = await response.json();
    const results = (data.result || []).slice(0, 15);
    res.json({ count: data.count || 0, result: results });
  } catch (error) {
    res.status(500).json({ error: "API Error" });
  }
});

app.get("/api/company-profile/:symbol", async (req, res) => {
  try {
    let symbol = (req.params.symbol || "").trim();
    if (symbol === "BTC") symbol = "BINANCE:BTCUSDT";
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.name || data.ticker) res.json(data);
    else res.json({ name: symbol.replace("BINANCE:", "").replace("USDT", ""), ticker: symbol });
  } catch (error) {
    res.status(500).json({ error: "API Error" });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const symbol = (req.query.symbol || "").trim();
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    let url;
    if (symbol) {
      url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${FINNHUB}`;
    } else {
      url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB}`;
    }
    const response = await fetch(url);
    const data = await response.json();
    const list = Array.isArray(data) ? data.slice(0, 10) : [];
    res.json({ news: list });
  } catch (error) {
    res.status(500).json({ error: "API Error" });
  }
});

// Market movers: top gainers, losers, most active (by volume)
const MARKET_MOVER_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "JPM", "V", "JNJ", "WMT", "PG", "UNH", "HD",
  "DIS", "BAC", "ADBE", "XOM", "NFLX", "CRM", "PFE", "CSCO", "KO", "PEP", "INTC", "AMD", "ABT", "TMO", "COST"
];
app.get("/api/market-movers", async (req, res) => {
  try {
    const results = await Promise.all(
      MARKET_MOVER_SYMBOLS.map(async (sym) => {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${FINNHUB}`;
          const r = await fetch(url);
          const d = await r.json();
          if (d.c == null) return null;
          return {
            symbol: sym,
            price: d.c,
            change: d.d != null ? d.d : 0,
            changePercent: d.dp != null ? d.dp : 0,
            volume: d.v != null ? d.v : 0,
            open: d.o,
            high: d.h,
            low: d.l,
            previousClose: d.pc,
          };
        } catch (e) {
          return null;
        }
      })
    );
    const valid = results.filter(Boolean);
    const byPercent = [...valid].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    const gainers = byPercent.filter((x) => (x.changePercent || 0) > 0).slice(0, 10);
    const losers = byPercent.filter((x) => (x.changePercent || 0) < 0).slice(-10).reverse();
    const byVolume = [...valid].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const mostActive = byVolume.slice(0, 10);
    res.json({ gainers, losers, mostActive });
  } catch (error) {
    res.status(500).json({ error: "API Error" });
  }
});

// Candles for symbol page chart (optional)
app.get("/api/stock/:symbol/candles", async (req, res) => {
  try {
    let symbol = (req.params.symbol || "").trim();
    if (symbol === "BTC") symbol = "BINANCE:BTCUSDT";
    const resolution = (req.query.resolution || "D").toUpperCase();
    const to = Math.floor(Date.now() / 1000);
    const from = to - (resolution === "D" ? 365 : 30) * 24 * 60 * 60;
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.s === "no_data") {
      return res.json({ o: [], h: [], l: [], c: [], v: [], t: [] });
    }
    res.json({
      t: data.t || [],
      o: data.o || [],
      h: data.h || [],
      l: data.l || [],
      c: data.c || [],
      v: data.v || [],
    });
  } catch (error) {
    res.status(500).json({ error: "API Error" });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}

module.exports = app;