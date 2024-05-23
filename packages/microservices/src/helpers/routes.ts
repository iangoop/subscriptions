import { TSchema } from '@sinclair/typebox';
import { FastifyInstance, FastifyReply } from 'fastify';
import { Crud, Identified, Timestamped } from './dbfunctions';
import { InvalidReferenceError } from './errors';
import { Pagination } from './pagination';
import { ValidationError } from './validators';

export const crudRest = <
  T extends Identified & Timestamped,
  QueryStringGetAll extends Pagination,
>(
  fastify: FastifyInstance,
  service: Crud<T>,
  getAllSchema: TSchema,
  postSchema: TSchema,
  patchSchema: TSchema = postSchema,
) => {
  fastify.get<{ Querystring: QueryStringGetAll }>(
    '/',
    { schema: { querystring: getAllSchema } },
    async function (request, reply) {
      return await service.getAll(request.query as QueryStringGetAll);
    },
  );

  fastify.get<{ Params: IdGetParam }>('/:id', async function (request, reply) {
    const { id } = request.params;

    return await service.getById(id);
  });

  fastify.post<{ Body: T }>(
    '/',
    { schema: { body: postSchema } },
    async function (request, reply) {
      return await service.create(request.body as T);
    },
  );

  fastify.patch<{ Params: IdGetParam; Body: T }>(
    '/:id',
    { schema: { body: patchSchema } },
    async function (request, reply) {
      const { id } = request.params;

      return await service.update(id, request.body as T);
    },
  );

  fastify.delete<{ Params: IdGetParam }>(
    '/:id',
    async function (request, reply) {
      const { id } = request.params;

      await service.delete(id);
      return reply.code(204).send();
    },
  );
};

export interface IdGetParam {
  id: string;
}

export const writeErrorsToResponse = (
  exception: unknown,
  reply: FastifyReply,
): void => {
  if (exception instanceof ValidationError) {
    reply.code(400).send(exception.errors);
  } else if (exception instanceof InvalidReferenceError) {
    reply.notFound(exception.message);
  } else {
    reply.send(exception);
  }
};
