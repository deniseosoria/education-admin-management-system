const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  createUser,
  getUserByEmail,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  resetPasswordWithToken,
  clearPasswordResetToken
} = require('../models/userModel');
const pool = require('../config/db');
const emailService = require('../utils/emailService');

// Input validation middleware
const validateRegistration = (req, res, next) => {
  const { name, email, password, phone_number, first_name, last_name, role, status, email_notifications } = req.body;

  // Required fields validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  // Password validation
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Phone number validation (optional)
  if (phone_number && phone_number.trim()) {
    const phoneRegex = /^\+?1?\d{10}$/;
    if (!phoneRegex.test(phone_number.replace(/[^0-9+]/g, ''))) {
      return res.status(400).json({ error: 'Invalid phone number format. Please enter a 10-digit phone number.' });
    }
  }

  // Name validation (first and last name if provided)
  if (first_name && first_name.trim().length < 2) {
    return res.status(400).json({ error: 'First name must be at least 2 characters long' });
  }

  if (last_name && last_name.trim().length < 2) {
    return res.status(400).json({ error: 'Last name must be at least 2 characters long' });
  }

  next();
};

const registerUser = async (req, res) => {
  const {
    name,
    email,
    password,
    role = 'student',
    status = 'active',
    first_name,
    last_name,
    phone_number = null,
    email_notifications = true
  } = req.body;

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      role,
      status,
      first_name,
      last_name,
      phone_number,
      email_notifications
    });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    // Send welcome email to new user (non-blocking)
    emailService.sendWelcomeEmail(user.email, user.name)
      .then(() => {
        console.log(`Welcome email sent to: ${user.email}`);
      })
      .catch((emailError) => {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the registration if email fails
      });

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      error: 'Failed to register user',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for email:', email); // Debug log

  try {
    if (!email || !password) {
      console.log('Login failed: Missing email or password'); // Debug log
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
    console.log('User found:', user ? { id: user.id, email: user.email, role: user.role } : null); // Debug log

    if (!user) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Failed login attempt for non-existent email: ${email}`);
      }
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch); // Debug log

    if (!isMatch) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Failed login attempt for user: ${user.email}`);
      }
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Update last_login timestamp
    const updateResult = await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    console.log('last_login update result:', updateResult.rowCount, 'for user id:', user.id);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
    console.log('Generated token:', token.substring(0, 20) + '...'); // Debug log (only show part of token)

    const { password: _, ...userData } = user;
    console.log('Sending response with user data:', {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      hasToken: !!token
    }); // Debug log

    res.status(200).json({ user: userData, token });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Login error:', err);
    }
    res.status(500).json({
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    // Since we're using JWT tokens, we don't need to do anything server-side
    // The client will handle removing the token
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token and send email
    const { resetToken } = await generatePasswordResetToken(email);

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken);
      console.log(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Clear the token if email fails
      await clearPasswordResetToken(email);
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }

    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({
      error: 'Failed to process password reset request',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Verify password reset token
const verifyResetToken = async (req, res) => {
  const { token } = req.params;

  try {
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    const user = await verifyPasswordResetToken(token);

    res.status(200).json({
      message: 'Reset token is valid',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim() || user.email
      }
    });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const user = await resetPasswordWithToken(token, newPassword);

    // Log the password reset activity
    try {
      await require('../models/userModel').logUserActivity(user.id, 'password_reset', {
        reset_method: 'email_token',
        timestamp: new Date().toISOString()
      });
    } catch (activityError) {
      console.error('Failed to log password reset activity:', activityError);
    }

    res.status(200).json({
      message: 'Password has been reset successfully',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim() || user.email
      }
    });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  validateRegistration,
  requestPasswordReset,
  verifyResetToken,
  resetPassword
};
