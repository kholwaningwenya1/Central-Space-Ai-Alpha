import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { AppNotification } from '../types';

export const createNotification = async (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => {
  const id = Math.random().toString(36).substring(2, 15);
  const newNotification: AppNotification = {
    ...notification,
    id,
    timestamp: Date.now(),
    isRead: false
  };

  try {
    await setDoc(doc(db, 'notifications', id), newNotification);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${id}`);
  }
};

export const markNotificationAsRead = async (id: string) => {
  try {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
  }
};

export const deleteNotification = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: AppNotification[]) => void) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => doc.data() as AppNotification);
    callback(notifications);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  });
};
