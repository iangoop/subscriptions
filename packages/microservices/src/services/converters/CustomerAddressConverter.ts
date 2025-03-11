import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import {
  ICustomerAddress,
  IDBCustomerAddress,
} from '@src/models/CustomerAddress';

export const customerAddressConverter: FirestoreDataConverter<ICustomerAddress> =
  {
    toFirestore(customer: ICustomerAddress): DocumentData {
      const document = Object.assign({}, customer) as DocumentData;
      return document;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot<IDBCustomerAddress>,
      options: SnapshotOptions,
    ): ICustomerAddress {
      const data = snapshot.data(options);
      return data as ICustomerAddress;
    },
  };
