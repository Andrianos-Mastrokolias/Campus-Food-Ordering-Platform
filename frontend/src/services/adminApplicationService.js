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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from "../firebase";

/**
 * Admin Application Service
 * Handles all admin role application operations
 */
class AdminApplicationService {
  
  constructor() {
    this.collectionName = 'adminApplications';
  }

  /**
   * Submit a new admin role application
   * @param {string} userId - ID of the user applying
   * @param {string} userEmail - Email of the user
   * @param {string} userName - Display name of the user
   * @param {string} currentRole - Current role of the user
   * @param {string} reason - Reason for wanting admin privileges
   * @returns {Promise<string>} Application ID
   */
  async submitApplication(userId, userEmail, userName, currentRole, reason) {
    try {
      // Check if user already has a pending application
      const existingApp = await this.getUserPendingApplication(userId);
      
      if (existingApp) {
        throw new Error('You already have a pending application');
      }

      // Create new application
      const applicationData = {
        userId,
        userEmail,
        userName,
        currentRole,
        reason,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null
      };

      const docRef = await addDoc(collection(db, this.collectionName), applicationData);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  }

  /**
   * Get all pending applications (for admins)
   * @returns {Promise<Array>} Array of pending applications
   */
  async getPendingApplications() {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const applications = [];

      querySnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return applications;
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      throw error;
    }
  }

  /**
   * Get all applications (for admins)
   * @returns {Promise<Array>} Array of all applications
   */
  async getAllApplications() {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const applications = [];

      querySnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return applications;
    } catch (error) {
      console.error('Error fetching all applications:', error);
      throw error;
    }
  }

  /**
   * Get applications by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of user's applications
   */
  async getUserApplications(userId) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const applications = [];

      querySnapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return applications;
    } catch (error) {
      console.error('Error fetching user applications:', error);
      throw error;
    }
  }

  /**
   * Get user's pending application if exists
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Pending application or null
   */
  async getUserPendingApplication(userId) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error checking pending application:', error);
      throw error;
    }
  }

  /**
   * Approve an admin application
   * @param {string} applicationId - Application ID
   * @param {string} reviewerId - ID of admin who approved
   * @param {string} reviewNotes - Optional review notes
   * @returns {Promise<void>}
   */
  async approveApplication(applicationId, reviewerId, reviewNotes = '') {
    try {
      const applicationRef = doc(db, this.collectionName, applicationId);
      const applicationDoc = await getDoc(applicationRef);

      if (!applicationDoc.exists()) {
        throw new Error('Application not found');
      }

      const applicationData = applicationDoc.data();

      // Update application status
      await updateDoc(applicationRef, {
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        reviewNotes,
        updatedAt: serverTimestamp()
      });

      // Update user role to admin
      const userRef = doc(db, 'users', applicationData.userId);
      await updateDoc(userRef, {
        role: 'admin',
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error approving application:', error);
      throw error;
    }
  }

  /**
   * Reject an admin application
   * @param {string} applicationId - Application ID
   * @param {string} reviewerId - ID of admin who rejected
   * @param {string} reviewNotes - Reason for rejection
   * @returns {Promise<void>}
   */
  async rejectApplication(applicationId, reviewerId, reviewNotes) {
    try {
      const applicationRef = doc(db, this.collectionName, applicationId);
      const applicationDoc = await getDoc(applicationRef);

      if (!applicationDoc.exists()) {
        throw new Error('Application not found');
      }

      // Update application status
      await updateDoc(applicationRef, {
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        reviewNotes,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error rejecting application:', error);
      throw error;
    }
  }

  /**
   * Get a single application by ID
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object>} Application data
   */
  async getApplicationById(applicationId) {
    try {
      const applicationRef = doc(db, this.collectionName, applicationId);
      const applicationDoc = await getDoc(applicationRef);

      if (!applicationDoc.exists()) {
        throw new Error('Application not found');
      }

      return {
        id: applicationDoc.id,
        ...applicationDoc.data()
      };
    } catch (error) {
      console.error('Error fetching application:', error);
      throw error;
    }
  }

  /**
   * Delete an application (admin only)
   * @param {string} applicationId - Application ID
   * @returns {Promise<void>}
   */
  async deleteApplication(applicationId) {
    try {
      const applicationRef = doc(db, this.collectionName, applicationId);
      await deleteDoc(applicationRef);
      return true;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  /**
   * Get application statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getApplicationStats() {
    try {
      const allApps = await this.getAllApplications();
      
      const stats = {
        total: allApps.length,
        pending: allApps.filter(app => app.status === 'pending').length,
        approved: allApps.filter(app => app.status === 'approved').length,
        rejected: allApps.filter(app => app.status === 'rejected').length
      };

      return stats;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }
}

export default new AdminApplicationService();
