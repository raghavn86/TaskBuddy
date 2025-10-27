import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  arrayUnion, 
  arrayRemove, 
  runTransaction 
} from 'firebase/firestore';
import { db } from './config';

export const firestoreService = {
  db,
  collection: (path: string) => collection(db, path),
  doc: (collection: any, id: string) => doc(collection, id),
  setDoc: (ref: any, data: any) => setDoc(ref, data),
  getDoc: (ref: any) => getDoc(ref),
  updateDoc: (ref: any, data: any) => updateDoc(ref, data),
  deleteDoc: (ref: any) => deleteDoc(ref),
  query: (collection: any, ...constraints: any[]) => query(collection, ...constraints),
  where: (field: string, op: any, value: any) => where(field, op, value),
  getDocs: (query: any) => getDocs(query),
  addDoc: (collection: any, data: any) => addDoc(collection, data),
  arrayUnion: (...elements: any[]) => arrayUnion(...elements),
  arrayRemove: (...elements: any[]) => arrayRemove(...elements),
  runTransaction: (fn: any) => runTransaction(db, fn),
};
