const baseConfig = require('./jest.config.js');
module.exports = {
  ...baseConfig,
  testMatch: ['**/*.db.test.ts'], // only pick .db.test.ts files
};
