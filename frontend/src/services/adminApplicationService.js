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
 * Handles admin access applications and the admin approval workflow.
 * Approved users are promoted to the admin role and marked as approved.
 */
class AdminApplicationService {
  constructor() {
    this.collectionName = 'adminApplications';
  }

  /**
   * Submits a new admin access request.
   * Prevents duplicate pending requests for the same user.
   */
  async submitApplication(userId, userEmail, userName, currentRole, reason) {
    try {
      const existingApp = await this.getUserPendingApplication(userId);

      if (existingApp) {
        throw new Error('You already have a pending application');
      }

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
   * Returns all pending admin applications for review.
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

      querySnapshot.forEach((docSnapshot) => {
        applications.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });

      return applications;
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      throw error;
    }
  }

  /**
   * Returns all admin applications.
   */
  async getAllApplications() {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const applications = [];

      querySnapshot.forEach((docSnapshot) => {
        applications.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });

      return applications;
    } catch (error) {
      console.error('Error fetching all applications:', error);
      throw error;
    }
  }

  /**
   * Returns all admin applications submitted by a specific user.
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

      querySnapshot.forEach((docSnapshot) => {
        applications.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });

      return applications;
    } catch (error) {
      console.error('Error fetching user applications:', error);
      throw error;
    }
  }

  /**
   * Checks whether the user already has a pending admin request.
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

      const firstApplication = querySnapshot.docs[0];
      return {
        id: firstApplication.id,
        ...firstApplication.data()
      };
    } catch (error) {
      console.error('Error checking pending application:', error);
      throw error;
    }
  }

  /**
   * Approves an admin application.
   * The user is granted the admin role and marked as approved,
   * which allows access to protected admin pages.
   */
  async approveApplication(applicationId, reviewerId, reviewNotes = '') {
    try {
      const applicationRef = doc(db, this.collectionName, applicationId);
      const applicationDoc = await getDoc(applicationRef);

      if (!applicationDoc.exists()) {
        throw new Error('Application not found');
      }

      const applicationData = applicationDoc.data();

      // Update the application status and review details.
      await updateDoc(applicationRef, {
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        reviewNotes,
        updatedAt: serverTimestamp()
      });

      // Promote the user to an approved admin.
      const userRef = doc(db, 'users', applicationData.userId);
      await updateDoc(userRef, {
        role: 'admin',
        status: 'approved',
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error approving application:', error);
      throw error;
    }
  }

  /**
   * Rejects an admin application and stores the review outcome.
   */
  async rejectApplication(applicationId, reviewerId, reviewNotes) {
    try {
      const applicationRef = doc(db, this.collectionName, applicationId);
      const applicationDoc = await getDoc(applicationRef);

      if (!applicationDoc.exists()) {
        throw new Error('Application not found');
      }

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
   * Returns summary counts used in the admin applications page.
   */
  async getApplicationStats() {
    try {
      const allApps = await this.getAllApplications();

      return {
        total: allApps.length,
        pending: allApps.filter(app => app.status === 'pending').length,
        approved: allApps.filter(app => app.status === 'approved').length,
        rejected: allApps.filter(app => app.status === 'rejected').length
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }
}

export default new AdminApplicationService();