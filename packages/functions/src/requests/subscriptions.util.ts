import {
  DeliveryApp,
  SubscriptionApp,
  SubscriptionStatus,
} from '../db/types/subscriptions';
import {
  dateToStr,
  getNextScheduledDate,
  isOrderDateFrozen,
  strToDate,
} from '../util/subscriptions';
import {
  addMonths,
  endOfDay,
  isAfter,
  lastDayOfMonth,
  startOfDay,
  subDays,
} from 'date-fns';
import { groupBy } from 'lodash';

/**
 * A version of SubscriptionApp that includes its current "skippability" status.
 */
export type SubscriptionPlanning = {
  canSkip: boolean;
} & Pick<SubscriptionApp, 'id' | 'status' | 'orderDate' | 'schedule'>;

/**
 * A group of subscriptions occurring on a specific date, potentially linked to a delivery.
 */
export type SubscriptionsGroup = {
  /** The delivery information for this order date, if any. */
  delivery?: DeliveryApp;
  /** List of subscriptions scheduled for this order date. */
  subscriptions: SubscriptionPlanning[];
  /** Whether the order for this date is currently "frozen" (within the freeze period). */
  isOnDateFreeze: boolean;
  /** Whether every subscription in this group can be skipped. */
  canSkipAll: boolean;
  /** The last date (ISO string) the user can make changes to subscriptions in this group. */
  lastDayToEdit?: string;
};

/** Mapping of date strings (ISO) to their respective subscription group data. */
export type AddressDateSubscriptionGroup = Record<string, SubscriptionsGroup>;

/** Mapping of shipping address IDs to their date-based subscription groups. */
export type AddressSubscriptionGroup = Record<
  string,
  AddressDateSubscriptionGroup
>;

/**
 * Calculates the last day a subscription can be edited before it is frozen.
 *
 * @param orderDate - The date of the scheduled order (ISO string).
 * @param freezeTime - Number of days before the order date that editing is locked.
 * @returns The last editable date (ISO string).
 */
export const getLastDayToEdit = (
  orderDate: string,
  freezeTime: number,
): string => {
  return dateToStr(subDays(strToDate(orderDate), freezeTime));
};

/**
 * Determines if a subscription can be skipped based on its status and the order date's freeze status.
 *
 * @param subscription - The subscription application object.
 * @param orderDate - The date of the scheduled order (ISO string).
 * @param freezeTimeInDays - Number of days before the order date that editing is locked.
 * @returns True if the subscription is Active and not currently frozen.
 */
export const canSkipSubscription = (
  subscription: SubscriptionApp,
  orderDate: string,
  freezeTimeInDays: number,
) => {
  return (
    subscription.status === SubscriptionStatus.Active &&
    !isOrderDateFrozen(orderDate, freezeTimeInDays)
  );
};

export const formatSubscriptionForPlanning = (
  subscription: SubscriptionApp,
): SubscriptionPlanning => {
  const { id, status, schedule, orderDate } = subscription;
  if (!orderDate) {
    throw new Error(
      `Subscription with ID ${subscription.id} has no order date.`,
    ); // This should not happen if data is consistent
  }
  return {
    id,
    status,
    schedule,
    orderDate,
    canSkip: false,
  };
};

/**
 * Populates future orders for a subscription up to a maximum date based on its frequency schedule.
 *
 * @param subscriptionsPlanning - The accumulator object mapping dates to subscription lists.
 * @param subscription - The base subscription object to replicate forward.
 * @param maxDate - The furthest date in the future to schedule orders for.
 */
export const scheduleFutureOrders = (
  subscriptionsPlanning: Record<string, SubscriptionPlanning[]>,
  subscription: SubscriptionApp,
  maxDate: Date,
) => {
  let nextOrderDate = getNextScheduledDate(
    strToDate(subscription.orderDate!),
    subscription.schedule,
  );

  while (!isAfter(nextOrderDate, maxDate)) {
    const nextOrderDateStr = dateToStr(nextOrderDate);

    subscriptionsPlanning[nextOrderDateStr] = [
      ...(subscriptionsPlanning[nextOrderDateStr] || []),
      {
        ...formatSubscriptionForPlanning(subscription),
        orderDate: nextOrderDateStr,
        status: SubscriptionStatus.NotScheduled, // Future orders are not yet active
      },
    ];

    nextOrderDate = getNextScheduledDate(nextOrderDate, subscription.schedule);
  }
};

/**
 * Internal helper to format raw groups of subscriptions into a formal SubscriptionsGroup structure.
 *
 * @param orderDate - The date of the group (ISO string).
 * @param subscriptions - The list of subscriptions planned for this date.
 * @param delivery - Optional delivery data for this date.
 * @param freezeTimeInDays - Days before order where editing is disabled.
 * @returns A formatted group object with metadata like `canSkipAll` and `lastDayToEdit`.
 */
const formatSubscriptionsGroup = (
  orderDate: string,
  subscriptions: SubscriptionPlanning[],
  delivery?: DeliveryApp,
  freezeTimeInDays: number = 5,
): SubscriptionsGroup => {
  const canSkipAll = subscriptions.every((s) => s.canSkip);
  const canSkipSome = subscriptions.some((s) => s.canSkip);
  const isOnDateFreeze = isOrderDateFrozen(orderDate, freezeTimeInDays);

  const group: SubscriptionsGroup = {
    subscriptions,
    canSkipAll,
    isOnDateFreeze,
    delivery,
  };

  if (canSkipSome || isOnDateFreeze) {
    group.lastDayToEdit = getLastDayToEdit(orderDate, freezeTimeInDays);
  }

  return group;
};

