import { createConverter } from '@src/helpers/converters';
import { IDBDelivery, IDelivery } from '@src/models/Delivery';
import { FirestoreDataConverter } from 'firebase/firestore';

export const deliveryConverter: FirestoreDataConverter<IDelivery, IDBDelivery> =
  createConverter();
