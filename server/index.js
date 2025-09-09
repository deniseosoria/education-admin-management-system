// server/index.js

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
// path module no longer needed since we removed SPA fallback
dotenv.config();
// express.raw(); // For Stripe webhook

const userRoutes = require('./routes/userRoutes');
const classRoutes = require('./routes/classRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
// const paymentRoutes = require('./routes/paymentRoutes');
const stripeWebhook = require('./routes/stripeWebhook');
const adminRoutes = require('./routes/adminRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const profileRoutes = require('./routes/profileRoutes');
const errorHandler = require('./middleware/errorHandler');
const devLogger = require('./middleware/devLogger');
const sessionRoutes = require('./routes/sessionRoutes');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    // Wildcard pattern for all Vercel preview domains
    /^https:\/\/client-.*-deniseosorias-projects\.vercel\.app$/,
    // Keep specific domains for backward compatibility
    "https://client-six-kappa-83.vercel.app",
    "https://client-nsoumyuuy-deniseosorias-projects.vercel.app",
    "https://client-ri13jqi56-deniseosorias-projects.vercel.app",
    "https://client-ndie67jbi-deniseosorias-projects.vercel.app"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/enrollments', enrollmentRoutes);
// app.use('/api/payments', paymentRoutes);
app.use('/api/webhook', stripeWebhook);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use(devLogger);
app.use(errorHandler); // place this last!

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Education API is running...');
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  try {
    // Minimal response that Railway expects
    res.status(200).json({
      status: 'OK'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR'
    });
  }
});

// Detailed health check for monitoring
app.get('/health/detailed', (req, res) => {
  try {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    });
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Railway-specific health check (minimal response)
app.get('/railway-health', (req, res) => {
  res.status(200).send('OK');
});

// Additional health check for Railway
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Keep-alive endpoint for Railway
app.get('/keepalive', (req, res) => {
  console.log('💓 Keep-alive request received:', new Date().toISOString());
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Service is alive and running'
  });
});




// Only start the server if this file is run directly
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  });

  // Handle uncaught exceptions to prevent crashes
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Don't exit immediately, let Railway handle it
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit immediately, let Railway handle it
  });

  // Keep-alive mechanism for Railway
  let keepAliveInterval = setInterval(() => {
    console.log('💓 Keep-alive ping:', new Date().toISOString());
    console.log('📊 Memory usage:', process.memoryUsage());
    console.log('⏱️ Uptime:', process.uptime(), 'seconds');
  }, 30000); // Every 30 seconds

  // Clean up interval on shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    clearInterval(keepAliveInterval);
    server.close(() => {
      console.log('Process terminated');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    clearInterval(keepAliveInterval);
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  // Additional process monitoring
  process.on('exit', (code) => {
    console.log('Process exiting with code:', code);
  });

  // Monitor for memory issues
  setInterval(() => {
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      console.warn('⚠️ High memory usage:', memUsage.heapUsed / 1024 / 1024, 'MB');
    }
  }, 60000); // Every minute
}

module.exports = app;