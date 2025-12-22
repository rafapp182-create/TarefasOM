
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole } from '../types';

export const createUserInFirestore = async (uid: string, email: string, name: string, role: UserRole) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      name,
      role,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Error writing user to firestore", error);
  }
};
