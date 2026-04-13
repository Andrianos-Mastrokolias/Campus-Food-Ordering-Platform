# Firebase Admin Role Request System - Setup Guide

## ✅ What This Does

### UAT1: User Requests Admin Access
- User clicks **"Request Admin Access"** button
- User fills in reason (minimum 20 characters)
- Request is **saved to Firebase Firestore**
- User can view request status

### UAT2: Admin Approves/Rejects Request
- Existing admin sees all pending requests
- Admin can **approve** request → **User role updates to "Admin" in Firebase**
- Admin can **reject** request with reason
- All actions logged in Firebase

---

## 📦 Firebase Collections Created

### 1. `adminRoleRequests`
Stores all admin access requests

```javascript
{
  userId: "user123",
  userName: "John Doe",
  userEmail: "john@example.com",
  requestReason: "I need admin access to...",
  status: "Pending", // Pending, Approved, Rejected, Cancelled
  createdAt: Timestamp,
  updatedAt: Timestamp,
  reviewedBy: "admin456", // null if not reviewed
  reviewedByName: "Admin User", // null if not reviewed
  reviewedAt: Timestamp, // null if not reviewed
  reviewNotes: "Optional notes" // null if no notes
}
```

### 2. `users`
Existing users collection - role field updated on approval

```javascript
{
  // ... existing user fields
  role: "Admin", // Updated from "Student" when approved
  updatedAt: Timestamp
}
```

### 3. `adminActivityLog`
Audit trail of all admin actions

```javascript
{
  adminUserId: "admin456",
  adminName: "Admin User",
  actionType: "Request_Approved", // or Request_Rejected
  targetUserId: "user123",
  targetUserName: "John Doe",
  description: "Approved admin access request for...",
  createdAt: Timestamp
}
```

---

## 🚀 Installation Steps

### Step 1: Install Firebase Dependencies

```bash
npm install firebase
```

### Step 2: Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select your project
3. Go to Project Settings → General
4. Copy your Firebase config
5. Update `firebaseConfig.js` with your credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 3: Firestore Setup

