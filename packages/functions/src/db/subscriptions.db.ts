import { firestore } from '../firestore';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { addDays } from 'date-fns';
import {
  ConfigurationKeys,
  getConfigurationValue,
} from './migration/configurations';
import {
  SubscriptionApp,
  subscriptionDbConverter,
  SubscriptionStatus,
  DeliveryApp,
  SubscriptionDb,
  SubscriptionWriteDb,
} from './types/subscriptions';
import { getActiveDeliveries } from './deliveries.db';
import { dateToStr, today } from '../util/subscriptions';

/**
 * Retrieves all subscriptions associated with active deliveries for a given customer and (optionally) a shipping address.
 *
 * Active deliveries are deliveries that are created from the configured freeze time in days
 * up until the day the delivery is completed (i.e., when the subscriptions have been delivered).
 * They started as active, and may have transitioned to other states like 'Retry' or 'Shipped',
 * until the final state 'Completed'.
 *
 * Ideally, there will be only one active delivery at a time for a given customer and address,
 * as the freeze time should be less than the minimum schedule interval, preventing overlap.
 *
 * Queries the 'deliveries' collection for documents with the specified customer ID,
 * status 'Active', and (optionally) the given shipping address ID.
 * For each matching delivery, collects all subscription IDs from its paymentInfo,
 * and fetches the corresponding subscriptions.
 *
 * ??? remove
 *
 * @param {string} customerId - The ID of the customer whose subscriptions to retrieve.
 * @param {string} [shippingAddressId] - (Optional) The shipping address ID to filter deliveries.
 * @returns {Promise<SubscriptionApp[]>} A promise that resolves to an array of subscriptions found in active deliveries.
 */
export const getSubscriptionsFromActiveDeliveries = async (
  customerId: string,
  shippingAddressId?: string,
  db: Firestore = firestore,
): Promise<SubscriptionApp[]> => {
  const deliveries = await getActiveDeliveries(
    customerId,
    shippingAddressId,
    db,
  );
  const subscriptionIds = new Set<string>();
  deliveries.forEach((delivery) => {
    delivery.paymentInfo.forEach((paymentInfo) => {
      paymentInfo.deliveries.forEach((subscriptionId) => {
        subscriptionIds.add(subscriptionId);
      });
    });
  });
  return getSubscriptions(Array.from(subscriptionIds), db);
};
/**
 * Retrieves all active subscriptions for a given customer and (optionally) a shipping address ordered by order date.
 *
 * Active subscriptions are those with status 'Active' i.e., due to be processed when their order date arrives.
 *
 * Queries the 'subscriptions' collection for documents with the specified customer ID
 * and status 'Active'. If a shipping address ID is provided, it further filters by that address.
 * Results are ordered by 'orderDate' and filtered to only include subscriptions with a defined order date.
 *
 * @param {string} customerId - The ID of the customer whose subscriptions to retrieve.
 * @param {string} [shippingAddressId] - (Optional) The shipping address ID to filter subscriptions.
 * @returns {Promise<SubscriptionApp[]>} A promise that resolves to an array of active subscriptions ordered by order date.
 */
export const getActiveSubscriptionsOrderedByOrderDate = async (
  customerId: string,
  shippingAddressId?: string,
  db: Firestore = firestore,
): Promise<SubscriptionApp[]> => {
  let query = db
    .collection('subscriptions')
    .withConverter(subscriptionDbConverter)
    .where('customerId', '==', customerId)
    .where('status', '==', SubscriptionStatus.Active);
  if (shippingAddressId !== undefined) {
    query = query.where('shippingAddressId', '==', shippingAddressId);
  }
  const result = await query.orderBy('orderDate').get();

  return result.empty
    ? []
    : result.docs
        .map((doc) => {
          return doc.data();
        })
        .filter((subscription) => subscription.orderDate !== undefined);
};

export const getSubscriptionsByStatusesOrderedByOrderDate = async (
  customerId: string,
  statuses: SubscriptionStatus[],
  shippingAddressId?: string,
  db: Firestore = firestore,
): Promise<SubscriptionApp[]> => {
  let query = db
    .collection('subscriptions')
    .withConverter(subscriptionDbConverter)
    .where('customerId', '==', customerId)
    .where('status', 'in', statuses);
  if (shippingAddressId !== undefined) {
    query = query.where('shippingAddressId', '==', shippingAddressId);
  }
  const result = await query.orderBy('orderDate').get();

  return result.empty
    ? []
    : result.docs
        .map((doc) => {
          return doc.data();
        })
        .filter((subscription) => subscription.orderDate !== undefined);
};

//remove??
export const findDeliveryContaningSubscription = (
  subscriptionId: string,
  deliveries: DeliveryApp[],
): DeliveryApp | undefined => {
  return deliveries.find((delivery) => {
    return delivery.paymentInfo.some((paymentInfo) => {
      return paymentInfo.deliveries.includes(subscriptionId);
    });
  });
};

export const getSubscription = async (
  subscriptionId: string,
  db: Firestore = firestore,
): Promise<SubscriptionApp | undefined> => {
  const result = await db
    .collection('subscriptions')
    .withConverter(subscriptionDbConverter)
    .doc(subscriptionId)
    .get();
  return result.exists ? result.data() : undefined;
};

export const getSubscriptions = async (
  subscriptionsIds: string[],
  db: Firestore = firestore,
): Promise<SubscriptionApp[]> => {
  const collectionRef = db
    .collection('subscriptions')
    .withConverter(subscriptionDbConverter);
  const docRefs = subscriptionsIds.map((id) => collectionRef.doc(id));
  const snapshots = await db.getAll(...docRefs);

  return snapshots
    .filter((snap) => snap.exists)
    .map((snap) => snap.data() as SubscriptionApp);
};

