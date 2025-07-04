import { createConverter } from '@src/helpers/converters';
import { IDBSubscription, ISubscription } from '@src/models/Subscription';
import { FirestoreDataConverter } from 'firebase/firestore';

export const subscriptionConverter: FirestoreDataConverter<
  ISubscription,
  IDBSubscription
> = createConverter();
