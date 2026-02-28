# Address Management Integration - Testing Guide

## ✅ Implementation Complete!

All changes have been successfully implemented and the servers are running:
- **Frontend**: http://localhost:5173 (Vite + React)
- **Backend**: http://localhost:5000 (Express + Node.js)
- **Auth Service**: http://localhost:3001

---

## How to Test the New Address Management System

### Test 1: Consumer Dashboard - Address Book

1. **Login as Consumer**
   - Go to http://localhost:5173
   - Login with consumer credentials
   - Navigate to Dashboard

2. **Add First Address**
   - Click "Address Book" in sidebar
   - Click "Add New Address"
   - Fill in all fields:
     - Label: Home
     - First Name: John
     - Last Name: Doe
     - Address Line: 123 Main Street, Apt 4B
     - City: Bangalore
     - State: Karnataka
     - Pincode: 560001
     - Phone: 9876543210
   - Click "Save Address"
   - ✅ **Expected**: Address saved, automatically set as default (green border, "Default" badge)

3. **Add Second Address**
   - Click "Add New Address" again
   - Fill in different address (e.g., Work address)
   - Click "Save Address"
   - ✅ **Expected**: New address saved, first address remains default

4. **Set Second Address as Default**
   - Find the second address card
   - Click "Set as Default" button
   - ✅ **Expected**: 
     - Second address now has green border and "Default" badge
     - First address loses default status
     - First address now shows "Set as Default" button

5. **Edit Address**
   - Click "Edit" on any address
   - Modify some fields
   - Click "Save Address"
   - ✅ **Expected**: Address updated successfully

6. **Delete Non-Default Address**
   - Click "Delete" on a non-default address
   - ✅ **Expected**: Address removed from list

7. **Delete Default Address**
   - Click "Delete" on the default address
   - ✅ **Expected**: 
     - Address removed
     - First remaining address automatically becomes default

---

### Test 2: Checkout - Saved Address Selection

1. **Add Items to Cart**
   - Browse products on home page
   - Add 2-3 items to cart
   - Click cart icon, then "Checkout"

2. **Verify Auto-Selection**
   - ✅ **Expected**: 
     - Default address is automatically selected
     - "Select Saved Address" button is active (blue)
     - Dropdown shows all saved addresses
     - Selected address preview card displays below dropdown
     - Preview shows: label, name, full address, phone, default badge

3. **Change Selected Address**
   - Click the dropdown
   - Select a different address
   - ✅ **Expected**: 
     - Preview card updates with new address details
     - Shipping address updates

4. **Continue to Payment**
   - Click "Continue to Payment Selection"
   - ✅ **Expected**: Moves to step 2 (payment selection)

5. **Edit Address from Step 2**
   - Click "Edit Address" button
   - ✅ **Expected**: Returns to step 1 with address still selected

---

### Test 3: Checkout - New Address Entry

1. **Switch to New Address Mode**
   - In checkout step 1, click "Enter New Address" button
   - ✅ **Expected**: 
     - Button turns blue
     - Address form fields appear
     - Dropdown and preview card disappear

2. **Fill New Address**
   - Enter all address fields:
     - First Name: Jane
     - Last Name: Smith
     - Address Line: 456 Park Avenue
     - City: Mumbai
     - State: Maharashtra
     - Pincode: 400001

3. **Save Address Options**
   - ✅ **Expected**: Two checkboxes visible:
     - ☐ Save this address for future use
     - ☐ Set as default address (disabled/hidden initially)

4. **Check "Save this address"**
   - Check the first checkbox
   - ✅ **Expected**: Second checkbox "Set as default address" appears

5. **Check "Set as default"**
   - Check the second checkbox
   - ✅ **Expected**: Both checkboxes are checked

6. **Complete Order (COD)**
   - Click "Continue to Payment Selection"
   - Select "Cash on Delivery"
   - Click "Place Order"
   - ✅ **Expected**: 
     - Order placed successfully
     - New address saved to Address Book
     - New address is set as default

7. **Verify in Dashboard**
   - Go to Dashboard → Address Book
   - ✅ **Expected**: 
     - New address (Jane Smith, 456 Park Avenue) is present
     - Has green border and "Default" badge
     - Previous default address is now non-default

---

### Test 4: Checkout - New Address Without Saving

1. **Add Items to Cart Again**
   - Add products to cart
   - Go to checkout

2. **Switch to New Address**
   - Click "Enter New Address"
   - Fill in address fields
   - **DO NOT** check "Save this address for future use"

3. **Complete Order**
   - Continue to payment
   - Place order (COD or Razorpay)
   - ✅ **Expected**: 
     - Order placed successfully
     - Address NOT saved to Address Book

4. **Verify in Dashboard**
   - Go to Dashboard → Address Book
   - ✅ **Expected**: New address is NOT in the list

---

### Test 5: Checkout - Razorpay Payment with New Address

1. **Add Items to Cart**
   - Add products to cart
   - Go to checkout

2. **Enter New Address**
   - Click "Enter New Address"
   - Fill in address fields
   - Check "Save this address for future use"
   - Check "Set as default address"

3. **Select Razorpay Payment**
   - Click "Continue to Payment Selection"
   - Select "Pay Online" (Razorpay)
   - Click "Pay ₹X Securely"

4. **Complete Razorpay Payment**
   - Razorpay modal opens
   - Use test card: 4111 1111 1111 1111
   - Expiry: Any future date
   - CVV: 123
   - Complete payment

5. **Verify Order and Address**
   - ✅ **Expected**: 
     - Order placed successfully
     - Confirmation animation shows
     - New address saved to Address Book
     - New address is set as default

---

### Test 6: User with No Saved Addresses

