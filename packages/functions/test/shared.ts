import testEnv from 'firebase-functions-test';
import {
  DeliveryDb,
  SubscriptionDb,
  DeliveryStatus,
  SubscriptionStatus,
} from '../src/db/types/subscriptions';

export const BASE_DATE = '2026-02-08';
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
}
export const test = testEnv({
  projectId: process.env.CUSTOM_FIREBASE_PROJECTID || 'test-project', // match what's in your firebase.json
  storageBucket: process.env.CUSTOM_FIREBASE_STORAGEBUCKET || 'test-bucket',
});

export const makeDocumentSnapshot = (
  id: string,
  path: string,
  beforeData: Record<string, unknown>,
  afterData: Record<string, unknown>,
) => {
  return test.makeChange(
    test.firestore.makeDocumentSnapshot(beforeData, `${path}/${id}`),
    test.firestore.makeDocumentSnapshot(afterData, `${path}/${id}`),
  );
};

export function createMocks<T extends Record<string, unknown>>(
  module: T,
): Record<keyof T, jest.Mock> {
  const mocks = {} as Record<keyof T, jest.Mock>;
  for (const key in module) {
    mocks[key as keyof T] = jest.fn();
  }
  return mocks;
}

export function makeSubData(
  overrides: Partial<SubscriptionDb> = {},
): SubscriptionDb {
  return {
    customerId: SampleIds.customer1Id,
    shippingAddressId: SampleIds.address1Id,
    paymentCode: 'abcd',
    productId: SampleIds.product1Id,
    quantity: 1,
    schedule: '1M',
    status: SubscriptionStatus.Active,
    shippingMethodCode: 'nextday',
    recurringOrderCount: 0,
    ...overrides,
  } as SubscriptionDb;
}

export function makeDeliveryData(
  overrides: Partial<DeliveryDb> = {},
): DeliveryDb {
  return {
    customerId: SampleIds.customer1Id,
    shippingAddressId: SampleIds.address1Id,
    status: DeliveryStatus.Active,
    paymentInfo: [],
    orderDate: BASE_DATE,
    created: undefined,
    updated: undefined,
    ...overrides,
  };
}
