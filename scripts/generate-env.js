const path = require('path');
const fs = require('fs');

// Only include the vars you actually need
const keys = [
  'NODE_ENV',
  'CUSTOM_FIREBASE_STORAGEBUCKET',
  'CUSTOM_FIREBASE_STORAGEBUCKET_MIGRATION',
  'CUSTOM_FIREBASE_REGION',
  'CUSTOM_FIREBASE_AUTHDOMAIN',
  'CUSTOM_FIREBASE_PROJECTID',
  'CUSTOM_FIREBASE_MESSAGINGSENDERID',
  'CUSTOM_FIREBASE_APPID',
  'CUSTOM_FIREBASE_MEASUREMENTID',
  // add more here
];

const content = keys
  .map((key) => `${key}=${process.env[key] || ''}`)
  .join('\n');

// targets
const targets = [
  'packages/functions/.env.local',
  'packages/microservices/.env.local',
];

targets.forEach((target) => {
  const fullPath = path.resolve(target);
  fs.writeFileSync(fullPath, content);
  console.log(`Generated ${target}`);
});
