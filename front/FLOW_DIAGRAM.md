# SellSathi Authentication Flow Diagram

## User Journey Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER VISITS WEBSITE                          │
│                              (Home.jsx)                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Clicks "Shop   │
                    │ Now" or visits │
                    │ /admin/login   │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  AuthModal     │
                    │  Opens         │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Enter Phone    │
                    │ Number (+91)   │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Firebase sends │
                    │ OTP via SMS    │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ User enters    │
                    │ 6-digit OTP    │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Firebase       │
                    │ verifies OTP   │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Get ID Token   │
                    │ from Firebase  │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ POST to        │
                    │ /auth/login    │
                    └────────┬───────┘
                             │
                             ▼
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌───────────────┐                        ┌───────────────┐
│ User exists   │                        │ New user      │
│ in Firestore? │                        │ Create user   │
└───────┬───────┘                        │ role=CONSUMER │
        │                                └───────┬───────┘
        │                                        │
        └────────────────┬───────────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │ Check user     │
                │ role in DB     │
                └────────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌───────────┐    ┌───────────┐    ┌───────────┐
│   ADMIN   │    │ CONSUMER  │    │  SELLER   │
└─────┬─────┘    └─────┬─────┘    └─────┬─────┘
      │                │                │
      ▼                ▼                ▼
┌───────────┐    ┌───────────┐    ┌───────────┐
│ Redirect  │    │ Redirect  │    │ Check     │
│ to /admin │    │ to /      │    │ status    │
└───────────┘    └───────────┘    └─────┬─────┘
                                         │
                        ┌────────────────┼────────────────┐
                        │                │                │
                        ▼                ▼                ▼
                  ┌──────────┐    ┌──────────┐    ┌──────────┐
                  │ APPROVED │    │ PENDING  │    │ REJECTED │
                  └────┬─────┘    └────┬─────┘    └────┬─────┘
                       │               │               │
                       ▼               ▼               ▼
                  ┌──────────┐    ┌──────────┐    ┌──────────┐
                  │ /seller/ │    │ Alert +  │    │ Alert +  │
                  │dashboard │    │ goto /   │    │ goto /   │
                  └──────────┘    └──────────┘    └──────────┘
```

## Seller Registration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER LOGGED IN AS CONSUMER                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Clicks "Become │
                    │ a Seller" in   │
                    │ Footer         │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Check if user  │
                    │ is logged in   │
                    └────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────┐        ┌───────────┐        ┌───────────┐
│ Not       │        │ Already   │        │ Is Admin  │
│ logged in │        │ a Seller  │        │           │
└─────┬─────┘        └─────┬─────┘        └─────┬─────┘
      │                    │                    │
      ▼                    ▼                    ▼
┌───────────┐        ┌───────────┐        ┌───────────┐
│ Alert:    │        │ Alert:    │        │ Alert:    │
│ Login     │        │ Already   │        │ Cannot    │
│ first     │        │ registered│        │ become    │
└───────────┘        └───────────┘        └───────────┘
                             │
                             │ (User is CONSUMER)
                             │
                             ▼
                    ┌────────────────┐
                    │ SellerAuthModal│
                    │ Opens          │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Enter Phone    │
                    │ Number         │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Validate phone │
                    │ matches login  │
                    └────────┬───────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌───────────────┐                        ┌───────────────┐
│ Phone matches │                        │ Phone doesn't │
│               │                        │ match         │
└───────┬───────┘                        └───────┬───────┘
        │                                        │
        │                                        ▼
        │                                ┌───────────────┐
        │                                │ Show error:   │
        │                                │ "Use same     │
        │                                │ phone number" │
        │                                └───────────────┘
        │
        ▼
┌───────────────┐
│ Send OTP      │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Verify OTP    │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Show Seller   │
│ Details Form  │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Fill:         │
│ - Shop Name   │
│ - Category    │
│ - Address     │
│ - GST (opt)   │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Submit to     │
│ /auth/apply-  │
│ seller        │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Backend:      │
│ 1. Create doc │
│    in sellers │
│    collection │
│ 2. Update user│
│    role to    │
│    SELLER     │
│ 3. Set status │
│    to PENDING │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Show success  │
│ message       │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Application   │
│ appears in    │
│ Admin         │
│ Dashboard     │
└───────────────┘
```

