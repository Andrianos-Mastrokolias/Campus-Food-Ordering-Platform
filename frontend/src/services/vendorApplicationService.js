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
import { db } from '../firebase.jsx';

/**
 * Handles vendor application submission, review, and approval.
 * This service is responsible for generating a unique shop number
 * and updating both the application and user records on approval.
 */
class VendorApplicationService {
  constructor() {
    this.collectionName = 'vendorApplications';
  }

  /**
   * Generates a unique shop number for each approved vendor.
   * The value is based on the current date, userId, and applicationId.
   */
  generateShopNumber(applicationId, userId) {
    const safeApplicationId = (applicationId || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase();

    const safeUserId = (userId || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    return `SHOP-${datePart}-${safeUserId}-${safeApplicationId}`;
  }

  /**
   * Builds the vendor profile object that is stored on the approved user record.
   */
  buildVendorProfile(applicationData, shopNumber) {
    return {
      businessName: applicationData.businessName,
      businessDescription: applicationData.businessDescription,
      businessPhone: applicationData.businessPhone,
      businessAddress: applicationData.businessAddress,
      businessType: applicationData.businessType,
      shopNumber,
      verifiedAt: serverTimestamp()
    };
  }

  /**
   * Submits a new vendor application.
   * Prevents a user from submitting another application while one is still pending.
   */
  async submitApplication(userId, userEmail, userName, businessData) {
    try {
      const existingApp = await this.getUserPendingApplication(userId);

      if (existingApp) {
        throw new Error('You already have a pending vendor application');
      }

      const applicationData = {
        userId,
        userEmail,
        userName,
        businessName: businessData.businessName,
        businessDescription: businessData.businessDescription,
        businessPhone: businessData.businessPhone,
        businessAddress: businessData.businessAddress,
        businessType: businessData.businessType,
        documents: [],
        status: 'pending',
        shopNumber: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null
      };

      const docRef = await addDoc(collection(db, this.collectionName), applicationData);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting vendor application:', error);
      throw error;
    }
  }

  /**
   * Returns only vendor applications that are still waiting for review.
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
   * Returns all vendor applications for admin review.
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
   * Returns all applications submitted by a specific user.
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
   * Checks whether a user already has a pending vendor application.
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
   * Approves a vendor application.
   * This updates both:
   * 1. the vendor application record
   * 2. the user record
   *
   * The user only becomes a valid vendor after role, status, and shop number
   * have all been written successfully.
   */
  async approveApplication(applicationId, reviewerId, reviewNotes = '') {
    try {
      const applicationRef = doc(db, this.collectionName, applicationId);
      const applicationDoc = await getDoc(applicationRef);

      if (!applicationDoc.exists()) {
        throw new Error('Application not found');
      }

      const applicationData = applicationDoc.data();

      // Generate a shop number if one has not already been assigned.
      const shopNumber =
        applicationData.shopNumber ||
        this.generateShopNumber(applicationId, applicationData.userId);

      // Update the vendor application with its final approval details.
      await updateDoc(applicationRef, {
        status: 'approved',
        shopNumber,
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        reviewNotes,
        updatedAt: serverTimestamp()
      });

      // Update the user so they can access the vendor dashboard.
      const userRef = doc(db, 'users', applicationData.userId);
      await updateDoc(userRef, {
        role: 'vendor',
        status: 'approved',
        shopNumber,
        vendorProfile: this.buildVendorProfile(applicationData, shopNumber),
        updatedAt: serverTimestamp()
      });

      return shopNumber;
    } catch (error) {
      console.error('Error approving vendor application:', error);
      throw error;
    }
  }

  /**
   * Rejects a vendor application and stores the reviewer details.
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
      console.error('Error rejecting vendor application:', error);
      throw error;
    }
  }

  /**
   * Returns simple summary stats for the admin dashboard cards and filters.
   */
  async getApplicationStats() {
    try {
      const allApps = await this.getAllApplications();

      return {
        total: allApps.length,
        pending: allApps.filter((app) => app.status === 'pending').length,
        approved: allApps.filter((app) => app.status === 'approved').length,
        rejected: allApps.filter((app) => app.status === 'rejected').length
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }
}

export default new VendorApplicationService();