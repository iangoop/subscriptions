/* eslint-disable node/no-process-env */
export default {
  apiUrl: process.env.REACT_APP_API_URL ?? '',
  avatarUrl: process.env.REACT_APP_AVATAR_URL ?? '',
  imagePlaceholder: process.env.REACT_APP_PLACEHOLDER_URL ?? '',
} as const;
