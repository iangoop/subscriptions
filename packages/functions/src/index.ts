import * as glob from 'glob';
import * as _ from 'lodash';
import { exportProduct } from './db/migration/products';
import { onRequest } from 'firebase-functions/v2/https';
import { Customer, exportCustomer } from './db/migration/customers';
import { exportSubscriptions } from './db/migration/subscriptions';
import { SubscriptionPayload } from './db/subscriptions';
import { app } from './app';

/** EXPORT ALL FUNCTIONS
 *
 *   Loads all `.f.js` files
 *   Exports a cloud function matching the file name
 *   Author: David King
 *   Edited: Tarik Huber
 *   Based on this thread:
 *     https://github.com/firebase/functions-samples/issues/170
 */
const files = glob.sync('./**/*.f.js', {
  cwd: __dirname,
  ignore: './node_modules/**',
});
/* eslint-disable node/no-process-env */
for (let f = 0, fl = files.length; f < fl; f++) {
  const file = files[f];
  const functionName = _.camelCase(file.slice(0, -5).split('/').join('_'));
  if (
    !process.env.FUNCTION_NAME ||
    process.env.FUNCTION_NAME === functionName
  ) {
    try {
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      exports[functionName] = require(file);
    } catch (err) {
      console.error(`Failed to load ${file}`, err);
      throw err;
    }
  }
}

export const migrateProducts = onRequest(async (req, res) => {
  await exportProduct(req.body as Record<string, string>[]);
  res.send('ok');
});

export const migrateCustomer = onRequest(async (req, res) => {
  const customerList = req.body as Customer[];
  await exportCustomer(customerList);
  res.send('ok');
});

export const migrateSubscriptions = onRequest(async (req, res) => {
  const deliveryList = req.body as SubscriptionPayload;
  await exportSubscriptions(deliveryList);
  res.send('ok');
});

export const subscriptions = onRequest(app);
