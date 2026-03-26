import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore';
import {
  Identified,
  TimestampedApp,
  TimestampedDb,
  TimestampedWriteDb,
} from '../../firestore';

export type SubscriptionData = {
  quantity: number;
  oneOf: boolean;
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
  orderDate?: string;
};

export type Subscription = {
  customerId: OneOfId;
  productId: OneOfProductId;
  shippingAddressId: OneOfId | undefined;
};

export type SubscriptionKey = {
  customerId: string;
  shippingAddressId: string;
  productId: string;
};

export type SubscriptionDb = SubscriptionData & SubscriptionKey & TimestampedDb;
export type SubscriptionWriteDb = SubscriptionData &
  SubscriptionKey &
  TimestampedWriteDb;

export type SubscriptionApp = SubscriptionData &
  SubscriptionKey &
  Identified &
  TimestampedApp;

export type Delivery = {
  customerId: OneOfId;
  shippingAddressId: OneOfId | undefined;
  status: DeliveryStatus;
  paymentInfo: PaymentInfo[];
  subscriptionsCount?: number;
  subscriptionsScheduledCount?: number;
  created?: string;
  updated?: string;
};

export type PaymentInfo = {
  paymentCode: string;
  errorCode?: string;
  attemptCount?: number;
  deliveries: string[];
};

export type DeliveryKey = {
  customerId: string;
  shippingAddressId: string;
  orderDate: string;
};

export type DeliveryDb = {
  isFirstDelivery?: boolean;
} & DeliveryKey &
  Omit<Delivery, 'customerId' | 'shippingAddressId'>;

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
  Ready = 'R',
  Paused = 'P',
  Expired = 'E',
  OnGoing = 'O',
  Completed = 'C',
  NotScheduled = 'N',
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
  toFirestore(subscription: SubscriptionApp): SubscriptionWriteDb {
    const created = subscription.created
      ? Timestamp.fromDate(new Date(subscription.created))
      : undefined;
    const updated = subscription.updated
      ? Timestamp.fromDate(new Date(subscription.updated))
      : undefined;
    const { id, ...deliveryWithoutId } = { ...subscription, created, updated };
    return deliveryWithoutId;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot<SubscriptionDb>,
  ): SubscriptionApp {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      created: data.created ? data.created.toDate().toISOString() : undefined,
      updated: data.updated ? data.updated.toDate().toISOString() : undefined,
    };
  },
};
