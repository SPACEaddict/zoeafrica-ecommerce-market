# ZoeAfrica Marketplace v3.0

## What's included

### Backend (Node.js + Express + MongoDB)
- **Auth**: Register, Login, Email Verification, Password Reset, JWT tokens
- **Products**: CRUD + full-text search + category filter + pagination  
- **Payments**: M-Pesa Kenya (STK Push + polling), M-Pesa Africa (C2B), Paystack, Bitcoin (stub)
- **Email**: Verification emails, welcome emails, order confirmations via Nodemailer
- **Security**: Helmet, rate limiting, mongo sanitize, bcrypt password hashing

### Frontend (3 pages)
- `index.html` — Marketplace homepage with live search, auth-aware header, real cart
- `auth.html` — Register / Login / Email verification / Forgot password
- `checkout.html` — Shipping form + M-Pesa Kenya STK + M-Pesa Africa + Paystack + Bitcoin

---

## Quick Start

### 1. Get free accounts (15 min)

| Service | URL | What you need |
|---------|-----|---------------|
| MongoDB Atlas | mongodb.com/atlas | Connection URI |
| Cloudinary | cloudinary.com | Cloud name, API key, API secret |
| Safaricom Daraja | developer.safaricom.co.ke | Consumer key/secret, shortcode, passkey |
| M-Pesa Africa | openapiportal.m-pesa.com | API key, public key, service code |
| Paystack | paystack.com | Secret key, public key |
| Gmail | myaccount.google.com → App Passwords | App password |

### 2. Configure

```bash
cd backend
cp .env.example .env
# Fill in all credentials
```

### 3. Run

```bash
npm install
npm run dev
# → http://localhost:5000
```

### 4. Test M-Pesa locally (requires public URL)

```bash
# Install ngrok: https://ngrok.com
ngrok http 5000
# Copy the https URL → set as SERVER_URL in .env
```

---

## API Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Create account → sends verification email |
| GET | /api/auth/verify-email/:token | Verify email from link |
| POST | /api/auth/login | Login → returns JWT token |
| GET | /api/auth/me | Get current user (auth required) |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password/:token | Reset password |
| PUT | /api/auth/update-profile | Update profile (auth required) |

### Products (with search)
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/products | List with ?search=kente&category=Handmade&page=2 |
| GET | /api/products/:id | Single product |
| POST | /api/products | Create product |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete + remove Cloudinary images |

### Payments
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/payments/mpesa/stk | STK Push to Kenya phone |
| POST | /api/payments/mpesa/query | Poll STK payment status |
| POST | /api/payments/mpesa/callback | Daraja webhook (Safaricom calls this) |
| POST | /api/payments/mpesa-africa/pay | M-Pesa Africa C2B |
| POST | /api/payments/paystack/initialize | Get Paystack auth URL |
| GET | /api/payments/paystack/verify/:ref | Verify Paystack payment |
| POST | /api/payments/paystack/webhook | Paystack webhook |
| GET | /api/payments/orders | Get my orders (auth required) |
