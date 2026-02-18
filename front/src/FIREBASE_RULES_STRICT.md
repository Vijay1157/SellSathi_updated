
# ✅ Correct Firebase Rules for User Cart

To allow each user to have their own private cart that persists across logins, replace your **Firestore Rules** with this code.

### Instructions:
1. Go to **Firebase Console** > **Firestore Database** > **Rules**.
2. **Paste** this code:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. PUBLIC: Allow anyone to read products (Marketplace)
    match /products/{productId} {
      allow read: if true;
      allow write: if false; // Only admin can edit via backend
    }

    // 2. PRIVATE: Allow users to read/write ONLY their own data
    // This covers: users/{userId}/cart/* 
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Default: Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**.

This ensures that:
- `users/USER_123/cart/ITEM_ABC` can **only** be accessed by `USER_123`.
- If `USER_123` logs in on another device, they will see these same items.
