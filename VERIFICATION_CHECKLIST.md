# Review System - Verification Checklist

## Quick Verification Guide

Use this checklist to verify the review system is working correctly.

---

## ✅ Pre-Verification Checks

### 1. Servers Running
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 5173
- [ ] Auth service running on port 3001
- [ ] No console errors in terminal

**How to Check**:
```bash
# Check if servers are running
netstat -ano | findstr :5000
netstat -ano | findstr :5173
netstat -ano | findstr :3001
```

### 2. Database Connection
- [ ] Firestore connected
- [ ] `reviews` collection exists
- [ ] `products` collection has data
- [ ] `orders` collection has data
- [ ] `users` collection has data

**How to Check**:
- Open Firebase Console
- Navigate to Firestore Database
- Verify collections exist

---

## ✅ Customer Flow Verification

### Step 1: Create Test Order (if needed)
```
1. Login as customer
2. Add product to cart
3. Proceed to checkout
4. Complete order (use COD for testing)
5. Note the Order ID
```

### Step 2: Mark Order as Delivered
```
Option A: Via Admin Dashboard
1. Login as admin
2. Go to Orders section
3. Find the test order
4. Change status to "Delivered"

Option B: Via Firestore Console
1. Open Firebase Console
2. Go to Firestore Database
3. Find order in `orders` collection
4. Update `status` field to "Delivered"
```

### Step 3: Verify Reviewable Orders
```
1. Login as customer
2. Go to Consumer Dashboard
3. Click "My Reviews" tab
4. Verify delivered product appears
5. Check badge shows count (e.g., "My Reviews 1")
```

**Expected Result**:
- Product card with image
- Product name displayed
- "Delivered on dd/mm/yyyy" shown
- "Write Review" button visible

### Step 4: Submit Review
```
1. Click "Write Review" button
2. Modal opens with product name
3. Select rating (1-5 stars)
4. Enter review title (e.g., "Great product!")
5. Enter detailed review (e.g., "Very satisfied with quality...")
6. Click "Submit Review"
```

**Expected Result**:
- Success message: "Review submitted successfully!"
- Modal closes
- Product removed from reviewable list
- Badge count decreases

### Step 5: Verify Database Entry
```
1. Open Firebase Console
2. Go to Firestore Database
3. Open `reviews` collection
4. Find the new review document
```

**Expected Fields**:
```javascript
{
  productId: "prod123",
  orderId: "OD1234567890",
  userId: "user456",
  customerName: "John Doe",
  productName: "Product Name",
  rating: 5,
  title: "Great product!",
  body: "Very satisfied...",
  verified: true,
  status: "active",
  createdAt: Timestamp
}
```

---

## ✅ Admin Dashboard Verification

### Step 1: Access Customer Feedback
```
1. Login as admin
2. Go to Admin Dashboard
3. Click "Total Feedback" stat card
   OR scroll to Customer Feedback section
```

### Step 2: Verify Review Display
```
Check that the review shows:
- [ ] Product name (bold, large text)
- [ ] Product category (e.g., "Category: Electronics")
- [ ] Product brand (e.g., "Brand: Samsung")
- [ ] Average rating stars (★★★★★)
- [ ] Rating score and count (e.g., "4.5 (12 reviews)")
- [ ] Customer name (bold)
- [ ] Customer ID (first 8 characters)
- [ ] Rating stars (visual)
- [ ] Numeric rating (e.g., "5/5")
- [ ] Review text (truncated to 120 chars)
- [ ] Date (dd/mm/yyyy format)
- [ ] Delete button
```

**Expected Display**:
```
Product Details:
  Handmade Jute Bag
  Category: Fashion  Brand: EcoStyle
  ★★★★★ 4.5 (12 reviews)

Customer:
  John Doe
  ID: abc12345

Rating:
  ★★★★★
  5/5

Review:
  Very satisfied with this purchase. The quality is excellent and delivery was fast...

Date:
  27/02/2026

Actions:
  [Delete]
```

### Step 3: Test Search Functionality
```
1. Enter product name in search box
2. Verify only matching reviews show
3. Clear search
4. Enter customer name in search box
5. Verify only matching reviews show
6. Click "Clear" button
7. Verify all reviews show again
```

### Step 4: Test Date Filter
```
1. Click date filter input
2. Select a date
3. Verify only reviews from that date show
4. Click "Clear" button
5. Verify all reviews show again
```

### Step 5: Test Delete Functionality
```
1. Click "Delete" button on a review
2. Verify confirmation dialog appears
3. Click "OK" to confirm
4. Verify success message
5. Verify review removed from list
6. Check Firestore: status should be "deleted"
```

### Step 6: Test Auto-Refresh
```
1. Note current review count
2. Wait 2 minutes
3. Verify page refreshes automatically
4. Check console for: "[AUTO-REFRESH] Refreshing admin dashboard data..."
```

---

## ✅ API Endpoint Verification

### Test Review Submission Endpoint
```bash
# POST /api/reviews
curl -X POST http://localhost:5000/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "prod123",
    "orderId": "OD1234567890",
    "rating": 5,
    "title": "Test Review",
    "body": "This is a test review"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "reviewId": "abc123xyz"
}
```

### Test Admin Reviews Endpoint
```bash
# GET /admin/reviews
curl http://localhost:5000/admin/reviews \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "reviews": [
    {
      "id": "review123",
      "productName": "Handmade Jute Bag",
      "productCategory": "Fashion",
      "productBrand": "EcoStyle",
      "productAvgRating": 4.5,
      "productReviewCount": 12,
      "customerName": "John Doe",
      "customerId": "user456",
      "rating": 5,
      "title": "Great product!",
      "body": "Very satisfied...",
      "feedback": "Very satisfied...",
      "date": "27/02/2026",
      "verified": true,
      "orderId": "OD1234567890"
    }
  ]
}
```

