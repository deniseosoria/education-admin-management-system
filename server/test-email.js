#!/usr/bin/env node

// Test script for email functionality
require('dotenv').config();
const emailService = require('./utils/emailService');

async function testEmailFunctionality() {
    console.log('🧪 Testing Email Functionality');
    console.log('================================');

    // Check environment variables
    console.log('\n📋 Environment Check:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
    console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? '✅ Set' : '❌ Missing');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing');
    console.log('CLIENT_URL:', process.env.CLIENT_URL ? '✅ Set' : '❌ Missing');

    if (!process.env.EMAIL_USER || (!process.env.EMAIL_APP_PASSWORD && !process.env.EMAIL_PASS)) {
        console.log('\n❌ Email configuration is incomplete. Please set EMAIL_USER and EMAIL_APP_PASSWORD or EMAIL_PASS');
        process.exit(1);
    }

    // Test SMTP connection
    console.log('\n🔍 Testing SMTP Connection:');
    const connectionTest = await emailService.testSMTPConnection();

    if (!connectionTest) {
        console.log('\n❌ SMTP connection test failed. Email service may not work properly.');
        process.exit(1);
    }

    // Test email delivery (optional - requires a test email)
    const testEmail = process.env.TEST_EMAIL;
    if (testEmail) {
        console.log(`\n📧 Testing Email Delivery to: ${testEmail}`);
        const deliveryTest = await emailService.testEmailDelivery(testEmail);

        if (deliveryTest) {
            console.log('✅ Email delivery test successful!');
        } else {
            console.log('❌ Email delivery test failed.');
        }
    } else {
        console.log('\n💡 To test email delivery, set TEST_EMAIL environment variable');
        console.log('   Example: TEST_EMAIL=your-email@example.com node test-email.js');
    }

    console.log('\n✅ Email functionality test completed!');
}

// Run the test
testEmailFunctionality().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
