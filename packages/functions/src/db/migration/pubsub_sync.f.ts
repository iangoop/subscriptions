import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { firestore } from '../../firestore';
import { exportProduct, Product } from './products';
import { Customer, exportCustomer } from './customers';
import { exportSubscriptions } from './subscriptions';
import { Configuration, exportConfigurations } from './configurations';
import { SubscriptionPayload } from '../types/subscriptions';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Pub/Sub trigger that synchronizes individual records to Firestore with idempotency protection.
 *
 * This function listens to the 'sync-data' topic. It uses a 'processedEvents' collection in
 * Firestore to ensure that each message (or custom idempotency key) is processed exactly once,
 * even if Pub/Sub delivers the message multiple times.
 *
 * ### Step-by-Step Usage:
 *
 * 1. **Build and Deploy**:
 *    - Run `npm run build` to compile the TypeScript code.
 *    - Run `firebase deploy --only functions:pubsubSyncTrigger` to deploy the trigger.
 *    - *Note: The 'sync-data' topic is created automatically if it doesn't exist.*
 *
 * 2. **Prepare Message Structure**:
 *    - **Body (JSON)**: The actual record (e.g., `{ "sku": "PROD-001", ... }`).
 *    - **Attributes**:
 *      - `type`: (Required) Must be 'products', 'customers', 'subscriptions', or 'configurations'.
 *      - `idempotencyKey`: (Recommended) A unique ID for this update to prevent duplicates.
 *
 * 3. **Publish a Message**:
 *    - **Console**: Go to GCP Pub/Sub -> Topics -> 'sync-data' -> Messages -> Publish Message.
 *    - **CLI**: `gcloud pubsub topics publish sync-data --message='{...}' --attribute=type=products,idempotencyKey=unique-key-123`
 *    - **Code**: Use the `@google-cloud/pubsub` SDK to publish to the topic.
 *
 * 4. **Automated Processing**:
 *    - The function triggers on message receipt.
 *    - It checks the `processedEvents` collection for the `idempotencyKey`.
 *    - If new, it processes the record using the corresponding migration logic.
 *    - It records the key in Firestore to mark the event as completed.
 *
 * 5. **Verification**:
 *    - Check the target Firestore collection for the synced data.
 *    - Check the `processedEvents` collection for the audit trail.
 *    - Check Cloud Functions logs for 'Processing' and 'Successfully processed' messages.
 *
 * @param {PubsubEvent} event - The Pub/Sub event object.
 */
export const pubsubSyncTrigger = onMessagePublished(
  {
    topic: 'sync-data',
    cpu: 0.5,
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    const messageId = event.id;
    const data = event.data.message.json as unknown;
    const attributes = event.data.message.attributes;

    // Use custom idempotencyKey if provided, otherwise use messageId
    const idempotencyKey = attributes.idempotencyKey || messageId;
    const type = attributes.type; // products, customers, subscriptions, configurations

    if (!type) {
      console.error('Missing required attribute "type" in pub/sub message');
      return;
    }

    // Check for idempotency in Firestore
    const idempotencyRef = firestore
      .collection('processedEvents')
      .doc(idempotencyKey);

    return await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(idempotencyRef);
      if (snap.exists) {
        console.log(
          `Event ${idempotencyKey} has already been processed. Skipping.`,
        );
        return;
      }

      console.log(`Processing ${type} sync for event ${idempotencyKey}`);

      // Run migration logic based on type
      switch (type) {
        case 'products':
          // exportProduct expects an array of records
          await exportProduct(
            Array.isArray(data) ? (data as Product[]) : [data as Product],
          );
          break;
        case 'customers':
          // exportCustomer expects an array of Customer
          await exportCustomer(
            Array.isArray(data) ? (data as Customer[]) : [data as Customer],
          );
          break;
        case 'subscriptions':
          // exportSubscriptions expects SubscriptionPayload
          await exportSubscriptions(data as SubscriptionPayload);
          break;
        case 'configurations':
          // exportConfigurations expects an array of Configuration
          await exportConfigurations(
            Array.isArray(data)
              ? (data as Configuration[])
              : [data as Configuration],
          );
          break;
        default:
          throw new Error(`Unknown sync type: ${type}`);
      }

      // Mark as processed within the same transaction for atomic safety
      transaction.set(idempotencyRef, {
        processedAt: FieldValue.serverTimestamp(),
        type,
        messageId,
      });

      console.log(
        `Successfully processed ${type} sync for event ${idempotencyKey}`,
      );
    });
  },
);
