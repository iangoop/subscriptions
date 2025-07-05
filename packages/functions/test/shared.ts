import testEnv from 'firebase-functions-test';
import {
  DeliveryDb,
  SubscriptionDb,
  DeliveryApp,
  SubscriptionApp,
} from '../src/db/subscriptions';
import * as subscriptionsFns from '../src/db/subscriptions';
import {
  processDelivery,
  processSubscriptionTransaction,
} from '../src/db/events/subscriptions.f';
import { DocumentSnapshot, WriteResult } from 'firebase-admin/firestore';
import { Change } from 'firebase-functions/core';

export const BASE_DATE = '2025-06-07';
export enum SampleIds {
  subscription1Id = 'sub_001',
  subscription2Id = 'sub_002',
  subscription3Id = 'sub_003',
  subscription4Id = 'sub_004',
  customer1Id = 'cust_001',
  customer2Id = 'cust_002',
  address1Id = 'addr_001',
  address2Id = 'addr_002',
  address3Id = 'addr_003',
  address4Id = 'addr_004',
  product1Id = 'prod_001',
  product2Id = 'prod_002',
  product3Id = 'prod_003',
  product4Id = 'prod_004',
  delivery1Id = 'del_001',
  delivery2Id = 'del_002',
  delivery3Id = 'del_003',
}
export const fft = testEnv({
  projectId: process.env.CUSTOM_FIREBASE_PROJECTID, // match what's in your firebase.json
  storageBucket: process.env.CUSTOM_FIREBASE_STORAGEBUCKET,
});

export const makeDocumentSnapshot = (
  id: string,
  path: string,
  beforeData: Record<string, unknown>,
  afterData: Record<string, unknown>,
) => {
  const beforeSnap = fft.firestore.makeDocumentSnapshot(
    beforeData,
    `${path}/${id}`,
  ) as DocumentSnapshot;
  const afterSnap = fft.firestore.makeDocumentSnapshot(
    afterData,
    `${path}/${id}`,
  ) as DocumentSnapshot;

  return {
    before: beforeSnap,
    after: afterSnap,
  };
};

export async function processSubscriptionEvent(
  subscriptionId: string,
  data: Partial<SubscriptionDb>,
  before?: Partial<SubscriptionDb>,
) {
  const event = makeDocumentSnapshot(
    subscriptionId,
    'subscriptions',
    before ? before : {},
    data,
  );
  return processSubscriptionTransaction(event as Change<DocumentSnapshot>);
}

export async function processDeliveryEvent(
  deliveryId: string,
  data: Partial<DeliveryDb>,
  before?: Partial<DeliveryDb>,
) {
  const event = makeDocumentSnapshot(
    deliveryId,
    'deliveries',
    before ? before : {},
    data,
  );
  return processDelivery(event as Change<DocumentSnapshot>);
}

export function makeSubData(
  overrides: Partial<SubscriptionApp> = {},
): SubscriptionApp {
  return {
    customerId: SampleIds.customer1Id,
    shippingAddressId: SampleIds.address1Id,
    paymentCode: 'abcd',
    productId: SampleIds.product1Id,
    quantity: 1,
    schedule: '1M',
    status: 'A',
    shippingMethodCode: 'nextday',
    ...overrides,
  } as SubscriptionApp;
}

export function makeDeliveryData(
  overrides: Partial<DeliveryApp> = {},
): DeliveryApp {
  return {
    id: SampleIds.delivery1Id,
    customerId: SampleIds.customer1Id,
    shippingAddressId: SampleIds.address1Id,
    status: subscriptionsFns.DeliveryStatus.Active,
    paymentInfo: [],
    ...overrides,
  };
}

export function getNextActiveDeliveriesForCustomer(
  deliveries: DeliveryApp[],
  customerId: string,
  shippingAddressId?: string,
) {
  return deliveries
    .slice() // avoid in-place sort
    .filter((delivery) => {
      return (
        (shippingAddressId === undefined ||
          delivery.shippingAddressId === shippingAddressId) &&
        delivery.customerId === customerId &&
        delivery.status == subscriptionsFns.DeliveryStatus.Active
      );
    })
    .sort((a, b) => {
      const aDate = new Date(a.nextOrderDate!);
      const bDate = new Date(b.nextOrderDate!);
      return aDate.getTime() - bDate.getTime();
    });
}

