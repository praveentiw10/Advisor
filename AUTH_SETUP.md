# Authentication System – Setup & File Guide

## Stack
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, Nodemailer  
- **Frontend:** HTML, CSS, JavaScript (static files)

---

## Where Everything Lives

### Backend (`backend/`)

| Path | Purpose |
|------|--------|
| `backend/src/index.js` | App entry; mounts auth API, serves static HTML and assets |
| `backend/src/config/db.js` | MongoDB connection (uses `MONGO_URI` from `.env`) |
| `backend/src/models/User.js` | User schema: `name`, `email`, `password`, `otp`, `otpExpiry` |
| `backend/src/middleware/auth.js` | JWT verification middleware for protected routes |
| `backend/src/routes/authApiRoutes.js` | Auth API: login, signup, forgot-password, verify-otp, reset-password, /me |
| `backend/src/utils/email.js` | Nodemailer helper to send OTP email |
| `backend/.env` | Secrets (see below) |

### Frontend (`frontend/public/`)

| File | Purpose |
|------|--------|
| `login.html` | Login form; calls `POST /api/auth/login`, stores JWT in localStorage (Remember Me) or sessionStorage |
| `signup.html` | Sign up form; calls `POST /api/auth/signup` |
| `forgot-password.html` | Enter email; calls `POST /api/auth/forgot-password`, then redirects to verify-otp |
| `verify-otp.html` | Enter OTP; calls `POST /api/auth/verify-otp`, then redirects to reset-password |
| `reset-password.html` | Enter OTP + new password; calls `POST /api/auth/reset-password` |
| `dashboard.html` | Protected page; sends `Authorization: Bearer <token>`, calls `GET /api/auth/me` |
| `auth.css` | Shared styles for all auth pages |

### How frontend talks to backend
- Same origin: frontend is served from `http://localhost:3000` (Express `static` + routes).
- All auth requests use `fetch()` to `http://localhost:3000/api/auth/...`.
- No CORS needed when using the same server and port.

---

## API Routes

| Method | Route | Body | Description |
|--------|--------|------|-------------|
| POST | `/api/auth/signup` | `{ name, email, password }` | Create user, return JWT |
| POST | `/api/auth/login` | `{ email, password, rememberMe }` | Return JWT (long-lived if rememberMe) |
| POST | `/api/auth/forgot-password` | `{ email }` | Generate OTP, save in DB, send email |
| POST | `/api/auth/verify-otp` | `{ email, otp }` | Check OTP and expiry |
| POST | `/api/auth/reset-password` | `{ email, otp, newPassword }` | Update password, clear OTP |
| GET | `/api/auth/me` | Header: `Authorization: Bearer <token>` | Protected; returns current user |

---

## Environment variables (`backend/.env`)

```env
# Required
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/yourdb

# JWT (optional; default used if missing)
JWT_SECRET=your-secret-key-min-32-chars

# Nodemailer – required to actually send OTP email (e.g. Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your@gmail.com
```

**Without SMTP:** OTP is still generated and saved in the DB; it is only logged to the server console (dev mode). Set `SMTP_*` to send real emails.

---

## Run the project

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Ensure `backend/.env` has at least `MONGO_URI` (and optionally `JWT_SECRET`, `SMTP_*`).**

3. **Start server**
   ```bash
   npm start
   ```
   Or `npm run dev` for nodemon.

4. **Open in browser**
   - Login: http://localhost:3000/login  
   - Sign up: http://localhost:3000/signup  
   - Forgot password: http://localhost:3000/forgot-password  
   - Dashboard (after login): http://localhost:3000/dashboard  

---

## Auth flow summary

1. **Login:** User submits email + password (+ Remember Me). Backend returns JWT. Frontend stores it in **localStorage** (if Remember Me) or **sessionStorage**.
2. **Dashboard:** Page sends `Authorization: Bearer <token>`. Backend `/api/auth/me` uses JWT middleware and returns user.
3. **Forgot password:** User enters email → backend finds user, generates 6-digit OTP, sets `otp` and `otpExpiry` (e.g. 10 min) in MongoDB, sends OTP via Nodemailer (or logs it if no SMTP).
4. **Verify OTP:** User enters OTP → backend checks `User.otp` and `User.otpExpiry`.
5. **Reset password:** User submits OTP + new password → backend verifies OTP again, hashes password with bcrypt, updates user and clears `otp` / `otpExpiry`.
