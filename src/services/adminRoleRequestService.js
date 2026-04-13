// adminRoleRequestService.js
// Firebase service for admin role request operations

import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const REQUESTS_COLLECTION = 'adminRoleRequests';
const USERS_COLLECTION = 'users';
const ACTIVITY_LOG_COLLECTION = 'adminActivityLog';

// ===========================
// USER FUNCTIONS (UAT1)
// ===========================

/**
 * Submit a request for admin access
 * UAT1: User submits request which is saved in Firebase
 */
export const submitAdminRequest = async (userId, userName, userEmail, reason) => {
  try {
    // Validate reason length
    if (!reason || reason.trim().length < 20) {
      throw new Error('Request reason must be at least 20 characters long');
    }

    // Check if user already has a pending request
    const existingRequest = await checkPendingRequest(userId);
    if (existingRequest) {
      throw new Error('You already have a pending admin access request');
    }

    // Check if user is already an admin
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (userDoc.exists() && userDoc.data().role === 'Admin') {
      throw new Error('You are already an admin');
    }

    // Create the request
    const requestData = {
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      requestReason: reason.trim(),
      status: 'Pending', // Pending, Approved, Rejected
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null
    };

    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), requestData);

    return {
      success: true,
      message: 'Admin access request submitted successfully',
      requestId: docRef.id
    };
  } catch (error) {
    console.error('Error submitting admin request:', error);
    throw error;
  }
};

/**
 * Check if user has a pending request
 */
export const checkPendingRequest = async (userId) => {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'Pending')
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty ? querySnapshot.docs[0] : null;
  } catch (error) {
    console.error('Error checking pending request:', error);
    throw error;
  }
};

/**
 * Get all requests for a specific user
 */
export const getUserRequests = async (userId) => {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching user requests:', error);
    throw error;
  }
};

/**
 * Cancel a pending request
 */
export const cancelRequest = async (requestId, userId) => {
  try {
    const requestDoc = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
    
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestDoc.data();
    
    // Verify ownership
    if (requestData.userId !== userId) {
      throw new Error('Unauthorized: You can only cancel your own requests');
    }
    
    // Verify status is pending
    if (requestData.status !== 'Pending') {
      throw new Error('Only pending requests can be cancelled');
    }
    
    // Update status to cancelled
    await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
      status: 'Cancelled',
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Request cancelled successfully'
    };
  } catch (error) {
    console.error('Error cancelling request:', error);
    throw error;
  }
};

// ===========================
// ADMIN FUNCTIONS (UAT2)
// ===========================

/**
 * Get all pending admin requests
 */
export const getPendingRequests = async () => {
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('status', '==', 'Pending'),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        daysPending: data.createdAt ? 
          Math.floor((new Date() - data.createdAt.toDate()) / (1000 * 60 * 60 * 24)) : 0
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    throw error;
  }
};

/**
 * Get all admin requests (with optional status filter)
 */
export const getAllRequests = async (statusFilter = null) => {
  try {
    let q;
    
    if (statusFilter) {
      q = query(
        collection(db, REQUESTS_COLLECTION),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, REQUESTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        reviewedAt: data.reviewedAt?.toDate()
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching all requests:', error);
    throw error;
  }
};

/**
 * Approve admin request
 * UAT2: Admin approves request and user role is updated to Admin
 */
export const approveAdminRequest = async (requestId, adminUserId, adminName, notes = '') => {
  try {
    // Get the request
    const requestDoc = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
    
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestDoc.data();
    
    // Verify status is pending
    if (requestData.status !== 'Pending') {
      throw new Error(`Request has already been ${requestData.status.toLowerCase()}`);
    }
    
    // Update the request status
    await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
      status: 'Approved',
      reviewedBy: adminUserId,
      reviewedByName: adminName,
      reviewedAt: serverTimestamp(),
      reviewNotes: notes || null,
      updatedAt: serverTimestamp()
    });
    
    // Update user role to Admin in users collection
    await updateDoc(doc(db, USERS_COLLECTION, requestData.userId), {
      role: 'Admin',
      updatedAt: serverTimestamp()
    });
    
    // Log the activity
    await addDoc(collection(db, ACTIVITY_LOG_COLLECTION), {
      adminUserId: adminUserId,
      adminName: adminName,
      actionType: 'Request_Approved',
      targetUserId: requestData.userId,
      targetUserName: requestData.userName,
      description: `Approved admin access request for ${requestData.userName} (${requestData.userEmail})`,
      createdAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Admin access request approved successfully',
      userId: requestData.userId,
      newRole: 'Admin'
    };
  } catch (error) {
    console.error('Error approving request:', error);
    throw error;
  }
};

/**
 * Reject admin request
 */
export const rejectAdminRequest = async (requestId, adminUserId, adminName, rejectionReason) => {
  try {
    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      throw new Error('Rejection reason must be at least 10 characters long');
    }
    
    // Get the request
    const requestDoc = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
    
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestDoc.data();
    
    // Verify status is pending
    if (requestData.status !== 'Pending') {
      throw new Error(`Request has already been ${requestData.status.toLowerCase()}`);
    }
    
    // Update the request status
    await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
      status: 'Rejected',
      reviewedBy: adminUserId,
      reviewedByName: adminName,
      reviewedAt: serverTimestamp(),
      reviewNotes: rejectionReason.trim(),
      updatedAt: serverTimestamp()
    });
    
    // Log the activity
    await addDoc(collection(db, ACTIVITY_LOG_COLLECTION), {
      adminUserId: adminUserId,
      adminName: adminName,
      actionType: 'Request_Rejected',
      targetUserId: requestData.userId,
      targetUserName: requestData.userName,
      description: `Rejected admin access request for ${requestData.userName}. Reason: ${rejectionReason.trim()}`,
      createdAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Admin access request rejected'
    };
  } catch (error) {
    console.error('Error rejecting request:', error);
    throw error;
  }
};

/**
 * Get admin activity log
 */
export const getActivityLog = async (limit = 50) => {
  try {
    const q = query(
      collection(db, ACTIVITY_LOG_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const logs = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()
      });
    });
    
    return logs.slice(0, limit);
  } catch (error) {
    console.error('Error fetching activity log:', error);
    throw error;
  }
};

export default {
  submitAdminRequest,
  checkPendingRequest,
  getUserRequests,
  cancelRequest,
  getPendingRequests,
  getAllRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getActivityLog
};
