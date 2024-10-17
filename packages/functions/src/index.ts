import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as glob from 'glob';
import * as _ from 'lodash';
import { exportProduct } from './db/migration/products';

admin.initializeApp();

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
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    exports[functionName] = require(file);
  }
}

export const migrate = functions.https.onCall(() => {
  return Promise.all([exportProduct()]);
});
