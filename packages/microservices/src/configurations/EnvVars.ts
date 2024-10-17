/* eslint-disable node/no-process-env */

export default {
  nodeEnv: process.env.NODE_ENV ?? '',
  port: process.env.PORT ?? 0,
  firebase: {
    apiKey: process.env.CUSTOM_FIREBASE_APIKEY ?? '',
    authDomain: process.env.CUSTOM_FIREBASE_AUTHDOMAIN ?? '',
    projectId: process.env.CUSTOM_FIREBASE_PROJECTID ?? '',
    storageBucket: process.env.CUSTOM_FIREBASE_STORAGEBUCKET ?? '',
    messagingSenderId: process.env.CUSTOM_FIREBASE_MESSAGINGSENDERID ?? '',
    appId: process.env.CUSTOM_FIREBASE_APPID ?? '',
    measurementId: process.env.CUSTOM_FIREBASE_MEASUREMENTID ?? '',
  },
} as const;
