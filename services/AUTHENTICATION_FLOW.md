# SellSathi Authentication System Documentation

## Overview
This document describes the complete authentication flow for the SellSathi platform, including user login, admin access, and seller registration.

## User Roles
The platform has three distinct user roles:
1. **ADMIN** - Platform administrator (manually configured in database)
2. **CONSUMER** - Regular users who browse and purchase products
3. **SELLER** - Users who sell products (requires admin approval)

## Authentication Flow

### 1. Initial Login (Consumer/Admin)

#### Entry Points:
- **Home Page** (`/`): Users land here on first visit
- **Admin Login Page** (`/admin/login`): Dedicated admin login page

#### Process:
1. User clicks "Shop Now" or visits admin login page
2. `AuthModal` component opens
3. User enters phone number (+91 prefix)
4. Firebase sends OTP via SMS
5. User enters 6-digit OTP
6. Firebase verifies OTP
7. Backend (`/auth/login`) receives Firebase ID token
8. Backend checks Firestore `users` collection:
   - **If user doesn't exist**: Creates new user with role `CONSUMER`
   - **If user exists**: Retrieves existing role and status

#### Role-Based Redirection:
- **ADMIN**: Redirected to `/admin` (Admin Dashboard)
- **CONSUMER**: Redirected to `/` (Home Page)
- **SELLER**: 
  - If `APPROVED`: Redirected to `/seller/dashboard`
  - If `PENDING`: Alert shown, redirected to `/`
  - If `REJECTED`: Alert shown, redirected to `/`

### 2. Admin Access

#### Requirements:
- Admin role must be manually set in Firestore database
- Admin user document structure:
```json
{
  "uid": "firebase_uid_here",
  "role": "ADMIN",
  "phone": "+919999999999",
  "isActive": true,
  "createdAt": "timestamp"
}
```

#### Flow:
1. Admin visits `/admin/login`
2. Enters phone number
3. Receives and verifies OTP
4. Backend checks role
5. Only if role is `ADMIN`, user is redirected to admin dashboard
6. Non-admin users are redirected to home page

### 3. Seller Registration (Become a Seller)

#### Prerequisites:
- User must be logged in as a CONSUMER
- User cannot be ADMIN
- User cannot already be a SELLER

#### Flow:
1. User clicks "Become a Seller" button in footer
2. System checks if user is logged in
3. System validates user is not already a seller or admin
4. `SellerAuthModal` opens
5. User enters phone number (must match their consumer login phone)
6. System validates phone number matches logged-in user
7. OTP is sent and verified
8. User fills seller details form:
   - Shop Name (required)
   - Category (required)
   - Address (required)
   - GST Number (optional)
9. Application is submitted to backend (`/auth/apply-seller`)
10. Backend creates entry in `sellers` collection with status `PENDING`
11. Backend updates user role to `SELLER` in `users` collection
12. User receives confirmation message
13. Application appears in admin dashboard for approval

#### Seller Document Structure:
```json
{
  "uid": "firebase_uid_here",
  "phone": "+919999999999",
  "shopName": "My Shop",
  "category": "Electronics",
  "address": "Shop address here",
  "gstNumber": "GST123456789",
  "sellerStatus": "PENDING",
  "appliedAt": "timestamp",
  "approvedAt": null,
  "rejectedAt": null
}
```

### 4. Admin Approval/Rejection

#### Admin Actions:
- View all pending seller applications
- Approve seller: Changes `sellerStatus` to `APPROVED`
- Reject seller: Changes `sellerStatus` to `REJECTED`
- Remove user: Sets `isActive` to `false`

#### After Approval:
- Seller can login and access `/seller/dashboard`
- Seller can list products

#### After Rejection:
- User remains as CONSUMER
- User can reapply (if system allows)

## Database Structure

### Collections:

