import { Type } from '@sinclair/typebox';
import { validateWithMessages } from '../util';
import { format } from 'date-fns';
import {
  DATE_FORMAT,
  dateToStr,
  getNextScheduledDate,
  strToDate,
} from '../util/subscriptions';
import { app } from '../app';
import { Request, Response } from 'express';
import {
  getFreezeTimeInDays,
  getSubscription,
  getSubscriptionsByStatusesOrderedByOrderDate,
  updateSubscription,
} from '../db/subscriptions.db';
import {
  buildSubscriptionsForCustomerPlanning,
  isSkippable,
} from './subscriptions.util';
import { SubscriptionStatus } from '../db/types/subscriptions';
import { getOngoingDeliveriesForCustomer } from '../db/deliveries.db';

const nextScheduleQuerySchema = Type.Object({
  date: Type.String({ format: 'date' }),
  schedule: Type.String({ pattern: '^\\d+[MW]$' }),
});

const custmerSubscriptionPlanningSchema = Type.Object({
  customerId: Type.String(),
  monthsToShow: Type.Optional(Type.Number({ default: 6 })),
});

const skipSubscriptionSchema = Type.Object({
  id: Type.String(),
});

export const nextScheduledDate = (req: Request, res: Response) => {
  const result = validateWithMessages(nextScheduleQuerySchema, req.body, {
    date: 'Invalid "date" format. Expected ISO string like "2025-06-16T00:00:00Z".',
    schedule: 'Invalid "schedule". Use something like "1M" or "2W".',
  });

  if (!result.valid) {
    res.status(400).send({ errors: result.errors });
  } else {
    const { date, schedule } = result.data;
    const next = format(
      getNextScheduledDate(new Date(date), schedule),
      DATE_FORMAT,
    );

    res.status(200).send({ nextDate: next });
  }
};

app.post('/next-scheduled-date', nextScheduledDate);

export const prepareSubscriptionsForCustomerPlanning = async (
  customerId: string,
  monthsToShow: number = 6,
) => {
  const freezeTime = await getFreezeTimeInDays();
  const subscriptionsFromCustomer =
    await getSubscriptionsByStatusesOrderedByOrderDate(customerId, [
      SubscriptionStatus.Active,
      SubscriptionStatus.OnGoing,
    ]);
  const deliveriesFromCustomer =
    await getOngoingDeliveriesForCustomer(customerId);
  return buildSubscriptionsForCustomerPlanning(
    subscriptionsFromCustomer,
    deliveriesFromCustomer,
    freezeTime,
    monthsToShow,
  );
};

export const getCustomerSubscriptionPlanning = async (
  req: Request,
  res: Response,
) => {
  const result = validateWithMessages(
    custmerSubscriptionPlanningSchema,
    req.body,
    {
      customerId: 'Invalid "customerId". Expected a valid customer ID.',
      monthsToShow: 'Invalid "monthsToShow". Expected a number.',
    },
  );
  if (!result.valid) {
    res.status(400).send({ errors: result.errors });
  } else {
    const { customerId, monthsToShow } = result.data;
    const planning = await prepareSubscriptionsForCustomerPlanning(
      customerId,
      monthsToShow,
    );
    res.status(200).send(planning);
  }
};

app.post('/customer-subscription-planning', getCustomerSubscriptionPlanning);

export const processSkipSubscription = async (subscriptionId: string) => {
  const freezeTime = await getFreezeTimeInDays();
  const subscription = await getSubscription(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription with ID ${subscriptionId} not found.`);
  }
  if (!subscription.orderDate) {
    throw new Error(
      `Subscription with ID ${subscriptionId} has no next order date.`,
    );
  }

  const subscriptionsForAddress =
    await getSubscriptionsByStatusesOrderedByOrderDate(
      subscription.customerId,
      [SubscriptionStatus.Active],
      subscription.shippingAddressId,
    );

  const canSkip = isSkippable(
    subscriptionId,
    subscriptionsForAddress,
    freezeTime,
  );

  if (!canSkip) {
    throw new Error(`Subscription with ID ${subscriptionId} cannot be skipped`);
  }
  const nextOrderDate = getNextScheduledDate(
    strToDate(subscription.orderDate),
    subscription.schedule,
  );
  await updateSubscription(subscriptionId, {
    orderDate: dateToStr(nextOrderDate),
  });
};

const skipSubscription = async (req: Request, res: Response) => {
  const result = validateWithMessages(skipSubscriptionSchema, req.body, {
    id: 'Invalid "id". Expected a valid subscription ID.',
  });
  if (!result.valid) {
    res.status(400).send({ errors: result.errors });
  } else {
    try {
      await processSkipSubscription(result.data.id);
      res.status(200).send({ success: true });
    } catch (error) {
      res.status(500).send(error);
    }
  }
};

app.post('/skip-subscription', skipSubscription);
