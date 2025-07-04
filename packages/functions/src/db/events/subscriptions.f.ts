import {
  Change,
  DocumentSnapshot,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import {
  DeliveryApp,
  DeliveryDb,
  DeliveryStatus,
  getNextActiveDeliveriesForCustomer,
  getSubscription,
  getSubscriptions,
  persistSubscriptionToDelivery,
  SubscriptionDb,
  SubscriptionStatus,
  updateSubscription,
  removeFromActiveDeliveries,
} from '../subscriptions';
import {
  isBefore,
  startOfDay,
  isSameDay,
  isAfter,
  differenceInMilliseconds,
} from 'date-fns';
import {
  dateToStr,
  getNextScheduledDate,
  getPreviousScheduledDate,
  hasExactSchedule,
  hasSameUnitSchedule,
  strToDate,
} from '../../util/subscriptions';

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

export const findEarliestSuitableDeliveryDate = (
  registeredDeliveryDate: Date,
  schedule: string,
): Date => {
  const today = startOfDay(new Date());
  let candidateDeliveryDateOnSchedule = registeredDeliveryDate;
  do {
    candidateDeliveryDateOnSchedule = getPreviousScheduledDate(
      candidateDeliveryDateOnSchedule,
      schedule,
    );
  } while (isAfter(candidateDeliveryDateOnSchedule, today));
  if (isSameDay(candidateDeliveryDateOnSchedule, today)) {
    return candidateDeliveryDateOnSchedule;
  } else {
    return getNextScheduledDate(candidateDeliveryDateOnSchedule, schedule);
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
  const nextOrderDate = strToDate(subscription.nextOrderDate!);

  let closest: DeliveryApp | null = null;
  let smallestDiff = Infinity;

  for (const delivery of deliveries) {
    if (!delivery.nextOrderDate) continue;
    const deliveryDate = strToDate(delivery.nextOrderDate);
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

const isNeedDeliveryProcessing = (
  subscriptionBefore: SubscriptionDb,
  subscriptionAfter: SubscriptionDb,
) => {
  const isNewSubscription = !subscriptionBefore;
  const hasNextOrderDateBeenUpdated =
    !isNewSubscription &&
    subscriptionAfter.nextOrderDate !== subscriptionBefore.nextOrderDate;
  return isNewSubscription || hasNextOrderDateBeenUpdated;
};

const isSubscriptionDateValid = (subscription: SubscriptionDb) => {
  const today = startOfDay(new Date());
  return (
    !subscription.nextOrderDate ||
    !isBefore(strToDate(subscription.nextOrderDate), today)
  );
};

export const processSubscriptionTransaction = async (
  change: Change<DocumentSnapshot>,
) => {
  const subscriptionRef = change.after;
  const _subscriptionRef = change.before;

  if (subscriptionRef && subscriptionRef.exists) {
    const subscription = subscriptionRef.data() as SubscriptionDb;
    const _subscription = change.before.data() as SubscriptionDb;

    if (
      subscription.status == SubscriptionStatus.Expired ||
      subscription.status == SubscriptionStatus.Paused
    ) {
      await removeFromActiveDeliveries(subscriptionRef.id, subscription);
    } else if (isNeedDeliveryProcessing(_subscription, subscription)) {
      if (!isSubscriptionDateValid(subscription)) {
        //todo - notify error
        return;
      }
      const today = startOfDay(new Date());
      const formattedNextOrderDate = subscription.nextOrderDate
        ? subscription.nextOrderDate
        : dateToStr(today);

      const deliveriesByOrderDate = await getNextActiveDeliveriesForCustomer(
        subscription.customerId,
        subscription.shippingAddressId,
      );
      if (deliveriesByOrderDate.length === 0 || subscription.nextOrderDate) {
        await removeFromActiveDeliveries(subscriptionRef.id, subscription);
        await persistSubscriptionToDelivery(subscriptionRef.id, {
          ...subscription,
          nextOrderDate: formattedNextOrderDate,
        });
        await updateSubscription(subscriptionRef.id, {
          nextOrderDate: formattedNextOrderDate,
          scheduled: true,
        });
      } else {
        const earlierDelivery = await findEarliestSuitableDelivery(
          deliveriesByOrderDate,
          subscription.schedule,
        );
        const formattedOrderDate = earlierDelivery.nextOrderDate!;
        const orderDate = strToDate(earlierDelivery.nextOrderDate!);
        const cutoffDate = getPreviousScheduledDate(
          orderDate,
          subscription.schedule,
        );
        if (isBefore(today, cutoffDate)) {
          const earliestDeliveryDateForSubscription =
            findEarliestSuitableDeliveryDate(orderDate, subscription.schedule);
          const suitableOrderDate = dateToStr(
            earliestDeliveryDateForSubscription,
          );
          await persistSubscriptionToDelivery(subscriptionRef.id, {
            ...subscription,
            nextOrderDate: suitableOrderDate,
          });
          await updateSubscription(subscriptionRef.id, {
            nextOrderDate: suitableOrderDate,
            scheduled: true,
          });
        } else {
          await persistSubscriptionToDelivery(subscriptionRef.id, {
            ...subscription,
            nextOrderDate: formattedOrderDate,
          });
          await updateSubscription(subscriptionRef.id, {
            nextOrderDate: formattedOrderDate,
            scheduled: true,
          });
        }
      }
    }
  } else if (_subscriptionRef && _subscriptionRef.exists) {
    await removeFromActiveDeliveries(
      _subscriptionRef.id,
      _subscriptionRef.data() as SubscriptionDb,
    );
  }
};

export const processDelivery = async (change: Change<DocumentSnapshot>) => {
  const deliveryRef = change.after;
  if (deliveryRef && deliveryRef.exists) {
    const delivery = deliveryRef.data() as DeliveryDb;
    if (delivery.status === DeliveryStatus.Processing) {
      const orderDate = strToDate(delivery.nextOrderDate!);
      delivery.paymentInfo.map(async (paymentInfo) => {
        if (!paymentInfo.errorCode) {
          paymentInfo.deliveries.map(async (subscriptionId) => {
            const subscription = await getSubscription(subscriptionId);
            if (subscription) {
              const nextOrderDate = getNextScheduledDate(
                orderDate,
                subscription.schedule,
              );
              await updateSubscription(subscriptionId, {
                nextOrderDate: dateToStr(nextOrderDate),
                previousOrderDate: delivery.nextOrderDate,
                scheduled: false,
              });
            }
          });
        }
      });
    }
  }
};

export const onSubscriptionWritten = onDocumentWritten(
  'subscriptions/{subscriptionId}',
  async (event) => {
    if (event.data) {
      processSubscriptionTransaction(event.data);
    }
  },
);

export const onDeliveryWritten = onDocumentWritten(
  'deliveries/{deliveryId}',
  async (event) => {
    if (event.data) {
      processDelivery(event.data);
    }
  },
);
