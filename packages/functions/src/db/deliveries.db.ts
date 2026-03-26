import { FieldValue, Firestore } from 'firebase-admin/firestore';
import {
  DeliveryApp,
  DeliveryDb,
  deliveryDbConverter,
  DeliveryKey,
  DeliveryStatus,
  PaymentInfo,
  SubscriptionDb,
} from './types/subscriptions';
import { firestore } from '../firestore';
import {
  createOngoingSubscription,
  updateSubscriptionInTransaction,
} from './subscriptions.db';
import {
  dateToStr,
  getNextScheduledDate,
  strToDate,
  today,
} from '../util/subscriptions';

/**
 * Retrieves all active deliveries for a given customer and (optionally) a shipping address.
 *
 * Active deliveries are deliveries that are created from the configured freeze time in days
 * up until the day the delivery is completed (i.e., when the subscriptions have been delivered).
 * They started as active, and may have transitioned to other states like 'Retry' or 'Shipped',
 * until the final state 'Completed'.
 *
 * Ideally, there will be only one active delivery at a time for a given customer and address,
 * as the freeze time should be less than the minimum schedule interval, preventing overlap.
 *
 * Queries the 'deliveries' collection for documents with the specified customer ID
 * and status 'Active'. If a shipping address ID is provided, it further filters by that address.
 * Results are ordered by 'orderDate'.
 *
 * @param {string} customerId - The ID of the customer whose deliveries to retrieve.
 * @param {string} [shippingAddressId] - (Optional) The shipping address ID to filter deliveries.
 * @returns {Promise<DeliveryApp[]>} A promise that resolves to an array of active deliveries.
 */
export const getActiveDeliveries = async (
  customerId: string,
  shippingAddressId?: string,
  db: Firestore = firestore,
): Promise<DeliveryApp[]> => {
  let query = db
    .collection('deliveries')
    .withConverter(deliveryDbConverter)
    .where('customerId', '==', customerId)
    .where('status', '==', DeliveryStatus.Active);
  if (shippingAddressId !== undefined) {
    query = query.where('shippingAddressId', '==', shippingAddressId);
  }
  const result = await query.orderBy('orderDate').get();
  return result.empty
    ? []
    : result.docs.map((doc) => {
        return doc.data();
      });
};

/**
 * Retrieves all ongoing deliveries for a given customer and (optionally) a shipping address.
 *
 * Ongoing deliveries are deliveries that are currently in progress, including those in various states
 * such as 'Active', 'Retry', 'WaitingPayment', 'Processing', and 'Shipped'. These represent all deliveries
 * that have not yet been completed, providing a comprehensive view of all in-flight delivery operations.
 *
 * Queries the 'deliveries' collection for documents with the specified customer ID
 * and status matching any of the ongoing statuses. If a shipping address ID is provided, it further filters
 * by that address. Results are ordered by 'orderDate'.
 *
 * @param {string} customerId - The ID of the customer whose deliveries to retrieve.
 * @param {string} [shippingAddressId] - (Optional) The shipping address ID to filter deliveries.
 * @returns {Promise<DeliveryApp[]>} A promise that resolves to an array of ongoing deliveries.
 */
export const getOngoingDeliveriesForCustomer = async (
  customerId: string,
  shippingAddressId?: string,
  db: Firestore = firestore,
): Promise<DeliveryApp[]> => {
  let query = db
    .collection('deliveries')
    .withConverter(deliveryDbConverter)
    .where('customerId', '==', customerId)
    .where('status', 'in', [
      DeliveryStatus.Active,
      DeliveryStatus.Retry,
      DeliveryStatus.WaitingPayment,
      DeliveryStatus.Processing,
      DeliveryStatus.Shipped,
    ]);
  if (shippingAddressId !== undefined) {
    query = query.where('shippingAddressId', '==', shippingAddressId);
  }
  const result = await query.orderBy('orderDate').get();

  return result.empty ? [] : result.docs.map((doc) => doc.data());
};

/**
 * Ensures a delivery document exists for the given delivery key.
 *
 * The delivery document ID is constructed as `${customerId}_${shippingAddressId}_${orderDate}`.
 * This function runs a Firestore transaction and:
 *  - returns false if a delivery with the same ID already exists (no write performed),
 *  - creates the delivery document (with `created` and `updated` timestamps as ISO strings) and returns true if it did not exist.
 *
 * Notes:
 *  - The operation is atomic: concurrent calls for the same delivery ID will race, but only one transaction will succeed in creating the document.
 *  - Firestore transaction errors will propagate to the caller.
 *  - `delivery` must include `customerId`, `shippingAddressId` and `orderDate`; those fields are used to build the document ID.
 *
 * @param {DeliveryDb} delivery - Delivery data to create if missing.
 * @returns {Promise<boolean>} Resolves to true if the delivery was created, false if it already existed.
 */
