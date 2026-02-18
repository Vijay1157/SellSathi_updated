
# 🚨 CRITICAL FIX FOR CART ERROR 🚨

The error `FirebaseError: Missing or insufficient permissions` guarantees that your Firebase Application does not have permission to write to the database.

**You MUST update these rules in your Firebase Console for the cart to work:**

1. Go to **Firebase Console** > **Build** > **Firestore Database** > **Rules**.
2. **DELETE EVERYTHING** in the editor.
3. **PASTE** this code (Test Mode - Allows Everything):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
4. Click **Publish**.

*Note: This allows anyone to edit your database. For a hackathon/demo this is fine.*
