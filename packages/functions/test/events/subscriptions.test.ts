import {
  test,
  makeDocumentSnapshot,
  makeSubData,
  SampleIds,
  BASE_DATE,
  makeDeliveryData,
} from '../shared';
import {
  SubscriptionDb,
  SubscriptionStatus,
  DeliveryStatus,
} from '../../src/db/types/subscriptions';
jest.mock('../../src/db/subscriptions.db', () =>
  jest.createMockFromModule('../../src/db/subscriptions.db'),
);
jest.mock('../../src/db/deliveries.db', () =>
  jest.createMockFromModule('../../src/db/deliveries.db'),
);

// Now import the function being tested
import { onSubscriptionWritten } from '../../src/db/events/subscriptions.f';
import * as subscriptionsDbModule from '../../src/db/subscriptions.db';
import * as deliveriesDbModule from '../../src/db/deliveries.db';

const {
  getActiveSubscriptionsOrderedByOrderDate,
  getFreezeTimeInDays,
  updateSubscription,
} = jest.mocked(subscriptionsDbModule);

const { getOngoingDeliveriesForCustomer, persistSubscriptionToDelivery } =
  jest.mocked(deliveriesDbModule);

describe('onSubscriptionWrittenFunctions', () => {
  async function processSubscriptionEvent(
    subscriptionId: string,
    data: Partial<SubscriptionDb>,
    before?: Partial<SubscriptionDb>,
  ) {
    const event = makeDocumentSnapshot(
      subscriptionId,
      'subscriptions',
      (before ? before : {}) as Record<string, unknown>,
      data as Record<string, unknown>,
    );
    const wrapped = test.wrap(onSubscriptionWritten);
    await wrapped({ data: event });
  }

  beforeEach(() => {
    // reset mock call counts/instances to initial state
    jest.clearAllMocks();

    //jest.spyOn(admin, 'firestore').mockReturnThis();
    jest.setSystemTime(new Date(BASE_DATE + 'T00:00:00'));
    getFreezeTimeInDays.mockResolvedValue(5);
    // Clear Firestore before each test
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    test.cleanup();
  });

  it('should create a first time delivery for the subscription', async () => {
    const subscription1Data = makeSubData();

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );

    expect(updateSubscription).not.toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).toHaveBeenCalledWith(
      SampleIds.subscription1Id,
      expect.objectContaining({
        customerId: SampleIds.customer1Id,
        schedule: '1M',
        orderDate: BASE_DATE,
      }),
      true,
    );
  });

  it('should create first time delivery for many subscriptions ', async () => {
    const subscription1Data = makeSubData();
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
    });
    const deliveryData = makeDeliveryData({
      isFirstDelivery: true,
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValueOnce([]);
    getOngoingDeliveriesForCustomer.mockResolvedValueOnce([]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        orderDate: '2026-03-08',
        created: undefined,
        updated: undefined,
      },
    ]);

    getOngoingDeliveriesForCustomer.mockResolvedValue([
      {
        id: `${subscription1Data.customerId}_${subscription1Data.shippingAddressId}_${BASE_DATE}`,
        ...deliveryData,
        paymentInfo: [
          {
            paymentCode: 'abcd',
            deliveries: [SampleIds.subscription1Id],
          },
        ],
        created: undefined,
        updated: undefined,
      },
    ]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );

    expect(updateSubscription).not.toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).toHaveBeenCalledTimes(2);
    expect(persistSubscriptionToDelivery).toHaveBeenCalledWith(
      SampleIds.subscription1Id,
      expect.objectContaining({
        customerId: SampleIds.customer1Id,
        schedule: '1M',
        orderDate: BASE_DATE,
      }),
      true,
    );
    expect(persistSubscriptionToDelivery).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        customerId: SampleIds.customer1Id,
        schedule: '1M',
        orderDate: BASE_DATE,
      }),
      true,
    );
  });

  it('should define order date for subscription', async () => {
    const subscription1Data = makeSubData();
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        orderDate: '2026-03-08',
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );

    expect(updateSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-03-08',
      }),
    );
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should define order date for subscription on a lower frequency', async () => {
    const subscription1Data = makeSubData();
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
      schedule: '1W',
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        orderDate: '2026-03-08',
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );

    expect(updateSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-02-15',
      }),
    );
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should define order date for same schedule', async () => {
    const subscription1Data = makeSubData();
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
      schedule: '1W',
    });
    const subscription3Data = makeSubData({
      productId: SampleIds.product3Id,
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription2Data,
        id: SampleIds.subscription2Id,
        orderDate: '2026-02-15',
        created: undefined,
        updated: undefined,
      },
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        orderDate: '2026-03-08',
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      subscription3Data,
    );

    expect(updateSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription3Id,
      expect.objectContaining({
        orderDate: '2026-03-08',
      }),
    );
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should define order date to start at the same date as the one with lower frequency', async () => {
    const subscription1Data = makeSubData({
      schedule: '1W',
    });
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription2Data,
        id: SampleIds.subscription2Id,
        orderDate: '2026-02-15',
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );

    expect(updateSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription1Id,
      expect.objectContaining({
        orderDate: '2026-02-15',
      }),
    );
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should ignore subscription in freeze time and have it date schedule to the future', async () => {
    const subscription1Data = makeSubData();
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        orderDate: '2026-02-10',
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );

    expect(updateSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-03-10',
      }),
    );
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should ignore subscription in freeze time and have it date schedule to the future (different schedule type)', async () => {
    const subscription1Data = makeSubData();
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
      schedule: '1W',
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        orderDate: '2026-02-10',
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );

    expect(updateSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-02-17',
      }),
    );
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should ignore subscription in freeze time and have it date schedule to the future (same schedule type, different frequency)', async () => {
    const subscription1Data = makeSubData();
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
      schedule: '2M',
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        orderDate: '2026-02-10',
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );

    expect(updateSubscription).toHaveBeenCalledTimes(1);
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-03-10',
      }),
    );
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should schedule subscription when it is not first time and not frozen (next subscription is too far in future)', async () => {
    const subscription1Data = makeSubData();
    const subscription2Data = makeSubData({
      productId: SampleIds.product4Id,
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        orderDate: '2026-04-08', // Far in future, not frozen
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );

    // Should use updateSubscription instead of persistSubscriptionToDelivery
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-03-11',
      }),
    );
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should not process when document does not exist', async () => {
    await processSubscriptionEvent(SampleIds.subscription1Id, {});

    expect(updateSubscription).not.toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should not process when subscription is inactive', async () => {
    const subscriptionData = makeSubData({
      status: SubscriptionStatus.Expired, // or any non-Active status
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(SampleIds.subscription1Id, subscriptionData);

    expect(updateSubscription).not.toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should not process when subscription has past orderDate', async () => {
    const subscriptionData = makeSubData({
      orderDate: '2026-01-01', // Before BASE_DATE (2026-02-20)
    });

    await processSubscriptionEvent(SampleIds.subscription1Id, subscriptionData);

    // Should return early in scheduleSubscription, no DB calls
    expect(updateSubscription).not.toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should process when existing subscription orderDate changed', async () => {
    const subscriptionBefore = makeSubData({
      orderDate: '2026-03-08',
    });
    const subscriptionAfter = makeSubData({
      orderDate: '2026-03-15', // Changed orderDate
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscriptionAfter,
      subscriptionBefore,
    );

    // Should call one of the DB functions
    expect(updateSubscription).toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should not process when existing subscription orderDate did not change', async () => {
    const subscriptionData = makeSubData({
      orderDate: '2026-03-08',
    });

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscriptionData,
      subscriptionData, // Same before and after
    );

    expect(updateSubscription).not.toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should call persist subscription to delivery when existing subscription with changed frozen orderDate', async () => {
    const subscriptionBefore = makeSubData({
      orderDate: '2026-03-08',
    });
    const subscriptionAfter = makeSubData({
      orderDate: '2026-02-13', // Changed to a frozen date (within 5 days)
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscriptionAfter,
      subscriptionBefore,
    );

    expect(updateSubscription).not.toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).toHaveBeenCalled();
  });

  it('should not process subscription if previous orderDate is frozen', async () => {
    const subscriptionBefore = makeSubData({
      orderDate: '2026-02-08',
    });
    const subscriptionAfter = makeSubData({
      orderDate: '2026-02-13', // Changed to a frozen date (within 5 days)
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscriptionAfter,
      subscriptionBefore,
    );

    expect(updateSubscription).not.toHaveBeenCalled();
    expect(persistSubscriptionToDelivery).not.toHaveBeenCalled();
  });

  it('should prefer exact schedule match when multiple active subscriptions exist', async () => {
    const subscription1Data = makeSubData({
      schedule: '1W',
      orderDate: '2026-02-15',
    });
    const subscription2Data = makeSubData({
      productId: SampleIds.product2Id,
      schedule: '2W',
      orderDate: '2026-02-20',
    });
    const newSubscriptionData = makeSubData({
      productId: SampleIds.product3Id,
      schedule: '2W',
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        created: undefined,
        updated: undefined,
      },
      {
        ...subscription2Data,
        id: SampleIds.subscription2Id,
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      newSubscriptionData,
    );

    // Should align with 2W subscription (2026-02-20) instead of the earlier 1W (2026-02-15)
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription3Id,
      expect.objectContaining({
        orderDate: '2026-02-20',
      }),
    );
  });

  it('should use first active subscription as anchor when no schedule match exists', async () => {
    const subscription1Data = makeSubData({
      schedule: '1M',
      orderDate: '2026-03-01',
    });
    const newSubscriptionData = makeSubData({
      productId: SampleIds.product2Id,
      schedule: '1W',
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      newSubscriptionData,
    );

    // Anchor is 2026-03-01 ('1M'). New is '1W'.
    // today = 2026-02-08. freeze = 5. min = 2026-02-13.
    // findMatchingDateForSubscription will call findEarliestSuitableOrderDate(2026-03-01, '1W', 2026-02-13)
    // Steps back from 2026-03-01: 02-22, 02-15, 02-08.
    // Returns getNextScheduledDate(02-08, '1W') = 2026-02-15.
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-02-15',
      }),
    );
  });

  it('should step back multiple times in findEarliestSuitableOrderDate', async () => {
    const subscription1Data = makeSubData({
      schedule: '1W',
      orderDate: '2026-04-01', // Far in future
    });
    const newSubscriptionData = makeSubData({
      productId: SampleIds.product2Id,
      schedule: '1W',
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      newSubscriptionData,
    );

    // Steps back from 2026-04-01: 03-25, 03-18, 03-11, 03-04, 02-25, 02-18, 02-11.
    // Returns getNextScheduledDate(02-11, '1W') = 2026-02-18.
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-02-18',
      }),
    );
  });

  it('should return false for isFirstTimeDelivery when an ongoing delivery exists from the past', async () => {
    const newSubscriptionData = makeSubData();

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([
      {
        ...makeDeliveryData({
          orderDate: '2026-02-01', // In the past
          status: DeliveryStatus.Shipped,
          isFirstDelivery: true,
        }),
        id: 'old_delivery',
      },
    ]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      newSubscriptionData,
    );

    // isFirstTimeDelivery should be false because there's an ongoing delivery (even if past).
    // So it calls findMatchingDateForSubscription.
    // activeSubscriptionsByOrderDate is empty.
    // firstDateAvailable = minimumNextOrderDate = 2026-02-13.
    // candidateOrderDate = 2026-02-13.
    // Returns 2026-02-13.
    // 2026-02-13 IS frozen when today is 2026-02-08 and freeze is 5.
    expect(persistSubscriptionToDelivery).toHaveBeenCalledWith(
      SampleIds.subscription1Id,
      expect.objectContaining({
        orderDate: '2026-02-13',
      }),
      false, // isFirstTime
    );
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('should align to exactly minimumNextOrderDate if anchor matches it after stepping back', async () => {
    const subscription1Data = makeSubData({
      schedule: '1W',
      orderDate: '2026-02-27',
    });
    const newSubscriptionData = makeSubData({
      productId: SampleIds.product2Id,
      schedule: '1W',
    });

    // today = 2026-02-08. freeze = 5. min = 2026-02-13.
    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscription1Data,
        id: SampleIds.subscription1Id,
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      newSubscriptionData,
    );

    // Steps back from 02-27: 02-20, 02-13.
    // 02-13 is NOT isAfter(02-13, 02-13).
    // isSameDay(02-13, 02-13) is true.
    // Returns 2026-02-13.
    // 2026-02-13 is frozen.
    expect(persistSubscriptionToDelivery).toHaveBeenCalledWith(
      SampleIds.subscription2Id,
      expect.objectContaining({
        orderDate: '2026-02-13',
      }),
      false, // isFirstTime because activeSubscriptions was NOT empty
    );
  });

  it('should persist to delivery when manually updating to a frozen date', async () => {
    const subscriptionBefore = makeSubData({
      orderDate: '2026-03-08',
    });
    const subscriptionAfter = makeSubData({
      orderDate: '2026-02-10', // Frozen (today is 02-08, freeze is 5)
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([
      {
        ...subscriptionBefore,
        id: SampleIds.subscription1Id,
        created: undefined,
        updated: undefined,
      },
    ]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscriptionAfter,
      subscriptionBefore,
    );

    expect(persistSubscriptionToDelivery).toHaveBeenCalledWith(
      SampleIds.subscription1Id,
      expect.objectContaining({
        orderDate: '2026-02-10',
      }),
      false, // isFirstTime should be false because activeSubscriptions is not empty
    );
  });

  it('should process and reset status to Active when status changes from Active to Ready', async () => {
    const subscriptionBefore = makeSubData({
      status: SubscriptionStatus.Active,
      orderDate: '2026-03-08',
    });
    const subscriptionAfter = makeSubData({
      status: SubscriptionStatus.Ready, // Changed to Ready
      orderDate: '2026-03-08',
    });

    getActiveSubscriptionsOrderedByOrderDate.mockResolvedValue([]);
    getOngoingDeliveriesForCustomer.mockResolvedValue([]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscriptionAfter,
      subscriptionBefore,
    );

    // Should call updateSubscription with status: Active
    expect(updateSubscription).toHaveBeenCalledWith(
      SampleIds.subscription1Id,
      expect.objectContaining({
        status: SubscriptionStatus.Active,
        scheduled: true,
      }),
    );
  });
});
