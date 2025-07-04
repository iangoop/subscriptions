import { onDocumentDeleted } from 'firebase-functions/firestore';
import { firestore } from '../../firestore';

export const onDeleteArchive = onDocumentDeleted(
  '/customers/{documentId}',
  async (event) => {
    const snap = event.data;
    if (snap) {
      return firestore
        .collection('customersDeleted')
        .doc(snap.id)
        .set(snap.data());
    }
    return null;
  },
);
