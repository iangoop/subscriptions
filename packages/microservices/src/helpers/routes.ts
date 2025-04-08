import { Static, TSchema, Type } from '@sinclair/typebox';
import { FastifyInstance, FastifyReply } from 'fastify';
import { Crud, Identified, Timestamped } from './dbfunctions';
import { InvalidReferenceError } from './errors';
import { Pagination, PaginationSchema } from './pagination';
import { ValidationError } from './validators';

export type ConvertQueryString<T, K> = (param: T) => K;

export const defaultConvertQueryString = <T, K>(param: T): K => {
  return param as unknown as K;
};

export const defaultQueryStringParamSchema = Type.Object(
  {},
  { additionalProperties: false },
);
export type defaultQueryStringParam = Static<
  typeof defaultQueryStringParamSchema
>;

export const crudRest = <
  T extends Identified & Timestamped,
  QueryParamGetAll extends Pagination = Pagination,
  CustomQueryStringParam = defaultQueryStringParam,
>(
  fastify: FastifyInstance,
  service: Crud<T>,
  postSchema: TSchema,
  patchSchema: TSchema = postSchema,
  getAllQueryParamSchema: TSchema = PaginationSchema,
  queryStringParamSchema: TSchema = defaultQueryStringParamSchema,
) => {
  fastify.get<{ Querystring: QueryParamGetAll }>(
    '/',
    { schema: { querystring: getAllQueryParamSchema } },
    async function (request, reply) {
      return await service.getAll(request.query as QueryParamGetAll);
    },
  );

  fastify.get<{ Querystring: CustomQueryStringParam }>(
    '/:id',
    { schema: { querystring: queryStringParamSchema } },
    async function (request, reply) {
      return await service.getById(
        Object.assign({}, request.params, request.query) as Identified &
          CustomQueryStringParam,
      );
    },
  );

  fastify.post<{ Querystring: CustomQueryStringParam; Body: T }>(
    '/',
    { schema: { body: postSchema, querystring: queryStringParamSchema } },
    async function (request, reply) {
      return await service.create(
        Object.assign({}, request.query, request.body) as T,
      );
    },
  );

  fastify.patch<{
    Querystring: CustomQueryStringParam;
    Params: Identified;
    Body: T;
  }>(
    '/:id',
    { schema: { body: patchSchema, querystring: queryStringParamSchema } },
    async function (request, reply) {
      const { id } = request.params;

      return await service.update(
        id,
        Object.assign({}, request.query, request.body) as T,
      );
    },
  );

  fastify.delete<{ Querystring: CustomQueryStringParam; Params: Identified }>(
    '/:id',
    { schema: { querystring: queryStringParamSchema } },
    async function (request, reply) {
      await service.delete(Object.assign({}, request.params, request.query));
      return reply.code(204).send();
    },
  );
};

export const unarchive = <
  T extends Identified & Timestamped,
  CustomQueryStringParam = defaultQueryStringParam,
>(
  fastify: FastifyInstance,
  service: Crud<T>,
  queryStringParamSchema: TSchema = defaultQueryStringParamSchema,
) => {
  fastify.patch<{ Querystring: CustomQueryStringParam; Params: Identified }>(
    '/unarchive/:id',
    { schema: { querystring: queryStringParamSchema } },
    async function (request, reply) {
      await service.unarchive(Object.assign({}, request.params, request.query));
      return reply.code(204).send();
    },
  );
};

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
