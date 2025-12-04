const emailService = require('../utils/emailService');

// Helper function to format time
const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    const date = new Date();
    date.setHours(Number(hour), Number(minute));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// Preview welcome email
// Preview URL: http://localhost:5000/api/emails/preview/welcome?userName=John%20Doe
const previewWelcomeEmail = async (req, res) => {
    const { userName } = req.query;
    const defaultUserName = userName || 'John Doe';

    try {
        // Generate HTML using the same template as emailService
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Welcome to YJ Child Care Plus</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
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
        
        <div style="margin: 30px 0;">
          <a href="https://yjchildcareplus.com/profile" 
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
    `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview welcome email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview password reset email
// Preview URL: http://localhost:5000/api/emails/preview/password-reset?token=sample-token
const previewPasswordResetEmail = async (req, res) => {
    const resetToken = req.query.token || 'sample-reset-token-12345';
    const resetLink = `https://yjchildcareplus.com/reset-password?token=${resetToken}`;

    try {
        const html = `
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
    `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview password reset email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview waitlist confirmation email
// Preview URL: http://localhost:5000/api/emails/preview/waitlist-confirmation?userName=John%20Doe&className=Sample%20Class&position=5
const previewWaitlistConfirmationEmail = async (req, res) => {
    const { userName, className, position } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultClassName = className || 'Sample Class';
    const defaultPosition = position || '5';
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() + 30);
    const defaultEndDate = new Date(defaultStartDate);
    defaultEndDate.setDate(defaultEndDate.getDate() + 5);

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Waitlist Confirmation</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Great news! You've been successfully added to the waitlist for <strong>${defaultClassName}</strong>. We'll notify you as soon as a spot becomes available.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Class Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${defaultClassName}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Start Date:</strong> ${defaultStartDate.toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>End Date:</strong> ${defaultEndDate.toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> 123 Main St, New York, NY 10001</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Your Position:</strong> #${defaultPosition}</p>
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
          <a href="https://yjchildcareplus.com/profile?section=waitlist" 
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview waitlist confirmation email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview waitlist acceptance email
// Preview URL: http://localhost:5000/api/emails/preview/waitlist-acceptance?userName=John%20Doe&className=Sample%20Class
const previewWaitlistAcceptanceEmail = async (req, res) => {
    const { userName, className } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultClassName = className || 'Sample Class';
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() + 30);
    const defaultEndDate = new Date(defaultStartDate);
    defaultEndDate.setDate(defaultEndDate.getDate() + 5);

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Confirmed</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your enrollment in <strong>${defaultClassName}</strong> has been confirmed. You're all set to start your professional development journey.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${defaultClassName}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Start Date:</strong> ${defaultStartDate.toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>End Date:</strong> ${defaultEndDate.toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> 123 Main St, New York, NY 10001</p>
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview waitlist acceptance email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview waitlist rejection email
// Preview URL: http://localhost:5000/api/emails/preview/waitlist-rejection?userName=John%20Doe&className=Sample%20Class&reason=Class%20is%20full
const previewWaitlistRejectionEmail = async (req, res) => {
    const { userName, className, reason } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultClassName = className || 'Sample Class';
    const defaultReason = reason || '';

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Waitlist Update</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          We wanted to inform you about an update regarding your waitlist status for <strong>${defaultClassName}</strong>.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Status Update</h2>
          <p style="color: #000000; line-height: 1.6; margin-bottom: 10px;">
            Unfortunately, we are unable to offer you a spot in this class at this time.
          </p>
          ${defaultReason ? `<p style="color: #000000; line-height: 1.6;"><strong>Reason:</strong> ${defaultReason}</p>` : ''}
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
          <a href="https://yjchildcareplus.com/classes" 
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview waitlist rejection email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview enrollment approval email
// Preview URL: http://localhost:5000/api/emails/preview/enrollment-approval?userName=John%20Doe&className=Sample%20Class&classDetails[location_details]=123%20Main%20St&sessionDetails[session_date]=2024-12-15&sessionDetails[start_time]=10:00:00&sessionDetails[end_time]=12:00:00&adminNotes=Approved
const previewEnrollmentApprovalEmail = async (req, res) => {
    const { userName, className, classDetails, sessionDetails, adminNotes } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultClassName = className || 'Sample Class';
    const defaultClassDetails = {
        location_details: classDetails?.location_details || '123 Main St, New York, NY 10001'
    };
    const defaultSessionDetails = {
        session_date: sessionDetails?.session_date || new Date().toISOString(),
        start_time: sessionDetails?.start_time || '10:00:00',
        end_time: sessionDetails?.end_time || '12:00:00'
    };

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Approved</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Great news! Your enrollment in <strong>${defaultClassName}</strong> has been approved. You're all set to start your professional development journey.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${defaultClassName}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(defaultSessionDetails.session_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${defaultSessionDetails.start_time} - ${defaultSessionDetails.end_time}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${defaultClassDetails.location_details}</p>
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview enrollment approval email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview enrollment pending email
// Preview URL: http://localhost:5000/api/emails/preview/enrollment-pending?userName=John%20Doe&className=Sample%20Class&classDetails[location_details]=123%20Main%20St&sessionDetails[session_date]=2024-12-15&sessionDetails[start_time]=10:00:00&sessionDetails[end_time]=12:00:00&paymentMethod=EIP
// Alternative URL: http://localhost:5000/api/enrollments/preview-email-dev?userName=John%20Doe&className=Sample%20Class&classDetails[location_details]=123%20Main%20St&sessionDetails[session_date]=2024-12-15&sessionDetails[start_time]=10:00:00&sessionDetails[end_time]=12:00:00
const previewEnrollmentPendingEmail = async (req, res) => {
    const { userName, className, classDetails, sessionDetails, paymentMethod } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultClassName = className || 'Sample Class';
    const defaultPaymentMethod = paymentMethod || null;
    const defaultClassDetails = {
        location_details: classDetails?.location_details || '123 Main St, New York, NY 10001'
    };
    const defaultSessionDetails = {
        session_date: sessionDetails?.session_date || new Date().toISOString(),
        start_time: sessionDetails?.start_time || '10:00:00',
        end_time: sessionDetails?.end_time || '12:00:00',
        eip_url: sessionDetails?.eip_url || null
    };

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Submitted</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Thank you for enrolling in <strong>${defaultClassName}</strong>. Your enrollment has been successfully submitted and is now pending approval from our team.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${defaultClassName}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(defaultSessionDetails.session_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${formatTime(defaultSessionDetails.start_time)} - ${formatTime(defaultSessionDetails.end_time)}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${defaultClassDetails.location_details}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Status:</strong> Pending Approval</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What Happens Next?</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            ${defaultPaymentMethod === 'EIP' ? `<li>Please apply for scholarship through EIP (Educational Incentive Program) to complete your enrollment <a href="${defaultSessionDetails.eip_url || 'https://www.ecetp.pdp.albany.edu'}" style="color: #ff0000; text-decoration: underline;">(Click here)</a></li>` : ''}
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview enrollment pending email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview enrollment rejection email
// Preview URL: http://localhost:5000/api/emails/preview/enrollment-rejection?userName=John%20Doe&className=Sample%20Class&classDetails[location_details]=123%20Main%20St&sessionDetails[session_date]=2024-12-15&sessionDetails[start_time]=10:00:00&sessionDetails[end_time]=12:00:00&adminNotes=Class%20is%20full
const previewEnrollmentRejectionEmail = async (req, res) => {
    const { userName, className, classDetails, sessionDetails, adminNotes } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultClassName = className || 'Sample Class';
    const defaultClassDetails = {
        location_details: classDetails?.location_details || '123 Main St, New York, NY 10001'
    };
    const defaultSessionDetails = {
        session_date: sessionDetails?.session_date || new Date().toISOString(),
        start_time: sessionDetails?.start_time || '10:00:00',
        end_time: sessionDetails?.end_time || '12:00:00'
    };

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Status Update</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          We regret to inform you that your enrollment in <strong>${defaultClassName}</strong> has been rejected.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${defaultClassName}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(defaultSessionDetails.session_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${defaultSessionDetails.start_time} - ${defaultSessionDetails.end_time}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${defaultClassDetails.location_details}</p>
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
          <a href="https://yjchildcareplus.com/classes" 
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview enrollment rejection email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview notification alert email
// Preview URL: http://localhost:5000/api/emails/preview/notification-alert?userName=John%20Doe&notificationType=broadcast&notificationTitle=Important%20Update
const previewNotificationAlertEmail = async (req, res) => {
    const { userName, notificationType, notificationTitle } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultNotificationType = notificationType || 'broadcast';
    const defaultNotificationTitle = notificationTitle || 'Important Update';

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">New Notification</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          You have received a new notification from YJ Child Care Plus. Please check your profile to view the complete message.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Notification Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Type:</strong> ${defaultNotificationType === 'broadcast' ? 'Broadcast Message' : 'Personal Notification'}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Title:</strong> ${defaultNotificationTitle}</p>
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
          <a href="https://yjchildcareplus.com/profile?section=notifications" 
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview notification alert email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview certificate expiration email
// Preview URL: http://localhost:5000/api/emails/preview/certificate-expiration?userName=John%20Doe&certificateName=CPR%20Certification&className=CPR%20and%20First%20Aid
const previewCertificateExpirationEmail = async (req, res) => {
    const { userName, certificateName, className } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultCertificateName = certificateName || 'CPR and First Aid Certification';
    const defaultClassName = className || 'CPR and First Aid';
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    const expirationDateFormatted = expirationDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const daysUntilExpiration = 30;

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Certificate Expiration Notice</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          This is a reminder that your certificate <strong>${defaultCertificateName}</strong> is expiring soon. Please take action to renew or update your certificate before it expires.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Certificate Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Certificate Name:</strong> ${defaultCertificateName}</p>
          ${defaultClassName ? `<p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${defaultClassName}</p>` : ''}
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Expiration Date:</strong> ${expirationDateFormatted}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Days Remaining:</strong> ${daysUntilExpiration} days</p>
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
          <a href="https://yjchildcareplus.com/profile?section=certificates" 
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview certificate expiration email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

// Preview class reminder email
// Preview URL: http://localhost:5000/api/emails/preview/class-reminder?userName=John%20Doe&className=Sample%20Class&classDetails[location_details]=123%20Main%20St&classDetails[location_type]=in-person&sessionDetails[session_date]=2024-12-15&sessionDetails[start_time]=10:00:00&sessionDetails[end_time]=12:00:00
// For online classes, use: classDetails[location_type]=zoom
const previewClassReminderEmail = async (req, res) => {
    const { userName, className, classDetails, sessionDetails } = req.query;
    const defaultUserName = userName || 'John Doe';
    const defaultClassName = className || 'Sample Class';
    const defaultClassDetails = {
        location_details: classDetails?.location_details || '123 Main St, New York, NY 10001',
        location_type: classDetails?.location_type || 'in-person'
    };
    const defaultSessionDetails = {
        session_date: sessionDetails?.session_date || new Date().toISOString(),
        start_time: sessionDetails?.start_time || '10:00:00',
        end_time: sessionDetails?.end_time || '12:00:00'
    };
    const zoomLink = 'https://us02web.zoom.us/j/9172047844?pwd=amIyWEkxYUxYYU5ERTNDRUVHaHc4Zz09';

    try {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Class Reminder</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          This is a friendly reminder that your class <strong>${defaultClassName}</strong> starts tomorrow. We're looking forward to seeing you!
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Class Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${defaultClassName}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(defaultSessionDetails.session_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${formatTime(defaultSessionDetails.start_time)} - ${formatTime(defaultSessionDetails.end_time)}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${defaultClassDetails.location_details || 'TBD'}</p>
        </div>
        
        ${defaultClassDetails.location_type === 'zoom' ? `
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

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error("Preview class reminder email error:", error);
        res.status(500).send(`<html><body><h1>Error generating email preview</h1><p>${error.message}</p></body></html>`);
    }
};

module.exports = {
    previewWelcomeEmail,
    previewPasswordResetEmail,
    previewWaitlistConfirmationEmail,
    previewWaitlistAcceptanceEmail,
    previewWaitlistRejectionEmail,
    previewEnrollmentPendingEmail,
    previewEnrollmentApprovalEmail,
    previewEnrollmentRejectionEmail,
    previewNotificationAlertEmail,
    previewCertificateExpirationEmail,
    previewClassReminderEmail
};

