import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { firestore } from '../../firestore';
import { PromisePool } from '@supercharge/promise-pool';
import {
  DATE_FORMAT,
  DeliveryApp,
  deliveryDbConverter,
  DeliveryStatus,
  getDelivery,
  updateDelivery,
} from '../subscriptions';
import { format, startOfDay } from 'date-fns';

const MAX_CONCURRENCY = 10;
const findTodaysActiveDeliveries = async (): Promise<DeliveryApp[]> => {
  const today = startOfDay(new Date());
  const result = await firestore
    .collection('deliveries')
    .withConverter(deliveryDbConverter)
    .where('nextOrderDate', '==', format(today, DATE_FORMAT))
    .where('status', '==', 'A')
    .get();
  return result.empty
    ? []
    : result.docs.map((doc) => {
        return doc.data();
      });
};

export const processDayDeliveries = onSchedule('every day 06:00', async () => {
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
});

export const handlePaymentWebhook = onRequest(async (request, response) => {
  const { deliveryId, paymentCode, status, errorCode } = request.body;
  if (status === 'success') {
    await updateDelivery(deliveryId, {
      status: DeliveryStatus.Processing,
    });
  } else {
    const delivery = await getDelivery(deliveryId);
    if (delivery) {
      const paymentInfo = delivery.paymentInfo;
      paymentInfo.forEach((info) => {
        if (info === paymentCode) {
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
    }
  }

  response.sendStatus(200);
});
