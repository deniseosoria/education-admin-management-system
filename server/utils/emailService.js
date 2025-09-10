const nodemailer = require('nodemailer');
const { Resend } = require('resend');
require('dotenv').config();

// Log email configuration status
console.log('Email configuration check:');
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);
console.log('EMAIL_APP_PASSWORD exists:', !!process.env.EMAIL_APP_PASSWORD);
console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);

// Create transporter only if credentials are available
let transporter = null;
let resendClient = null;
let emailServiceEnabled = false;

if (process.env.RESEND_API_KEY) {
  try {
    // Use Resend HTTP API (Railway's recommended approach)
    resendClient = new Resend(process.env.RESEND_API_KEY);
    emailServiceEnabled = true;
    console.log('✅ Email service configured with Resend HTTP API');
  } catch (error) {
    console.error('❌ Error creating Resend client:', error);
    emailServiceEnabled = false;
  }
} else if (process.env.EMAIL_USER && (process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS)) {
  try {
    // Fallback to Gmail SMTP (only works on Railway Pro+ plans)
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS
      }
    });
    emailServiceEnabled = true;
    console.log('✅ Email service configured with Gmail SMTP (fallback)');
  } catch (error) {
    console.error('❌ Error creating Gmail transporter:', error);
    emailServiceEnabled = false;
  }
} else {
  console.log('⚠️ Email service is disabled - missing configuration');
  emailServiceEnabled = false;
}

