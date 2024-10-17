import * as express from 'express';
import server from './server';
import { onRequest } from 'firebase-functions/https';

const fastifyApp = async (
  request: express.Request,
  reply: express.Response,
) => {
  await server.ready();
  server.server.emit('request', request, reply);
};

export const app = onRequest(fastifyApp);
