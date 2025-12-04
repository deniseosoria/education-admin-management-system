const nodemailer = require('nodemailer');
const { Resend } = require('resend');
require('dotenv').config();

// Helper function to get client URL with production fallback
const getClientUrl = () => {
  // Use CLIENT_URL if set, otherwise fallback to production URL
  // Remove trailing slash if present
  const url = (process.env.CLIENT_URL || 'https://yjchildcareplus.com').replace(/\/$/, '');
  return url;
};

// Log email configuration status
console.log('Email configuration check:');
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);
console.log('EMAIL_APP_PASSWORD exists:', !!process.env.EMAIL_APP_PASSWORD);
console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
console.log('CLIENT_URL:', getClientUrl());

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
        from: 'YJ Child Care Plus <support@yjchildcareplus.com>',
        to: [to],
        subject: subject,
        html: `
          <div style="margin-bottom: 20px; padding: 15px 0; font-size: 12px; color: #666666;">
            <strong>Do Not Reply:</strong> This is an automated message. Please do not reply to this email address as it is not monitored. If you need assistance, please contact us through our website or support channels.
          </div>
          ${html}
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        // Throw error so it can be caught and handled (especially for rate limits)
        const emailError = new Error(error.message || 'Failed to send email');
        emailError.statusCode = error.statusCode;
        emailError.name = error.name;
        emailError.originalError = error;
        throw emailError;
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
    // Re-throw if it's already an error with statusCode (from Resend)
    if (error.statusCode || error.name === 'rate_limit_exceeded') {
      throw error;
    }
    // Otherwise throw a generic error
    const emailError = new Error(error.message || 'Failed to send email');
    emailError.originalError = error;
    throw emailError;
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

// Helper function to format time in user-friendly way
const formatTime = (timeString) => {
  if (!timeString) return 'TBD';

  // Convert 24-hour format to 12-hour format
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return `${displayHour}:${minutes} ${ampm}`;
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
      subject: 'Welcome to YJ Child Care Plus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Welcome to YJ Child Care Plus</h1>
          <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
          
          <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
            Hello ${userName},
          </p>
          
          <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
            Welcome to YJ Child Care Plus. We're excited to support you in your professional development as a childcare provider. Our comprehensive training programs are designed to enhance your skills and advance your career in early childhood education.
          </p>
          
          <div style="margin: 30px 0;">
            <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What's Next?</h2>
            <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
              <li>Browse our professional development courses and certifications</li>
              <li>Explore specialized training programs for childcare providers</li>
              <li>Join waitlists for upcoming classes and workshops</li>
              <li>Complete your professional profile and credentials</li>
            </ul>
          </div>
          
          <div style="margin: 30px 0;">
            <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Professional Benefits</h2>
            <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
              <li>Stay current with best practices in early childhood education</li>
              <li>Network with other childcare professionals</li>
              <li>Access to expert-led training sessions</li>
              <li>Professional certification opportunities</li>
            </ul>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${getClientUrl()}/profile" 
               style="color: #000000; text-decoration: underline; font-weight: 600;">
              Access Your Profile
            </a>
          </div>
          
          <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
            <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
              <strong>Need Support?</strong> Our team is here to help you succeed in your professional development.
            </p>
            <p style="color: #666666; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <p style="color: #666666; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Training Team</strong>
            </p>
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
    const resetLink = `${getClientUrl()}/reset-password?token=${resetToken}`;

    console.log('🔐 Sending password reset email to:', userEmail);
    console.log('🔐 Reset token length:', resetToken ? resetToken.length : 'undefined');
    console.log('🔐 Reset link:', resetLink);

    return sendEmail({
      to: userEmail,
      subject: 'Password Reset Request - YJ Child Care Plus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Password Reset Request</h1>
          <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
          
          <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password for your YJ Child Care Plus account. If you made this request, please click the link below to create a new password.
          </p>
          
          <div style="margin: 30px 0;">
            <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Important Security Notice</h2>
            <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
              <li>This link will expire in <strong>1 hour</strong></li>
              <li>Only click this link if you requested the password reset</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your current password will remain unchanged until you complete the reset</li>
            </ul>
          </div>
          
          <div style="margin: 30px 0;">
            <a href="${resetLink}" 
               style="color: #000000; text-decoration: underline; font-weight: 600;">
              Reset My Password
            </a>
          </div>
          
          <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
            <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
              <strong>Need Help?</strong> If you're having trouble, contact our support team.
            </p>
            <p style="color: #666666; font-size: 14px; margin: 0;">
              Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <p style="color: #666666; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Security Team</strong>
            </p>
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
    const subject = `Waitlist Confirmation: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Waitlist Confirmation</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Great news! You've been successfully added to the waitlist for <strong>${className}</strong>. We'll notify you as soon as a spot becomes available.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Class Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${className}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Start Date:</strong> ${new Date(classDetails.start_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>End Date:</strong> ${new Date(classDetails.end_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${classDetails.location_details}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Your Position:</strong> #${position}</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What Happens Next?</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>We'll monitor class availability and notify you when a spot opens</li>
            <li>You'll receive an email with 24 hours to accept the spot</li>
            <li>If you don't respond within 24 hours, the offer will expire</li>
            <li>You can check your waitlist status anytime in your profile</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${getClientUrl()}/profile?section=waitlist" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            View My Waitlist
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Questions?</strong> Contact our support team if you need assistance.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },



  // Send waitlist acceptance confirmation
  sendWaitlistAcceptanceEmail: async (userEmail, userName, className, classDetails) => {
    const subject = `Enrollment Confirmed: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Confirmed</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your enrollment in <strong>${className}</strong> has been confirmed. You're all set to start your professional development journey.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${className}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Start Date:</strong> ${new Date(classDetails.start_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>End Date:</strong> ${new Date(classDetails.end_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${classDetails.location_details}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Status:</strong> Confirmed</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What's Next?</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Review your class materials and requirements</li>
            <li>Mark your calendar with important dates</li>
            <li>Prepare any required materials or prerequisites</li>
            <li>Check your email for additional class information</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="https://yjchildcareplus.com/profile?section=enrollments" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            View My Classes
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Questions?</strong> Our team is here to help you succeed.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send waitlist rejection notification
  sendWaitlistRejectionEmail: async (userEmail, userName, className, reason = '') => {
    const subject = `Waitlist Update: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Waitlist Update</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          We wanted to inform you about an update regarding your waitlist status for <strong>${className}</strong>.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Status Update</h2>
          <p style="color: #000000; line-height: 1.6; margin-bottom: 10px;">
            Unfortunately, we are unable to offer you a spot in this class at this time.
          </p>
          ${reason ? `<p style="color: #000000; line-height: 1.6;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What You Can Do</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Browse other available classes and training programs</li>
            <li>Join waitlists for similar classes</li>
            <li>Contact us to discuss alternative options</li>
            <li>Stay updated on new class offerings</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${getClientUrl()}/classes" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            Browse Classes
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Need Help?</strong> We're here to support your professional development goals.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send enrollment pending approval email
  sendEnrollmentPendingEmail: async (userEmail, userName, className, classDetails, sessionDetails, paymentMethod = null) => {
    const subject = `Enrollment Submitted: ${className} - Pending Approval`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Submitted</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Thank you for enrolling in <strong>${className}</strong>. Your enrollment has been successfully submitted and is now pending approval from our team.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${className}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(sessionDetails.session_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${formatTime(sessionDetails.start_time)} - ${formatTime(sessionDetails.end_time)}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${classDetails.location_details}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Status:</strong> Pending Approval</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What Happens Next?</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            ${paymentMethod === 'EIP' ? `<li>Please apply for scholarship through EIP (Educational Incentive Program) to complete your enrollment <a href="${sessionDetails.eip_url || 'https://www.ecetp.pdp.albany.edu'}" style="color: #ff0000; text-decoration: underline;">(Click here)</a></li>` : ''}
            <li>Our team will review your enrollment request</li>
            <li>You'll receive an email notification once your enrollment is approved or rejected</li>
            <li>If approved, you'll get confirmation details and next steps</li>
            <li>You can check your enrollment status anytime in your profile</li>
            <li>We typically process enrollments within 1-2 business days</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Important Notes</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Please do not make travel arrangements until your enrollment is approved</li>
            <li>If you need to make changes, contact us as soon as possible</li>
            <li>Your spot is reserved while your enrollment is being reviewed</li>
            <li>You'll be notified immediately once a decision is made</li>
          </ul>
        </div>
        
        <div style="margin: 40px 0; background-color: #f5f5f5; padding: 25px; border-radius: 4px;">
          <h2 style="color: #003366; font-size: 18px; font-weight: 600; margin-bottom: 20px; border-bottom: 1px solid #003366; padding-bottom: 10px;">
            Policies & Procedures
          </h2>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Registration Fee</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Class must be paid in full before the class start date. Cash, checks, money orders, and EIP award letters are accepted. If using EIP award letter, we must receive the award letter prior to the class start date. Payment plans are available upon request.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Financial Aid</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin-bottom: 8px;">
              Scholarship funding to participate in this training may be available through the Educational Incentive Program (EIP). For more information or to apply for a scholarship, please visit <a href="https://www.ecetp.pdp.albany.edu" style="color: #000000; text-decoration: underline;">www.ecetp.pdp.albany.edu</a>.
            </p>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              You may also contact EIP by email at <a href="mailto:eip@albany.edu" style="color: #000000; text-decoration: underline;">eip@albany.edu</a>, or by phone at either (800) 295-9616 or (518) 442-6575. Call us for more information.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Refunds</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Participants waiting for an EIP award letter must pay for the class and payment will be reimbursed once EIP award letter is received.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Cancellation and Credit</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Cancellations must be made at least 3 days prior to the training session. A credit or refund will be issued for advanced cancellations or if cancellation was made by YJ Child Care Plus, Inc. No credits will be granted to EIP award recipients. In case of any cancellations unused awards must be returned to EIP and you must reapply online for the next available class.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Certificates</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              A certificate will be provided to each attendee after the completion of training and receipt of full payment. Certificates will include the name of the workshop, class date and expiration date, number of training hours completed and the trainer's name and Aspire ID number.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Participant's Responsibilities</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Participants are responsible for attending all training sessions and to complete all class assignments in order to receive a certificate of completion; responsible for purchasing all required class materials; and responsible for making up any missing sessions.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Children</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Child care is not available and children will not be allowed in the training sessions.
            </p>
          </div>
          
          <div style="margin-bottom: 0; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Policy on Non-Discrimination</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              YJ Child Care Plus, Inc does not discriminate on the basis of age, sex, sexual orientation, religion, race, color, nationality, ethnic origin, disability, or veteran or marital status in its participants' access to training, and administration of training policies.
            </p>
          </div>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="https://yjchildcareplus.com/profile?section=enrollments" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            View My Enrollments
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Questions?</strong> Contact our support team if you need assistance.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send enrollment approval email
  sendEnrollmentApprovalEmail: async (userEmail, userName, className, classDetails, sessionDetails, adminNotes) => {
    const subject = `Enrollment Approved: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Approved</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Great news! Your enrollment in <strong>${className}</strong> has been approved. You're all set to start your professional development journey.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${className}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(sessionDetails.session_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${sessionDetails.start_time} - ${sessionDetails.end_time}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${classDetails.location_details}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Status:</strong> Approved</p>
        </div>
        
        ${adminNotes ? `
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Admin Notes</h2>
          <p style="color: #000000; line-height: 1.6; margin: 0;">
            ${adminNotes}
          </p>
        </div>
        ` : ''}
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What's Next?</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Review your class materials and requirements</li>
            <li>Mark your calendar with important dates</li>
            <li>Prepare any required materials or prerequisites</li>
            <li>Check your email for additional class information</li>
            <li>Arrive 10 minutes early on the day of your class</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="https://yjchildcareplus.com/profile?section=enrollments" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            View My Enrollments
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Questions?</strong> Contact our support team if you need assistance.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send enrollment rejection email
  sendEnrollmentRejectionEmail: async (userEmail, userName, className, classDetails, sessionDetails, adminNotes) => {
    const subject = `Enrollment Status Update: ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Status Update</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          We regret to inform you that your enrollment in <strong>${className}</strong> has been rejected.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${className}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(sessionDetails.session_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${sessionDetails.start_time} - ${sessionDetails.end_time}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${classDetails.location_details}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Status:</strong> Rejected</p>
        </div>
        
        ${adminNotes ? `
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Reason for Rejection</h2>
          <p style="color: #000000; line-height: 1.6; margin: 0;">
            ${adminNotes}
          </p>
        </div>
        ` : ''}
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What's Next?</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Consider enrolling in other available classes</li>
            <li>Check our website regularly for new class offerings</li>
            <li>Contact us if you have questions about the rejection</li>
            <li>We may have alternative options that better suit your needs</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${getClientUrl()}/classes" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            Browse Available Classes
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Questions?</strong> Contact our support team if you need assistance.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send notification alert email
  sendNotificationAlertEmail: async (userEmail, userName, notificationType, notificationTitle) => {
    const subject = `New Notification: ${notificationTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">New Notification</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          You have received a new notification from YJ Child Care Plus. Please check your profile to view the complete message.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Notification Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Type:</strong> ${notificationType === 'broadcast' ? 'Broadcast Message' : 'Personal Notification'}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Title:</strong> ${notificationTitle}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Status:</strong> Unread</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What You Need to Do</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Log in to your YJ Child Care Plus account</li>
            <li>Go to your profile</li>
            <li>Check the notifications section</li>
            <li>Read the complete message</li>
            <li>Take any required actions</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${getClientUrl()}/profile?section=notifications" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            View My Notifications
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Questions?</strong> Contact our support team if you need assistance.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail({ to: userEmail, subject, html });
  },

  // Send admin notification for new account creation
  async sendAdminNewAccountNotification(userEmail, userName, userDetails) {
    try {
      console.log(`📧 sendAdminNewAccountNotification called for: ${userEmail}`);
      const adminEmails = ['yvelisse225@gmail.com', 'deniseosoria04@gmail.com'];
      const subject = `New Account Created: ${userName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">New Account Created</h1>
          <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
          
          <div style="margin: 30px 0;">
            <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Account Details</h2>
            <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Name:</strong> ${userName}</p>
            <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
            ${userDetails?.first_name ? `<p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>First Name:</strong> ${userDetails.first_name}</p>` : ''}
            ${userDetails?.last_name ? `<p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Last Name:</strong> ${userDetails.last_name}</p>` : ''}
            ${userDetails?.phone_number ? `<p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Phone:</strong> ${userDetails.phone_number}</p>` : ''}
            <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Role:</strong> ${userDetails?.role || 'student'}</p>
            <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Status:</strong> ${userDetails?.status || 'active'}</p>
            <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Created At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="margin: 30px 0;">
            <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Next Steps</h2>
            <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
              <li>Review the new user's profile in the admin dashboard</li>
              <li>Verify user information if needed</li>
              <li>Monitor user activity and enrollments</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <p style="color: #666666; font-size: 12px; margin: 0;">
              This is an automated notification from YJ Child Care Plus<br>
              <strong>Website:</strong> ${getClientUrl()}
            </p>
          </div>
        </div>
      `;

      console.log(`📧 Preparing to send admin notifications to: ${adminEmails.join(', ')}`);

      // Send to all admin emails
      const emailPromises = adminEmails.map(email =>
        sendEmail({ to: email, subject, html })
      );

      const results = await Promise.allSettled(emailPromises);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`✅ Admin notification sent to: ${adminEmails[index]}`);
        } else {
          console.error(`❌ Failed to send admin notification to: ${adminEmails[index]}`, result.reason);
        }
      });

      const allSuccessful = results.every(result => result.status === 'fulfilled');
      console.log(`📧 Admin notification sending complete. All successful: ${allSuccessful}`);
      return allSuccessful;
    } catch (error) {
      console.error('❌ Error in sendAdminNewAccountNotification:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  },

  // Send admin notification for class enrollment
  async sendAdminEnrollmentNotification(userEmail, userName, className, classDetails, sessionDetails) {
    const adminEmails = ['yvelisse225@gmail.com', 'deniseosoria04@gmail.com'];
    const subject = `New Enrollment: ${userName} enrolled in ${className}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">New Class Enrollment</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Student Information</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Name:</strong> ${userName}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
        </div>

        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Class Information</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${className}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(sessionDetails.session_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${formatTime(sessionDetails.start_time)} - ${formatTime(sessionDetails.end_time)}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${classDetails.location_details}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Enrollment Status:</strong> Pending Approval</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Enrolled At:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Action Required</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Review the enrollment in the admin dashboard</li>
            <li>Approve or reject the enrollment request</li>
            <li>Check class capacity and availability</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${getClientUrl()}/admin/enrollments" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            View Enrollments
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            This is an automated notification from YJ Child Care Plus<br>
            <strong>Website:</strong> ${process.env.CLIENT_URL || 'https://yjchildcareplus.com'}
          </p>
        </div>
      </div>
    `;

    // Send to all admin emails
    const emailPromises = adminEmails.map(email =>
      sendEmail({ to: email, subject, html })
    );

    const results = await Promise.allSettled(emailPromises);
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Admin enrollment notification sent to: ${adminEmails[index]}`);
      } else {
        console.error(`❌ Failed to send admin enrollment notification to: ${adminEmails[index]}`, result.reason);
      }
    });

    return results.every(result => result.status === 'fulfilled');
  },

  // Send certificate expiration warning email
  async sendCertificateExpirationEmail(userEmail, userName, certificateName, expirationDate, className) {
    const expirationDateFormatted = new Date(expirationDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculate days until expiration
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    const subject = `Certificate Expiring Soon: ${certificateName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Certificate Expiration Notice</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          This is a reminder that your certificate <strong>${certificateName}</strong> is expiring soon. Please take action to renew or update your certificate before it expires.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Certificate Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Certificate Name:</strong> ${certificateName}</p>
          ${className ? `<p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${className}</p>` : ''}
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Expiration Date:</strong> ${expirationDateFormatted}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Days Remaining:</strong> ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What You Need to Do</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Review your certificate details in your profile</li>
            <li>Contact us if you need to renew or update your certificate</li>
            <li>Ensure your certificate information is up to date</li>
            <li>Take any necessary actions before the expiration date</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${getClientUrl()}/profile?section=certificates" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            View My Certificates
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Need Help?</strong> Contact our support team if you have questions about your certificate.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;

    return sendEmail({ to: userEmail, subject, html });
  },

  // Send class reminder email to students (day before class)
  async sendClassReminderEmail(userEmail, userName, className, classDetails, sessionDetails) {
    const zoomLink = 'https://us02web.zoom.us/j/9172047844?pwd=amIyWEkxYUxYYU5ERTNDRUVHaHc4Zz09';

    const subject = `Reminder: Your class "${className}" starts tomorrow!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Class Reminder</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          This is a friendly reminder that your class <strong>${className}</strong> starts tomorrow. We're looking forward to seeing you!
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Class Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${className}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(sessionDetails.session_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${formatTime(sessionDetails.start_time)} - ${formatTime(sessionDetails.end_time)}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${classDetails.location_details || 'TBD'}</p>
        </div>
        
        ${classDetails.location_type === 'zoom' ? `
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Online Class Information</h2>
          <p style="color: #000000; line-height: 1.6; margin-bottom: 15px;">
            If class location is online then join class with zoom link:
          </p>
          <p style="color: #000000; line-height: 1.6; margin-bottom: 10px;">
            <a href="${zoomLink}" 
               style="color: #000000; text-decoration: underline; word-break: break-all;">
              ${zoomLink}
            </a>
          </p>
          <p style="color: #000000; line-height: 1.6; margin: 0; font-size: 14px;">
            Click the link above to join the Zoom meeting. Please join a few minutes early to ensure your audio and video are working properly.
          </p>
        </div>
        ` : ''}
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Important Reminders</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Please arrive 10 minutes early to check in</li>
            <li>Bring any required materials or documents</li>
            <li>Check your email for any last-minute updates</li>
            <li>Contact us if you have any questions or need to make changes</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <p style="color: #000000; line-height: 1.6; margin: 0;">
            We're looking forward to having you join us for this professional development opportunity. If you have any questions before the class, please don't hesitate to reach out.
          </p>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Need Help?</strong> Contact our support team if you have any questions.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;

    return sendEmail({ to: userEmail, subject, html });
  }

};

module.exports = emailService; 