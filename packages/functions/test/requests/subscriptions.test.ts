import {
  dateToStr,
  getNextScheduledDate,
  strToDate,
} from '../../src/util/subscriptions';
import { admin } from '../../src/admin';
import { DeliveryApp, SubscriptionApp } from '../../src/db/subscriptions';
import {
  BASE_DATE,
  makeDeliveryData,
  makeSubData,
  mockDeliveryDbActions,
  SampleIds,
} from '../shared';
import { addDays, addMonths, format } from 'date-fns';
import { buildSubscriptionPlanning } from '../../src/requests/subscriptions.f';

describe('onSubscriptionPlanning', () => {
  beforeEach(() => {
    jest.spyOn(admin, 'firestore').mockReturnThis();
    jest.setSystemTime(new Date(BASE_DATE + 'T00:00:00'));
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
  });

  it('should show subscription planning based on one initial delivery', async () => {
    const baseDate = strToDate(BASE_DATE);
    const firstDeliveryDay = addDays(baseDate, 3);

    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      nextOrderDate: dateToStr(firstDeliveryDay),
    });
    const subscription2Data = makeSubData({
      id: SampleIds.subscription2Id,
      nextOrderDate: dateToStr(firstDeliveryDay),
      schedule: '2M',
    });
    const subscription3Data = makeSubData({
      id: SampleIds.subscription3Id,
      nextOrderDate: dateToStr(firstDeliveryDay),
      paymentCode: 'cdef',
      schedule: '2W',
    });

    const subscriptions: SubscriptionApp[] = [
      subscription1Data,
      subscription2Data,
      subscription3Data,
    ];

    const delivery1: DeliveryApp = makeDeliveryData({
      nextOrderDate: dateToStr(firstDeliveryDay),
      paymentInfo: [
        {
          paymentCode: 'abcd',
          deliveries: [SampleIds.subscription1Id, SampleIds.subscription2Id],
        },
        {
          paymentCode: 'cdef',
          deliveries: [SampleIds.subscription3Id],
        },
      ],
    });

    const deliveries: DeliveryApp[] = [delivery1];

    mockDeliveryDbActions(deliveries, subscriptions);

    const planning = await buildSubscriptionPlanning({
      customerId: SampleIds.customer1Id,
      monthsToShow: 6,
    });

    expect(planning).toBeDefined();
    const planningForAddress1 = planning[SampleIds.address1Id];
    expect(planningForAddress1).toBeDefined();
    if (planningForAddress1) {
      const keys = Object.keys(planningForAddress1);
      expect(keys).toBeDefined();
      if (keys) {
        expect(keys.length).toBeGreaterThan(0); // 6 months of planning
        if (keys.length > 0) {
          expect(keys[0]).toEqual(dateToStr(firstDeliveryDay));
          expect(planningForAddress1[keys[0]].delivery).toBeDefined();
          expect(planningForAddress1[keys[0]].subscriptions.length).toBe(3);

          expect(keys[1]).toEqual(
            dateToStr(getNextScheduledDate(firstDeliveryDay, '2W')),
          );
          expect(planningForAddress1[keys[1]].delivery).not.toBeDefined();
          expect(planningForAddress1[keys[1]].subscriptions.length).toBe(1);
          if (planningForAddress1[keys[1]].subscriptions.length) {
            expect(
              planningForAddress1[keys[1]].subscriptions[0].isEditable,
            ).toBe(false);
          }

          const next2MPlanning =
            planningForAddress1[
              dateToStr(getNextScheduledDate(firstDeliveryDay, '2M'))
            ];
          expect(next2MPlanning).toBeDefined();
          if (next2MPlanning) {
            expect(next2MPlanning.subscriptions.length).toBe(2);
            expect(next2MPlanning.subscriptions).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  id: SampleIds.subscription1Id,
                }),
                expect.objectContaining({
                  id: SampleIds.subscription2Id,
                }),
              ]),
            );
          }
        }
      }
    }
  });

  it('should show 6 months of subscription planning', async () => {
    const baseDate = strToDate(BASE_DATE);
    const firstDeliveryDay = addDays(baseDate, 3);

    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      nextOrderDate: dateToStr(firstDeliveryDay),
    });

    const subscriptions: SubscriptionApp[] = [subscription1Data];

    const delivery1: DeliveryApp = makeDeliveryData({
      nextOrderDate: dateToStr(firstDeliveryDay),
      paymentInfo: [
        {
          paymentCode: 'abcd',
          deliveries: [SampleIds.subscription1Id],
        },
      ],
    });

    const deliveries: DeliveryApp[] = [delivery1];

    mockDeliveryDbActions(deliveries, subscriptions);

    const planning = await buildSubscriptionPlanning({
      customerId: SampleIds.customer1Id,
      monthsToShow: 6,
    });
    const max = addMonths(new Date(), 6);

    expect(planning).toBeDefined();
    const planningForAddress1 = planning[SampleIds.address1Id];
    expect(planningForAddress1).toBeDefined();
    if (planningForAddress1) {
      const keys = Object.keys(planningForAddress1);
      expect(keys).toBeDefined();
      if (keys) {
        expect(keys[keys.length - 1].split('-')[1]).toBe(format(max, 'MM'));
      }
    }
  });

  it('should show subscriptions planning for each address', async () => {
    const baseDate = strToDate(BASE_DATE);
    const firstDeliveryDay = addDays(baseDate, 3);

    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      nextOrderDate: dateToStr(firstDeliveryDay),
    });

    const subscription2Data = makeSubData({
      id: SampleIds.subscription2Id,
      shippingAddressId: SampleIds.address2Id,
      nextOrderDate: dateToStr(firstDeliveryDay),
    });

    const subscriptions: SubscriptionApp[] = [
      subscription1Data,
      subscription2Data,
    ];

    const delivery1: DeliveryApp = makeDeliveryData({
      nextOrderDate: dateToStr(firstDeliveryDay),
      paymentInfo: [
        {
          paymentCode: 'abcd',
          deliveries: [SampleIds.subscription1Id],
        },
      ],
    });

    const delivery2: DeliveryApp = makeDeliveryData({
      nextOrderDate: dateToStr(firstDeliveryDay),
      shippingAddressId: SampleIds.address2Id,
      paymentInfo: [
        {
          paymentCode: 'abcd',
          deliveries: [SampleIds.subscription2Id],
        },
      ],
    });

    const deliveries: DeliveryApp[] = [delivery1, delivery2];

    mockDeliveryDbActions(deliveries, subscriptions);

    const planning = await buildSubscriptionPlanning({
      customerId: SampleIds.customer1Id,
      monthsToShow: 6,
    });

    expect(planning).toBeDefined();
    expect(Object.keys(planning).length).toBe(2); // 2 addresses
    expect(Object.keys(planning)).toEqual(
      expect.arrayContaining([SampleIds.address1Id, SampleIds.address2Id]),
    );
  });

  it('should show subscriptions planning for subscriptions with different order dates', async () => {
    const baseDate = strToDate(BASE_DATE);
    const firstDeliveryDay = addDays(baseDate, 3);

    const subscription1Data = makeSubData({
      id: SampleIds.subscription1Id,
      nextOrderDate: dateToStr(firstDeliveryDay),
    });

    const subscription2NextOrderDateStr = dateToStr(
      getNextScheduledDate(firstDeliveryDay, '2W'),
    );
    const subscription2Data = makeSubData({
      id: SampleIds.subscription2Id,
      schedule: '2W',
      nextOrderDate: subscription2NextOrderDateStr,
    });

    const subscription3NextOrderDateStr = dateToStr(
      getNextScheduledDate(firstDeliveryDay, '1M'),
    );
    const subscription3Data = makeSubData({
      id: SampleIds.subscription3Id,
      schedule: '2M',
      nextOrderDate: subscription3NextOrderDateStr,
    });

    const subscriptions: SubscriptionApp[] = [
      subscription1Data,
      subscription2Data,
      subscription3Data,
    ];

    const delivery1: DeliveryApp = makeDeliveryData({
      nextOrderDate: dateToStr(firstDeliveryDay),
      paymentInfo: [
        {
          paymentCode: 'abcd',
          deliveries: [SampleIds.subscription1Id],
        },
      ],
    });

    const delivery2: DeliveryApp = makeDeliveryData({
      id: SampleIds.delivery2Id,
      nextOrderDate: subscription2NextOrderDateStr,
      paymentInfo: [
        {
          paymentCode: 'abcd',
          deliveries: [SampleIds.subscription2Id],
        },
      ],
    });

    const delivery3: DeliveryApp = makeDeliveryData({
      id: SampleIds.delivery3Id,
      nextOrderDate: subscription3NextOrderDateStr,
      paymentInfo: [
        {
          paymentCode: 'abcd',
          deliveries: [SampleIds.subscription3Id],
        },
      ],
    });

    const deliveries: DeliveryApp[] = [delivery1, delivery2, delivery3];

    mockDeliveryDbActions(deliveries, subscriptions);

    const planning = await buildSubscriptionPlanning({
      customerId: SampleIds.customer1Id,
      monthsToShow: 6,
    });

    expect(planning).toBeDefined();
    const planningForAddress1 = planning[SampleIds.address1Id];
    expect(planningForAddress1).toBeDefined();
    if (planningForAddress1) {
      const keys = Object.keys(planningForAddress1);
      expect(keys).toBeDefined();
      if (keys) {
        expect(keys.length).toBeGreaterThan(0); // 6 months of planning
        if (keys.length > 0) {
          expect(keys[0]).toEqual(dateToStr(firstDeliveryDay));
          expect(planningForAddress1[keys[0]].delivery).toBeDefined();
          expect(planningForAddress1[keys[0]].subscriptions.length).toBe(1);

          expect(keys[1]).toEqual(subscription2NextOrderDateStr);
          expect(planningForAddress1[keys[1]].delivery).toBeDefined();
          expect(planningForAddress1[keys[1]].subscriptions.length).toBe(1);
          if (planningForAddress1[keys[1]].subscriptions.length) {
            expect(
              planningForAddress1[keys[1]].subscriptions[0].isEditable,
            ).toBe(true);
          }

          const next2MPlanning =
            planningForAddress1[subscription3NextOrderDateStr];
          expect(next2MPlanning).toBeDefined();
          if (next2MPlanning) {
            expect(next2MPlanning.subscriptions.length).toBe(3);
            expect(next2MPlanning.subscriptions).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  id: SampleIds.subscription1Id,
                }),
                expect.objectContaining({
                  id: SampleIds.subscription2Id,
                }),
                expect.objectContaining({
                  id: SampleIds.subscription3Id,
                }),
              ]),
            );
          }
        }
      }
    }
  });
});
