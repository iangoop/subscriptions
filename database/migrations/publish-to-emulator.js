/**
 * Utility script to publish a message to the Pub/Sub emulator for testing purposes.
 * Usage:
 *   npm run sync:emulator -- <filename> <type> <idempotencyKey>
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const EMULATOR_PORT = '8085';
const PROJECT_ID = 'fir-f51cb';
const TOPIC_NAME = 'sync-data';

// Get command line arguments
const [fileName, type, idempotencyKey] = process.argv.slice(2);

if (!fileName || !type || !idempotencyKey) {
  console.error(
    'Usage: node publish-to-emulator.js <filename> <type> <idempotencyKey>',
  );
  process.exit(1);
}

const filePath = path.join(__dirname, fileName);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

try {
  console.log(`Reading ${fileName}...`);
  const jsonContent = fs.readFileSync(filePath, 'utf8');

  // Pub/Sub API expects base64 encoded data
  const base64Content = Buffer.from(jsonContent).toString('base64');

  const payload = JSON.stringify({
    messages: [
      {
        data: base64Content,
        attributes: {
          type,
          idempotencyKey,
        },
      },
    ],
  });

  const options = {
    hostname: 'localhost',
    port: EMULATOR_PORT,
    path: `/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  console.log(`Sending ${type} sync to ${TOPIC_NAME} topic on emulator...`);

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const parsedResponse = JSON.parse(responseData);
        console.log(
          '\x1b[32m%s\x1b[0m',
          `Success! Message ID: ${parsedResponse.messageIds[0]}`,
        );
      } else {
        console.error(`Failed with status code: ${res.statusCode}`);
        console.error('Response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error connecting to emulator:', error.message);
    console.error(
      'Make sure the Pub/Sub emulator is running on port',
      EMULATOR_PORT,
    );
  });

  req.write(payload);
  req.end();
} catch (err) {
  console.error('Unexpected error:', err.message);
}
