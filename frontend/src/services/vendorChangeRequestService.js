import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase.jsx';
import notificationService from './notificationService';

/**
 * Handles vendor requests to change approved shop details.
 */
class VendorChangeRequestService {
  constructor() {
    this.collectionName = 'vendorChangeRequests';
  }

  async submitRequest(vendorId, vendorEmail, vendorName, currentProfile, requestedProfile) {
    const requestData = {
      vendorId,
      vendorEmail,
      vendorName,
      currentProfile: currentProfile || {},
      requestedProfile,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: ''
    };

    const docRef = await addDoc(collection(db, this.collectionName), requestData);

    await notificationService.sendAdminVendorChangeRequestEmail({
      id: docRef.id,
      ...requestData
    });

    return docRef.id;
  }

  async getAllRequests() {
    const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    }));
  }

  async getPendingRequests() {
    const q = query(
      collection(db, this.collectionName),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    }));
  }

  async getVendorRequests(vendorId) {
  const q = query(
    collection(db, this.collectionName),
    where('vendorId', '==', vendorId)
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs
    .map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    }))
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
}

  async approveRequest(requestId, reviewerId, reviewNotes = '') {
    const requestRef = doc(db, this.collectionName, requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Vendor change request not found');
    }

    const requestData = requestSnap.data();

    const userRef = doc(db, 'users', requestData.vendorId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('Vendor user not found');
    }

    const userData = userSnap.data();
    const currentVendorProfile = userData.vendorProfile || {};

    const updatedVendorProfile = {
      ...currentVendorProfile,
      ...requestData.requestedProfile,
      updatedAt: serverTimestamp()
    };

    await updateDoc(userRef, {
      vendorProfile: updatedVendorProfile,
      updatedAt: serverTimestamp()
    });

    await updateDoc(requestRef, {
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
      reviewNotes,
      updatedAt: serverTimestamp()
    });

    return true;
  }

  async rejectRequest(requestId, reviewerId, reviewNotes = '') {
    const requestRef = doc(db, this.collectionName, requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Vendor change request not found');
    }

    await updateDoc(requestRef, {
      status: 'rejected',
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
      reviewNotes,
      updatedAt: serverTimestamp()
    });

    return true;
  }
}

export default new VendorChangeRequestService();