1. In Firebase Console → Firestore Database
2. Click "Create database"
3. Start in **production mode** (we'll add rules next)

### Step 4: Security Rules

Go to Firestore → Rules and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Admin Role Requests
    match /adminRoleRequests/{requestId} {
      // Anyone authenticated can read
      allow read: if request.auth != null;
      
      // Users can create their own requests
      allow create: if request.auth != null 
                    && request.resource.data.userId == request.auth.uid;
      
      // Only admins can update/delete
      allow update, delete: if request.auth != null 
                             && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    
    // Users Collection
    match /users/{userId} {
      // Anyone authenticated can read
      allow read: if request.auth != null;
      
      // Users can update their own profile
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // Admins can update anyone's role
      allow update: if request.auth != null 
                    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    
    // Admin Activity Log
    match /adminActivityLog/{logId} {
      // Only admins can read
      allow read: if request.auth != null 
                  && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
      
      // Only admins can write
      allow create: if request.auth != null 
                    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
  }
}
```

### Step 5: Create Composite Indexes

Firestore → Indexes → Add composite index:

**Index 1:**
- Collection: `adminRoleRequests`
- Fields:
  - `userId` (Ascending)
  - `status` (Ascending)
  - `createdAt` (Descending)

**Index 2:**
- Collection: `adminRoleRequests`
- Fields:
  - `status` (Ascending)
  - `createdAt` (Ascending)

### Step 6: Add Files to Your Project

```bash
# Copy these files to your project:
src/
├── firebaseConfig.js
├── services/
│   └── adminRoleRequestService.js
└── components/
    ├── RequestAdminAccess.jsx
    ├── RequestAdminAccess.css
    ├── AdminRequestReview.jsx
    └── AdminRequestReview.css
```

### Step 7: Add Routes

In your `App.js` or router file:

```javascript
import RequestAdminAccess from './components/RequestAdminAccess';
import AdminRequestReview from './components/AdminRequestReview';

// In your routes:
<Route path="/request-admin" element={<RequestAdminAccess />} />
<Route path="/admin/requests" element={<AdminRequestReview />} />
```

### Step 8: Add Navigation Button

In your navigation or user profile menu:

```jsx
<button onClick={() => navigate('/request-admin')}>
  📋 Request Admin Access
</button>

{/* For admins only: */}
{userRole === 'Admin' && (
  <button onClick={() => navigate('/admin/requests')}>
    ⚙️ Review Admin Requests
  </button>
)}
```

---

## 🔐 Making the First Admin

Since you need an admin to approve requests, you'll need to manually create the first admin:

### Method 1: Firebase Console (Easiest)

1. Go to Firestore Database
2. Find your `users` collection
3. Find your user document
4. Edit the document
5. Add/update field: `role: "Admin"`

### Method 2: Using Firebase Admin SDK (Backend)

```javascript
const admin = require('firebase-admin');

admin.firestore()
  .collection('users')
  .doc('YOUR_USER_ID')
  .update({ role: 'Admin' });
```

---

## 💻 Usage Flow

### For Users (UAT1):

1. Navigate to `/request-admin`
2. Click **"Request Admin Access"** button
3. Fill in reason (min 20 chars)
4. Click "Submit Request"
5. Request saved to Firebase ✅
6. Wait for admin approval

### For Admins (UAT2):

1. Navigate to `/admin/requests`
2. See pending requests
3. Review user's reason
4. Optional: Add approval notes
5. Click **"Approve & Make Admin"**
6. User role updates to "Admin" in Firebase ✅
7. User can now approve other requests

---

## 📝 Firebase Functions (Optional Enhancement)

You can add Cloud Functions to send email notifications:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.onRequestApproved = functions.firestore
  .document('adminRoleRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // If status changed to Approved
    if (before.status === 'Pending' && after.status === 'Approved') {
      // Send email to user
      // await sendEmail(after.userEmail, 'Request Approved!');
    }
  });
```

---

## 🧪 Testing

### Test UAT1:
1. Log in as regular user
2. Click "Request Admin Access"
3. Submit request
4. Check Firebase Console → `adminRoleRequests` collection
5. Verify request is saved ✅

### Test UAT2:
1. Log in as admin
2. Go to `/admin/requests`
3. See the pending request
4. Click "Approve & Make Admin"
5. Check Firebase Console → `users` collection
6. Verify user's `role` field = "Admin" ✅

---

## 🎨 Customization

### Change Minimum Reason Length:
In `RequestAdminAccess.jsx` and `adminRoleRequestService.js`:
```javascript
if (reason.trim().length < 20) // Change 20 to your preference
```

### Add More Request Statuses:
In `adminRoleRequestService.js`:
```javascript
status: 'Pending', // Add: 'UnderReview', 'OnHold', etc.
```

### Custom Approval Logic:
In `adminRoleRequestService.js` → `approveAdminRequest()`:
```javascript
// Add custom logic before updating role
if (someCondition) {
  throw new Error('Cannot approve this request');
}
```

---

## 🐛 Troubleshooting

### "Missing or insufficient permissions"
- Check Firestore security rules
- Verify user is authenticated
- Ensure user has correct role

### "Index required" error
- Go to Firestore → Indexes
- Click the link in error message
- Create the required index

### Request not appearing for admin
- Check user's role is "Admin" in Firestore
- Verify request status is "Pending"
- Check security rules allow admin to read

### Role not updating after approval
- Check security rules allow admin to update users
- Verify Firestore write succeeded (check Console)
- User may need to refresh token

---

## 📊 Monitoring

Track admin requests in Firebase Console:
1. Firestore → `adminRoleRequests` collection
2. See all requests and their statuses
3. Check `adminActivityLog` for audit trail

---

## 🔒 Security Best Practices

1. ✅ Always validate input on both client and server
2. ✅ Use Firebase Security Rules
3. ✅ Log all admin actions
4. ✅ Require minimum reason length
5. ✅ Prevent duplicate pending requests
6. ✅ Only allow admins to update roles

---

## 🚀 Next Steps

1. Deploy Firestore security rules
2. Create your first admin user
3. Test the full flow (UAT1 → UAT2)
4. Add email notifications (optional)
5. Customize UI to match your app

---

**Questions?** Check Firebase documentation or review the code comments!
