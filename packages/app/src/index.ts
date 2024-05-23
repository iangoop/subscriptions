import './pre-start';
import commandLineArgs from 'command-line-args';

import { initializeApp } from 'firebase/app';
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const app = initializeApp({
  projectId: 'fir-f51cb',
  apiKey: 'AIzaSyA-x-KaIVKVAw-KUXNy1MDAd6h19nJCAPo',
  authDomain: 'fir-f51cb.firebaseapp.com',
});
const functions = getFunctions(app);
const firestoreInstance = getFirestore(app);
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV == 'development') {
  connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

const cmd = commandLineArgs(
  [
    {
      name: 'action',
      alias: 'a',
      defaultValue: '',
      type: String,
    },
  ],
  { partial: true },
);
console.log(cmd);
if (cmd.action == 'migrate') {
  const migrate = httpsCallable(functions, 'migrate');
  migrate().then((result) => {
    // Read result of the Cloud Function.
    /** @type {any} */
    const data = result.data;
    console.log(data);
  });
}