1. **Create New User Account**
   - Logout
   - Register new consumer account
   - Login with new account

2. **Go to Checkout**
   - Add items to cart
   - Go to checkout
   - ✅ **Expected**: 
     - Automatically in "Enter New Address" mode
     - No mode toggle buttons (since no saved addresses)
     - Address form fields visible
     - Checkboxes visible

3. **Complete First Order**
   - Fill address
   - Check "Save this address"
   - Check "Set as default"
   - Place order
   - ✅ **Expected**: Address saved as default

4. **Second Order**
   - Add items to cart again
   - Go to checkout
   - ✅ **Expected**: 
     - Now shows mode toggle buttons
     - Default address auto-selected
     - Can switch between saved and new

---

### Test 7: Data Consistency

1. **Set Address as Default in Dashboard**
   - Go to Dashboard → Address Book
   - Set "Work" address as default
   - Note which address is default

2. **Go to Checkout**
   - Add items to cart
   - Go to checkout
   - ✅ **Expected**: "Work" address is auto-selected

3. **Add New Address in Checkout**
   - Switch to "Enter New Address"
   - Fill in new address
   - Check both checkboxes (save + set as default)
   - Complete order

4. **Verify in Dashboard**
   - Go to Dashboard → Address Book
   - ✅ **Expected**: 
     - New address is present
     - New address is default
     - "Work" address is no longer default

5. **Go to Checkout Again**
   - Add items to cart
   - Go to checkout
   - ✅ **Expected**: New address is auto-selected

---

## Expected Behavior Summary

### Consumer Dashboard - Address Book:
✅ Can add multiple addresses
✅ Can edit any address
✅ Can delete any address
✅ Can set any address as default
✅ Only one address can be default at a time
✅ Default address has green border and badge
✅ Non-default addresses show "Set as Default" button
✅ Deleting default address auto-sets next address as default

### Checkout Page:
✅ Auto-selects default address on load
✅ Shows mode toggle if user has saved addresses
✅ Dropdown shows all saved addresses with labels
✅ Selected address preview displays full details
✅ Can switch to "Enter New Address" mode
✅ New address mode shows form fields
✅ Checkboxes only visible in new address mode
✅ "Set as default" checkbox only visible when "Save" is checked
✅ Address saves after order placement (both COD and Razorpay)
✅ Address only saves if checkbox is checked

### Data Consistency:
✅ Addresses synced between Dashboard and Checkout
✅ Default address set in Dashboard auto-selects in Checkout
✅ Address saved in Checkout appears in Dashboard
✅ Only one address can be default across the system
✅ No duplicate addresses created

---

## Common Issues and Solutions

### Issue 1: Default address not auto-selecting in checkout
**Solution**: 
- Check if address has `isDefault: true` in Firestore
- Verify user is logged in
- Check browser console for errors

### Issue 2: Address not saving after order
**Solution**:
- Ensure "Save this address" checkbox is checked
- Verify user is in "new address" mode (not "saved address" mode)
- Check backend logs for API errors

### Issue 3: Multiple addresses showing as default
**Solution**:
- This shouldn't happen with new code
- If it does, manually fix in Firestore
- Set only one address with `isDefault: true`

### Issue 4: Mode toggle buttons not showing
**Solution**:
- This is expected if user has no saved addresses
- Add an address in Dashboard first
- Refresh checkout page

---

## Database Verification (Firestore)

To verify data in Firestore:

1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to `users` collection
4. Find your user document
5. Check `addresses` array:
   ```javascript
   addresses: [
     {
       label: "Home",
       firstName: "John",
       lastName: "Doe",
       addressLine: "123 Main St",
       city: "Bangalore",
       state: "Karnataka",
       pincode: "560001",
       phone: "9876543210",
       isDefault: true  // ← Should be true for only ONE address
     },
     {
       label: "Work",
       // ... other fields
       isDefault: false  // ← Should be false for others
     }
   ]
   ```

---

## API Endpoint Testing (Optional)

You can test the new backend endpoints using Thunder Client or Postman:

### 1. Get All Addresses
```
GET http://localhost:5000/api/user/{uid}/addresses
Headers: Authorization: Bearer {token}
```

### 2. Get Default Address
```
GET http://localhost:5000/api/user/{uid}/address/default
Headers: Authorization: Bearer {token}
```

### 3. Save Address
```
POST http://localhost:5000/api/user/{uid}/address/save
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json
Body:
{
  "address": {
    "label": "Home",
    "firstName": "John",
    "lastName": "Doe",
    "addressLine": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "phone": "9876543210",
    "isDefault": true
  }
}
```

### 4. Delete Address
```
POST http://localhost:5000/api/user/{uid}/address/delete
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json
Body:
{
  "addressId": 0  // Index of address to delete
}
```

---

## Success Criteria

All tests pass if:
- ✅ Addresses can be added, edited, deleted in Dashboard
- ✅ Default address can be set and only one is default at a time
- ✅ Checkout auto-selects default address
- ✅ Saved addresses can be selected from dropdown
- ✅ New addresses can be entered and saved
- ✅ Addresses sync between Dashboard and Checkout
- ✅ Orders can be placed with both saved and new addresses
- ✅ No errors in browser console or backend logs
- ✅ All other features (cart, wishlist, payment, etc.) still work

---

## Next Steps After Testing

1. Test all scenarios above
2. Report any issues found
3. If all tests pass, the feature is ready for production
4. Consider adding the optional enhancements listed in implementation doc

---

## Support

If you encounter any issues during testing:
1. Check browser console for errors
2. Check backend terminal for API errors
3. Verify Firestore data structure
4. Ensure both servers are running
5. Clear browser cache and try again

**Happy Testing! 🎉**
