# SellSathi Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- Firebase project created

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: "sellsathi"
4. Follow the setup wizard

### 1.2 Enable Phone Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Phone** authentication
3. Add your test phone numbers if needed

### 1.3 Get Firebase Configuration
1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click on Web app icon (</>) to add a web app
4. Register app with name "SellSathi Web"
5. Copy the Firebase configuration object
6. This config is already added to `src/config/firebase.js`

### 1.4 Generate Service Account Key (for Backend)
1. Go to **Project Settings** → **Service Accounts**
2. Click "Generate New Private Key"
3. Download the JSON file
4. Rename it to `serviceAccountKey.json`
5. Place it in the project root directory: `D:\ssinphinite\Main Project\sellsathi\Sellsathi\Sellsathi\serviceAccountKey.json`

⚠️ **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore` to prevent committing sensitive data

## Step 2: Install Dependencies

### 2.1 Frontend Dependencies
```bash
cd "D:\ssinphinite\Main Project\sellsathi\Sellsathi\Sellsathi"
npm install
```

This will install:
- firebase (for authentication)
- react, react-dom
- react-router-dom
- framer-motion
- lucide-react

### 2.2 Backend Dependencies
The backend (auth.js) requires separate dependencies. Install them:

```bash
npm install express firebase-admin body-parser cors
```

Or if you prefer to use the backend-package.json:
```bash
npm install --save express@^4.18.2 firebase-admin@^12.0.0 body-parser@^1.20.2 cors@^2.8.5
```

## Step 3: Firebase Firestore Setup

### 3.1 Enable Firestore
1. In Firebase Console, go to **Firestore Database**
2. Click "Create Database"
3. Choose "Start in production mode" (we'll set rules later)
4. Select your preferred location

### 3.2 Create Collections
Create the following collections manually:

#### Collection: `users`
- This will be auto-populated when users login
- Structure:
```
users/
  {uid}/
    - uid: string
    - phone: string
    - role: string (ADMIN | CONSUMER | SELLER)
    - isActive: boolean
    - createdAt: timestamp
```

#### Collection: `sellers`
- This will be auto-populated when users apply to become sellers
- Structure:
```
sellers/
  {uid}/
    - uid: string
    - phone: string
    - shopName: string
    - category: string
    - address: string
    - gstNumber: string
    - sellerStatus: string (PENDING | APPROVED | REJECTED)
    - appliedAt: timestamp
```

### 3.3 Set Firestore Security Rules
Go to **Firestore Database** → **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only backend can write
    }
    
    // Sellers collection
    match /sellers/{sellerId} {
      allow read: if request.auth != null && request.auth.uid == sellerId;
      allow write: if false; // Only backend can write
    }
  }
}
```

## Step 4: Create Admin User Manually

### 4.1 Get Admin UID
1. Have the admin person login once using the phone authentication
2. Check Firebase Console → **Authentication** → **Users**
3. Copy the UID of the admin user

