/* eslint-disable node/no-process-env */
export default {
  apiUrl: process.env.REACT_APP_API_URL ?? '',
} as const;
