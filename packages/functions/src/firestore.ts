import { Timestamp } from 'firebase-admin/firestore';
import { admin } from './admin';

const firestore = admin.firestore();

export type Identified = {
  id: string;
};

export type TimestampedApp = {
  created?: string;
  updated?: string;
};

export type TimestampedDb = {
  created?: Timestamp;
  updated?: Timestamp;
};

export type TimestampedWriteDb = {
  created?: FirebaseFirestore.FieldValue;
  updated?: FirebaseFirestore.FieldValue;
};

if (process.env.NODE_ENV === 'development') {
  firestore.settings({
    host: 'localhost:8080',
    ssl: false,
  });
}

export { firestore };
