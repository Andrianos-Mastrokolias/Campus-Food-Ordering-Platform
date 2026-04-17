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

class VendorApplicationService {
  
  constructor() {
    this.collectionName = 'vendorApplications';
  }

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
        role: 'vendor',
        vendorProfile: {
          businessName: applicationData.businessName,
          businessDescription: applicationData.businessDescription,
          businessPhone: applicationData.businessPhone,
          businessAddress: applicationData.businessAddress,
          businessType: applicationData.businessType,
          verifiedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error approving vendor application:', error);
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
      console.error('Error rejecting vendor application:', error);
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

export default new VendorApplicationService();
