import {
  doc,
  DocumentData,
  DocumentReference,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import {
  CustomerCollection,
  ICustomer,
  IDBCustomer,
} from '@src/models/Customer';
import { firestoreInstance } from '@src/configurations/firebase';

export const customerConverter: FirestoreDataConverter<ICustomer> = {
  toFirestore(customer: ICustomer): DocumentData {
    const document = Object.assign({}, customer) as IDBCustomer;
    if (customer.defaultAddressId) {
      document.defaultAddressId = doc(
        firestoreInstance,
        CustomerCollection,
        customer.defaultAddressId.toString(),
      );
    }
    if (customer.defaultBillingAddressId) {
      document.defaultBillingAddressId = doc(
        firestoreInstance,
        CustomerCollection,
        customer.defaultBillingAddressId.toString(),
      );
    }
    if (customer.defaultShippingAddressId) {
      document.defaultShippingAddressId = doc(
        firestoreInstance,
        CustomerCollection,
        customer.defaultShippingAddressId.toString(),
      );
    }
    return customer;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot<IDBCustomer>,
    options: SnapshotOptions,
  ): ICustomer {
    const data = snapshot.data(options);
    if (data.defaultAddressId instanceof DocumentReference) {
      data.defaultAddressId = data.defaultAddressId.id;
    }
    if (data.defaultBillingAddressId instanceof DocumentReference) {
      data.defaultBillingAddressId = data.defaultBillingAddressId.id;
    }
    if (data.defaultShippingAddressId instanceof DocumentReference) {
      data.defaultShippingAddressId = data.defaultShippingAddressId.id;
    }
    return data as ICustomer;
  },
};
