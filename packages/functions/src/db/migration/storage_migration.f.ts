import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { exportProduct, Product } from './products';
import { Customer, exportCustomer } from './customers';
import { exportSubscriptions } from './subscriptions';
import { Configuration, exportConfigurations } from './configurations';
import { SubscriptionPayload } from '../types/subscriptions';

/**
 * Cloud Storage trigger that automatically migrates data to Firestore when a file is uploaded.
 *
 * This function monitors the 'migrations/' folder in the default storage bucket. When a JSON file
 * is uploaded to a subfolder (e.g., 'migrations/products/file.json'), it processes the data
 * and moves the file to either 'processed/' or 'failed/' to ensure it is only handled once.
 *
 * ### Step-by-Step Usage:
 *
 * 1. **Build and Deploy**:
 *    - Run `npm run build` to compile the TypeScript code.
 *    - Run `firebase deploy --only functions:storageMigrationTrigger` to deploy the trigger.
 *
 * 2. **Prepare JSON Data**:
 *    - Create a JSON file containing an array of records (e.g., `products.json`).
 *    - Ensure the format matches the target migration script (e.g., `exportProduct` expects objects with `sku`).
 *
 * 3. **Upload to Storage**:
 *    - Go to Firebase Storage in the console.
 *    - Navigate to (or create) the `migrations/` folder.
 *    - Create a subfolder for the data type: `products`, `customers`, `subscriptions`, or `configurations`.
 *    - Upload your file to that subfolder (e.g., `migrations/products/my_data.json`).
 *
 * 4. **Automated Processing**:
 *    - The function triggers upon upload completion.
 *    - It parses the JSON and updates Firestore using the corresponding migration logic.
 *    - On success, the file is moved to `processed/{type}/{filename}`.
 *    - On failure, the file is moved to `failed/{type}/{filename}`.
 *
 * 5. **Verification**:
 *    - Check the Firestore collections to see the updated data.
 *    - Check the Cloud Functions logs in the Firebase Console for detailed progress or error messages.
 *
 * @param {StorageEvent} event - The Cloud Storage event object.
 */
export const storageMigrationTrigger = onObjectFinalized(
  {
    cpu: 1,
    memory: '1GiB',
    timeoutSeconds: 540, // Increased timeout for large files
  },
  async (event) => {
    const bucket = getStorage().bucket(event.data.bucket);
    const filePath = event.data.name;

    // Only process files in the 'migrations/{type}/{filename}' format
    // This regex ensures we have a type and a filename, avoiding triggers on folder creation.
    const match = filePath.match(/^migrations\/([^/]+)\/(.+)$/);

    if (!match) {
      return;
    }

    const [, type, fileName] = match;

    try {
      console.log(`Starting migration for ${type} from file ${fileName}`);
      const file = bucket.file(filePath);
      const [content] = await file.download();
      const data = JSON.parse(content.toString()) as unknown;

      switch (type) {
        case 'products':
          await exportProduct(data as Product[]);
          break;
        case 'customers':
          await exportCustomer(data as Customer[]);
          break;
        case 'subscriptions':
          await exportSubscriptions(data as SubscriptionPayload);
          break;
        case 'configurations':
          await exportConfigurations(data as Configuration[]);
          break;
        default:
          throw new Error(`Unknown migration type: ${type}`);
      }

      console.log(`Successfully migrated ${type} from ${fileName}`);

      // Move to processed
      const destination = `processed/${type}/${fileName}`;
      await file.move(destination);
      console.log(`Moved file to ${destination}`);
    } catch (error) {
      console.error(`Failed to migrate ${type} from ${fileName}:`, error);

      // Move to failed
      const file = bucket.file(filePath);
      const destination = `failed/${type}/${fileName}`;
      try {
        await file.move(destination);
        console.log(`Moved failed file to ${destination}`);
      } catch (moveError) {
        console.error('Failed to move file to failed/ folder:', moveError);
      }
    }
  },
);