#### 1. `users` Collection
```
users/
  {uid}/
    - uid: string
    - phone: string
    - role: "ADMIN" | "CONSUMER" | "SELLER"
    - isActive: boolean
    - createdAt: timestamp
    - updatedAt: timestamp
```

#### 2. `sellers` Collection
```
sellers/
  {uid}/
    - uid: string
    - phone: string
    - shopName: string
    - category: string
    - address: string
    - gstNumber: string
    - sellerStatus: "PENDING" | "APPROVED" | "REJECTED"
    - appliedAt: timestamp
    - approvedAt: timestamp | null
    - rejectedAt: timestamp | null
```

## Security Features

1. **Phone Verification**: All users must verify their phone number via OTP
2. **Firebase Authentication**: Secure token-based authentication
3. **Role-Based Access Control**: Backend validates user roles before granting access
4. **Admin Manual Setup**: Admin role cannot be auto-assigned
5. **Phone Number Matching**: Seller registration requires same phone as consumer login
6. **Account Status**: Inactive accounts cannot login

## API Endpoints

### 1. POST `/auth/login`
**Purpose**: Authenticate user and determine role

**Request Body**:
```json
{
  "idToken": "firebase_id_token"
}
```

**Response**:
```json
{
  "success": true,
  "uid": "user_id",
  "role": "ADMIN" | "CONSUMER" | "SELLER",
  "status": "AUTHORIZED" | "PENDING" | "REJECTED",
  "message": "Login successful"
}
```

### 2. POST `/auth/apply-seller`
**Purpose**: Submit seller application

**Request Body**:
```json
{
  "idToken": "firebase_id_token",
  "sellerDetails": {
    "phone": "+919999999999",
    "shopName": "My Shop",
    "category": "Electronics",
    "address": "Shop address",
    "gstNumber": "GST123456789"
  }
}
```

**Response**:
```json
{
  "success": true,
  "uid": "user_id",
  "message": "Seller application submitted successfully",
  "status": "PENDING"
}
```

## Frontend Components

### 1. `AuthModal.jsx`
- Handles phone number input
- Manages OTP verification
- Integrates with Firebase Authentication
- Calls backend for role determination
- Redirects based on user role

### 2. `SellerAuthModal.jsx`
- Validates user is logged in
- Checks phone number matches consumer login
- Collects seller details
- Submits application to backend

### 3. `Footer.jsx`
- Contains "Become a Seller" button
- Opens `SellerAuthModal` when clicked
- Validates user eligibility

## Installation & Setup

### Frontend Dependencies:
```bash
npm install firebase
```

### Backend Dependencies:
```bash
npm install cors
```

### Environment Setup:
1. Configure Firebase project
2. Add Firebase config to `src/config/firebase.js`
3. Set up Firebase Admin SDK in backend
4. Create `serviceAccountKey.json` for backend
5. Manually create admin user in Firestore

### Running the Application:
```bash
# Frontend
npm run dev

# Backend
node auth.js
```

## Important Notes

1. **Admin Setup**: Admin role MUST be manually created in Firestore before first use
2. **Phone Number**: All phone numbers use +91 country code (India)
3. **OTP**: Firebase handles OTP generation and delivery
4. **reCAPTCHA**: Firebase requires reCAPTCHA for phone authentication (invisible mode)
5. **CORS**: Backend must have CORS enabled for frontend communication
6. **LocalStorage**: User data is stored in browser localStorage after successful login

## Troubleshooting

### Common Issues:

1. **OTP not received**: Check Firebase console for quota limits
2. **CORS errors**: Ensure backend has CORS middleware enabled
3. **Admin redirect fails**: Verify admin role is set correctly in Firestore
4. **Seller application fails**: Check if user is already logged in as consumer
5. **Phone mismatch error**: Ensure same phone number is used for seller registration

## Future Enhancements

1. Email verification as alternative to phone
2. Social login integration
3. Two-factor authentication
4. Password-based login option
5. Seller profile editing
6. Admin bulk approval/rejection
7. Notification system for status updates