export const createDeliveryIfNotExists = async (
  delivery: DeliveryDb,
  db: Firestore = firestore,
): Promise<boolean> => {
  const deliveryId = `${delivery.customerId}_${delivery.shippingAddressId}_${delivery.orderDate}`;
  const deliveryRef = db.collection('deliveries').doc(deliveryId);

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(deliveryRef);
    if (snap.exists) {
      return false;
    }

    tx.set(
      deliveryRef,
      Object.assign({}, delivery, {
        created: FieldValue.serverTimestamp(),
        updated: FieldValue.serverTimestamp(),
      }),
    );

    return true;
  });
};

export const addSubscriptionToDeliveryPaymentInfo = (
  delivery: DeliveryDb,
  subscriptionId: string,
  subscriptionPaymentCode: string,
): PaymentInfo[] => {
  let hasPaymentInfo = false;
  const deliveryPaymentInfo = delivery.paymentInfo.map((pi) => {
    const isSubscriptionPaymentInfo =
      pi.paymentCode === subscriptionPaymentCode;
    hasPaymentInfo = hasPaymentInfo || isSubscriptionPaymentInfo;
    const deliveries = isSubscriptionPaymentInfo
      ? pi.deliveries.concat(subscriptionId)
      : pi.deliveries.slice();
    return { ...pi, deliveries };
  });
  if (!hasPaymentInfo) {
    deliveryPaymentInfo.push({
      paymentCode: subscriptionPaymentCode,
      deliveries: [subscriptionId],
    });
  }
  return deliveryPaymentInfo;
};

export const removeSubscriptionFromDelivery = async (
  deliveryId: string,
  subscriptionId: string,
  db: Firestore = firestore,
) => {
  const deliveryRef = db.collection('deliveries').doc(deliveryId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(deliveryRef);
    if (!snap.exists) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    const delivery = snap.data() as DeliveryApp;

    const paymentInfoList: PaymentInfo[] = [];
    delivery.paymentInfo.forEach((paymentInfo) => {
      paymentInfoList.push({
        ...paymentInfo,
        deliveries: (paymentInfo.deliveries = paymentInfo.deliveries.filter(
          (value) => value !== subscriptionId,
        )),
      });
    });

    tx.update(deliveryRef, {
      paymentInfo: paymentInfoList,
      updated: FieldValue.serverTimestamp(),
    });
  });
};

/**
 * Adds subscription information to a delivery document within a Firestore transaction.
 *
 * This function determines the `deliveryId` based on `customerId`, `shippingAddressId`, and `orderDate`
 * from `deliveryKey`. It then checks if a delivery document with this ID already exists:
 * - If it exists, the function updates its `paymentInfo` by adding the `subscriptionId` to the relevant entry.
 * - If it does not exist, a new delivery document is created with the provided subscription's payment information
 *   and marked with 'Active' status.
 *
 * @param {FirebaseFirestore.Transaction} transaction - The Firestore transaction object.
 * @param {string} subscriptionId - The ID of the subscription to add to the delivery.
 * @param {string} subscriptionPaymentCode - The payment code associated with the subscription.
 * @param {DeliveryKey} deliveryKey - An object containing the delivery key fields: `customerId`, `shippingAddressId`, and `orderDate`.
 * @param {boolean} isFirstTimeDelivery - A boolean indicating if this is the first time delivery ever for the customer at one particular shipping address.
 * @returns {Promise<void>} A promise that resolves when the operation within the transaction is complete (i.e., a set or update operation has been queued).
 */
