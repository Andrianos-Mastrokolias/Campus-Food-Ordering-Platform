# User Story 3: Admin Role Application System - Setup Guide

## Overview
This feature allows users to apply for admin privileges, and existing admins can review and approve/reject applications. All data is stored in Firebase Firestore with Firebase Authentication for user management.

---

## Prerequisites

1. **Node.js** (v14 or higher)
2. **npm** or **yarn**
3. **Firebase Account** (free tier is sufficient)
4. **Git** (for version control)

---

## Firebase Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `campus-food-platform` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firebase Authentication

1. In Firebase Console, go to **Build** > **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method
4. Click "Save"

### Step 3: Create Firestore Database

1. In Firebase Console, go to **Build** > **Firestore Database**
2. Click "Create database"
3. Select **Production mode** (we'll add security rules later)
4. Choose a location (closest to South Africa: `europe-west1`)
5. Click "Enable"

### Step 4: Get Firebase Configuration

1. In Firebase Console, go to **Project settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the **Web** icon (</>)
4. Register app with nickname: `Campus Food Web`
5. Copy the `firebaseConfig` object
6. Paste it into `src/config/firebase.js` (replace placeholder values)

Example:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 5: Set Firestore Security Rules

1. In Firebase Console, go to **Firestore Database** > **Rules**
2. Copy and paste the rules from `docs/DATABASE_SCHEMA.md`
3. Click "Publish"

### Step 6: Create Firestore Indexes

1. Go to **Firestore Database** > **Indexes**
2. Click "Add index"
3. Create the following composite indexes:

**Index 1:**
- Collection ID: `adminApplications`
- Fields to index:
  - `status` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection

**Index 2:**
- Collection ID: `adminApplications`  
- Fields to index:
  - `userId` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Andrianos-Mastrokolias/Campus-Food-Ordering-Platform.git
cd Campus-Food-Ordering-Platform
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `firebase` - Backend services

### Step 3: Configure Firebase

1. Open `src/config/firebase.js`
2. Replace placeholder values with your Firebase config from Step 4 above
3. Save the file

### Step 4: Start Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

---

## Creating the First Admin User

Since admins approve other admins, you need to manually create the first admin:

### Option 1: Manual Firestore Entry

1. Register a user through the app normally
2. In Firebase Console, go to **Firestore Database**
3. Find the `users` collection
4. Click on your user document (identified by UID)
5. Edit the `role` field from `student` to `admin`
6. Save changes
7. Log out and log back in to see admin dashboard

### Option 2: Using Firebase Console

1. Go to **Authentication** > **Users**
2. Add a user with email/password
3. Copy the UID
4. Go to **Firestore Database**
5. Create a document in `users` collection with the UID as document ID:
```json
{
  "email": "admin@campus.ac.za",
  "displayName": "Admin User",
  "role": "admin",
  "createdAt": [current timestamp],
  "updatedAt": [current timestamp],
  "isActive": true
}
```

---

## Testing the Feature

### Test 1: User Application

1. Register as a new user (student role by default)
2. Navigate to admin application form
3. Fill out the form with a reason (minimum 50 characters)
4. Submit application
5. Verify application appears in "Your Application History"

### Test 2: Admin Review

1. Log in as admin user
2. Navigate to admin review dashboard
3. View pending applications
4. Click "Approve" or "Reject" on an application
5. Add review notes
6. Confirm action
7. Verify:
   - Application status updated
   - If approved, user role changed to admin
   - Statistics updated

### Test 3: Edge Cases

1. Try submitting multiple applications (should be blocked)
2. Try to approve as non-admin (should be blocked)
3. Check that rejected users can see rejection reason
4. Verify approved users can access admin dashboard

---

## Folder Structure

```
campus-food-platform/
├── src/
│   ├── config/
│   │   └── firebase.js              # Firebase configuration
│   ├── services/
│   │   ├── authService.js           # Authentication logic
│   │   └── adminApplicationService.js # Application CRUD operations
│   ├── components/
│   │   └── AdminApplication/
│   │       ├── AdminApplicationForm.js    # User application form
│   │       ├── AdminApplicationForm.css
│   │       ├── AdminReviewDashboard.js    # Admin review dashboard
│   │       └── AdminReviewDashboard.css
│   ├── App.js                       # Main app component
│   └── index.js                     # Entry point
├── docs/
│   └── DATABASE_SCHEMA.md           # Database structure
├── package.json                     # Dependencies
└── README.md                        # This file
```

---

## Deployment

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init
```
- Select "Hosting"
- Choose your Firebase project
- Build directory: `build`
- Single-page app: Yes
- GitHub deployment: No (optional)

4. Build the production app:
```bash
npm run build
```

5. Deploy to Firebase:
```bash
firebase deploy
```

Your app will be live at: `https://your-project-id.web.app`

---

## Git Workflow

### Initial Commit

```bash
git add .
git commit -m "feat: implement user story 3 - admin role application system"
git push origin main
```

### Feature Branch Workflow

```bash
# Create feature branch
git checkout -b feature/admin-applications

# Make changes and commit
git add .
git commit -m "feat: add admin application form component"

# Push to remote
git push origin feature/admin-applications

# Create pull request on GitHub
```

---

## Common Issues & Solutions

### Issue 1: Firebase Config Error
**Error:** `Firebase: Error (auth/invalid-api-key)`  
**Solution:** Double-check that you copied the entire `firebaseConfig` object correctly from Firebase Console

### Issue 2: Permission Denied
**Error:** `Missing or insufficient permissions`  
**Solution:** Ensure Firestore security rules are published correctly

### Issue 3: Index Required
**Error:** `The query requires an index`  
**Solution:** Click the link in the error message to auto-create the index, or manually create it in Firebase Console

### Issue 4: User Not Admin
**Error:** User can't access admin dashboard  
**Solution:** Verify the user document in Firestore has `role: "admin"`

---

## Security Considerations

1. **Never commit** `firebase.js` with real credentials to public repos
2. Use environment variables for sensitive data:
```javascript
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  // ... other config
};
```

3. Keep Firestore security rules strict
4. Implement rate limiting for application submissions
5. Add email verification before allowing applications

---

## Next Steps / Enhancements

1. **Email Notifications** - Send emails when applications are approved/rejected
2. **Application Withdrawal** - Allow users to withdraw pending applications
3. **Batch Operations** - Allow admins to approve/reject multiple applications
4. **Application Comments** - Allow admins to add comments before final decision
5. **Role Expiry** - Implement temporary admin roles with expiration dates
6. **Audit Log** - Track all admin actions with timestamps

---

## Support

For issues or questions:
- Check Firebase Console for error logs
- Review browser console for client-side errors
- Verify Firestore security rules
- Check that indexes are created

---

## License

This project is part of COMS3009A Software Design coursework.
