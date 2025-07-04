import { FirestoreDataConverter } from 'firebase/firestore';
import { ICustomer, IDBCustomer } from '@src/models/Customer';
import { createConverter } from '@src/helpers/converters';
export const customerConverter: FirestoreDataConverter<ICustomer, IDBCustomer> =
  createConverter();
