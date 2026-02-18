# SELLSATHI Authentication - Complete Test Cases

## ✅ Test Credentials (No reCAPTCHA Required)

These are predefined test credentials that bypass Firebase and reCAPTCHA entirely.

### Admin User
- **Phone Number**: 7483743936
- **Full Number**: +917483743936
- **OTP**: 123456
- **Expected Role**: ADMIN
- **Expected Redirect**: `/admin` (Admin Dashboard)
- **reCAPTCHA**: ❌ NOT REQUIRED (Skipped automatically)

### How to Add More Test Numbers
Edit `auth.cjs` file and add to `TEST_CREDENTIALS` object:
```javascript
const TEST_CREDENTIALS = {
    '+917483743936': { otp: '123456', role: 'ADMIN' },
    // Add more test numbers like:
    // '+919876543210': { otp: '123456', role: 'CONSUMER' },
};
```

---

## 📋 Test Cases

### **TEST CASE 1: Admin Login - Correct Credentials**
**Scenario**: Admin logs in with correct phone and OTP
- Enter Phone: `7483743936`
- Click "Get OTP"
- **Expected**: OTP input appears (NO reCAPTCHA popup)
- Enter OTP: `123456`
- Click "Continue"
- **Expected**: 
  - ✅ Redirected to `/admin` (Admin Dashboard)
  - ✅ Profile shows phone: +917483743936
  - ✅ Profile shows role: ADMIN
  - ✅ No errors in console

---

### **TEST CASE 2: Admin Login - Wrong OTP**
**Scenario**: Admin enters correct phone but wrong OTP
- Enter Phone: `7483743936`
- Click "Get OTP"
- Enter OTP: `999999`
- Click "Continue"
- **Expected**: 
  - ✅ Error message: "Invalid OTP"
  - ✅ Stays on OTP screen
  - ✅ Can retry with correct OTP

---

### **TEST CASE 3: Admin Login - Wrong Phone Number**
**Scenario**: User tries to login with non-admin phone
- Enter Phone: `9999999999`
- Click "Get OTP"
- **Expected**: 
  - ✅ Sends to Firebase (uses reCAPTCHA)
  - ✅ OTP input appears
- Enter OTP: `123456` (or any OTP from SMS)
- Click "Continue"
- **Expected**: 
  - ✅ Redirected to `/` (Home/Featured Products)
  - ✅ Role set to CONSUMER
  - ✅ No access to Admin Dashboard

---

### **TEST CASE 4: Profile Dropdown - Logged In Admin**
**Scenario**: Admin logs in and checks profile menu
- Login with admin credentials (Test Case 1)
- Click User icon in navbar
- **Expected**:
  - ✅ Dropdown appears showing:
    - Phone: +917483743936
    - Role: ADMIN (blue badge)
    - "Login as Another User" button
    - "Sign Out" button

---

### **TEST CASE 5: Switch Users - Admin to Consumer**
**Scenario**: Admin logs in, then logs in as different user
- Login as Admin (Test Case 1)
- Click User icon → Click "Login as Another User"
- **Expected**: Auth modal opens
- Enter different phone: `9999999999`
- Get OTP and enter it
- **Expected**:
  - ✅ Consumer data stored in localStorage
  - ✅ Profile updates to show new phone
  - ✅ Role changes to CONSUMER
  - ✅ Auto-redirected from admin if on `/admin` route

---

### **TEST CASE 6: Sign Out**
**Scenario**: Logged-in user signs out
- Login as any user
- Click User icon → Click "Sign Out"
- **Expected**:
  - ✅ localStorage cleared
  - ✅ User data removed
  - ✅ Redirected to `/` (Home)
  - ✅ User icon button shows (no dropdown)

---

### **TEST CASE 7: Admin Dashboard Protection**
**Scenario**: Try to access admin dashboard with non-admin phone
- Login with consumer phone
- Try to manually navigate to `/admin`
- **Expected**:
  - ✅ Auto-redirected to `/` (Home)
  - ✅ Cannot access admin dashboard
  - ✅ No errors in console

---

### **TEST CASE 8: Page Refresh - Session Persistence**
**Scenario**: Login and then refresh the page
- Login as Admin
- Press F5 or Cmd+R to refresh
- **Expected**:
  - ✅ User data persists from localStorage
  - ✅ Still on Admin Dashboard
  - ✅ Profile still shows correct phone and role

---

### **TEST CASE 9: Page Refresh - Authorization Check**
**Scenario**: Login as Consumer, then manually change localStorage to ADMIN (hack attempt)
- Login as Consumer
- Open DevTools → Application → localStorage → Edit user data to set role: ADMIN
- Refresh page
- **Expected**:
  - ✅ ProtectedRoute catches the mismatch
  - ✅ Auto-redirects to `/` (Home)
  - ✅ localStorage user data cleared
  - ✅ Security maintained

