const emailService = require('../utils/emailService');

// Custom email sending function for contact emails (without automatic "Do Not Reply" message)
const sendContactEmail = async ({ to, subject, html }) => {
    const nodemailer = require('nodemailer');
    const { Resend } = require('resend');

    // Check if email service is properly configured
    if (!process.env.RESEND_API_KEY && !process.env.EMAIL_USER) {
        console.log('📧 Email sending disabled - missing configuration:', { to, subject });
        return false;
    }

    try {
        console.log(`📧 Sending contact email to: ${to}`);

        if (process.env.RESEND_API_KEY) {
            // Use Resend HTTP API directly without adding "Do Not Reply" message
            const resendClient = new Resend(process.env.RESEND_API_KEY);
            const { data, error } = await resendClient.emails.send({
                from: 'YJ Child Care Plus <support@yjchildcareplus.com>',
                to: [to],
                subject: subject,
                html: html, // No automatic "Do Not Reply" message added
            });

            if (error) {
                console.error('❌ Resend error:', error);
                return false;
            }

            console.log('✅ Contact email sent successfully via Resend to:', to);
            console.log('📧 Message ID:', data?.id || 'N/A');
            return true;
        } else {
            // Fallback to regular email service
            return await emailService.sendEmail({ to, subject, html });
        }
    } catch (error) {
        console.error('❌ Error sending contact email:', error.message);
        return false;
    }
};

// Send contact form message
const sendContactMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and message are required fields'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }

        // Send email to yvelisse225@gmail.com using custom function to avoid duplicate "Do Not Reply" message
        const emailSent = await sendContactEmail({
            to: 'yvelisse225@gmail.com',
            subject: `Contact Form Message from ${name}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 12px; color: #6c757d;">
              <strong>⚠️ Do Not Reply:</strong> This is an automated message. Please do not reply to this email address as it is not monitored. If you need assistance, please contact us through our website or support channels.
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">New Contact Form Message</h1>
              <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">From YJ Child Care Plus Website</p>
            </div>
            
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Contact Information</h3>
              <div style="color: #2c3e50; line-height: 1.8;">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #3498db;">${email}</a></p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Message</h3>
              <div style="color: #2c3e50; line-height: 1.6; white-space: pre-wrap;">${message}</div>
            </div>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Next Steps</h3>
              <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
                <li>Reply directly to the sender's email: <a href="mailto:${email}" style="color: #3498db;">${email}</a></li>
                <li>Consider adding this contact to your CRM system</li>
                <li>Follow up within 24-48 hours for best customer service</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #95a5a6; font-size: 12px; margin: 0;">
                This message was sent from the YJ Child Care Plus contact form<br>
                <strong>Website:</strong> ${process.env.CLIENT_URL || 'https://yjchildcareplus.com'}
              </p>
            </div>
          </div>
        </div>
      `
        });

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                error: 'Failed to send email. Please try again later.'
            });
        }

        // Send confirmation email to the sender
        await sendContactEmail({
            to: email,
            subject: 'Thank you for contacting YJ Child Care Plus',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Thank You!</h1>
              <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">We received your message</p>
            </div>
            
            <div style="margin-bottom: 25px;">
              <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${name}! 👋</h2>
              <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
                Thank you for reaching out to YJ Child Care Plus! We have received your message and will get back to you as soon as possible.
              </p>
            </div>
            
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3498db;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">What Happens Next?</h3>
              <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
                <li>Our team will review your message within 24 hours</li>
                <li>We'll respond directly to this email address</li>
                <li>For urgent matters, you can call us at 1-917-204-7844</li>
                <li>We're here Monday through Friday, 9AM - 3PM</li>
              </ul>
            </div>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">While You Wait</h3>
              <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px;">
                <li>Explore our professional development courses</li>
                <li>Learn about our childcare training programs</li>
                <li>Check out our upcoming classes and workshops</li>
                <li>Follow us for updates and announcements</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'https://yjchildcareplus.com'}/classes" 
                 style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Browse Our Classes
              </a>
            </div>
            
            <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
                <strong>Need Immediate Assistance?</strong> Call us at 1-917-204-7844
              </p>
              <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
                Visit us at: 1110 East 93rd Street, Brooklyn, NY 11216
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
      `
        });

        res.status(200).json({
            success: true,
            message: 'Your message has been sent successfully! We will get back to you soon.'
        });

    } catch (error) {
        console.error('Error sending contact message:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while sending your message. Please try again later.'
        });
    }
};

module.exports = {
    sendContactMessage
};
