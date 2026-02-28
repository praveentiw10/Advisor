# Testing Advisor

## Quick Start

1. **Start MongoDB** (if using local):
   ```bash
   mongod
   ```

2. **Start the server**:
   ```bash
   npm start
   ```
   Or on Windows: double-click `run.bat`

3. **Open** http://localhost:3000

## Test Flows

### 1. Login / Signup
- Visit http://localhost:3000
- Sign up or log in with existing credentials
- You should be redirected to `/home`

### 2. Manage Funds – Deposit (PayPal)
- Click **Manage Funds** in sidebar
- Enter amount, select PayPal
- Click PayPal button → complete payment in sandbox
- Receipt overlay appears with Print / Save PDF

### 3. Manage Funds – Deposit (UPI)
- In Manage Funds, select **UPI**
- Enter your UPI ID
- Click **CONFIRM DEPOSIT**
- Receipt appears (PENDING status)

### 4. Manage Funds – Withdrawal
- Switch to **Withdraw** tab
- Enter amount ($10+), method, and recipient details
- Click **CONFIRM WITHDRAWAL**
- Receipt appears with Print / Save PDF

### 5. API Smoke Test
With server running:
```bash
npm run test:api
```

## Troubleshooting

- **401 on API calls**: Ensure you're logged in (session cookie)
- **PayPal errors**: Verify `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` in `backend/.env`
- **MongoDB connection**: Check `MONGO_URI` in `backend/.env`
