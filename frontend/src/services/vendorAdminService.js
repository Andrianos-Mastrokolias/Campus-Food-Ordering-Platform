import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function fetchVendors() {
  const q = query(collection(db, "users"), where("role", "==", "vendor"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export async function approveVendor(vendorId) {
  const vendorRef = doc(db, "users", vendorId);
  await updateDoc(vendorRef, {
    status: "approved",
  });
}

export async function suspendVendor(vendorId) {
  const vendorRef = doc(db, "users", vendorId);
  await updateDoc(vendorRef, {
    status: "suspended",
  });
}