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
        console.log(`\n📧 Testing Basic Email Delivery to: ${testEmail}`);
        const deliveryTest = await emailService.testEmailDelivery(testEmail);

        if (deliveryTest) {
            console.log('✅ Basic email delivery test successful!');
        } else {
            console.log('❌ Basic email delivery test failed.');
        }

        // Test password reset email specifically
        console.log(`\n🔐 Testing Password Reset Email to: ${testEmail}`);
        const passwordResetTest = await emailService.testPasswordResetEmail(testEmail);

        if (passwordResetTest) {
            console.log('✅ Password reset email test successful!');
        } else {
            console.log('❌ Password reset email test failed.');
        }

        // Summary
        console.log('\n📊 Test Summary:');
        console.log(`- SMTP Connection: ${connectionTest ? '✅' : '❌'}`);
        console.log(`- Basic Email: ${deliveryTest ? '✅' : '❌'}`);
        console.log(`- Password Reset Email: ${passwordResetTest ? '✅' : '❌'}`);

        if (connectionTest && deliveryTest && passwordResetTest) {
            console.log('\n🎉 All email tests passed! Email functionality is working correctly.');
        } else if (connectionTest && deliveryTest && !passwordResetTest) {
            console.log('\n⚠️ Basic emails work but password reset emails fail. This suggests a specific issue with password reset email content or timing.');
        } else if (!connectionTest) {
            console.log('\n❌ SMTP connection failed. This indicates Railway may be blocking SMTP connections on your current plan.');
        } else {
            console.log('\n❌ Multiple email issues detected. Check configuration and Railway plan.');
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
