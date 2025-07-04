import { firestoreInstance } from '@src/configurations/firebase';
import { DeliveryCollection } from '@src/models/Delivery';
import {
  ISubscription,
  SubscriptionCollection,
} from '@src/models/Subscription';
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { deliveryConverter } from './converters/DeliveryConverter';
import { subscriptionConverter } from './converters/SubscriptionConverter';
import { subscriptionValidator } from './validators/SubscriptionValidator';
import { fetchNextScheduledDate } from './functions/SubscriptionFunction';

export class SubscriptionService {
  async createSubscriptionForProduct(subscription: ISubscription) {
    const validation = await subscriptionValidator.instantiable(subscription);
    if (!validation.isValid()) {
      validation.throwErrors();
    }
    const docRef = await addDoc(
      collection(firestoreInstance, SubscriptionCollection),
      subscription,
    );
    docRef.withConverter(subscriptionConverter);
    return getDoc(docRef);
  }

  async skipSubscription(subscriptionId: string): Promise<boolean> {
    const docRef = doc(
      collection(firestoreInstance, SubscriptionCollection),
      subscriptionId,
    ).withConverter(subscriptionConverter);
    const docSnapshot = await getDoc(docRef);
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      if (data.nextOrderDate) {
        const nextOrderDate = await fetchNextScheduledDate(
          data.nextOrderDate,
          data.schedule,
        );
        await updateDoc(docRef, {
          nextOrderDate: nextOrderDate,
          scheduled: false,
        });
        return true;
      }
    }
    return false;
  }

  getDeliveryCollection() {
    return collection(firestoreInstance, DeliveryCollection).withConverter(
      deliveryConverter,
    );
  }

  getSubscriptionCollection() {
    return collection(firestoreInstance, SubscriptionCollection).withConverter(
      subscriptionConverter,
    );
  }
}