/**
 * Updates a subscription document in Firestore.
 *
 * This function updates the subscription document with the specified ID with the provided data.
 *
 * @param {string} subscriptionId - The ID of the subscription document to update.
 * @param {Partial<SubscriptionDb>} update - An object containing the fields to update.
 * @returns {Promise<FirebaseFirestore.WriteResult>} A promise that resolves with the result of the write operation.
 */
export const updateSubscription = async (
  subscriptionId: string,
  update: Partial<SubscriptionDb>,
  db: Firestore = firestore,
) => {
  const deliveryRef = db.collection('subscriptions').doc(subscriptionId);
  return deliveryRef.update({
    ...update,
    updated: FieldValue.serverTimestamp(),
  });
};

/**
 * Creates a new subscription document in Firestore.
 *
 * @param {SubscriptionDb} subscriptionData - The subscription data to be created.
 * @returns {Promise<string>} A promise that resolves to the ID of the newly created subscription document.
 */
export const createSubscription = async (
  subscriptionData: SubscriptionDb,
  db: Firestore = firestore,
): Promise<string> => {
  const subscriptionRef = await db
    .collection('subscriptions')
    .add(subscriptionData);
  return subscriptionRef.id;
};

/**
 * Creates a new subscription document with a status of 'OnGoing' within a Firestore transaction.
 *
 * This function constructs an archive ID using the original `subscriptionId` and its `orderDate`.
 * It then sets the provided `subscriptionData` in a new document in the 'subscriptions' collection
 * with the calculated archive ID. The `status` is explicitly set to `SubscriptionStatus.OnGoing`
 *
 * It includes a check to prevent archiving a subscription whose ID already suggests it's an archive.
 *
 * @param {FirebaseFirestore.Transaction} transaction - The Firestore transaction object.
 * @param {string} subscriptionId - The ID of the subscription to create as 'OnGoing'.
 * @param {SubscriptionDb} subscriptionData - The data of the subscription to be set, which will be merged with status, updated, and created fields.
 * @returns {FirebaseFirestore.Transaction} Returns the transaction object with the set operation enqueued.
 * @throws {Error} If the provided `subscriptionId` already appears to be an archived ID.
 */
export const createOngoingSubscription = (
  transaction: FirebaseFirestore.Transaction,
  subscriptionId: string,
  subscriptionData: SubscriptionDb,
  db: Firestore,
) => {
  // Prevent archiving an already-archived subscription whose id already
  // contains a trailing `_YYYY-MM-DD` date suffix (e.g. generated archive ids).
  const archiveSuffixRegex = /_\d{4}-\d{2}-\d{2}$/;
  if (archiveSuffixRegex.test(subscriptionId)) {
    throw new Error(
      'Cannot create archive from an already-archived subscription id',
    );
  }

  const archiveId = `${subscriptionId}_${subscriptionData.orderDate}`;
  const subscriptionArchiveRef = db.collection('subscriptions').doc(archiveId);

  return transaction.set(subscriptionArchiveRef, {
    ...subscriptionData,
    status: SubscriptionStatus.OnGoing,
    updated: FieldValue.serverTimestamp(),
    created: FieldValue.serverTimestamp(),
  });
};

/**
 * Updates a subscription document within a Firestore transaction.
 *
 * This function takes a transaction object, a subscription ID, and an update object,
 * then updates the specified subscription document with the provided data.
 *
 * @param {FirebaseFirestore.Transaction} transaction - The Firestore transaction object.
 * @param {string} subscriptionId - The ID of the subscription document to update.
 * @param {Partial<SubscriptionWriteDb>} update - An object containing the fields to update in the subscription document.
 * @returns {void} This function does not return a value directly, but enqueues an update operation within the transaction.
 */
export const updateSubscriptionInTransaction = (
  transaction: FirebaseFirestore.Transaction,
  subscriptionId: string,
  update: Partial<SubscriptionWriteDb>,
  db: Firestore,
) => {
  const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
  transaction.update(subscriptionRef, update);
};

/**
 * Retrieves the subscription freeze time in days from the configuration.
 *
 * This function fetches the value of `subscriptionFreezeTimeInDays` from the `configurations` collection.
 * If the value is not found, it defaults to '5'.
 *
 * @returns {Promise<number>} A promise that resolves to the freeze time in days.
 */
export const getFreezeTimeInDays = async (db: Firestore = firestore) => {
  const freezeTimeConfig = await getConfigurationValue(
    ConfigurationKeys.subscriptionFreezeTimeInDays,
    db,
  );
  return parseInt(freezeTimeConfig || '5');
};

/**
 * Finds all active subscriptions that have entered the freeze window as of today.
 *
 * The freeze window is defined as subscriptions with an order date less than or
 * equal to today plus the configured freeze time in days. These subscriptions
 * are ready to have their state updated (e.g., to 'Ready').
 *
 * @param {Firestore} [db=firestore] - The Firestore database instance to use.
 * @returns {Promise<SubscriptionApp[]>} A promise that resolves to an array of active subscriptions in the freeze window.
 */
export const findTodaysActiveSubscriptionsOnTimeFreeze = async (
  db: Firestore = firestore,
): Promise<SubscriptionApp[]> => {
  const _today = today();
  const freezeTime = await getFreezeTimeInDays(db);
  const freezeEndDate = addDays(_today, freezeTime);

  const result = await db
    .collection('subscriptions')
    .withConverter(subscriptionDbConverter)
    .where('orderDate', '<=', dateToStr(freezeEndDate))
    .where('status', '==', SubscriptionStatus.Active)
    .get();
  return result.empty
    ? []
    : result.docs.map((doc) => {
        return doc.data();
      });
};
