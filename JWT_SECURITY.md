# JWT Token Security Implementation

## ✅ What's Implemented

Your project now has complete JWT token authentication with the following components:

### Backend
1. **JWT Token Generation** - When user verifies OTP (signup/login)
2. **Authentication Middleware** - Protects routes from unauthorized access
3. **Protected Routes** - OCPP routes and profile routes require authentication

### Frontend
1. **Token Storage** - JWT saved in localStorage after login
2. **Auto Token Injection** - All API requests automatically include token
3. **Protected Pages** - Dashboard requires valid token

---

## 🔐 Why JWT Tokens Are Essential

### 1. **Stateless Authentication**
```
Without JWT:
❌ Server stores session for each user
❌ Needs database lookup for every request
❌ Hard to scale across multiple servers

With JWT:
✅ Token contains all user info (encrypted)
✅ No database lookup needed
✅ Easy to scale horizontally
```

### 2. **Security After OTP**
```
OTP: One-time use, expires in 10 minutes
JWT: Valid for 7 days, reusable

Flow:
1. User logs in with OTP (high security)
2. Gets JWT token (convenience)
3. Uses token for next 7 days (no OTP needed)
4. After 7 days, must login again
```

### 3. **API Protection**
```
Without JWT:
❌ Anyone can call: POST /api/ocpp/charge
❌ No way to know who is making request
❌ Can't track user actions

With JWT:
✅ Only authenticated users can access protected routes
✅ Know exactly which user made request (from token)
✅ Can log user activities
```

### 4. **Frontend-Backend Communication**
```
Request Flow:
Frontend → Add JWT to header → Backend → Verify JWT → Process request

Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🧪 Testing JWT Protection

### Test 1: Access Protected Route WITHOUT Token (Should Fail)

**Postman:**
```
Method: GET
URL: http://localhost:5000/api/auth/profile
Headers: (none)

Expected Response (401):
{
  "message": "No token provided. Please login."
}
```

### Test 2: Access Protected Route WITH Token (Should Work)

**Step 1 - Get Token:**
```
Method: POST
URL: http://localhost:5000/api/auth/login/send-otp
Body: { "email": "test@example.com" }
```

**Step 2 - Verify OTP:**
```
Method: POST
URL: http://localhost:5000/api/auth/login/verify-otp
Body: { "email": "test@example.com", "otp": "123456" }

Response:
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  ← Copy this
  "user": { ... }
}
```

**Step 3 - Use Token:**
```
Method: GET
URL: http://localhost:5000/api/auth/profile
Headers: 
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  (paste the token after "Bearer ")

Expected Response (200):
{
  "message": "User profile",
  "user": {
    "userId": "...",
    "email": "test@example.com"
  }
}
```

### Test 3: OCPP Protected Route

```
Method: GET
URL: http://localhost:5000/api/ocpp/
Headers: 
  Authorization: Bearer YOUR_TOKEN_HERE

Expected Response (200):
{
  "message": "OCPP routes",
  "user": {
    "userId": "...",
    "email": "test@example.com"
  }
}
```

---

## 📋 Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER SIGNUP FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. User enters email
   ↓
2. Backend generates OTP → Sends via email
   ↓
3. User enters OTP
   ↓
4. Backend verifies OTP → Creates user → Generates JWT token
   ↓
5. Frontend stores JWT token in localStorage
   ↓
6. User redirected to login page


┌─────────────────────────────────────────────────────────────┐
│                     USER LOGIN FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. User enters email
   ↓
2. Backend checks if user exists → Sends OTP
   ↓
3. User enters OTP
   ↓
4. Backend verifies OTP → Generates JWT token
   ↓
5. Frontend stores JWT token in localStorage
   ↓
6. User redirected to dashboard


┌─────────────────────────────────────────────────────────────┐
│                  PROTECTED API REQUEST                       │
└─────────────────────────────────────────────────────────────┘

1. Frontend makes API request
   ↓
2. apiFetch() automatically adds JWT token to header
   ↓
3. Backend middleware extracts token from header
   ↓
4. Backend verifies token signature & expiry
   ↓
5. If valid → Allow request & add user info to req.user
   If invalid → Return 401 Unauthorized
```

---

## 🛡️ Security Features

### Token Content (Encrypted)
```javascript
{
  userId: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  iat: 1709136000,  // Issued at
  exp: 1709740800   // Expires at (7 days later)
}
```

### Security Measures
1. **Secret Key** - Token signed with JWT_SECRET from .env
2. **Expiration** - Token expires after 7 days
3. **Verification** - Every request validates token signature
4. **No Password Storage** - Only email stored, OTP-based auth

### Attack Prevention
- **Token Tampering** - Invalid signature → Rejected
- **Token Expiry** - Old tokens → Rejected
- **No Token** - Protected routes → Rejected
- **Secret Exposure** - Change JWT_SECRET → All tokens invalidated

---

## 📁 File Structure

```
backend/
├── src/
│   ├── middleware/
│   │   └── auth.js ← NEW: JWT verification middleware
│   ├── routes/
│   │   ├── auth.routes.js ← UPDATED: Added protected /profile route
│   │   └── ocpp.routes.js ← UPDATED: All routes now protected
│   └── controllers/
│       └── authController.js ← Generates JWT tokens

frontend/
├── src/
│   └── lib/
│       └── api.ts ← UPDATED: Auto-includes JWT in requests
```

---

## 🚀 How to Use in New Routes

### Protect Entire Router
```javascript
const authenticate = require('../middleware/auth');
router.use(authenticate); // All routes below need JWT
```

### Protect Specific Routes
```javascript
const authenticate = require('../middleware/auth');
router.get('/public', (req, res) => { /* No auth needed */ });
router.get('/private', authenticate, (req, res) => { /* Auth required */ });
```

### Access User Info in Protected Routes
```javascript
router.get('/my-data', authenticate, (req, res) => {
  const userId = req.user.userId;
  const email = req.user.email;
  // Use this info to fetch user-specific data
});
```

---

## 🎯 Real-World Example

**Scenario:** User wants to start charging their EV

```javascript
// Frontend (automatic)
const response = await apiFetch('/ocpp/start-charging', {
  method: 'POST',
  body: JSON.stringify({ stationId: '123' })
});

// Backend receives:
Headers: {
  Authorization: Bearer eyJhbGciOi...
  Content-Type: application/json
}

// Middleware extracts & verifies token
// Adds to request: req.user = { userId: "...", email: "..." }

// Controller knows WHO is charging:
router.post('/start-charging', authenticate, (req, res) => {
  const { stationId } = req.body;
  const userId = req.user.userId; // From JWT
  
  // Start charging session for this specific user
  ChargingSession.create({
    user: userId,
    station: stationId,
    startTime: new Date()
  });
});
```

---

## ✅ Summary

**What JWT Solves:**
1. ✅ Users don't need OTP for every request
2. ✅ Server knows who is making each request
3. ✅ API routes are protected from unauthorized access
4. ✅ Scalable authentication system
5. ✅ User sessions managed securely

**Your Implementation:**
- **OTP** for initial authentication (high security)
- **JWT** for session management (convenience)
- **Middleware** for route protection (security)
- **7-day expiry** for balance between security and UX

The system is production-ready! 🎉
