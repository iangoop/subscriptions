import { formatISO } from 'date-fns';
import { firestore, Identified } from '../firestore';
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

export const DATE_FORMAT = 'yyyy-MM-dd';

export type Subscription = {
  customerId: OneOfId;
  productId: OneOfProductId;
  quantity: number;
  shippingAddressId: OneOfId | undefined;
  billingAddressId: string;
  paymentMethodCode: string;
  status: SubscriptionStatus;
  schedule: string;
  scheduled: boolean;
  shippingMethodCode: string;
  paymentCode: string;
  couponCode?: string;
  useFixedPrice: boolean;
  currency?: string;
  fixedPrice: number;
  expirationDate?: string;
  recurringOrderCount: number;
  previousOrderDate?: string;
  nextOrderDate?: string;
  created?: string;
  updated?: string;
};

export type SubscriptionDb = {
  customerId: string;
  shippingAddressId: string;
  productId: string;
} & Omit<Subscription, 'customerId' | 'shippingAddressId' | 'productId'>;

export type SubscriptionApp = SubscriptionDb & Identified;

export type SubscriptionPlanning = {
  isEditable: boolean;
} & SubscriptionApp;

export type Delivery = {
  customerId: OneOfId;
  shippingAddressId: OneOfId | undefined;
  status: DeliveryStatus;
  paymentInfo: PaymentInfo[];
  created?: string;
  updated?: string;
};

export type PaymentInfo = {
  paymentCode: string;
  errorCode?: string;
  attemptCount?: number;
  deliveries: string[];
};

export type DeliveryDb = {
  customerId: string;
  shippingAddressId: string;
  nextOrderDate?: string;
} & Omit<Delivery, 'customerId' | 'shippingAddressId'>;

export type DeliveryApp = DeliveryDb & Identified;

export type OneOfId = {
  id?: string;
  platformId?: string;
};

export type OneOfProductId = {
  id?: string;
  sku?: string;
};

export type SubscriptionPayload = {
  subscriptions: Subscription[];
  deliveries: Delivery[];
};

export enum DeliveryStatus {
  Active = 'A',
  Retry = 'R',
  Failed = 'F',
  WaitingPayment = 'W',
  Processing = 'P',
  Shipped = 'S',
  Completed = 'C',
}

export enum SubscriptionStatus {
  Active = 'A',
  Paused = 'P',
  Expired = 'E',
}

export const deliveryDbConverter: FirestoreDataConverter<
  DeliveryApp,
  DeliveryDb
> = {
  toFirestore(delivery: DeliveryApp) {
    const { id, ...deliveryWithoutId } = delivery;
    return deliveryWithoutId as DeliveryDb;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): DeliveryApp {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      // Optionally, add type assertions or default values here if needed
    } as DeliveryApp;
  },
};

export const subscriptionDbConverter: FirestoreDataConverter<
  SubscriptionApp,
  SubscriptionDb
> = {
  toFirestore(delivery: SubscriptionApp): SubscriptionDb {
    const { id, ...deliveryWithoutId } = delivery;
    return deliveryWithoutId;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot<SubscriptionDb>,
  ): SubscriptionApp {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      // Optionally, add type assertions or default values here if needed
    };
  },
};
export const getActiveSubscriptions = async (
  customerId: string,
  shippingAddressId?: string,
): Promise<SubscriptionApp[]> => {
  let query = firestore
    .collection('subscriptions')
    .withConverter(subscriptionDbConverter)
    .where('customerId', '==', customerId)
    .where('status', '==', DeliveryStatus.Active);
  if (shippingAddressId !== undefined) {
    query = query.where('shippingAddressId', '==', shippingAddressId);
  }
  const result = await query.orderBy('nextOrderDate').get();

  return result.empty
    ? []
    : result.docs
        .map((doc) => {
          return doc.data();
        })
        .filter((subscription) => subscription.nextOrderDate !== undefined);
};
export const getNextActiveDeliveriesForCustomer = async (
  customerId: string,
  shippingAddressId?: string,
): Promise<DeliveryApp[]> => {
  let query = firestore
    .collection('deliveries')
    .withConverter(deliveryDbConverter)
    .where('customerId', '==', customerId)
    .where('status', '==', DeliveryStatus.Active);
  if (shippingAddressId !== undefined) {
    query = query.where('shippingAddressId', '==', shippingAddressId);
  }
  const result = await query.orderBy('nextOrderDate').get();

  return result.empty
    ? []
    : result.docs
        .map((doc) => {
          return doc.data();
        })
        .filter((delivery) => delivery.nextOrderDate !== undefined);
};

export const getDelivery = async (id: string) => {
  const delivery = await firestore
    .collection('deliveries')
    .withConverter(deliveryDbConverter)
    .doc(id)
    .get();
  return delivery.data();
};

export const updateDelivery = async (
  deliveryId: string,
  update: Partial<DeliveryDb>,
) => {
  const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
  return deliveryRef.update(update);
};

export const createDelivery = async (delivery: DeliveryDb): Promise<string> => {
  const deliveryRef = await firestore.collection('deliveries').add(delivery);
  return deliveryRef.id;
};

