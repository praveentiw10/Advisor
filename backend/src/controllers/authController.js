const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail } = require('../utils/email');

exports.getLanding = (req, res) => {
    res.render("landing");
};

exports.getLogin = (req, res) => {
    res.render("login");
};

exports.getSignup = (req, res) => {
    res.render("signup");
};

exports.getForgotPassword = (req, res) => {
    res.render("forgot-password");
};

exports.getHome = (req, res) => {
    res.render("home", { userName: req.session.userName });
};

exports.postSignup = async (req, res) => {
    try {
        const data = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        };
        const newUser = new User(data);
        await newUser.save();

        // Send welcome email asynchronously (don't block the response)
        sendWelcomeEmail(newUser.email, newUser.name).catch(err => {
            console.error('Failed to send welcome email:', err);
        });

        // Initialize session
        req.session.userId = newUser._id;
        req.session.userName = newUser.name;

        res.redirect("/home");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error signing up");
    }
};


exports.postLogin = async (req, res) => {
    try {
        const user = await User.findOne({ name: req.body.name });
        if (user) {
            const isMatch = await bcrypt.compare(req.body.password, user.password);
            if (isMatch) {
                // Initialize session
                req.session.userId = user._id;
                req.session.userName = user.name;

                res.redirect("/home");
            } else {
                res.send("Wrong username or password");
            }
        } else {
            res.send("User not found");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Login error");
    }
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect("/");
};

exports.requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect("/login");
    }
};


