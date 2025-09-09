const axios = require('axios');

// Test the real password reset flow
async function testRealPasswordReset() {
    const testEmail = process.env.TEST_EMAIL || 'deniseosoria04@gmail.com';
    const baseUrl = process.env.API_URL || 'http://localhost:5000';

    console.log('🧪 Testing Real Password Reset Flow');
    console.log('=====================================');
    console.log(`📧 Test Email: ${testEmail}`);
    console.log(`🌐 API URL: ${baseUrl}`);
    console.log('');

    try {
        // Step 1: Request password reset
        console.log('1️⃣ Requesting password reset...');
        const resetResponse = await axios.post(`${baseUrl}/api/users/forgot-password`, {
            email: testEmail
        });

        console.log('✅ Password reset request successful');
        console.log('📧 Response:', resetResponse.data);
        console.log('');

        // Step 2: Check if we can extract token from logs (for testing)
        console.log('2️⃣ Password reset email should have been sent');
        console.log('📧 Check your email for the reset link');
        console.log('🔗 The reset link should contain a real token');
        console.log('');

        console.log('✅ Real password reset flow test completed!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('1. Check your email inbox');
        console.log('2. Click the reset link in the email');
        console.log('3. The link should work with a real token from the database');

    } catch (error) {
        console.error('❌ Password reset test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
testRealPasswordReset();
