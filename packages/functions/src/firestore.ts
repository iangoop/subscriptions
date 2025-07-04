import { admin } from './admin';

const firestore = admin.firestore();

export type Identified = {
  id: string;
};

if (process.env.NODE_ENV === 'development') {
  firestore.settings({
    host: 'localhost:8080',
    ssl: false,
  });
}

export { firestore };
