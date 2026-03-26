import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { PromisePool } from '@supercharge/promise-pool';
import {
  findTodaysActiveSubscriptionsOnTimeFreeze,
  updateSubscription,
} from '../subscriptions.db';
import { DeliveryStatus, SubscriptionStatus } from '../types/subscriptions';
import { findTodaysActiveDeliveries, updateDelivery } from '../deliveries.db';

const MAX_CONCURRENCY = 10;

export const processActiveDeliveries = async () => {
  const deliveries = await findTodaysActiveDeliveries();
  if (deliveries.length) {
    await PromisePool.for(deliveries)
      .withConcurrency(MAX_CONCURRENCY)
      .process(async (delivery) => {
        //todo - create order
        return updateDelivery(delivery.id, {
          status: DeliveryStatus.WaitingPayment,
        });
      });
  }
};

export const processActiveSubscriptions = async () => {
  const subscriptions = await findTodaysActiveSubscriptionsOnTimeFreeze();
  if (subscriptions.length) {
    await PromisePool.for(subscriptions)
      .withConcurrency(MAX_CONCURRENCY)
      .process(async (subscription) => {
        return updateSubscription(subscription.id, {
          status: SubscriptionStatus.Ready,
        });
      });
  }
};

export const processDayDeliveries = onSchedule('every day 06:00', async () => {
  await processActiveDeliveries();
  await processActiveSubscriptions();
});

type PaymentWebhookRequest = {
  deliveryId: string;
  paymentCode: string;
  status: 'success' | 'failed';
  errorCode?: string;
};

export const handlePaymentWebhook = onRequest(async (request, response) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deliveryId, paymentCode, status, errorCode } =
    request.body as PaymentWebhookRequest;
  if (status === 'success') {
    await updateDelivery(deliveryId, {
      status: DeliveryStatus.Processing,
    });
  } else {
    /*const delivery = await getDelivery(deliveryId);
    if (delivery) {
      
      const paymentInfo = delivery.paymentInfo;
      paymentInfo.forEach((info) => {
        if (info.paymentCode === paymentCode) {
          info.attemptCount = info.attemptCount ? info.attemptCount + 1 : 1;
          info.errorCode = errorCode;
        }
      });
      await updateDelivery(deliveryId, {
        status: DeliveryStatus.Failed,
        paymentInfo: paymentInfo,
      });
    } else {
      //to do - log error
    }*/
  }

  response.sendStatus(200);
});