export function mockDeliveryDbActions(
  deliveries: DeliveryApp[],
  subscriptions: SubscriptionApp[],
) {
  const nextActiveDeliveries = jest
    .spyOn(subscriptionsFns, 'getNextActiveDeliveriesForCustomer')
    .mockImplementation(
      async (customerId: string, shippingAddressId?: string) => {
        return Promise.resolve(
          getNextActiveDeliveriesForCustomer(
            deliveries,
            customerId,
            shippingAddressId,
          ),
        );
      },
    );

  const getActiveSubscriptions = jest
    .spyOn(subscriptionsFns, 'getActiveSubscriptions')
    .mockImplementation(
      async (customerId: string, shippingAddressId?: string) => {
        return Promise.resolve(
          subscriptions.filter((subscription) => {
            return (
              subscription.customerId === customerId &&
              (shippingAddressId === undefined ||
                subscription.shippingAddressId === shippingAddressId) &&
              subscription.status === subscriptionsFns.SubscriptionStatus.Active
            );
          }),
        );
      },
    );

  const update = jest
    .spyOn(subscriptionsFns, 'updateDelivery')
    .mockImplementation(
      async (deliveryId: string, data: Partial<DeliveryDb>) => {
        deliveries[parseInt(deliveryId) - 1] = Object.assign(
          {},
          deliveries[parseInt(deliveryId) - 1],
          data,
        );
        return Promise.resolve({} as WriteResult);
      },
    );

  const create = jest
    .spyOn(subscriptionsFns, 'createDelivery')
    .mockImplementation(async (delivery: DeliveryDb) => {
      const newDelivery: DeliveryApp = Object.assign(
        { id: '' + (deliveries.length + 1) },
        delivery,
      );
      deliveries.push(newDelivery);
      return Promise.resolve(newDelivery.id);
    });

  const getSubscriptions = jest
    .spyOn(subscriptionsFns, 'getSubscriptions')
    .mockImplementation(async (subscriptionsIds: string[]) => {
      return Promise.resolve(
        subscriptions.filter((subscription) => {
          return subscriptionsIds.includes(subscription.id);
        }),
      );
    });

  const getSubscription = jest
    .spyOn(subscriptionsFns, 'getSubscription')
    .mockImplementation(async (subscriptionsId: string) => {
      return Promise.resolve(
        subscriptions.find((subscription) => {
          return subscriptionsId === subscription.id;
        }),
      );
    });

  const updateSubscription = jest
    .spyOn(subscriptionsFns, 'updateSubscription')
    .mockImplementation(
      async (subscriptionId: string, update: Partial<SubscriptionDb>) => {
        const subscription = subscriptions.find((subscription) => {
          return subscription.id === subscriptionId;
        });
        Object.assign(subscription!, update);
        return Promise.resolve({} as WriteResult);
      },
    );

  const persistSubscriptionToDelivery = jest
    .spyOn(subscriptionsFns, 'persistSubscriptionToDelivery')
    .mockImplementation(
      async (subscriptionId: string, subscriptionData: SubscriptionDb) => {
        const deliveryFound = deliveries.find((d) => {
          return (
            d.customerId === subscriptionData.customerId &&
            d.shippingAddressId === subscriptionData.shippingAddressId &&
            d.nextOrderDate === subscriptionData.nextOrderDate
          );
        });
        if (deliveryFound) {
          const paymentInfoFound = deliveryFound.paymentInfo.find((p) => {
            return p.paymentCode === subscriptionData.paymentCode;
          });
          if (paymentInfoFound) {
            paymentInfoFound.deliveries.push(subscriptionId);
          } else {
            deliveryFound.paymentInfo.push({
              paymentCode: subscriptionData.paymentCode,
              deliveries: [subscriptionId],
            });
          }
        } else {
          const newDelivery: DeliveryApp = {
            id: '' + (deliveries.length + 1),
            customerId: subscriptionData.customerId,
            shippingAddressId: subscriptionData.shippingAddressId,
            nextOrderDate: subscriptionData.nextOrderDate,
            status: subscriptionsFns.DeliveryStatus.Active,
            paymentInfo: [
              {
                paymentCode: subscriptionData.paymentCode,
                deliveries: [subscriptionId],
              },
            ],
          };
          deliveries.push(newDelivery);
        }
        return Promise.resolve();
      },
    );
  const removeSubscriptionFromDelivery = jest
    .spyOn(subscriptionsFns, 'removeSubscriptionFromDelivery')
    .mockImplementation(async (deliveryId: string, subscriptionId: string) => {
      const delivery = deliveries[parseInt(deliveryId) - 1];
      delivery.paymentInfo.forEach((paymentInfo) => {
        paymentInfo.deliveries = paymentInfo.deliveries.filter(
          (id) => id !== subscriptionId,
        );
      });
      return Promise.resolve();
    });

  return {
    removeSubscriptionFromDelivery,
    update,
    create,
    getActiveSubscriptions,
    getSubscription,
    getSubscriptions,
    nextActiveDeliveries,
    persistSubscriptionToDelivery,
    updateSubscription,
  };
}
