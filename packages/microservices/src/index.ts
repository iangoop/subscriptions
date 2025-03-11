import { Request, Response } from 'express';
import server from './server';
import { onRequest } from 'firebase-functions/https';
import EnvVars from '@src/configurations/EnvVars';

let sInstance;
if (EnvVars.nodeEnv == 'development') {
  server.listen({ port: Number(EnvVars.port) });
  sInstance = server;
} else {
  const fastifyApp = async (request: Request, reply: Response) => {
    server.addContentTypeParser(
      'application/json',
      {},
      (req, payload, done) => {
        const response: Request = payload as Request;
        done(null, response.body);
      },
    );
    await server.ready();
    server.server.emit('request', request, reply);
  };
  sInstance = onRequest(fastifyApp);
}
export const app = sInstance;
