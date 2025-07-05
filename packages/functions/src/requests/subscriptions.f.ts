import { Type, Static } from '@sinclair/typebox';
import { validateWithMessages } from '../util';
import {
  addMonths,
  endOfDay,
  format,
  isBefore,
  lastDayOfMonth,
  startOfDay,
} from 'date-fns';
import {
  DATE_FORMAT,
  DeliveryApp,
  getActiveSubscriptions,
  getNextActiveDeliveriesForCustomer,
  SubscriptionPlanning,
} from '../db/subscriptions';
import { getNextScheduledDate, strToDate } from '../util/subscriptions';
import { groupBy } from 'lodash';
import { app } from '../app';
import { Request, Response } from 'express';

const nextScheduleQuerySchema = Type.Object({
  date: Type.String({ format: 'date' }),
  schedule: Type.String({ pattern: '^\\d+[MW]$' }),
});

const custmerSubscriptionPlanningSchema = Type.Object({
  customerId: Type.String(),
  monthsToShow: Type.Optional(Type.Number({ default: 6 })),
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

type SubscriptionsGroup = {
  delivery?: DeliveryApp;
  subscriptions: SubscriptionPlanning[];
};
type AddressSubscriptionGroup = Record<string, AddressDateSubscriptionGroup>;
type AddressDateSubscriptionGroup = Record<string, SubscriptionsGroup>;

export const buildSubscriptionPlanning = async (
  params: Static<typeof custmerSubscriptionPlanningSchema>,
) => {
  const { customerId, monthsToShow } = params;
  const planning: AddressSubscriptionGroup = {};
  const deliveries = await getNextActiveDeliveriesForCustomer(customerId);
  const subscriptions = await getActiveSubscriptions(customerId);
  const groupedDeliveries = groupBy(deliveries, 'shippingAddressId');
  const today = startOfDay(new Date());

  const maxDate = endOfDay(lastDayOfMonth(addMonths(today, monthsToShow!)));
  for (const addressId in groupedDeliveries) {
    const groupByDate = groupedDeliveries[
      addressId
    ].reduce<AddressDateSubscriptionGroup>((acc, delivery) => {
      const orderDate = delivery.nextOrderDate!;
      if (acc[orderDate]) {
        acc[orderDate].delivery = delivery;
      } else {
        acc[orderDate] = { delivery: delivery, subscriptions: [] };
      }
      delivery.paymentInfo.forEach((paymentInfo) => {
        paymentInfo.deliveries.forEach((subscriptionId) => {
          const subscription = subscriptions.find(
            (sub) => sub.id === subscriptionId,
          );
          if (subscription) {
            acc[orderDate].subscriptions.push({
              ...subscription,
              isEditable: true,
            });
            let nextOrderDate = getNextScheduledDate(
              strToDate(orderDate),
              subscription.schedule,
            );
            while (isBefore(nextOrderDate, maxDate)) {
              const nextOrderDateStr = format(nextOrderDate, DATE_FORMAT);
              if (!acc[nextOrderDateStr]) {
                acc[nextOrderDateStr] = {
                  delivery: undefined,
                  subscriptions: [],
                };
              }
              acc[nextOrderDateStr].subscriptions.push({
                ...subscription,
                isEditable: false,
              });
              nextOrderDate = getNextScheduledDate(
                nextOrderDate,
                subscription.schedule,
              );
            }
          }
        });
      });

      return acc;
    }, {});
    planning[addressId] = Object.fromEntries(
      Object.entries(groupByDate).sort(([keyA], [keyB]) =>
        keyA.localeCompare(keyB),
      ),
    );
  }
  return planning;
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
    const planning = await buildSubscriptionPlanning(result.data);
    res.status(200).send(planning);
  }
};

app.post('/customer-subscription-planning', getCustomerSubscriptionPlanning);
