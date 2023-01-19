import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onDeleteArchive = functions.firestore
  .document('/customers/{documentId}')
  .onDelete((snap, context) => {
    return admin
      .firestore()
      .collection('customersDeleted')
      .doc(snap.id)
      .set(snap.data());
  });
