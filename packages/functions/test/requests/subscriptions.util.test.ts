import * as subUtil from '../../src/util/subscriptions';
import {
  getLastDayToEdit,
  canSkipSubscription,
  isSkippable,
  scheduleFutureOrders,
  buildSubscriptionsForAddressPlanning,
  buildSubscriptionsForCustomerPlanning,
  SubscriptionPlanning,
} from '../../src/requests/subscriptions.util';
import {
  SubscriptionApp,
  SubscriptionStatus,
  DeliveryApp,
  DeliveryStatus,
} from '../../src/db/types/subscriptions';
import { SampleIds, makeSubData, BASE_DATE } from '../shared';

// Mock today() to have a consistent "now" for tests using the shared BASE_DATE
jest.spyOn(subUtil, 'today').mockReturnValue(subUtil.strToDate(BASE_DATE));

describe('subscriptions.util', () => {
  describe('getLastDayToEdit', () => {
    it('should return the date minus freezeTime days', () => {
      const orderDate = '2026-02-20';
      const freezeTime = 5;
      const expected = '2026-02-15';
      expect(getLastDayToEdit(orderDate, freezeTime)).toBe(expected);
    });
  });

  describe('canSkipSubscription', () => {
    const freezeTime = 5;
    const orderDateFar = '2026-02-20'; // 20th is 12 days after 8th, not frozen
    const orderDateNear = '2026-02-12'; // 12th is 4 days after 8th, frozen (freezeTime=5)

    it('should return true for Active subscription not in freeze period', () => {
      const sub = makeSubData({
        status: SubscriptionStatus.Active,
      }) as SubscriptionApp;
      expect(canSkipSubscription(sub, orderDateFar, freezeTime)).toBe(true);
    });

    it('should return false for non-Active subscription', () => {
      const sub = makeSubData({
        status: SubscriptionStatus.Paused,
      }) as SubscriptionApp;
      expect(canSkipSubscription(sub, orderDateFar, freezeTime)).toBe(false);
    });

    it('should return false for Active subscription in freeze period', () => {
      const sub = makeSubData({
        status: SubscriptionStatus.Active,
      }) as SubscriptionApp;
      expect(canSkipSubscription(sub, orderDateNear, freezeTime)).toBe(false);
    });
  });

  describe('isSkippable', () => {
    const freezeTime = 5;
    // BASE_DATE = '2026-02-08'

    it('should return true for the first skippable occurrence in its category', () => {
      const sub1 = {
        ...makeSubData({ orderDate: '2026-02-20', schedule: '1M' }),
        id: 'sub1',
      } as SubscriptionApp;
      const sub2 = {
        ...makeSubData({ orderDate: '2026-03-20', schedule: '1M' }),
        id: 'sub2',
      } as SubscriptionApp;

      const allSubs = [sub1, sub2];

      expect(isSkippable('sub1', allSubs, freezeTime)).toBe(true);
      expect(isSkippable('sub2', allSubs, freezeTime)).toBe(false);
    });

    it('should return true for a later occurrence if the earlier one is frozen', () => {
      const sub1 = {
        ...makeSubData({ orderDate: '2026-02-10', schedule: '1M' }),
        id: 'sub1',
      } as SubscriptionApp; // Frozen
      const sub2 = {
        ...makeSubData({ orderDate: '2026-03-20', schedule: '1M' }),
        id: 'sub2',
      } as SubscriptionApp; // Not frozen

      const allSubs = [sub1, sub2];

      expect(isSkippable('sub1', allSubs, freezeTime)).toBe(false);
      expect(isSkippable('sub2', allSubs, freezeTime)).toBe(true);
    });

    it('should handle different categories (W vs M) independently', () => {
      const subW = {
        ...makeSubData({ orderDate: '2026-02-20', schedule: '1W' }),
        id: 'subW',
      } as SubscriptionApp;
      const subM = {
        ...makeSubData({ orderDate: '2026-02-20', schedule: '1M' }),
        id: 'subM',
      } as SubscriptionApp;

      const allSubs = [subW, subM];

      expect(isSkippable('subW', allSubs, freezeTime)).toBe(true);
      expect(isSkippable('subM', allSubs, freezeTime)).toBe(true);
    });
  });

  describe('scheduleFutureOrders', () => {
    it('should add future orders up to maxDate (Week - Uneven)', () => {
      const planning: Record<string, SubscriptionPlanning[]> = {};
      const sub = {
        ...makeSubData({
          schedule: '1W',
          orderDate: '2026-02-08',
        }),
        id: 'sub1',
      } as SubscriptionApp;
      const maxDate = subUtil.strToDate('2026-02-23'); // Should include 15th and 22nd

      scheduleFutureOrders(planning, sub, maxDate);

      expect(Object.keys(planning)).toHaveLength(2);
      expect(planning['2026-02-15']).toBeDefined();
      expect(planning['2026-02-22']).toBeDefined();
      expect(planning['2026-02-15'][0].id).toBe('sub1');
      expect(planning['2026-02-15'][0].orderDate).toBe('2026-02-15');
      expect(planning['2026-02-15'][0].canSkip).toBe(false);
    });

    it('should add future orders up to maxDate (Week - Even)', () => {
      const planning: Record<string, SubscriptionPlanning[]> = {};
      const sub = {
        ...makeSubData({
          schedule: '1W',
          orderDate: '2026-02-08',
        }),
        id: 'sub1',
      } as SubscriptionApp;
      const maxDate = subUtil.strToDate('2026-03-01'); // Should include 15th and 22nd

      scheduleFutureOrders(planning, sub, maxDate);
      expect(Object.keys(planning)).toHaveLength(3);
      expect(planning['2026-02-15']).toBeDefined();
      expect(planning['2026-02-22']).toBeDefined();
      expect(planning['2026-03-01']).toBeDefined();
      expect(planning['2026-02-15'][0].id).toBe('sub1');
      expect(planning['2026-02-15'][0].orderDate).toBe('2026-02-15');
      expect(planning['2026-02-15'][0].canSkip).toBe(false);
      expect(
        Object.values(planning)
          .flat()
          .every((p) => p.canSkip === false),
      ).toBe(true);
    });

    it('should add future orders up to maxDate (M)', () => {
      const planning: Record<string, SubscriptionPlanning[]> = {};
      const sub = {
        ...makeSubData({
          schedule: '1W',
          orderDate: '2026-02-08',
        }),
        id: 'sub1',
      } as SubscriptionApp;
      const maxDate = subUtil.strToDate('2026-02-23'); // Should include 15th and 22nd

      scheduleFutureOrders(planning, sub, maxDate);

      expect(Object.keys(planning)).toHaveLength(2);
      expect(planning['2026-02-15']).toBeDefined();
      expect(planning['2026-02-22']).toBeDefined();
      expect(planning['2026-02-15'][0].id).toBe('sub1');
      expect(planning['2026-02-15'][0].orderDate).toBe('2026-02-15');
      expect(planning['2026-02-15'][0].canSkip).toBe(false);
    });
  });

  describe('buildSubscriptionsForAddressPlanning', () => {
    it('should group and schedule subscriptions for a specific address', () => {
      const sub = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '1M',
          orderDate: '2026-02-20',
          status: SubscriptionStatus.Active,
        }),
        id: 'sub1',
      } as SubscriptionApp;

      const delivery: DeliveryApp = {
        id: 'del1',
        customerId: SampleIds.customer1Id,
        shippingAddressId: SampleIds.address1Id,
        orderDate: '2026-02-20',
        status: DeliveryStatus.Active,
        paymentInfo: [],
      };

      const result = buildSubscriptionsForAddressPlanning(
        [sub],
        [delivery],
        1,
        5,
      );

      // Result should have 2026-02-20 and also future dates (since monthsToShow=1)
      expect(result['2026-02-20']).toBeDefined();
      expect(result['2026-02-20'].subscriptions).toHaveLength(1);
      expect(result['2026-02-20'].delivery).toEqual(delivery);
      expect(result['2026-02-20'].isOnDateFreeze).toBe(false); // 20th is > 5 days from 8th
      expect(result['2026-02-20'].canSkipAll).toBe(true);
      expect(result['2026-02-20'].lastDayToEdit).toBe('2026-02-15');

      const futureDates = Object.keys(result).filter((d) => d > '2026-02-20');
      expect(futureDates.length).toBeGreaterThan(0);
    });

    it('should only allow skipping the first available subscription per frequency category (W/M)', () => {
      // BASE_DATE = '2026-02-08'
      // Sub 1: 1M, Feb 20 (Not frozen)
      const sub1 = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '1M',
          orderDate: '2026-02-20',
          status: SubscriptionStatus.Active,
        }),
        id: 'sub1',
      } as SubscriptionApp;

      // Sub 2: 2M, Mar 20 (Not frozen)
      const sub2 = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '2M',
          orderDate: '2026-03-20',
          status: SubscriptionStatus.Active,
        }),
        id: 'sub2',
      } as SubscriptionApp;

      const result = buildSubscriptionsForAddressPlanning(
        [sub1, sub2],
        [],
        1,
        5,
      );

      expect(result['2026-02-20'].subscriptions[0].canSkip).toBe(true);
      // This is the expected failure point before the fix
      expect(
        result['2026-03-20'].subscriptions.find((s) => s.id === 'sub2')
          ?.canSkip,
      ).toBe(false);
    });

    it('should allow skipping a subscription if previous ones in the same category are NOT skippable (e.g. frozen)', () => {
      // BASE_DATE = '2026-02-08', freezeTime = 5
      // Sub 1: 1M, Feb 10 (Frozen: 10 - 5 = 5. 8 is not before 5. Wait. isBefore(today(), freezeDate))
      // subUtil.isOrderDateFrozen returns true if !isBefore(today, freezeDate)
      // freezeDate = 10 - 5 = 5.
      // today = 8.
      // isBefore(8, 5) is false.
      // !false is true. So it's frozen. Correct.

      const sub1 = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '1M',
          orderDate: '2026-02-10',
          status: SubscriptionStatus.Active,
        }),
        id: 'sub1',
      } as SubscriptionApp;

      // Sub 2: 2M, Mar 20 (Not frozen)
      const sub2 = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '2M',
          orderDate: '2026-03-20',
          status: SubscriptionStatus.Active,
        }),
        id: 'sub2',
      } as SubscriptionApp;

      const result = buildSubscriptionsForAddressPlanning(
        [sub1, sub2],
        [],
        1,
        5,
      );

      expect(result['2026-02-10'].subscriptions[0].canSkip).toBe(false); // Frozen
      expect(
        result['2026-03-20'].subscriptions.find((s) => s.id === 'sub2')
          ?.canSkip,
      ).toBe(true); // Should be true because previous one was NOT skippable
    });

    it('should correctly differentiate between Active, OnGoing, and NotScheduled statuses', () => {
      // BASE_DATE = '2026-02-08'
      // 1. Active subscription: should be skippable if not frozen
      const subActive = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '1M',
          orderDate: '2026-02-20',
          status: SubscriptionStatus.Active,
        }),
        id: 'subActive',
      } as SubscriptionApp;

      // 2. OnGoing subscription: should NOT be skippable, status should remain 'O'
      const subOnGoing = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '1W',
          orderDate: '2026-02-15',
          status: SubscriptionStatus.OnGoing,
        }),
        id: 'subOnGoing',
      } as SubscriptionApp;

      const result = buildSubscriptionsForAddressPlanning(
        [subActive, subOnGoing],
        [],
        1,
        5,
      );

      // Check OnGoing subscription
      const onGoingGroup = result['2026-02-15'];
      expect(onGoingGroup).toBeDefined();
      const onGoingPlaning = onGoingGroup.subscriptions.find(
        (s) => s.id === 'subOnGoing',
      );
      expect(onGoingPlaning?.status).toBe(SubscriptionStatus.OnGoing);
      expect(onGoingPlaning?.canSkip).toBe(false);

      // Check Active subscription
      const activeGroup = result['2026-02-20'];
      expect(activeGroup).toBeDefined();
      const activePlanning = activeGroup.subscriptions.find(
        (s) => s.id === 'subActive',
      );
      expect(activePlanning?.status).toBe(SubscriptionStatus.Active);
      expect(activePlanning?.canSkip).toBe(true);

      // Check NotScheduled (Future order for Active subscription)
      // Next date for 1M from 2026-02-20 is 2026-03-20
      const futureActiveGroup = result['2026-03-20'];
      expect(futureActiveGroup).toBeDefined();
      const futureActivePlanning = futureActiveGroup.subscriptions.find(
        (s) => s.id === 'subActive',
      );
      expect(futureActivePlanning?.status).toBe(
        SubscriptionStatus.NotScheduled,
      );
      expect(futureActivePlanning?.canSkip).toBe(false);

      // Check NotScheduled (Future order for OnGoing subscription)
      // Next date for 1W from 2026-02-15 is 2026-02-22
      const futureOnGoingGroup = result['2026-02-22'];
      expect(futureOnGoingGroup).toBeDefined();
      const futureOnGoingPlanning = futureOnGoingGroup.subscriptions.find(
        (s) => s.id === 'subOnGoing',
      );
      expect(futureOnGoingPlanning?.status).toBe(
        SubscriptionStatus.NotScheduled,
      );
      expect(futureOnGoingPlanning?.canSkip).toBe(false);
    });
  });

  describe('buildSubscriptionsForCustomerPlanning', () => {
    it('should group planning by address', () => {
      const sub1 = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          orderDate: '2026-02-20',
        }),
        id: 'sub1',
      } as SubscriptionApp;
      const sub2 = {
        ...makeSubData({
          shippingAddressId: SampleIds.address2Id,
          orderDate: '2026-02-25',
        }),
        id: 'sub2',
      } as SubscriptionApp;

      const result = buildSubscriptionsForCustomerPlanning(
        [sub1, sub2],
        [],
        1,
        5,
      );

      expect(result[SampleIds.address1Id]).toBeDefined();
      expect(result[SampleIds.address2Id]).toBeDefined();
      expect(result[SampleIds.address1Id]['2026-02-20']).toBeDefined();
      expect(result[SampleIds.address2Id]['2026-02-25']).toBeDefined();
    });
  });

  describe('buildSubscriptionsForCustomerPlanning - Complex Scenario', () => {
    it('should correctly project and group subscriptions across multiple addresses with overlapping schedules', () => {
      // BASE_DATE = '2026-02-08' (Sunday)

      // Address 1:
      // Sub A: Weekly starting Feb 8. Dates: Feb 8, 15, 22, Mar 1, 8, 15, 22, 29, Apr 5, 12...
      const subA = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '1W',
          orderDate: '2026-02-08',
          status: SubscriptionStatus.Active,
        }),
        id: 'subA',
      } as SubscriptionApp;

      // Sub B: Monthly starting Feb 8. Dates: Feb 8, Mar 8 (2nd Sun), Apr 12 (2nd Sun)...
      const subB = {
        ...makeSubData({
          shippingAddressId: SampleIds.address1Id,
          schedule: '1M',
          orderDate: '2026-02-08',
          status: SubscriptionStatus.Active,
        }),
        id: 'subB',
      } as SubscriptionApp;

      // Address 2:
      // Sub C: Bi-weekly starting Feb 15. Dates: Feb 15, Mar 1, Mar 15, Mar 29, Apr 12...
      const subC = {
        ...makeSubData({
          shippingAddressId: SampleIds.address2Id,
          schedule: '2W',
          orderDate: '2026-02-15',
          status: SubscriptionStatus.Active,
        }),
        id: 'subC',
      } as SubscriptionApp;

      // Delivery for the overlap date on Address 1
      const deliveryA: DeliveryApp = {
        id: 'delA-Mar08',
        customerId: SampleIds.customer1Id,
        shippingAddressId: SampleIds.address1Id,
        orderDate: '2026-03-08',
        status: DeliveryStatus.Active,
        paymentInfo: [],
      };

      const monthsToShow = 2; // Project up to April
      const result = buildSubscriptionsForCustomerPlanning(
        [subA, subB, subC],
        [deliveryA],
        monthsToShow,
        5,
      );

      // --- Assertions for Address 1 ---
      const addr1 = result[SampleIds.address1Id];
      expect(addr1).toBeDefined();

      // Check overlap date: Mar 8
      expect(addr1['2026-03-08']).toBeDefined();
      expect(addr1['2026-03-08'].subscriptions).toHaveLength(2);
      expect(addr1['2026-03-08'].subscriptions.map((s) => s.id)).toContain(
        'subA',
      );
      expect(addr1['2026-03-08'].subscriptions.map((s) => s.id)).toContain(
        'subB',
      );
      expect(addr1['2026-03-08'].delivery).toEqual(deliveryA);

      // Check another overlap date: Apr 12
      expect(addr1['2026-04-12']).toBeDefined();
      expect(addr1['2026-04-12'].subscriptions).toHaveLength(2);

      // Check a weekly-only date
      expect(addr1['2026-02-15']).toBeDefined();
      expect(addr1['2026-02-15'].subscriptions).toHaveLength(1);
      expect(addr1['2026-02-15'].subscriptions[0].id).toBe('subA');

      // --- Assertions for Address 2 ---
      const addr2 = result[SampleIds.address2Id];
      expect(addr2).toBeDefined();

      // Check bi-weekly projections
      expect(addr2['2026-02-15']).toBeDefined();
      expect(addr2['2026-03-01']).toBeDefined();
      expect(addr2['2026-03-15']).toBeDefined();
      expect(addr2['2026-03-29']).toBeDefined();
      expect(addr2['2026-04-12']).toBeDefined();
      expect(addr2['2026-02-15'].subscriptions[0].id).toBe('subC');
      expect(addr2['2026-03-01'].subscriptions[0].id).toBe('subC');
    });
  });
});