/**
 * Determines if a subscription is skippable within the context of all subscriptions for an address.
 * A subscription is skippable if it's the first available (not frozen) occurrence in its frequency category (W/M).
 *
 * @param subscriptionId - The ID of the subscription to check.
 * @param allSubscriptionsForAddress - All active subscriptions for the same address.
 * @param freezeTimeInDays - Days before order where editing is disabled.
 * @returns True if the subscription can be skipped.
 */
export const isSkippable = (
  subscriptionId: string,
  allSubscriptionsForAddress: SubscriptionApp[],
  freezeTimeInDays: number,
): boolean => {
  const firstSkippableDateByCategory: Record<string, string | null> = {
    W: null,
    M: null,
  };

  const sortedSubs = [...allSubscriptionsForAddress]
    .filter((s) => !!s.orderDate)
    .sort((a, b) => a.orderDate!.localeCompare(b.orderDate!));

  for (const sub of sortedSubs) {
    const category = sub.schedule.slice(-1);
    const isActuallySkippable = canSkipSubscription(
      sub,
      sub.orderDate!,
      freezeTimeInDays,
    );

    if (isActuallySkippable && !firstSkippableDateByCategory[category]) {
      firstSkippableDateByCategory[category] = sub.orderDate!;
    }

    if (sub.id === subscriptionId) {
      return (
        isActuallySkippable &&
        firstSkippableDateByCategory[category] === sub.orderDate
      );
    }
  }

  return false;
};

/**
 * Builds a comprehensive planning object for a single address, including scheduled future orders.
 *
 * @param subscriptionsForAddress - All subscriptions associated with a specific address.
 * @param deliveriesForAddress - Existing delivery records associated with a specific address.
 * @param monthsToShow - How far into the future (in months) to project new orders.
 * @param freezeTimeInDays - Days before order where editing is disabled.
 * @returns A sorted object mapping ISO date strings to subscription groups.
 */
export const buildSubscriptionsForAddressPlanning = (
  subscriptionsForAddress: SubscriptionApp[],
  deliveriesForAddress: DeliveryApp[] = [],
  monthsToShow: number = 6,
  freezeTimeInDays: number = 5,
): AddressDateSubscriptionGroup => {
  const today = startOfDay(new Date());
  const maxDate = endOfDay(lastDayOfMonth(addMonths(today, monthsToShow)));

  // 1. Group subscriptions by date and schedule future ones
  const subscriptionsByDate = [...subscriptionsForAddress]
    .filter((s) => !!s.orderDate)
    .reduce<Record<string, SubscriptionPlanning[]>>((acc, subscription) => {
      const orderDate = subscription.orderDate!;

      acc[orderDate] = acc[orderDate] || [];
      acc[orderDate].push({
        ...formatSubscriptionForPlanning(subscription),
        canSkip: isSkippable(
          subscription.id,
          subscriptionsForAddress,
          freezeTimeInDays,
        ),
      });

      scheduleFutureOrders(acc, subscription, maxDate);
      return acc;
    }, {});

  // 2. Index deliveries by date for O(1) lookup
  const deliveriesByDate = groupBy(deliveriesForAddress, 'orderDate');

  // 3. Format into final AddressDateSubscriptionGroup
  const entries = Object.entries(subscriptionsByDate)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([orderDate, plannedSubscriptions]): [string, SubscriptionsGroup] => {
      const delivery = deliveriesByDate[orderDate]?.[0];
      return [
        orderDate,
        formatSubscriptionsGroup(
          orderDate,
          plannedSubscriptions,
          delivery,
          freezeTimeInDays,
        ),
      ];
    });

  return Object.fromEntries(entries);
};

/**
 * Builds a multi-address planning object for a customer by grouping their data by address.
 *
 * @param subscriptionsForCustomer - All subscriptions belonging to the customer.
 * @param deliveriesForCustomer - All delivery records belonging to the customer.
 * @param monthsToShow - How far into the future (in months) to project new orders.
 * @param freezeTimeInDays - Days before order where editing is disabled.
 * @returns An object mapping Address IDs to their respective date-based planning objects.
 */
export const buildSubscriptionsForCustomerPlanning = (
  subscriptionsForCustomer: SubscriptionApp[],
  deliveriesForCustomer: DeliveryApp[] = [],
  monthsToShow: number = 6,
  freezeTimeInDays: number = 5,
): AddressSubscriptionGroup => {
  const groupedSubscriptions = groupBy(
    subscriptionsForCustomer,
    'shippingAddressId',
  );
  const groupedDeliveries = groupBy(deliveriesForCustomer, 'shippingAddressId');

  const entries = Object.entries(groupedSubscriptions).map<
    [string, AddressDateSubscriptionGroup]
  >(([addressId, subscriptions]) => {
    const deliveriesForAddress = groupedDeliveries[addressId] || [];
    return [
      addressId,
      buildSubscriptionsForAddressPlanning(
        subscriptions,
        deliveriesForAddress,
        monthsToShow,
        freezeTimeInDays,
      ),
    ];
  });

  return Object.fromEntries(entries);
};