export const createDeliveryIfNotExists = async (
  delivery: DeliveryDb,
): Promise<boolean> => {
  const deliveryId = `${delivery.customerId}_${delivery.shippingAddressId}_${delivery.nextOrderDate}`;
  const deliveryRef = firestore.collection('deliveries').doc(deliveryId);

  return await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(deliveryRef);
    if (snap.exists) {
      return false;
    }
    const now = formatISO(Date.now());

    tx.set(
      deliveryRef,
      Object.assign({}, delivery, {
        created: now,
        updated: now,
      }),
    );

    return true;
  });
};

export const preparePaymentInfoChangesInDelivery = (
  delivery: DeliveryApp,
  subscriptionId: string,
  subscription: SubscriptionDb,
) => {
  if (
    !delivery.paymentInfo.find(
      (paymentInfo) => paymentInfo.paymentCode === subscription.paymentCode,
    )
  ) {
    delivery.paymentInfo.push({
      paymentCode: subscription.paymentCode,
      deliveries: [subscriptionId],
    });
  }
  return delivery.paymentInfo.map((paymentInfo) => {
    let deliverables;
    if (paymentInfo.paymentCode === subscription.paymentCode) {
      deliverables = (
        paymentInfo.deliveries.includes(subscriptionId) ? [] : [subscriptionId]
      ).concat(paymentInfo.deliveries);
    } else {
      deliverables = paymentInfo.deliveries.filter(
        (value) => value != subscriptionId,
      );
    }
    return Object.assign({}, paymentInfo, {
      deliveries: deliverables,
    });
  });
};

export const addSubscriptionInfoToDelivery = async (
  subscriptionId: string,
  subscription: SubscriptionDb,
) => {
  const deliveryId = `${subscription.customerId}_${subscription.shippingAddressId}_${subscription.nextOrderDate}`;
  const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(deliveryRef);
    if (!snap.exists) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    const delivery = snap.data() as DeliveryApp;

    const updatedPaymentInfo = preparePaymentInfoChangesInDelivery(
      delivery,
      subscriptionId,
      subscription,
    );

    tx.update(deliveryRef, {
      paymentInfo: updatedPaymentInfo,
      updated: formatISO(Date.now()),
    });
  });
};

export const persistSubscriptionToDelivery = async (
  subscriptionId: string,
  subscriptionData: SubscriptionDb,
) => {
  const wasCreated = await createDeliveryIfNotExists({
    customerId: subscriptionData.customerId,
    shippingAddressId: subscriptionData.shippingAddressId,
    nextOrderDate: subscriptionData.nextOrderDate,
    status: DeliveryStatus.Active,
    paymentInfo: [
      {
        paymentCode: subscriptionData.paymentCode,
        deliveries: [subscriptionId],
      },
    ],
  });
  if (!wasCreated) {
    await addSubscriptionInfoToDelivery(subscriptionId, subscriptionData);
  }
};

export const removeSubscriptionFromDelivery = async (
  deliveryId: string,
  subscriptionId: string,
) => {
  const deliveryRef = firestore.collection('deliveries').doc(deliveryId);
  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(deliveryRef);
    if (!snap.exists) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    const delivery = snap.data() as DeliveryApp;

    const paymentInfoList: PaymentInfo[] = [];
    delivery.paymentInfo.forEach((paymentInfo) => {
      paymentInfoList.push({
        ...paymentInfo,
        deliveries: (paymentInfo.deliveries = paymentInfo.deliveries.filter(
          (value) => value !== subscriptionId,
        )),
      });
    });

    tx.update(deliveryRef, {
      paymentInfo: paymentInfoList,
      updated: formatISO(Date.now()),
    });
  });
};

export const removeFromActiveDeliveries = async (
  subscriptionId: string,
  subscription: SubscriptionDb,
) => {
  const deliveries = await getNextActiveDeliveriesForCustomer(
    subscription.customerId,
    subscription.shippingAddressId,
  );
  return Promise.all(
    deliveries.flatMap(async (deliveryData) => {
      return Promise.all(
        deliveryData.paymentInfo
          .filter(
            (paymentInfo) =>
              paymentInfo.paymentCode === subscription.paymentCode,
          )
          .map(async (paymentInfo) => {
            if (paymentInfo.deliveries.includes(subscriptionId)) {
              return removeSubscriptionFromDelivery(
                deliveryData.id,
                subscriptionId,
              );
            }
            return null;
          }),
      );
    }),
  );
};

export const getSubscription = async (
  subscriptionId: string,
): Promise<SubscriptionApp | undefined> => {
  const result = await firestore
    .collection('subscriptions')
    .withConverter(subscriptionDbConverter)
    .doc(subscriptionId)
    .get();
  return result.exists ? result.data() : undefined;
};

export const getSubscriptions = async (
  subscriptionsIds: string[],
): Promise<SubscriptionApp[]> => {
  const collectionRef = firestore
    .collection('subscriptions')
    .withConverter(subscriptionDbConverter);
  const docRefs = subscriptionsIds.map((id) => collectionRef.doc(id));
  const snapshots = await firestore.getAll(...docRefs);

  return snapshots
    .filter((snap) => snap.exists)
    .map((snap) => snap.data() as SubscriptionApp);
};

export const updateSubscription = async (
  subscriptionId: string,
  update: Partial<SubscriptionDb>,
) => {
  const deliveryRef = firestore.collection('subscriptions').doc(subscriptionId);
  return deliveryRef.update(update);
};
