const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { sendWelcomeEmail } = require('./src/utils/email');

const targetEmail = '2203051050816@paruluniversity.ac.in';

async function test() {
    console.log(`Sending welcome email to: ${targetEmail}`);
    try {
        const res = await sendWelcomeEmail(targetEmail, 'Test User');
        console.log('Result:', res);
    } catch (err) {
        console.error('Test error:', err);
    }
}

test();
