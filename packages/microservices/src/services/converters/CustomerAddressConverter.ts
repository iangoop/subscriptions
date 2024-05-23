import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  doc,
  DocumentReference,
} from 'firebase/firestore';
import {
  ICustomerAddress,
  IDBCustomerAddress,
} from '@src/models/CustomerAddress';
import { firestoreInstance } from '@src/configurations/firebase';

export const customerAddressConverter: FirestoreDataConverter<ICustomerAddress> =
  {
    toFirestore(customer: ICustomerAddress): DocumentData {
      const document = Object.assign({}, customer) as DocumentData;
      const customerReference = doc(
        firestoreInstance,
        'customers',
        customer.customerId.toString(),
      );
      document.customerId = customerReference;
      return document;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot<IDBCustomerAddress>,
      options: SnapshotOptions,
    ): ICustomerAddress {
      const data = snapshot.data(options);
      if (data.customerId instanceof DocumentReference) {
        data.customerId = data.customerId.id;
      }

      return data as ICustomerAddress;
    },
  };
