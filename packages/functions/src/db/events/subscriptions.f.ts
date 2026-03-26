import {
  Change,
  DocumentSnapshot,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import {
  getSubscriptions,
  updateSubscription,
  getFreezeTimeInDays,
  getActiveSubscriptionsOrderedByOrderDate,
} from '../subscriptions.db';
import {
  isBefore,
  isSameDay,
  isAfter,
  differenceInMilliseconds,
  addDays,
} from 'date-fns';
import {
  dateToStr,
  getEarliestNextOrderDate,
  getNextScheduledDate,
  getPreviousScheduledDate,
  hasExactSchedule,
  hasSameUnitSchedule,
  isOrderDateFrozen,
  strToDate,
  today,
} from '../../util/subscriptions';
import {
  DeliveryApp,
  SubscriptionDb,
  SubscriptionStatus,
  DeliveryStatus,
  SubscriptionData,
} from '../types/subscriptions';
import {
  createDeliveryIfNotExists,
  getOngoingDeliveriesForCustomer,
  persistSubscriptionToDelivery,
} from '../deliveries.db';

export const findEarliestSuitableDelivery = async (
  deliveries: DeliveryApp[],
  schedule: string,
): Promise<DeliveryApp> => {
  const match = schedule.match(/^(\d+)([MW])$/);
  if (!match) {
    throw new Error('Invalid schedule format');
  }

  const type = match[2];

  for (const delivery of deliveries) {
    const subscriptions = await getSubscriptions(
      delivery.paymentInfo.flatMap((paymentinfo) => paymentinfo.deliveries),
    );

    if (
      (type === 'W' && hasExactSchedule(subscriptions, schedule)) ||
      hasSameUnitSchedule(subscriptions, schedule)
    ) {
      return delivery;
    }
  }
  return deliveries[0];
};

/**
 * Finds the earliest subscription in a list that matches a given schedule.
 *
 * This function searches an ordered list of subscriptions and returns the earliest subscription
 * whose schedule matches the provided schedule string. For weekly schedules ('W'), it prioritizes
 * an exact match (e.g., "2W" matching "2W"). If no exact match exists, it falls back to the earliest
 * subscription with the same unit schedule (e.g., any "xW"). For monthly schedules ('M'), it returns
 * the earliest subscription with the same unit schedule (e.g., any "xM").
 *
 * @param {SubscriptionData[]} orderedSubscriptions - The list of subscriptions, ordered by order date.
 * @param {string} schedule - The schedule string to match (e.g., "2W" for every 2 weeks, "1M" for every month).
 * @returns {SubscriptionData | null} The earliest matching subscription, or null if none match.
 * @throws {Error} If the schedule format is invalid.
 */
export const findEarliestMatchingScheduleSubscription = (
  orderedSubscriptions: SubscriptionData[],
  schedule: string,
): SubscriptionData | null => {
  const match = schedule.match(/^(\d+)([MW])$/);
  if (!match) {
    throw new Error('Invalid schedule format');
  }

  const type = match[2];

  if (type === 'W') {
    // For weekly: Prefer exact match, fall back to same unit
    const exactMatch = orderedSubscriptions.find((sub) =>
      hasExactSchedule([sub], schedule),
    );
    if (exactMatch) return exactMatch;
  }

  return (
    orderedSubscriptions.find((sub) => hasSameUnitSchedule([sub], schedule)) ||
    null
  );
};
/**
 * Finds the earliest order date on the given schedule that is suitable for scheduling
 * a subscription given a minimum next order date (freeze constraint).
 *
 * Algorithm:
 * - Start from a candidate order date and step backwards along the schedule using
 *   getPreviousScheduledDate until the candidate is not after the minimumNextOrderDate.
 * - If the found candidate falls on the same day as minimumNextOrderDate, return it.
 * - Otherwise return the next scheduled date after the candidate (the first future occurrence
 *   on the schedule after the candidate).
 *
 * Use case:
 * - Ensures the returned date respects the subscription schedule while also honoring
 *   the freeze window (minimumNextOrderDate).
 *
 * @param {Date} candidateOrderDate - A known order date that lies on the schedule (starting point).
 * @param {string} schedule - Schedule string (e.g. "2W", "1M") describing recurrence.
 * @param {Date} minimumNextOrderDate - The earliest allowed next order date (e.g. today + freeze time).
 * @returns {Date} The earliest suitable order date that can be used for the subscription.
 */
export const findEarliestSuitableOrderDate = (
  candidateOrderDate: Date,
  schedule: string,
  minimumNextOrderDate: Date,
): Date => {
  let candidateOrderDateOnSchedule = candidateOrderDate;
  do {
    candidateOrderDateOnSchedule = getPreviousScheduledDate(
      candidateOrderDateOnSchedule,
      schedule,
    );
  } while (isAfter(candidateOrderDateOnSchedule, minimumNextOrderDate));
  if (isSameDay(candidateOrderDateOnSchedule, minimumNextOrderDate)) {
    return candidateOrderDateOnSchedule;
  } else {
    return getNextScheduledDate(candidateOrderDateOnSchedule, schedule);
  }
};

export const findClosestFutureDeliveryForSubscription = (
  deliveries: DeliveryApp[],
  subscription: SubscriptionDb,
): DeliveryApp | null => {
  if (!deliveries.length) return null;

  // Use previousOrderDate if present, otherwise use today
  const baseDate = subscription.previousOrderDate
    ? strToDate(subscription.previousOrderDate)
    : null;

  const minimalNextOrderDate = baseDate
    ? getNextScheduledDate(baseDate, subscription.schedule)
    : null;
  const nextOrderDate = strToDate(subscription.orderDate!);

  let closest: DeliveryApp | null = null;
  let smallestDiff = Infinity;

  for (const delivery of deliveries) {
    if (!delivery.orderDate) continue;
    const deliveryDate = strToDate(delivery.orderDate);
    if (minimalNextOrderDate && !isAfter(deliveryDate, minimalNextOrderDate))
      continue; // Only consider dates after nextOrderDate

    const diff = differenceInMilliseconds(deliveryDate, nextOrderDate);
    if (closest === null || diff < smallestDiff) {
      closest = delivery;
      smallestDiff = diff;
    }
  }

  return closest;
};

/**
 * Determines whether delivery processing is needed for a subscription change.
 *
 * Delivery processing is required if:
 * - The subscription is active AND (it's new OR the order date has changed), OR
 * - The subscription status changed from Active to Ready.
 *
 * **Freeze Window Validation:**
 * If the subscription's order date is being updated to a date within the freeze window
 * (within the configured `freezeTimeInDays` from today), a `RangeError` is thrown.
 * This prevents modifications to orders that are too close to their delivery date.
 *
 * @param {SubscriptionDb | undefined} subscriptionBefore - The subscription state before the change (may be undefined for new subscriptions).
 * @param {SubscriptionDb} subscriptionAfter - The subscription state after the change.
 * @returns {boolean} True if delivery processing should occur, false otherwise.
 * @throws {RangeError} If the order date is being updated to a frozen date (within the freeze window).
 */
const isNeedDeliveryProcessing = async (
  subscriptionBefore: SubscriptionDb | undefined,
  subscriptionAfter: SubscriptionDb,
) => {
  const isNewSubscription = !subscriptionBefore;
  const isSubscriptionActive =
    subscriptionAfter.status === SubscriptionStatus.Active;
  const isSubscriptionReady =
    subscriptionAfter.status === SubscriptionStatus.Ready;
  const hasNextOrderDateBeenUpdated =
    !isNewSubscription &&
    subscriptionAfter.orderDate !== subscriptionBefore.orderDate;
  const isStatusChangedToReady =
    !isNewSubscription &&
    subscriptionBefore.status === SubscriptionStatus.Active &&
    isSubscriptionReady;

  const freezeTimeInDays = await getFreezeTimeInDays();
  if (
    subscriptionBefore &&
    subscriptionBefore.orderDate &&
    isOrderDateFrozen(subscriptionBefore.orderDate, freezeTimeInDays)
  ) {
    throw new RangeError(
      'Cannot update order date within freeze window. Please try again later.',
    );
  }
  return (
    (isSubscriptionActive &&
      (isNewSubscription || hasNextOrderDateBeenUpdated)) ||
    isStatusChangedToReady
  );
};

/**
 * Checks if a subscription's order date is valid (i.e., not in the past).
 *
 * A subscription is considered valid if:
 * - The order date is not set (falsy), or
 * - The order date is today or in the future.
 *
 * @param {SubscriptionDb} subscription - The subscription to check.
 * @returns {boolean} True if the order date is valid, false otherwise.
 */
const isSubscriptionDateValid = (subscription: SubscriptionDb) => {
  const _today = today();
  return (
    !subscription.orderDate ||
    !isBefore(strToDate(subscription.orderDate), _today)
  );
};

/**
 * Finds the most suitable next order date for a subscription, considering active subscriptions and freeze time.
 *
 * This function determines the earliest possible delivery date for a subscription, taking into account:
 * - The freeze time in days (minimum days before the next order can be scheduled).
 * - The schedule of the subscription.
 * - The order dates of other active subscriptions for the same customer and shipping address.
 *
 * It first fetches active subscriptions ordered by order date and determines a candidate order date
 * based on the earliest subscription with a matching schedule, or the earliest available date if none match.
 *
 * If the candidate order date is before the minimum next order date (today + freeze time), it selects an
 * anchor subscription (preferring the first matching subscription, or falling back to the earliest active subscription).
 * If an anchor subscription exists, it calls `getEarliestNextOrderDate` to align the new subscription with the anchor's
 * schedule. If no anchor subscription exists, it returns the next scheduled date on the subscription's own schedule.
 *
 * Otherwise, it calculates a cutoff date as the previous scheduled date from the candidate. If the minimum
 * next order date is before this cutoff date, it finds the earliest suitable order date using
 * `findEarliestSuitableOrderDate` to respect the freeze window. Otherwise, it returns the candidate
 * order date as is.
 *
 * @param {SubscriptionDb} subscription - The subscription for which to find the next order date.
 * @param {number} freezeTimeInDays - The freeze time in days to apply.
 * @returns {Promise<Date>} A promise that resolves to the determined next order date for the subscription.
 */
const findMatchingDateForSubscription = async (
  subscription: SubscriptionDb,
  freezeTimeInDays: number,
): Promise<Date> => {
  const minimumNextOrderDate = addDays(today(), freezeTimeInDays);
  const activeSubscriptionsByOrderDate =
    await getActiveSubscriptionsOrderedByOrderDate(
      subscription.customerId,
      subscription.shippingAddressId,
    );
  const firstMatchingSubscription = findEarliestMatchingScheduleSubscription(
    activeSubscriptionsByOrderDate,
    subscription.schedule,
  );
  const firstDateAvailable = activeSubscriptionsByOrderDate.length
    ? strToDate(activeSubscriptionsByOrderDate[0].orderDate!)
    : minimumNextOrderDate;
  const candidateOrderDate = firstMatchingSubscription
    ? strToDate(firstMatchingSubscription.orderDate!)
    : firstDateAvailable;

  if (isBefore(candidateOrderDate, minimumNextOrderDate)) {
    const anchorSubscription =
      firstMatchingSubscription ?? activeSubscriptionsByOrderDate[0];

    if (!anchorSubscription) {
      return getNextScheduledDate(candidateOrderDate, subscription.schedule);
    }

    return getEarliestNextOrderDate(
      candidateOrderDate,
      subscription.schedule,
      anchorSubscription.schedule,
    );
  }

  const cutoffDate = getPreviousScheduledDate(
    candidateOrderDate,
    subscription.schedule,
  );
  if (isBefore(minimumNextOrderDate, cutoffDate)) {
    const earliestOrderDateForSubscription = findEarliestSuitableOrderDate(
      candidateOrderDate,
      subscription.schedule,
      minimumNextOrderDate,
    );
    return earliestOrderDateForSubscription;
  }
  return candidateOrderDate;
};

/**
 * Determines if a subscription is considered part of a "first time delivery" for a customer and shipping address.
 *
 * First time delivery on a subscription basis means that the customer does not have any other subscriptions
 * planned for the given shipping address. However, due to post-processing, when a subscription is added to the
 * first delivery, a copy of the subscription with status 'OnGoing' is added to the delivery, and the processed
 * subscription remains active with its orderDate set to the next scheduled order date. This means querying for
 * active subscriptions is not sufficient to determine if this is the first delivery.
 *
 * To address this, a flag `isFirstDelivery` is set on the delivery when it is created at code freeze time.
 * This function checks for active deliveries for the customer and shipping address, and returns true if:
 *   - There are no active subscriptions and no active deliveries (i.e., this is the very first delivery), OR
 *   - There is a delivery with `isFirstDelivery` set and its order date is today.
 *
 * @param {string} customerId - The ID of the customer to check.
 * @param {string} shippingAddressId - The shipping address ID to check.
 * @returns {Promise<boolean>} A promise that resolves to true if this is a first time delivery, false otherwise.
 */
export const isFirstTimeDelivery = async (
  subscription: SubscriptionDb,
): Promise<boolean> => {
  const activeSubscriptions = await getActiveSubscriptionsOrderedByOrderDate(
    subscription.customerId,
    subscription.shippingAddressId,
  );

  const activeDeliveries = await getOngoingDeliveriesForCustomer(
    subscription.customerId,
    subscription.shippingAddressId,
  );

  if (activeSubscriptions.length === 0 && activeDeliveries.length === 0) {
    return true;
  }
  return !!activeDeliveries.find(
    (delivery) =>
      delivery.isFirstDelivery && delivery.orderDate === dateToStr(today()),
  );
};

/**
 * Creates a new delivery document in Firestore for a customer's first delivery to a specific shipping address.
 *
 * This function is used when a customer is making their first delivery for a given shipping address.
 * It creates a delivery with the current date as the order date, sets the status to 'Active',
 * and marks the delivery with the `isFirstDelivery` flag.
 *
 * The `isFirstDelivery` flag is important for distinguishing true first deliveries, since
 * post-processing may result in active subscriptions and deliveries even after the first delivery has occurred.
 * By setting this flag at code freeze time, the system can reliably identify and handle first-time deliveries.
 *
 * @param {string} customerId - The ID of the customer for whom the delivery is being created.
 * @param {string} shippingAddressId - The shipping address ID for the delivery.
 * @returns {Promise<boolean>} A promise that resolves to true if the delivery was created or upserted successfully.
 */
export const createFirstTimeDelivery = async (
  customerId: string,
  shippingAddressId: string,
) => {
  return createDeliveryIfNotExists({
    customerId: customerId,
    shippingAddressId: shippingAddressId,
    paymentInfo: [],
    orderDate: dateToStr(today()),
    status: DeliveryStatus.Active,
    isFirstDelivery: true,
  });
};

/**
 * Orchestrates the scheduling of a subscription when it is created or updated.
 *
 * This function is the central logic for ensuring a subscription has a valid `orderDate`.
 * It is triggered by {@link processSubscriptionTransaction} whenever a subscription is written.
 *
 * ---
 *
 * ### Scenarios
 *
 * 1.  **No `orderDate` (e.g., a new subscription):**
 *     - **First-Time Delivery**: If `isFirstTimeDelivery` returns `true`, the `orderDate` is set to the current day. This scenario is for a customer's very first order to a specific address.
 *     - **Aligning with Existing Deliveries**: If it's not a first-time delivery, the function calls `findMatchingDateForSubscription` to find an optimal `orderDate`. This aligns the new subscription with existing deliveries for that customer and address, matching the delivery schedule (e.g., weekly, monthly) while respecting the freeze window.
 *
 * 2.  **An `orderDate` is present and is "Frozen":**
 *     - The system has a configurable `freezeTimeInDays` (defaulting to 5). If the subscription's `orderDate` falls within this window, it's considered "frozen," meaning it's too close to the delivery day to be changed.
 *     - When frozen, the critical {@link persistSubscriptionToDelivery} function is called. This function executes a single, atomic Firestore transaction that performs three key actions:
 *         1.  **Archives a Copy**: It creates a snapshot of the subscription (with status `OnGoing`) for the upcoming delivery. This record represents the *actual* item in the delivery.
 *         2.  **Updates the Delivery**: It adds the subscription's ID to the corresponding `delivery` document for that `orderDate`, creating the delivery if it doesn't already exist.
 *         3.  **Advances the Original Subscription**: It updates the *original* subscription document by setting its `orderDate` to the *next* occurrence in its cycle (e.g., two weeks later for a '2W' schedule).
 *
 * 3.  **An `orderDate` is present and is Not Frozen:**
 *     - If the `orderDate` is valid and outside the freeze window, the function simply updates the subscription with the `scheduled: true` flag and the defined `orderDate`.
 *
 * ---
 *
 * This orchestration ensures that subscriptions are always scheduled correctly, deliveries are consistently managed, and race conditions are prevented through atomic transactions during the critical freeze period.
 *
 * If the subscription status is `Ready`, it will be reset to `Active` as part of the scheduling process.
 *
 * @param {string} subscriptionId - The ID of the subscription to schedule.
 * @param {SubscriptionDb} subscription - The subscription data being processed.
 * @returns {Promise<void>} A promise that resolves when the scheduling operation is complete.
 */
export const scheduleSubscription = async (
  subscriptionId: string,
  subscription: SubscriptionDb,
) => {
  const subscriptionUpdate: Partial<SubscriptionDb> = {
    scheduled: true,
    status: SubscriptionStatus.Active,
  };

  if (!isSubscriptionDateValid(subscription)) {
    //todo - notify error
    return;
  }
  const freezeTimeInDays = await getFreezeTimeInDays();

  let definedOrderDate: string | undefined = subscription.orderDate;
  const isFirstTime = await isFirstTimeDelivery(subscription);

  if (!definedOrderDate) {
    if (isFirstTime) {
      definedOrderDate = dateToStr(today());
    } else {
      const _matchingDateForSubscription =
        await findMatchingDateForSubscription(subscription, freezeTimeInDays);
      definedOrderDate = dateToStr(_matchingDateForSubscription);
    }
  }

  if (isOrderDateFrozen(definedOrderDate, freezeTimeInDays)) {
    await persistSubscriptionToDelivery(
      subscriptionId,
      {
        ...subscription,
        ...subscriptionUpdate,
        orderDate: definedOrderDate,
      },
      isFirstTime,
    );
  } else {
    await updateSubscription(subscriptionId, {
      ...subscriptionUpdate,
      orderDate: definedOrderDate,
    });
  }
};

/**
 * Processes a Firestore document write event for a subscription.
 *
 * This function is triggered whenever a subscription document is created or updated.
 * It determines if delivery processing is needed for the subscription based on its
 * status and whether its order date has changed. If processing is required, it
 * calls `scheduleSubscription` to handle the scheduling logic.
 *
 * @param {Change<DocumentSnapshot>} change - The change object containing the before and after states of the document.
 * @returns {Promise<void>} A promise that resolves when the processing is complete.
 */
export const processSubscriptionTransaction = async (
  change: Change<DocumentSnapshot>,
) => {
  const subscriptionRef = change.after;
  const _subscriptionRef = change.before;
  if (subscriptionRef && subscriptionRef.exists) {
    const subscription = subscriptionRef.data() as SubscriptionDb;
    const _subscription = _subscriptionRef.data() as SubscriptionDb;

    try {
      if (await isNeedDeliveryProcessing(_subscription, subscription)) {
        await scheduleSubscription(subscriptionRef.id, subscription);
      }
    } catch (error) {
      if (error instanceof RangeError) {
        //todo - deal with error
      }
    }
  }
};

/**export const processDelivery = async (change: Change<DocumentSnapshot>) => {
  const deliveryRef = change.after;
  if (deliveryRef && deliveryRef.exists) {
    const delivery = deliveryRef.data() as DeliveryDb;
    if (delivery.status === DeliveryStatus.Processing) {
      const orderDate = strToDate(delivery.orderDate);
      await Promise.all(
        delivery.paymentInfo.map(async (paymentInfo) => {
          if (!paymentInfo.errorCode) {
            await Promise.all(
              paymentInfo.deliveries.map(async (subscriptionId) => {
                const subscription = await getSubscription(subscriptionId);
                if (subscription) {
                  const nextOrderDate = getNextScheduledDate(
                    orderDate,
                    subscription.schedule,
                  );
                  await updateSubscription(subscriptionId, {
                    orderDate: dateToStr(nextOrderDate),
                    previousOrderDate: delivery.orderDate,
                    scheduled: false,
                  });
                }
              }),
            );
          }
        }),
      );
    }
  }
};*/

export const onSubscriptionWritten = onDocumentWritten(
  'subscriptions/{subscriptionId}',
  async (event) => {
    if (event.data) {
      await processSubscriptionTransaction(event.data);
    }
  },
);

/**export const onDeliveryWritten = onDocumentWritten(
  'deliveries/{deliveryId}',
  async (event) => {
    if (event.data) {
      await processDelivery(event.data);
    }
  },
);*/
