import { admin } from '../../src/admin'; // Import your admin wrapper
import {
  fft,
  getNextActiveDeliveriesForCustomer,
  makeDocumentSnapshot,
  mockDeliveryDbActions,
  processSubscriptionEvent,
  makeDeliveryData,
  makeSubData,
  SampleIds,
  BASE_DATE,
} from '../shared';
import {
  findEarliestSuitableDeliveryDate,
  processDelivery,
} from '../../src/db/events/subscriptions.f';
import { isEqual, cloneDeep } from 'lodash';
import {
  DATE_FORMAT,
  DeliveryApp,
  DeliveryStatus,
} from '../../src/db/subscriptions';
import { addWeeks, format, parse, startOfDay } from 'date-fns';
import { getNextScheduledDate } from '../../src/util/subscriptions';

describe('onSubscriptionWrittenFunctions', () => {
  async function processDeliveryEvent(
    deliveryId: string,
    data: Partial<DeliveryApp>,
    before?: Partial<DeliveryApp>,
  ) {
    const event = makeDocumentSnapshot(
      deliveryId,
      'deliveries',
      before ? before : {},
      data,
    );
    return processDelivery(event as any);
  }

  beforeEach(async () => {
    jest.spyOn(admin, 'firestore').mockReturnThis();
    jest.setSystemTime(new Date(BASE_DATE + 'T00:00:00'));
    // Clear Firestore before each test
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(async () => {
    jest.useRealTimers();
    fft.cleanup();
  });

  it('should attach subscription ID to delivery document if date matches', async () => {
    const deliveryData = makeDeliveryData({
      id: SampleIds.delivery1Id,
      nextOrderDate: '2025-06-15T17:57:59',
    });
    const deliveries = [deliveryData];

    const subscription1Data = makeSubData({ id: SampleIds.subscription1Id });

    mockDeliveryDbActions(deliveries, [subscription1Data]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].paymentInfo).toHaveLength(1);
    expect(
      isEqual(deliveries[0].paymentInfo, [
        {
          paymentCode: 'abcd',
          deliveries: [SampleIds.subscription1Id],
        },
      ]),
    ).toBe(true);
  });

  it('should only attach active subscription ID to delivery document if dates are compatible', async () => {
    const deliveryData = makeDeliveryData({
      id: SampleIds.delivery1Id,
      nextOrderDate: '2025-06-15',
    });
    const deliveries: DeliveryApp[] = [deliveryData];
    /**
     * Subscription 1: Will use delivery `delivery1Id` as it is the next scheduled delivery and
     * it happens before chosen schedule interval recurrence.
     */
    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      productId: SampleIds.product1Id,
      quantity: 2,
    });

    /**
     * Subscription 2: Will use delivery `delivery1Id` as subscription and delivery dates match.
     */
    const subscription2Data = makeSubData({
      id: SampleIds.subscription2Id,
      productId: SampleIds.product2Id,
      nextOrderDate: '2025-06-15',
    });

    /**
     * Subscription 3: not be added to a delivery nor create a new delivery
     * as it has a next order date that is after the delivery's next order date.
     */
    const subscription3Data = makeSubData({
      id: SampleIds.subscription3Id,
      productId: SampleIds.product3Id,
      nextOrderDate: '2025-07-15',
    });

    /**
     * Subscription 4: Will not be added to a delivery nor create a new delivery
     * as it is expired.
     */
    const subscription4Data = makeSubData({
      id: SampleIds.subscription4Id,
      productId: SampleIds.product4Id,
      status: 'E',
      expirationDate: '2025-05-15',
    });

    mockDeliveryDbActions(deliveries, [
      subscription1Data,
      subscription2Data,
      subscription3Data,
      subscription4Data,
    ]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      subscription3Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription4Id,
      subscription4Data,
    );

    expect(deliveries.length).toBe(2);
    if (deliveries.length > 1) {
      expect(deliveries[0].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([
          SampleIds.subscription1Id,
          SampleIds.subscription2Id,
        ]),
      );
      expect(deliveries[1].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([SampleIds.subscription3Id]),
      );
    }
  });

  it('should create separate deliveries for different shipping address and customers', async () => {
    const deliveries: DeliveryApp[] = [];

    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      productId: SampleIds.product1Id,
      quantity: 2,
    });

    const subscription2Data = makeSubData({
      id: SampleIds.subscription2Id,
      shippingAddressId: SampleIds.address2Id,
      productId: SampleIds.product1Id,
    });

    const subscription3Data = makeSubData({
      id: SampleIds.subscription3Id,
      customerId: SampleIds.customer2Id,
      shippingAddressId: SampleIds.address3Id,
      productId: SampleIds.product2Id,
    });

    const subscription4Data = makeSubData({
      id: SampleIds.subscription4Id,
      productId: SampleIds.product2Id,
    });

    mockDeliveryDbActions(deliveries, [
      subscription1Data,
      subscription2Data,
      subscription3Data,
      subscription4Data,
    ]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      subscription3Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription4Id,
      subscription4Data,
    );

    expect(deliveries.length).toBe(3);
    if (deliveries.length > 2) {
      expect(deliveries[0].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([
          SampleIds.subscription1Id,
          SampleIds.subscription4Id,
        ]),
      );
      expect(deliveries[1].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([SampleIds.subscription2Id]),
      );
      expect(deliveries[2].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([SampleIds.subscription3Id]),
      );
    }
  });

  it('should only attach active subscription ID to delivery document if dates are compatible', async () => {
    const delivery1Data = makeDeliveryData({
      id: '1',
      nextOrderDate: '2025-06-15',
    });

    const delivery2Data = makeDeliveryData({
      id: '2',
      nextOrderDate: '2025-06-30',
    });

    const deliveries: DeliveryApp[] = [delivery1Data, delivery2Data];

    /**
     * Subscription 1: will use delivery 1 as it is the earliest delivery and
     * it happens before chosen schedule interval recurrence
     */
    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      productId: SampleIds.product1Id,
      quantity: 2,
      schedule: '1M',
    });

    /**
     * Subscription 2: will use delivery 2 as subscription and delivery dates match
     */
    const subscription2Data = makeSubData({
      id: SampleIds.subscription2Id,
      productId: SampleIds.product2Id,
      quantity: 2,
      schedule: '2M',
      nextOrderDate: '2025-06-30',
    });

    /**
     * Subscription 3: will use delivery 1 as it is the earliest delivery date and
     * it happens before chosen schedule interval recurrence.
     */
    const subscription3Data = makeSubData({
      id: SampleIds.subscription3Id,
      productId: SampleIds.product3Id,
      schedule: '2W',
    });

    mockDeliveryDbActions(deliveries, [
      subscription1Data,
      subscription2Data,
      subscription3Data,
    ]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      subscription3Data,
    );

    expect(deliveries.length).toBe(2);
    if (deliveries.length > 2) {
      expect(deliveries[0].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([
          SampleIds.subscription1Id,
          SampleIds.subscription3Id,
        ]),
      );
      expect(deliveries[1].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([SampleIds.subscription2Id]),
      );
    }
  });

  it('should create a delivery prior to the first delivery registered', async () => {
    const nextDeliveryDate = format(
      startOfDay(parse('2025-06-27', DATE_FORMAT, new Date())),
      DATE_FORMAT,
    );

    const deliveries: DeliveryApp[] = [];

    /**
     * Subscription 1: will create new delivery for the date chosen
     */
    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      productId: SampleIds.product1Id,
      quantity: 2,
      schedule: '1M',
      nextOrderDate: nextDeliveryDate,
    });

    /**
     * Subscription 2: will create new delivery as the earliest delivery which is
     * delivery 1 is after the chosen schedule interval recurrence
     */
    const subscription2Data = makeSubData({
      id: SampleIds.subscription2Id,
      productId: SampleIds.product2Id,
      quantity: 1,
      schedule: '2W',
    });

    /**
     * Subscription 3: will use the same delivery from subscription 2 as it is the
     * earliest delivery and it is before the chosen schedule interval recurrence
     */
    const subscription3Data = makeSubData({
      id: SampleIds.subscription3Id,
      productId: SampleIds.product3Id,
      quantity: 1,
      schedule: '2W',
    });

    mockDeliveryDbActions(deliveries, [
      subscription1Data,
      subscription2Data,
      subscription3Data,
    ]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      subscription3Data,
    );

    expect(deliveries.length).toBe(2);
    if (deliveries.length > 1) {
      expect(deliveries[0].nextOrderDate).toEqual(nextDeliveryDate);
      expect(deliveries[0].paymentInfo[0].paymentCode).toEqual('abcd');
      expect(deliveries[0].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([SampleIds.subscription1Id]),
      );

      expect(deliveries[1].nextOrderDate).toEqual(
        format(
          startOfDay(parse('2025-06-13', DATE_FORMAT, new Date())),
          DATE_FORMAT,
        ),
      );
      expect(deliveries[1].paymentInfo[0].paymentCode).toEqual('abcd');
      expect(deliveries[1].paymentInfo[0].deliveries).toEqual(
        expect.arrayContaining([
          SampleIds.subscription3Id,
          SampleIds.subscription2Id,
        ]),
      );
    }
  });

  it('should process deliveries and calculate next order dates to subscriptions', async () => {
    const deliveries: DeliveryApp[] = [];

    /**
     * Subscription 1: will create new delivery for the date chosen
     */
    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      productId: SampleIds.product1Id,
      quantity: 2,
      schedule: '1M',
      nextOrderDate: '2025-06-27',
    });

    const subscription2Data = makeSubData({
      id: SampleIds.subscription2Id,
      productId: SampleIds.product2Id,
      quantity: 1,
      schedule: '2M',
      nextOrderDate: format(
        getNextScheduledDate(
          startOfDay(parse('2025-06-27', DATE_FORMAT, new Date())),
          '1M',
        ),
        DATE_FORMAT,
      ),
    });

    const subscription3Data = makeSubData({
      id: SampleIds.subscription3Id,
      productId: SampleIds.product3Id,
      quantity: 1,
      schedule: '2W',
    });

    const subscription4Data = makeSubData({
      id: SampleIds.subscription4Id,
      productId: SampleIds.product4Id,
      quantity: 1,
      schedule: '2M',
    });

    mockDeliveryDbActions(deliveries, [
      subscription1Data,
      subscription2Data,
      subscription3Data,
      subscription4Data,
    ]);

    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription2Id,
      subscription2Data,
    );

    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      subscription3Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription4Id,
      subscription4Data,
    );

    let orderedDeliveries = getNextActiveDeliveriesForCustomer(
      deliveries,
      SampleIds.customer1Id,
      SampleIds.address1Id,
    );
    expect(orderedDeliveries.length).toBe(3);
    expect(orderedDeliveries[0].paymentInfo[0].paymentCode).toEqual('abcd');
    expect(orderedDeliveries[0].paymentInfo[0].deliveries).toEqual(
      expect.arrayContaining([SampleIds.subscription3Id]),
    );
    expect(orderedDeliveries[1].paymentInfo[0].paymentCode).toEqual('abcd');
    expect(orderedDeliveries[1].paymentInfo[0].deliveries).toEqual(
      expect.arrayContaining([
        SampleIds.subscription4Id,
        SampleIds.subscription1Id,
      ]),
    );
    expect(orderedDeliveries[2].paymentInfo[0].paymentCode).toEqual('abcd');
    expect(orderedDeliveries[2].paymentInfo[0].deliveries).toEqual(
      expect.arrayContaining([SampleIds.subscription2Id]),
    );

    let _subscription1Data,
      _subscription2Data,
      _subscription3Data,
      _subscription4Data;

    _subscription3Data = cloneDeep(subscription3Data);
    await processDeliveryEvent(
      orderedDeliveries[0].id,
      Object.assign(orderedDeliveries[0], {
        status: DeliveryStatus.Processing,
      }),
    );
    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      subscription3Data,
      _subscription3Data,
    );

    orderedDeliveries = getNextActiveDeliveriesForCustomer(
      deliveries,
      SampleIds.customer1Id,
      SampleIds.address1Id,
    );
    expect(deliveries.length).toBe(3);
    expect(orderedDeliveries.length).toBe(2);
    expect(orderedDeliveries[0].paymentInfo[0].deliveries).toEqual(
      expect.arrayContaining([
        SampleIds.subscription3Id,
        SampleIds.subscription4Id,
        SampleIds.subscription1Id,
      ]),
    );

    _subscription1Data = cloneDeep(subscription1Data);
    _subscription3Data = cloneDeep(subscription3Data);
    _subscription4Data = cloneDeep(subscription4Data);
    await processDeliveryEvent(
      orderedDeliveries[0].id,
      Object.assign(orderedDeliveries[0], {
        status: DeliveryStatus.Processing,
      }),
    );
    await processSubscriptionEvent(
      SampleIds.subscription1Id,
      subscription1Data,
      _subscription1Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription3Id,
      subscription3Data,
      _subscription3Data,
    );
    await processSubscriptionEvent(
      SampleIds.subscription4Id,
      subscription4Data,
      _subscription4Data,
    );

    orderedDeliveries = getNextActiveDeliveriesForCustomer(
      deliveries,
      SampleIds.customer1Id,
      SampleIds.address1Id,
    );
    expect(deliveries.length).toBe(5);
    expect(orderedDeliveries.length).toBe(3);
    expect(orderedDeliveries[0].paymentInfo[0].deliveries).toEqual(
      expect.arrayContaining([SampleIds.subscription3Id]),
    );
    expect(orderedDeliveries[1].paymentInfo[0].deliveries).toEqual(
      expect.arrayContaining([
        SampleIds.subscription1Id,
        SampleIds.subscription2Id,
      ]),
    );
    expect(orderedDeliveries[2].paymentInfo[0].deliveries).toEqual(
      expect.arrayContaining([SampleIds.subscription4Id]),
    );
  });

  it('should match delivery dates for week and month schedules', async () => {
    const result1 = getNextScheduledDate(
      parse('2025-05-29', 'yyyy-MM-dd', new Date()),
      '1M',
    );
    const result2 = getNextScheduledDate(
      parse('2025-05-29', 'yyyy-MM-dd', new Date()),
      '2W',
    );
    const result3 = getNextScheduledDate(result2, '2W');
    expect(result1).toEqual(result3);
  });

  it('should have 3 deliveries in a month', async () => {
    const result1 = getNextScheduledDate(
      parse('2025-06-08', 'yyyy-MM-dd', new Date()),
      '1M',
    );
    const result2 = getNextScheduledDate(
      parse('2025-06-08', 'yyyy-MM-dd', new Date()),
      '2W',
    );
    const result3 = getNextScheduledDate(result2, '2W');
    expect(result1).toEqual(addWeeks(result3, 1));
  });

  it('should shift a week', async () => {
    const result1 = getNextScheduledDate(
      parse('2025-03-31', 'yyyy-MM-dd', new Date()),
      '1W',
    );
    expect(result1).toEqual(
      addWeeks(parse('2025-03-31', 'yyyy-MM-dd', new Date()), 1),
    );
  });

  it('should find earliest delivery date based on week', async () => {
    jest.setSystemTime(new Date('2025-06-06T00:00:00Z'));
    const result = findEarliestSuitableDeliveryDate(
      parse('2025-06-27', 'yyyy-MM-dd', new Date()),
      '2W',
    );
    expect(result).toEqual(parse('2025-06-13', 'yyyy-MM-dd', new Date()));
  });
});