// Email sending function with Resend HTTP API support
const sendEmail = async ({ to, subject, html }) => {
  // Check if email service is properly configured
  if (!emailServiceEnabled) {
    console.log('📧 Email sending disabled - missing configuration:', { to, subject });
    return false;
  }

  try {
    console.log(`📧 Sending email to: ${to}`);

    if (resendClient) {
      // Use Resend HTTP API (Railway's recommended approach)
      const { data, error } = await resendClient.emails.send({
        from: 'YJ Child Care Plus <noreply@yjchildcareplus.com>',
        to: [to],
        subject: subject,
        html: html,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        return false;
      }

      console.log('✅ Email sent successfully via Resend to:', to);
      console.log('📧 Message ID:', data?.id || 'N/A');
      console.log('📧 Resend Data:', JSON.stringify(data, null, 2));
      return true;
    } else if (transporter) {
      // Fallback to Gmail SMTP (only works on Railway Pro+ plans)
      const result = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
      });

      console.log('✅ Email sent successfully via Gmail SMTP to:', to);
      console.log('📧 Message ID:', result.messageId);
      return true;
    } else {
      console.log('📧 No email service configured');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};

// Connection test for both Resend and SMTP
const testEmailConnection = async () => {
  if (!emailServiceEnabled) {
    console.log('📧 Email connection test skipped - email service not configured');
    return false;
  }

  try {
    console.log('🔍 Testing email connection...');

    if (resendClient) {
      // Test Resend API connection
      console.log('🔍 Testing Resend API connection...');
      // Resend doesn't have a specific test endpoint, so we'll just verify the client is created
      console.log('✅ Resend API client configured successfully');
      return true;
    } else if (transporter) {
      // Test SMTP connection
      console.log('🔍 Testing SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Email connection test failed:', error.message);
    return false;
  }
};

// Test email function for debugging
const testEmailDelivery = async (testEmail) => {
  console.log('🧪 Testing email delivery to:', testEmail);

  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'Test Email - YJ Child Care Plus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Test Email</h1>
          <p>This is a test email to verify email delivery is working.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
          <p>From: YJ Child Care Plus</p>
        </div>
      `
    });

    console.log('🧪 Test email result:', result);
    return result;
  } catch (error) {
    console.error('🧪 Test email failed:', error);
    return false;
  }
};

// Email templates and functions
const emailService = {
  // Base send email function (can be used for any custom email)
  sendEmail,

  // Test email connection (Resend or SMTP)
  testEmailConnection,

  // Test email delivery
  testEmailDelivery,

  // Test password reset email specifically
  async testPasswordResetEmail(testEmail) {
    console.log('🧪 Testing password reset email delivery to:', testEmail);

    try {
      // Generate a test token
      const testToken = 'test-token-' + Date.now();
      const result = await this.sendPasswordResetEmail(testEmail, testToken);

      if (result) {
        console.log('✅ Password reset email test successful');
        return true;
      } else {
        console.log('❌ Password reset email test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Password reset email test error:', error);
      return false;
    }
  },

  // Send a welcome email to new users
  async sendWelcomeEmail(userEmail, userName) {
    return sendEmail({
      to: userEmail,
      subject: 'Welcome to YJ Child Care Plus! 🎓',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Welcome to YJ Child Care Plus!</h1>
              <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">Your professional development journey starts here</p>
            </div>
            
            <div style="margin-bottom: 25px;">
              <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName}! 👋</h2>
              <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
                Welcome to YJ Child Care Plus! We're excited to support you in your professional development as a childcare provider. Our comprehensive training programs are designed to enhance your skills and advance your career in early childhood education.
              </p>
            </div>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What's Next?</h3>
              <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
                <li>Browse our professional development courses and certifications</li>
                <li>Explore specialized training programs for childcare providers</li>
                <li>Join waitlists for upcoming classes and workshops</li>
                <li>Complete your professional profile and credentials</li>
              </ul>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #27ae60;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Professional Benefits</h3>
              <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
                <li>Stay current with best practices in early childhood education</li>
                <li>Network with other childcare professionals</li>
                <li>Access to expert-led training sessions</li>
                <li>Professional certification opportunities</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard" 
                 style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Access Your Dashboard
              </a>
            </div>
            
            <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
                <strong>Need Support?</strong> Our team is here to help you succeed in your professional development.
              </p>
              <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
                Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #95a5a6; font-size: 12px; margin: 0;">
                Best regards,<br>
                <strong>The YJ Child Care Plus Training Team</strong>
              </p>
            </div>
          </div>
        </div>
      `
    });
  },

  // Send appointment confirmation
  async sendAppointmentConfirmation(userEmail, appointmentDetails) {
    return sendEmail({
      to: userEmail,
      subject: 'Appointment Confirmation - YJ Child Care Plus',
      html: `
        <h1>Appointment Confirmation</h1>
        <p>Your appointment has been confirmed:</p>
        <ul>
          <li>Date: ${appointmentDetails.date}</li>
          <li>Time: ${appointmentDetails.time}</li>
          <li>Service: ${appointmentDetails.service}</li>
        </ul>
        <p>If you need to make any changes, please contact us as soon as possible.</p>
        <br>
        <p>Best regards,</p>
        <p>The YJ Child Care Plus Team</p>
      `
    });
  },

  // Send password reset email
  async sendPasswordResetEmail(userEmail, resetToken) {
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    console.log('🔐 Sending password reset email to:', userEmail);
    console.log('🔐 Reset token length:', resetToken ? resetToken.length : 'undefined');
    console.log('🔐 Reset link:', resetLink);

    return sendEmail({
      to: userEmail,
      subject: 'Password Reset Request - YJ Child Care Plus 🔐',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Password Reset Request</h1>
              <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">Secure your account</p>
            </div>
            
            <div style="margin-bottom: 25px;">
              <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
                We received a request to reset your password for your YJ Child Care Plus account. If you made this request, please click the button below to create a new password.
              </p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">⚠️ Important Security Notice</h3>
              <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>Only click this link if you requested the password reset</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your current password will remain unchanged until you complete the reset</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Reset My Password
              </a>
            </div>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Can't click the button?</h3>
              <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 10px;">
                Copy and paste this link into your browser:
              </p>
              <p style="color: #3498db; word-break: break-all; font-size: 14px;">
                ${resetLink}
              </p>
            </div>
            
            <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
                <strong>Need Help?</strong> If you're having trouble, contact our support team.
              </p>
              <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
                Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #95a5a6; font-size: 12px; margin: 0;">
                Best regards,<br>
                <strong>The YJ Child Care Plus Security Team</strong>
              </p>
            </div>
          </div>
        </div>
      `
    });
  },

  // Send custom email (simplified version of the original sendCustomEmail)
  async sendCustomEmail(to, subject, htmlContent) {
    return sendEmail({ to, subject, html: htmlContent });
  },

  // Send waitlist confirmation email
  sendWaitlistConfirmationEmail: async (userEmail, userName, className, classDetails, position) => {
    const subject = `Waitlist Confirmation: ${className} 📋`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Waitlist Confirmation</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">You're on the list!</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName}! 👋</h2>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
              Great news! You've been successfully added to the waitlist for <strong>${className}</strong>. We'll notify you as soon as a spot becomes available.
            </p>
          </div>
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Class Details</h3>
            <div style="color: #2c3e50; line-height: 1.8;">
              <p><strong>Class:</strong> ${className}</p>
            <p><strong>Start Date:</strong> ${new Date(classDetails.start_date).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> ${new Date(classDetails.end_date).toLocaleDateString()}</p>
            <p><strong>Location:</strong> ${classDetails.location_details}</p>
              <p><strong>Your Position:</strong> #${position}</p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What Happens Next?</h3>
            <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
              <li>We'll monitor class availability and notify you when a spot opens</li>
              <li>You'll receive an email with 24 hours to accept the spot</li>
              <li>If you don't respond within 24 hours, the offer will expire</li>
              <li>You can check your waitlist status anytime in your dashboard</li>
            </ul>
        </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              View My Waitlist
            </a>
          </div>
          
          <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
              <strong>Questions?</strong> Contact our support team if you need assistance.
            </p>
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Team</strong>
            </p>
          </div>
        </div>
        </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },



  // Send waitlist acceptance confirmation
  sendWaitlistAcceptanceEmail: async (userEmail, userName, className, classDetails) => {
    const subject = `✅ Enrollment Confirmed: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Enrollment Confirmed!</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">Welcome to the class</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName}! 🎉</h2>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
              Congratulations! Your enrollment in <strong>${className}</strong> has been confirmed. You're all set to start your professional development journey.
            </p>
          </div>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Enrollment Details</h3>
            <div style="color: #2c3e50; line-height: 1.8;">
              <p><strong>Class:</strong> ${className}</p>
              <p><strong>Start Date:</strong> ${new Date(classDetails.start_date).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(classDetails.end_date).toLocaleDateString()}</p>
              <p><strong>Location:</strong> ${classDetails.location_details}</p>
              <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✅ Confirmed</span></p>
            </div>
          </div>
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What's Next?</h3>
            <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
              <li>Review your class materials and requirements</li>
              <li>Mark your calendar with important dates</li>
              <li>Prepare any required materials or prerequisites</li>
              <li>Check your email for additional class information</li>
            </ul>
        </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              View My Classes
            </a>
          </div>
          
          <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
              <strong>Questions?</strong> Our team is here to help you succeed.
            </p>
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Team</strong>
            </p>
          </div>
        </div>
        </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send waitlist rejection notification
  sendWaitlistRejectionEmail: async (userEmail, userName, className, reason = '') => {
    const subject = `Waitlist Update: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Waitlist Update</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">Important information about your waitlist status</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName},</h2>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
              We wanted to inform you about an update regarding your waitlist status for <strong>${className}</strong>.
            </p>
          </div>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #dc3545;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Status Update</h3>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 10px;">
              Unfortunately, we are unable to offer you a spot in this class at this time.
            </p>
            ${reason ? `<p style="color: #2c3e50; line-height: 1.6;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What You Can Do</h3>
            <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
              <li>Browse other available classes and training programs</li>
              <li>Join waitlists for similar classes</li>
              <li>Contact us to discuss alternative options</li>
              <li>Stay updated on new class offerings</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/classes" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Browse Classes
            </a>
          </div>
          
          <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
              <strong>Need Help?</strong> We're here to support your professional development goals.
            </p>
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Team</strong>
            </p>
          </div>
        </div>
        </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send enrollment confirmation email
  sendEnrollmentConfirmationEmail: async (userEmail, userName, className, classDetails, sessionDetails) => {
    const subject = `✅ Enrollment Confirmation: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Enrollment Confirmation</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">You're all set for your class!</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName}! 🎉</h2>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
              Congratulations! You have successfully enrolled in <strong>${className}</strong>. We're excited to have you join us for this professional development opportunity.
            </p>
          </div>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Class Details</h3>
            <div style="color: #2c3e50; line-height: 1.8;">
              <p><strong>Class:</strong> ${className}</p>
              <p><strong>Date:</strong> ${new Date(sessionDetails.session_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${sessionDetails.start_time} - ${sessionDetails.end_time}</p>
              <p><strong>Location:</strong> ${classDetails.location_details}</p>
              <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✅ Confirmed</span></p>
            </div>
          </div>
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What's Next?</h3>
            <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
              <li>Review your class materials and requirements</li>
              <li>Mark your calendar with the class date and time</li>
              <li>Prepare any required materials or prerequisites</li>
              <li>Check your email for additional class information</li>
              <li>Arrive 10 minutes early on the day of your class</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              View My Enrollments
            </a>
          </div>
          
          <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
              <strong>Questions?</strong> Contact our support team if you need assistance.
            </p>
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send enrollment approval email
  sendEnrollmentApprovalEmail: async (userEmail, userName, className, classDetails, sessionDetails, adminNotes) => {
    const subject = `✅ Enrollment Approved: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Enrollment Approved!</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">Welcome to the class</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName}! 🎉</h2>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
              Great news! Your enrollment in <strong>${className}</strong> has been approved. You're all set to start your professional development journey.
            </p>
          </div>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Enrollment Details</h3>
            <div style="color: #2c3e50; line-height: 1.8;">
              <p><strong>Class:</strong> ${className}</p>
              <p><strong>Date:</strong> ${new Date(sessionDetails.session_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${sessionDetails.start_time} - ${sessionDetails.end_time}</p>
              <p><strong>Location:</strong> ${classDetails.location_details}</p>
              <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✅ Approved</span></p>
            </div>
          </div>
          
          ${adminNotes ? `
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Admin Notes</h3>
            <p style="color: #2c3e50; line-height: 1.6; margin: 0;">
              ${adminNotes}
            </p>
          </div>
          ` : ''}
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What's Next?</h3>
            <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
              <li>Review your class materials and requirements</li>
              <li>Mark your calendar with important dates</li>
              <li>Prepare any required materials or prerequisites</li>
              <li>Check your email for additional class information</li>
              <li>Arrive 10 minutes early on the day of your class</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              View My Enrollments
            </a>
          </div>
          
          <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
              <strong>Questions?</strong> Contact our support team if you need assistance.
            </p>
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send enrollment rejection email
  sendEnrollmentRejectionEmail: async (userEmail, userName, className, classDetails, sessionDetails, adminNotes) => {
    const subject = `❌ Enrollment Status Update: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Enrollment Status Update</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">Important information about your enrollment</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName},</h2>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
              We regret to inform you that your enrollment in <strong>${className}</strong> has been rejected.
            </p>
          </div>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #dc3545;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Enrollment Details</h3>
            <div style="color: #2c3e50; line-height: 1.8;">
              <p><strong>Class:</strong> ${className}</p>
              <p><strong>Date:</strong> ${new Date(sessionDetails.session_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${sessionDetails.start_time} - ${sessionDetails.end_time}</p>
              <p><strong>Location:</strong> ${classDetails.location_details}</p>
              <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">❌ Rejected</span></p>
            </div>
          </div>
          
          ${adminNotes ? `
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Reason for Rejection</h3>
            <p style="color: #2c3e50; line-height: 1.6; margin: 0;">
              ${adminNotes}
            </p>
          </div>
          ` : ''}
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What's Next?</h3>
            <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
              <li>Consider enrolling in other available classes</li>
              <li>Check our website regularly for new class offerings</li>
              <li>Contact us if you have questions about the rejection</li>
              <li>We may have alternative options that better suit your needs</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/classes" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Browse Available Classes
            </a>
          </div>
          
          <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
              <strong>Questions?</strong> Contact our support team if you need assistance.
            </p>
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send notification alert email
  sendNotificationAlertEmail: async (userEmail, userName, notificationType, notificationTitle) => {
    const subject = `📢 New Notification: ${notificationTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">New Notification</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">You have a new message waiting for you</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName}! 📢</h2>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
              You have received a new notification from YJ Child Care Plus. Please check your profile to view the complete message.
            </p>
          </div>
          
          <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Notification Details</h3>
            <div style="color: #2c3e50; line-height: 1.8;">
              <p><strong>Type:</strong> ${notificationType === 'broadcast' ? 'Broadcast Message' : 'Personal Notification'}</p>
              <p><strong>Title:</strong> ${notificationTitle}</p>
              <p><strong>Status:</strong> <span style="color: #3498db; font-weight: bold;">📢 Unread</span></p>
            </div>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What You Need to Do</h3>
            <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
              <li>Log in to your YJ Child Care Plus account</li>
              <li>Go to your profile dashboard</li>
              <li>Check the notifications section</li>
              <li>Read the complete message</li>
              <li>Take any required actions</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              View My Notifications
            </a>
          </div>
          
          <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
              <strong>Questions?</strong> Contact our support team if you need assistance.
            </p>
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #3498db;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  }

};

module.exports = emailService; 