### Test Reviewable Orders Endpoint
```bash
# GET /api/user/:uid/reviewable-orders
curl http://localhost:5000/api/user/USER_UID/reviewable-orders \
  -H "Authorization: Bearer USER_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "orders": [
    {
      "orderId": "OD1234567890",
      "productId": "prod123",
      "productName": "Handmade Jute Bag",
      "productImage": "https://...",
      "deliveredDate": "27/02/2026"
    }
  ]
}
```

---

## ✅ Browser Console Verification

### Customer Dashboard Console
```javascript
// Open browser console (F12)
// Check for these logs:

// When fetching reviewable orders:
"[Dashboard] Fetching orders for userId: user456"

// When submitting review:
"Review submitted successfully"

// No errors should appear
```

### Admin Dashboard Console
```javascript
// Open browser console (F12)
// Check for these logs:

// When fetching reviews:
"[DEBUG] all-sellers response: true count: 5"

// Auto-refresh logs (every 2 minutes):
"[AUTO-REFRESH] Refreshing admin dashboard data..."

// No errors should appear
```

---

## ✅ Common Issues & Solutions

### Issue 1: Reviews Not Showing in Admin Dashboard
**Symptoms**: Customer Feedback section is empty
**Checks**:
- [ ] Backend server running?
- [ ] Reviews exist in Firestore?
- [ ] Reviews have `status: "active"`?
- [ ] Admin is logged in?
- [ ] No console errors?

**Solution**:
1. Check backend logs for errors
2. Verify Firestore connection
3. Check browser console for API errors
4. Click "Refresh" button in admin dashboard

### Issue 2: Product Not Appearing in "My Reviews"
**Symptoms**: Delivered products not showing
**Checks**:
- [ ] Order status is "Delivered"?
- [ ] Order has `userId` field?
- [ ] Product not already reviewed?
- [ ] Customer is logged in?

**Solution**:
1. Verify order status in Firestore
2. Check order has correct userId
3. Check if review already exists for product
4. Refresh Consumer Dashboard

### Issue 3: Missing Product Category/Brand
**Symptoms**: Shows "Uncategorized" or "Unknown"
**Checks**:
- [ ] Product exists in Firestore?
- [ ] Product has `category` field?
- [ ] Product has `brand` field?
- [ ] Backend restarted after fix?

**Solution**:
1. Update product in Firestore with category and brand
2. Restart backend server
3. Refresh admin dashboard

### Issue 4: Review Submission Fails
**Symptoms**: Error message when submitting
**Checks**:
- [ ] User is logged in?
- [ ] All fields filled?
- [ ] Backend server running?
- [ ] Network connection?

**Solution**:
1. Check browser console for error details
2. Verify backend logs
3. Check Firebase authentication
4. Try logging out and back in

---

## ✅ Performance Checks

### Response Time
- [ ] Review submission: < 2 seconds
- [ ] Admin reviews fetch: < 3 seconds
- [ ] Reviewable orders fetch: < 2 seconds
- [ ] Delete review: < 1 second

### Data Accuracy
- [ ] Review count matches Firestore
- [ ] Average ratings calculated correctly
- [ ] Dates formatted as dd/mm/yyyy
- [ ] Customer names match user records
- [ ] Product info matches product records

---

## ✅ Final Verification

### All Systems Go Checklist
- [ ] Customer can submit reviews
- [ ] Reviews saved to Firestore
- [ ] Reviews appear in Admin Dashboard
- [ ] All fields display correctly
- [ ] Search works
- [ ] Filter works
- [ ] Delete works
- [ ] Auto-refresh works
- [ ] No console errors
- [ ] No backend errors

---

## 🎉 Success Criteria

The review system is working correctly if:

1. ✅ Customers can see delivered products in "My Reviews" tab
2. ✅ Customers can submit reviews with rating, title, and body
3. ✅ Reviews are saved to Firestore with all required fields
4. ✅ Admin Dashboard shows all reviews with complete information:
   - Product name, category, brand
   - Average rating and review count
   - Customer name and ID
   - Rating and review text
   - Date in dd/mm/yyyy format
5. ✅ Search by product/customer name works
6. ✅ Date filter works
7. ✅ Delete functionality works
8. ✅ Auto-refresh works every 2 minutes
9. ✅ No errors in console or backend logs

---

## 📝 Test Results Template

```
Date: __________
Tester: __________

Customer Flow:
[ ] Create test order - PASS/FAIL
[ ] Mark as delivered - PASS/FAIL
[ ] Product appears in My Reviews - PASS/FAIL
[ ] Submit review - PASS/FAIL
[ ] Review saved to database - PASS/FAIL

Admin Dashboard:
[ ] Reviews display correctly - PASS/FAIL
[ ] All fields present - PASS/FAIL
[ ] Search works - PASS/FAIL
[ ] Filter works - PASS/FAIL
[ ] Delete works - PASS/FAIL
[ ] Auto-refresh works - PASS/FAIL

Overall Status: PASS/FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🔧 Quick Troubleshooting Commands

```bash
# Check if backend is running
netstat -ano | findstr :5000

# Check backend logs
cd back
npm run dev

# Check frontend logs
cd front
npm run dev

# Restart backend
# Stop: Ctrl+C
# Start: npm run dev:backend

# Clear browser cache
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete

# Check Firestore connection
# Open Firebase Console
# Go to Firestore Database
# Verify collections exist
```

---

**Last Updated**: February 27, 2026
**Status**: Ready for Testing
**Backend**: Updated and Restarted
**Frontend**: No Changes Needed
