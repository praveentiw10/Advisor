const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { sendOTPEmail } = require('./src/utils/email');

const targetEmail = '2203051050816@paruluniversity.ac.in';

async function test() {
    console.log(`Sending test email to: ${targetEmail}`);
    try {
        const res = await sendOTPEmail(targetEmail, '999999');
        console.log('Result:', res);
    } catch (err) {
        console.error('Test error:', err);
    }
}

test();
