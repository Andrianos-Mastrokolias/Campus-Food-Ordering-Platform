# Firebase Firestore Database Schema

## Collections

### 1. users
Stores user profile information and role assignments.

```
users/{userId}
  - email: string
  - displayName: string
  - role: string (enum: "student", "vendor", "admin")
  - createdAt: timestamp
  - updatedAt: timestamp
  - isActive: boolean
```

### 2. adminApplications
Stores admin role applications submitted by users.

```
adminApplications/{applicationId}
  - userId: string (reference to users collection)
  - userEmail: string
  - userName: string
  - currentRole: string
  - reason: string (why they want to be admin)
  - status: string (enum: "pending", "approved", "rejected")
  - createdAt: timestamp
  - updatedAt: timestamp
  - reviewedBy: string | null (userId of admin who reviewed)
  - reviewedAt: timestamp | null
  - reviewNotes: string | null
```

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Admin Applications collection
    match /adminApplications/{applicationId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
                      request.resource.data.userId == request.auth.uid &&
                      request.resource.data.status == 'pending';
      allow update: if isAdmin(); // Only admins can approve/reject
      allow delete: if isAdmin();
    }
  }
}
```

## Indexes Required

1. **adminApplications**
   - Field: status (Ascending)
   - Field: createdAt (Descending)

2. **adminApplications**
   - Field: userId (Ascending)
   - Field: createdAt (Descending)

### 3. payments (US5 — Student Payments)
Stores all payment transactions.

```
payments/{paymentId}
  - userId:         string   (reference to users collection)
  - userEmail:      string
  - userName:       string
  - orderId:        string   (e.g. CF-ABC123-XY)
  - amount:         number   (ZAR, e.g. 180.00)
  - method:         string   (enum: "upi" | "card" | "eft" | "wallet")
  - items:          array    [{ name, qty, price }]
  - status:         string   (enum: "pending" | "processing" | "success" | "failed" | "cancelled")
  - createdAt:      timestamp
  - updatedAt:      timestamp
  - processedAt:    timestamp | null
  - transactionRef: string | null  (e.g. TXN-18xyz or UPI-18xyz)
  - failureReason:  string | null
```

**Security rules additions for payments:**
```javascript
match /payments/{paymentId} {
  allow read:   if isAuthenticated() &&
                   (resource.data.userId == request.auth.uid || isAdmin());
  allow create: if isAuthenticated() &&
                   request.resource.data.userId == request.auth.uid &&
                   request.resource.data.status == 'pending';
  allow update: if isAuthenticated() &&
                   resource.data.userId == request.auth.uid;
  allow delete: if isAdmin();
}
```

**Indexes required for payments:**
- Field: userId (Ascending) + createdAt (Descending)
- Field: status (Ascending) + createdAt (Descending)