## Database Structure

```
Firestore
│
├── users/
│   ├── {uid_1}/
│   │   ├── uid: "abc123"
│   │   ├── phone: "+919999999999"
│   │   ├── role: "ADMIN"
│   │   ├── isActive: true
│   │   └── createdAt: timestamp
│   │
│   ├── {uid_2}/
│   │   ├── uid: "def456"
│   │   ├── phone: "+919876543210"
│   │   ├── role: "CONSUMER"
│   │   ├── isActive: true
│   │   └── createdAt: timestamp
│   │
│   └── {uid_3}/
│       ├── uid: "ghi789"
│       ├── phone: "+919123456789"
│       ├── role: "SELLER"
│       ├── isActive: true
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
└── sellers/
    └── {uid_3}/
        ├── uid: "ghi789"
        ├── phone: "+919123456789"
        ├── shopName: "My Shop"
        ├── category: "Electronics"
        ├── address: "123 Main St"
        ├── gstNumber: "GST123456"
        ├── sellerStatus: "PENDING" | "APPROVED" | "REJECTED"
        ├── appliedAt: timestamp
        ├── approvedAt: timestamp | null
        └── rejectedAt: timestamp | null
```

## API Endpoints

```
Backend Server (http://localhost:5000)
│
├── POST /auth/login
│   ├── Request:
│   │   └── { idToken: "firebase_token" }
│   │
│   └── Response:
│       └── {
│             success: true,
│             uid: "user_id",
│             role: "ADMIN" | "CONSUMER" | "SELLER",
│             status: "AUTHORIZED" | "PENDING" | "REJECTED",
│             message: "Login successful"
│           }
│
└── POST /auth/apply-seller
    ├── Request:
    │   └── {
    │         idToken: "firebase_token",
    │         sellerDetails: {
    │           phone: "+919999999999",
    │           shopName: "My Shop",
    │           category: "Electronics",
    │           address: "123 Main St",
    │           gstNumber: "GST123"
    │         }
    │       }
    │
    └── Response:
        └── {
              success: true,
              uid: "user_id",
              message: "Application submitted",
              status: "PENDING"
            }
```

## Component Hierarchy

```
App.jsx
│
├── Navbar.jsx
│
├── Routes
│   ├── / → MarketplaceHome (Home.jsx)
│   │   └── AuthModal (for consumer login)
│   │
│   ├── /products → ProductListing
│   ├── /product/:id → ProductDetail
│   ├── /checkout → Checkout
│   ├── /track → OrderTracking
│   │
│   ├── /seller/register → SellerRegistration
│   ├── /seller/dashboard → SellerDashboard
│   │
│   ├── /admin/login → AdminLogin
│   │   └── AuthModal (for admin login)
│   │
│   └── /admin → AdminDashboard
│
└── Footer.jsx
    └── SellerAuthModal (for seller registration)
```

## State Management (localStorage)

```
localStorage
│
└── user
    └── {
          uid: "user_firebase_uid",
          role: "ADMIN" | "CONSUMER" | "SELLER",
          phone: "+919999999999",
          status: "AUTHORIZED" | "PENDING" | "REJECTED",
          sellerStatus: "PENDING" | "APPROVED" | "REJECTED" (if seller)
        }
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                              │
└─────────────────────────────────────────────────────────────────────┘

Layer 1: Firebase Authentication
├── Phone number verification
├── OTP validation
└── ID token generation

Layer 2: Backend Validation
├── Verify Firebase ID token
├── Check user exists in Firestore
├── Validate user role
└── Check account status (isActive)

Layer 3: Frontend Route Protection
├── Check localStorage for user data
├── Redirect based on role
└── Prevent unauthorized access

Layer 4: Firestore Security Rules
├── Only authenticated users can read their own data
├── Only backend can write to collections
└── Admin has special read permissions
```

---

**Legend:**
- `┌─┐ └─┘` = Process/Step
- `│` = Flow direction
- `▼` = Next step
- `├── └──` = Branch/Option
