import { join } from 'path';
import AutoLoad from '@fastify/autoload';
import { fastify } from 'fastify';
import pino from 'pino';
import { writeErrorsToResponse } from './helpers/routes';
import { Request } from 'express';
const server = fastify({
  logger: pino({ level: 'info' }),
});

// register plugin below:
void server.register(AutoLoad, {
  dir: join(__dirname, 'plugins'),
});

// This loads all plugins defined in routes
// define your routes in one of these
void server.register(AutoLoad, {
  dir: join(__dirname, 'routes'),
});

server.setErrorHandler((error, request, reply) => {
  writeErrorsToResponse(error, reply);
});

server.addContentTypeParser('application/json', {}, (req, payload, done) => {
  const response: Request = payload as Request;
  done(null, response.body);
});

export default server;
