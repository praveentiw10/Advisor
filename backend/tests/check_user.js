const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to DB');
        const email = '2203051050816@paruluniversity.ac.in';
        const user = await User.findOne({ email });
        if (user) {
            console.log('User FOUND:', user.email);
            console.log('OTP:', user.otp);
            console.log('Expiry:', user.otpExpiry);
        } else {
            console.log('User NOT FOUND with email:', email);
        }
        mongoose.disconnect();
    })
    .catch(err => console.error(err));
