// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
//import { getAnalytics } from 'firebase/analytics';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import EnvVars from '@src/configurations/EnvVars';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: EnvVars.firebase.apiKey,
  authDomain: EnvVars.firebase.authDomain,
  projectId: EnvVars.firebase.projectId,
  storageBucket: EnvVars.firebase.storageBucket,
  messagingSenderId: EnvVars.firebase.messagingSenderId,
  appId: EnvVars.firebase.appId,
  measurementId: EnvVars.firebase.measurementId,
};

// Initialize Firebase

const firebaseApp = initializeApp(firebaseConfig);

const firestoreInstance = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp);
if (EnvVars.nodeEnv == 'development') {
  connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default firebaseApp;
export { firebaseApp, firestoreInstance, functions };
