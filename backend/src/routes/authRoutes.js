const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/', authController.getLanding);
router.get('/login', authController.getLogin);
router.get('/signup', authController.getSignup);
router.get('/home', authController.requireAuth, authController.getHome);
router.get('/logout', authController.logout);
router.post('/signup', authController.postSignup);
router.post('/login', authController.postLogin);


module.exports = router;
