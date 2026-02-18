
# Fix "Missing or insufficient permissions" Error

The error `FirebaseError: Missing or insufficient permissions` occurs when your Firebase Firestore Security Rules block the write operation. 

To fix this, you need to update your rules in the Firebase Console.

### Steps to Fix:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project **sellsathi**.
3. In the left sidebar, click on **Firestore Database**.
4. Click on the **Rules** tab at the top.
5. Replace the existing rules with the following code to allow authenticated users to read and write their own data:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow anyone to read products (so the marketplace works)
    match /products/{productId} {
      allow read: if true;
      allow write: if false; // Only admins should write via backend console, or add specific auth rule
    }

    // Allow users to read and write ONLY their own cart and data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Default deny for safety
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click **Publish**.

### Why this happens?
Your current rules likely default to `allow read, write: if false;` or have a timestamp check that expired (e.g., `allow read, write: if request.time < timestamp.date(202X, ...)`). The new rules explicitly allow:
- **Public Read** for Products.
- **Private Read/Write** for User Carts (authenticated users only).