### 4.2 Create Admin Document in Firestore
1. Go to **Firestore Database**
2. Click on `users` collection
3. Click "Add Document"
4. Document ID: `{paste the UID from step 4.1}`
5. Add fields:
   - `uid` (string): {same UID}
   - `phone` (string): "+919999999999" (admin's phone number)
   - `role` (string): "ADMIN"
   - `isActive` (boolean): true
   - `createdAt` (timestamp): {current timestamp}

Example:
```json
{
  "uid": "xyz123abc456",
  "phone": "+919999999999",
  "role": "ADMIN",
  "isActive": true,
  "createdAt": "2026-02-12T06:13:27.000Z"
}
```

## Step 5: Configure Firebase App Check (Optional but Recommended)

### 5.1 Enable App Check
1. Go to **App Check** in Firebase Console
2. Register your web app
3. Choose reCAPTCHA v3 as the provider
4. Add your domain (localhost for development)

## Step 6: Update .gitignore

Add these lines to `.gitignore`:
```
# Firebase
serviceAccountKey.json
.firebase/

# Environment
.env
.env.local
```

## Step 7: Run the Application

### 7.1 Start Backend Server
```bash
node auth.js
```

The backend will run on `http://localhost:5000`

You should see:
```
Auth service running on port 5000
```

### 7.2 Start Frontend Development Server
Open a new terminal:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (or similar)

## Step 8: Test the Authentication Flow

### 8.1 Test Consumer Login
1. Open browser and go to `http://localhost:5173`
2. Click "Shop Now"
3. Enter a test phone number
4. Enter the OTP received
5. You should be redirected to home page
6. Check Firestore - a new user document should be created with role "CONSUMER"

### 8.2 Test Admin Login
1. Go to `http://localhost:5173/admin/login`
2. Enter the admin phone number (the one you set in Firestore)
3. Enter the OTP
4. You should be redirected to `/admin` (Admin Dashboard)

### 8.3 Test Seller Registration
1. Login as a consumer first
2. Scroll to footer
3. Click "Become a Seller"
4. Enter the same phone number you used for consumer login
5. Verify OTP
6. Fill in seller details
7. Submit application
8. Check Firestore - a new document should be created in `sellers` collection with status "PENDING"

## Troubleshooting

### Issue: "Firebase: Error (auth/invalid-api-key)"
**Solution**: Check that the Firebase config in `src/config/firebase.js` matches your Firebase project settings

### Issue: "CORS error when calling backend"
**Solution**: Ensure `cors` is installed and enabled in `auth.js`:
```javascript
const cors = require("cors");
app.use(cors());
```

### Issue: "Cannot find module 'firebase-admin'"
**Solution**: Install backend dependencies:
```bash
npm install firebase-admin express body-parser cors
```

### Issue: "OTP not received"
**Solution**: 
- Check Firebase Console → Authentication → Phone numbers
- Ensure phone authentication is enabled
- For testing, add test phone numbers in Firebase Console

### Issue: "Admin redirect not working"
**Solution**: 
- Verify admin document exists in Firestore `users` collection
- Ensure `role` field is exactly "ADMIN" (case-sensitive)
- Check browser console for errors

### Issue: "Seller application not submitting"
**Solution**:
- Ensure user is logged in as CONSUMER first
- Check that phone number matches the one used for consumer login
- Verify backend is running on port 5000

## Environment Variables (Optional)

For better security, you can use environment variables:

Create `.env` file:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Update `src/config/firebase.js` to use these variables:
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ... etc
};
```

## Production Deployment

### Frontend (Vite)
```bash
npm run build
```
Deploy the `dist` folder to your hosting service (Vercel, Netlify, Firebase Hosting, etc.)

### Backend (Node.js)
Deploy `auth.js` and `serviceAccountKey.json` to a Node.js hosting service (Heroku, Railway, Google Cloud Run, etc.)

Update the backend URL in frontend components:
- `AuthModal.jsx`: Change `http://localhost:5000` to your production backend URL
- `SellerAuthModal.jsx`: Change `http://localhost:5000` to your production backend URL

## Security Checklist

- [ ] `serviceAccountKey.json` is in `.gitignore`
- [ ] Firebase security rules are configured
- [ ] Admin user is manually created (not auto-assigned)
- [ ] CORS is properly configured for production domains
- [ ] Environment variables are used for sensitive data
- [ ] HTTPS is enabled in production
- [ ] Firebase App Check is enabled

## Next Steps

1. Implement admin dashboard to approve/reject sellers
2. Add seller dashboard for managing products
3. Implement product listing and ordering
4. Add payment integration
5. Set up email notifications for status updates

## Support

For issues or questions, refer to:
- Firebase Documentation: https://firebase.google.com/docs
- React Documentation: https://react.dev
- Express Documentation: https://expressjs.com

---

**Last Updated**: February 12, 2026
