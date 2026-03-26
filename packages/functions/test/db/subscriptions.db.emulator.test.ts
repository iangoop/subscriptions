import { admin } from '../../src/admin';
import {
  createSubscription,
  getSubscription,
  updateSubscription,
  findTodaysActiveSubscriptionsOnTimeFreeze,
} from '../../src/db/subscriptions.db';
import {
  SubscriptionDb,
  SubscriptionStatus,
} from '../../src/db/types/subscriptions';
import { BASE_DATE, makeSubData } from '../shared';
import * as subUtil from '../../src/util/subscriptions';

// Set the emulator host
// eslint-disable-next-line node/no-process-env
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const db = admin.firestore();

// Helper to clear Firestore data
const clearFirestoreData = async () => {
  const collections = await db.listCollections();
  for (const collection of collections) {
    const docs = await collection.listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  }
};

describe('subscriptions.db (Emulator)', () => {
  // Clear the database before each test
  beforeEach(async () => {
    await clearFirestoreData();
  });

  // Clear the database after all tests
  afterAll(async () => {
    await clearFirestoreData();
  });

  describe('findTodaysActiveSubscriptionsOnTimeFreeze', () => {
    it('should find subscriptions in the freeze window', async () => {
      // Mock today to BASE_DATE ('2026-02-08')
      jest
        .spyOn(subUtil, 'today')
        .mockReturnValue(subUtil.strToDate(BASE_DATE));
      // freezeTime = 5 days, so freezeEndDate = '2026-02-13'

      const subInWindow = makeSubData({ orderDate: '2026-02-10' });
      const subOutOfWindow = makeSubData({ orderDate: '2026-02-14' });
      const subInactive = makeSubData({
        orderDate: '2026-02-10',
        status: SubscriptionStatus.Paused,
      });

      await createSubscription(subInWindow, db);
      await createSubscription(subOutOfWindow, db);
      await createSubscription(subInactive, db);

      const result = await findTodaysActiveSubscriptionsOnTimeFreeze(db);

      expect(result).toHaveLength(1);
      expect(result[0].orderDate).toBe('2026-02-10');
      expect(result[0].status).toBe(SubscriptionStatus.Active);
    });
  });

  it('should create, read, and update a subscription', async () => {
    // 1. Create
    const subData: SubscriptionDb = {
      customerId: 'cust1-emu',
      status: SubscriptionStatus.Active,
      paymentCode: 'pc1-emu',
      productId: 'prod1-emu',
      recurringOrderCount: 0,
      schedule: '1M',
      shippingAddressId: 'addr1-emu',
      quantity: 1,
      oneOf: false,
      billingAddressId: 'billAddr1-emu',
      paymentMethodCode: 'pmc1-emu',
      useFixedPrice: false,
      fixedPrice: 0,
      scheduled: false,
      shippingMethodCode: 'smc1-emu',
    };
    const newSubId = await createSubscription(subData, db);
    expect(newSubId).toBeTruthy();

    // 2. Read
    const createdSub = await getSubscription(newSubId, db);
    expect(createdSub).toBeDefined();
    // The converter transforms the DB model, so we check for matching properties
    expect(createdSub?.customerId).toEqual(subData.customerId);
    expect(createdSub?.status).toEqual(subData.status);

    // 3. Update
    const updateData = { status: SubscriptionStatus.Paused };
    await updateSubscription(newSubId, updateData, db);

    // 4. Verify Update
    const updatedSub = await getSubscription(newSubId, db);
    expect(updatedSub?.status).toEqual(SubscriptionStatus.Paused);
  });
});