---

### **TEST CASE 10: reCAPTCHA Loop - Test Credentials**
**Scenario**: Test that reCAPTCHA doesn't loop for test credentials
- Enter admin phone: `7483743936`
- Click "Get OTP"
- **Expected**:
  - ✅ OTP input appears immediately
  - ✅ No reCAPTCHA popup
  - ✅ No "Failed to initialize reCAPTCHA" errors
  - ✅ Console shows: "Test credential detected - Skipping Firebase"

---

### **TEST CASE 11: Real Phone - reCAPTCHA Required**
**Scenario**: Test reCAPTCHA works for real phone numbers (not test credentials)
- Enter any non-test phone: `9123456789`
- Click "Get OTP"
- **Expected**:
  - ✅ reCAPTCHA verification required (if configured)
  - ✅ After verification, OTP input appears
  - ✅ Real SMS OTP can be used
  - ✅ No infinite loop

---

### **TEST CASE 12: Login Button State Changes**
**Scenario**: Check button appears differently based on login state
- **NOT Logged In**: User icon button visible
- Click button → Auth modal opens
- **Logged In**: User icon + dropdown arrow visible
- Click button → Profile dropdown shows
- Expected: Button states change correctly

---

### **TEST CASE 13: Mobile Responsiveness**
**Scenario**: Test on mobile view (use DevTools)
- Resize to mobile (375px width)
- Login process
- **Expected**:
  - ✅ Auth modal responsive
  - ✅ Profile dropdown fits screen
  - ✅ All buttons accessible
  - ✅ No layout breaks

---

### **TEST CASE 14: Multiple Tabs - Session Sync**
**Scenario**: Open app in 2 tabs, login in one, check other
- Tab 1: Keep home page
- Tab 2: Open same app (or navigate to it)
- Tab 1: Login as Admin
- **Expected**:
  - ✅ Tab 2 updates to show logged-in state
  - ✅ Both tabs in sync via localStorage
  - ⚠️ Note: Navigation won't sync (expected behavior)

---

### **TEST CASE 15: Empty OTP Error**
**Scenario**: Try to verify without entering OTP
- Login with phone
- Click "Continue" without entering OTP
- **Expected**:
  - ✅ Error message: "Please enter a valid 6-digit OTP"
  - ✅ Button disabled until OTP entered

---

## 🔍 Browser Console Expected Logs

### For Test Credentials:
```
Starting OTP send for: +917483743936
Test credential detected - Skipping Firebase
Test mode verification - Using test-login endpoint
User login successful
```

### For Real Credentials:
```
Starting OTP send for: +919123456789
reCAPTCHA initialized successfully
Invoking signInWithPhoneNumber...
OTP Sent Successfully!
Real mode verification - Using Firebase
User login successful
```

---

## ❌ Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| reCAPTCHA infinite loop | Using Firebase for test number | Ensure test credentials are in TEST_CREDENTIALS object |
| "Unauthorized admin access" | Wrong phone for ADMIN role | Use +917483743936 for ADMIN |
| Stays on consumer page after admin login | reCAPTCHA failed | Refresh and try again |
| localStorage not clearing on sign out | Manual cache issue | Clear browser cache and localStorage |
| User profile not updating | Event not dispatched | Check that handleLoginSuccess dispatches userDataChanged |

---

## ✨ Zero Error Checklist

- ✅ Test credentials bypass reCAPTCHA completely
- ✅ No "Failed to initialize reCAPTCHA" errors
- ✅ Admin phone check happens on both frontend & backend
- ✅ ProtectedRoute monitors localStorage changes
- ✅ Sign out clears everything and dispatches event
- ✅ Profile menu shows correct data
- ✅ Redirection works for all roles
- ✅ Page refresh maintains session
- ✅ Authorization re-checked on role change

---

## 🚀 Quick Start Testing

### Option 1: Admin Test
1. Click User icon → Enter `7483743936` → Get OTP
2. Enter `123456` → Should go to Admin Dashboard

### Option 2: Consumer Test  
1. Click User icon → Enter any other number → Get OTP
2. Enter OTP from SMS → Should go to Home/Featured Products

### Option 3: Profile Test
1. Login as Admin
2. Click User icon → See profile dropdown
3. Click "Sign Out" → Logged out
4. Click User icon again → Back to login screen

---

## 📝 Notes
- All test credentials are in `auth.cjs` and `AuthModal.jsx`
- Real phone numbers still work via Firebase + reCAPTCHA
- Test mode is for development only
- Do NOT use test credentials in production