const addSubscriptionInfoToDelivery = async (
  transaction: FirebaseFirestore.Transaction,
  subscriptionId: string,
  subscriptionPaymentCode: string,
  deliveryKey: DeliveryKey,
  isFirstTimeDelivery: boolean,
  db: Firestore,
) => {
  const deliveryId = `${deliveryKey.customerId}_${deliveryKey.shippingAddressId}_${deliveryKey.orderDate}`;
  const deliveryRef = db.collection('deliveries').doc(deliveryId);

  const deliverySnap = await transaction.get(deliveryRef);
  if (deliverySnap.exists) {
    const delivery = deliverySnap.data()! as DeliveryDb;
    const paymentInfo = addSubscriptionToDeliveryPaymentInfo(
      delivery,
      subscriptionId,
      subscriptionPaymentCode,
    );
    return transaction.update(deliveryRef, {
      paymentInfo: paymentInfo,
      updated: FieldValue.serverTimestamp(),
    });
  } else {
    const delivery: DeliveryDb = {
      customerId: deliveryKey.customerId,
      shippingAddressId: deliveryKey.shippingAddressId,
      orderDate: deliveryKey.orderDate,
      isFirstDelivery: isFirstTimeDelivery,
      status: DeliveryStatus.Active,
      paymentInfo: [
        {
          paymentCode: subscriptionPaymentCode,
          deliveries: [subscriptionId],
        },
      ],
    };
    return transaction.set(deliveryRef, delivery);
  }
};

/**
 * Persists a subscription to a delivery in Firestore.
 *
 * This function creates a new subscription document with status 'OnGoing' and ensures that a corresponding
 * delivery document exists for the given customer, shipping address, and order date. If the delivery does not exist,
 * it is created with the subscription's payment info. If the delivery already exists, the subscription info is added
 * to the existing delivery's payment info.
 *
 * This ensures that the subscription is properly linked to the delivery, and that the delivery's payment info
 * accurately reflects all associated subscriptions.
 *
 * @param {DeliveryKey & SubscriptionDb} subscriptionData - The subscription data, including delivery key fields.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export const persistSubscriptionToDelivery = async (
  subscriptionId: string,
  subscriptionData: DeliveryKey & SubscriptionDb,
  isFirstTimeDelivery: boolean,
  db: Firestore = firestore,
) => {
  // Prevent archiving an already-archived subscription whose id already
  // contains a trailing `_YYYY-MM-DD` date suffix (e.g. generated archive ids).
  const archiveSuffixRegex = /_\d{4}-\d{2}-\d{2}$/;
  if (archiveSuffixRegex.test(subscriptionId)) {
    throw new Error(
      'Cannot create archive from an already-archived subscription id',
    );
  }

  await db.runTransaction(async (tx) => {
    createOngoingSubscription(tx, subscriptionId, subscriptionData, db);

    await addSubscriptionInfoToDelivery(
      tx,
      subscriptionId,
      subscriptionData.paymentCode,
      subscriptionData,
      isFirstTimeDelivery,
      db,
    );

    const nextOrderDate = dateToStr(
      getNextScheduledDate(
        strToDate(subscriptionData.orderDate),
        subscriptionData.schedule,
      ),
    );

    updateSubscriptionInTransaction(
      tx,
      subscriptionId,
      {
        orderDate: nextOrderDate,
        previousOrderDate: subscriptionData.orderDate,
        recurringOrderCount: subscriptionData.recurringOrderCount + 1,
        updated: FieldValue.serverTimestamp(),
      },
      db,
    );
  });
};

/**
 * Updates a delivery document in Firestore.
 *
 * This function updates the delivery document with the specified ID with the provided data.
 *
 * @param {string} deliveryId - The ID of the delivery document to update.
 * @param {Partial<DeliveryDb>} update - An object containing the fields to update.
 * @returns {Promise<FirebaseFirestore.WriteResult>} A promise that resolves with the result of the write operation.
 */
export const updateDelivery = async (
  deliveryId: string,
  update: Partial<DeliveryDb>,
  db: Firestore = firestore,
) => {
  const deliveryRef = db.collection('deliveries').doc(deliveryId);
  return deliveryRef.update({
    ...update,
    updated: FieldValue.serverTimestamp(),
  });
};

/**
 * Finds all active deliveries that are scheduled for today or earlier.
 *
 * These are deliveries that should be processed (e.g., moved to 'WaitingPayment').
 *
 * @param {Firestore} [db=firestore] - The Firestore database instance to use.
 * @returns {Promise<DeliveryApp[]>} A promise that resolves to an array of active deliveries for today.
 */
export const findTodaysActiveDeliveries = async (
  db: Firestore = firestore,
): Promise<DeliveryApp[]> => {
  const _today = today();
  const result = await db
    .collection('deliveries')
    .withConverter(deliveryDbConverter)
    .where('orderDate', '<=', dateToStr(_today))
    .where('status', '==', DeliveryStatus.Active)
    .get();
  return result.empty
    ? []
    : result.docs.map((doc) => {
        return doc.data();
      });
};
