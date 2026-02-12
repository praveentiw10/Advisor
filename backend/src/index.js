require("dotenv").config();

const express = require("express");
const app = express();
const finnhub = require("finnhub");
const path = require("path");
const bcrypt = require("bcrypt");

app.use(express.static(path.join(__dirname, '../../frontend/public')));

const hbs = require("hbs");
require("./config/db");
const User = require("./models/User");

const templatePath = path.join(__dirname, "../../frontend/views");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "hbs");
app.set("views", templatePath);

const finnhubClient = new finnhub.DefaultApi({
  apiKey: process.env.API_KEY
});


app.get("/", (req, res) => { res.render("landing"); });
app.get("/login", (req, res) => { res.render("login"); });
app.get("/signup", (req, res) => { res.render("signup"); });

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = new User({ name, email, password });
    await user.save();
    res.redirect("/home");
  } catch (err) {
    console.error("Signup Error:", err);
    if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
      res.status(503).send("Database connection timeout. Please check if your IP is whitelisted in MongoDB Atlas.");
    } else if (err.code === 11000) {
      res.status(400).send("User already exists with this email.");
    } else {
      res.status(500).send("Error during signup: " + err.message);
    }
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ name: req.body.name });
    if (user) {
      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (isMatch) {
        res.redirect("/home");
      } else {
        res.send("Wrong password");
      }
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Login error: " + err.message);
  }
});

// Root route to check server status
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

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});