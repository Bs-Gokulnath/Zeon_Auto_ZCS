# Zeon Auto - Authentication System

A complete OTP-based email authentication system with a modern, futuristic UI.

## Features

- ✅ Email-based OTP authentication
- ✅ Secure signup and login flows
- ✅ SMTP email integration
- ✅ JWT token authentication
- ✅ Modern, minimal white UI with futuristic design
- ✅ MongoDB database
- ✅ Next.js 15 frontend with TypeScript
- ✅ Express.js backend

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies (already done):
   ```bash
   npm install
   ```

3. Configure SMTP settings in `.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/zeonauto
   JWT_SECRET=zeonautosupersecret

   # SMTP Configuration - Update these with your email provider details
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com
   ```

   **For Gmail:**
   - Use your Gmail address for `SMTP_USER` and `SMTP_FROM`
   - Generate an App Password (not your regular password):
     1. Go to Google Account → Security
     2. Enable 2-Step Verification
     3. Go to App Passwords
     4. Create a new app password for "Mail"
     5. Use that password for `SMTP_PASS`

4. Make sure MongoDB is running:
   ```bash
   # MongoDB should be running on localhost:27017
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. The `.env.local` is already configured:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

## Usage Flow

### Signup
1. Visit `http://localhost:3000/signup`
2. Enter your email address
3. Click "Send OTP"
4. Check your email for the 6-digit OTP
5. Enter the OTP and click "Verify OTP"
6. After successful signup, you'll be redirected to the login page

### Login
1. Visit `http://localhost:3000/login`
2. Enter your email address
3. Click "Send OTP"
4. Check your email for the 6-digit OTP
5. Enter the OTP and click "Verify & Login"
6. After successful login, you'll be redirected to the dashboard

### Dashboard
- After login, you'll see a modern dashboard with your profile information
- You can logout from the top navigation bar

## API Endpoints

### Authentication Routes

- **POST** `/api/auth/signup/send-otp` - Send OTP for signup
  ```json
  { "email": "user@example.com" }
  ```

- **POST** `/api/auth/signup/verify-otp` - Verify OTP and complete signup
  ```json
  { "email": "user@example.com", "otp": "123456" }
  ```

- **POST** `/api/auth/login/send-otp` - Send OTP for login
  ```json
  { "email": "user@example.com" }
  ```

- **POST** `/api/auth/login/verify-otp` - Verify OTP and complete login
  ```json
  { "email": "user@example.com", "otp": "123456" }
  ```

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT for authentication
- Nodemailer for SMTP emails
- bcryptjs for password hashing (if needed later)

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Modern, minimal UI design

## Security Features

- OTP expires after 10 minutes
- JWT tokens for session management (7 days expiry)
- Secure SMTP email delivery
- Email validation
- Protected routes

## Troubleshooting

1. **Email not sending:**
   - Check SMTP credentials in `.env`
   - For Gmail, ensure you're using an App Password, not your regular password
   - Check if 2-Step Verification is enabled

2. **MongoDB connection error:**
   - Ensure MongoDB is running on `localhost:27017`
   - Check the `MONGO_URI` in `.env`

3. **Frontend can't connect to backend:**
   - Ensure backend is running on port 5000
   - Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`

## Next Steps

- Configure your SMTP settings in backend `.env`
- Start both backend and frontend servers
- Test the signup and login flows
- Customize the UI as needed
