const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { sendWelcomeEmail } = require('./src/utils/email');

const targetEmail = 'tiwpraveen10@gmail.com';

async function testManual() {
    console.log(`Sending manual welcome email to: ${targetEmail}`);
    try {
        const res = await sendWelcomeEmail(targetEmail, 'Praveen');
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (err) {
        console.error('Test error detail:', err);
    }
}

testManual();
