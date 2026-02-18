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


app.get("/status", (req, res) => {
  const status = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  res.json({
    server: "running",
    database: status,
    mongodb_state: mongoose.connection.readyState
  });
});

app.get("/home", (req, res) => { res.render("home"); });

app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
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