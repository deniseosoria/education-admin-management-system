# Education Admin Management System

A comprehensive full-stack web application for educational institution management, featuring a powerful admin dashboard for course enrollment, user management, analytics, and system administration.

🌐 **Live Application**: [https://client-six-kappa-83.vercel.app/](https://client-six-kappa-83.vercel.app/)

## 📋 Project Overview

Education Admin Management System is a full-stack web application that enables child care providers to discover, enroll in, and manage early childhood education courses. The platform features a modern React frontend with Material-UI components and a robust Node.js/Express backend with PostgreSQL database integration.

### Key Features

- **Course Discovery**: Browse and search through available early childhood education courses
- **User Authentication**: Secure registration, login, and password reset functionality
- **Course Enrollment**: Easy enrollment process with integrated payment processing
- **User Dashboard**: Personalized dashboard for managing enrollments, payments, and profile
- **Admin Panel**: Comprehensive admin interface for managing users, courses, and analytics
- **Notification System**: Email notifications for course reminders, updates, and confirmations
- **Certificate Management**: Digital certificate generation and management
- **Payment Integration**: Secure payment processing with Stripe
- **File Upload**: Support for document and image uploads via Cloudinary
- **Analytics Dashboard**: Comprehensive analytics and reporting for administrators

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Material-UI (MUI)** - Component library for consistent design
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API requests
- **Chart.js** - Data visualization
- **Tailwind CSS** - Utility-first CSS framework
- **FontAwesome** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **PostgreSQL** - Relational database
- **Supabase** - Backend-as-a-Service for storage and authentication
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Stripe** - Payment processing
- **Cloudinary** - Cloud-based image and video management
- **PDFKit** - PDF generation for certificates
- **QRCode** - QR code generation

### Development Tools
- **Jest** - Testing framework
- **Supertest** - HTTP assertion library
- **Nodemon** - Development server with auto-restart
- **ESLint** - Code linting
- **Concurrently** - Run multiple commands simultaneously

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/education-admin-management-system.git
   cd education-admin-management-system
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client && npm install && cd ..
   
   # Install server dependencies
   cd server && npm install && cd ..
   ```

3. **Environment Setup**
   
   **Server Environment Variables**
   
   Create a `.env` file in the `server` directory with the following variables:
   
   ```env
   # Database Configuration
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=yjchildcareplus
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Email Configuration
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=your_app_password

   # Email Service (Resend - Railway's recommended)
   RESEND_API_KEY=your_resend_api_key
   
   # Stripe Configuration (Optional)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   
   # Cloudinary Configuration (Optional)
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```
   
   **Client Environment Variables**
   
   Create a `.env` file in the `client` directory with the following variables:
   
   ```env
   # API Configuration
   VITE_APP_URL=http://localhost:5000/api
   
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   
   ```bash
   # Run database migrations
   cd server
   npm run migrate
   
   # Seed the database with sample data
   npm run seed
   ```

5. **Start the application**
   
   ```bash
   # Start both frontend and backend concurrently
   npm run dev
   
   # Or start them separately:
   # Backend only
   npm run start
   
   # Frontend only
   cd client && npm run dev
   ```

6. **Access the application**
   - **Live Application**: https://client-six-kappa-83.vercel.app/
   - Frontend (Local): http://localhost:5173
   - Backend API (Local): http://localhost:5000

## 📁 Project Structure

```
yjchildcareplus/
├── client/                    # React frontend
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── admin/       # Admin-specific components
│   │   │   ├── auth/        # Authentication components
│   │   │   ├── common/      # Shared components
│   │   │   └── dashboard/   # Dashboard components
│   │   ├── pages/           # Route-level views
│   │   ├── services/        # API service functions
│   │   ├── contexts/        # React Context providers
│   │   ├── config/          # Configuration files
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── vite.config.js
├── server/                   # Express backend
│   ├── config/              # Configuration files
│   │   ├── db.js           # Database configuration
│   │   ├── supabase.js     # Supabase configuration
│   │   ├── stripe.js       # Stripe configuration
│   │   └── emailConfig.js   # Email configuration
│   ├── controllers/         # Request handlers
│   ├── models/             # Database models and queries
│   ├── routes/             # API routes
│   ├── middleware/          # Custom middleware
│   ├── utils/              # Utility functions
│   ├── tests/              # Test files
│   ├── migrations/         # Database migrations
│   └── package.json
├── package.json             # Root package.json
└── README.md
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run start` - Start the backend server
- `npm run start:dev` - Start backend with nodemon
- `npm run client` - Start frontend development server
- `npm run test` - Run all tests
- `npm run seed` - Seed the database with sample data

### Client Level
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Server Level
- `npm run dev` - Start with nodemon
- `npm start` - Start production server
- `npm test` - Run server tests

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test files
npm test -- tests/adminRoutes.test.js
npm test -- tests/userRoutes.test.js
```

## 📸 Screenshots and Demo

### Homepage
![Homepage](https://via.placeholder.com/800x400/4CAF50/FFFFFF?text=YJ+Child+Care+Plus+Homepage)

### User Dashboard
![User Dashboard](https://via.placeholder.com/800x400/2196F3/FFFFFF?text=User+Dashboard)

### Admin Panel
![Admin Panel](https://via.placeholder.com/800x400/FF9800/FFFFFF?text=Admin+Panel)

### Course Enrollment
![Course Enrollment](https://via.placeholder.com/800x400/9C27B0/FFFFFF?text=Course+Enrollment)

## 🎥 Video Demo

[![Video Demo](https://via.placeholder.com/800x450/FF5722/FFFFFF?text=Click+to+Watch+Demo)](https://youtube.com/watch?v=demo)

*Click the image above to watch a comprehensive demo of the Education Admin Management System application*

## 🔐 Authentication & Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin, Instructor, User)
- Input validation and sanitization
- CORS protection
- Secure environment variable handling

## 📊 Features in Detail

### For Students
- Browse and search courses
- Enroll in courses with secure payment
- Manage personal profile and settings
- View enrollment history and certificates
- Receive email notifications
- Access course materials and recordings

### For Administrators
- Complete user management
- Course creation and management
- Analytics and reporting
- Payment processing oversight
- System configuration
- Bulk notification system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Denise Osoria** - *Initial work* - [deniseosoria](https://github.com/deniseosoria)

## 🙏 Acknowledgments

- Material-UI team for the excellent component library
- Vite team for the fast build tool
- Supabase team for the backend services
- All contributors and testers

## 📞 Support

For support, email deniseosoria04@gmail.com or create an issue in the GitHub repository.

---

**Education Admin Management System** - Empowering early childhood educators through technology.