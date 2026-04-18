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

class AdminApplicationService {
  
  constructor() {
    this.collectionName = 'adminApplications';
  }

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

  async approveApplication(applicationId, reviewerId, reviewNotes = '') {
    try {
      const applicationRef = doc(db, this.collectionName, applicationId);
      const applicationDoc = await getDoc(applicationRef);

      if (!applicationDoc.exists()) {
        throw new Error('Application not found');
      }

      const applicationData = applicationDoc.data();

      await updateDoc(applicationRef, {
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        reviewNotes,
        updatedAt: serverTimestamp()
      });

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
