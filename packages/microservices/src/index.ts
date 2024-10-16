import * as express from 'express';
import EnvVars from '@src/configurations/EnvVars';
import server from './server';
import { onRequest } from 'firebase-functions/https';

//server.listen({ port: Number(EnvVars.port) });

const fastifyApp = async (
  request: express.Request,
  reply: express.Response,
) => {
  await server.ready();
  server.server.emit('request', request, reply);
};

exports.app = onRequest(fastifyApp);
