import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import { ICustomer, IDBCustomer } from '@src/models/Customer';

export const customerConverter: FirestoreDataConverter<ICustomer> = {
  toFirestore(customer: ICustomer): IDBCustomer {
    return customer;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot<IDBCustomer>,
    options: SnapshotOptions,
  ): ICustomer {
    const data = snapshot.data(options);
    return data as ICustomer;
  },
};
