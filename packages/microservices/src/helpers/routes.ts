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

export const defaultQueryParamSchema = Type.Object(
  {},
  { additionalProperties: false },
);
export type defaultQueryParam = Static<typeof defaultQueryParamSchema>;

export const crudRest = <
  T extends Identified & Timestamped,
  QueryParamGetAll extends Pagination = Pagination,
  CustomQueryParam = defaultQueryParam,
  ConvertedQueryString = defaultQueryParam,
>(
  fastify: FastifyInstance,
  service: Crud<T>,
  postSchema: TSchema,
  patchSchema: TSchema = postSchema,
  getAllQueryParamSchema: TSchema = PaginationSchema,
  queryParamSchema: TSchema = defaultQueryParamSchema,
  convertQueryParam: ConvertQueryString<
    CustomQueryParam,
    ConvertedQueryString
  > = defaultConvertQueryString,
) => {
  fastify.get<{ Querystring: QueryParamGetAll }>(
    '/',
    { schema: { querystring: getAllQueryParamSchema } },
    async function (request, reply) {
      return await service.getAll(request.query as QueryParamGetAll);
    },
  );

  fastify.get<{ Querystring: CustomQueryParam }>(
    '/:id',
    { schema: { querystring: queryParamSchema } },
    async function (request, reply) {
      return await service.getById(
        Object.assign(
          {},
          request.params,
          convertQueryParam(request.query as CustomQueryParam),
        ) as Identified & ConvertedQueryString,
      );
    },
  );

  fastify.post<{ Querystring: CustomQueryParam; Body: T }>(
    '/',
    { schema: { body: postSchema } },
    async function (request, reply) {
      return await service.create(
        Object.assign(
          {},
          convertQueryParam(request.query as CustomQueryParam),
          request.body,
        ) as T,
      );
    },
  );

  fastify.patch<{ Querystring: CustomQueryParam; Params: Identified; Body: T }>(
    '/:id',
    { schema: { body: patchSchema, querystring: queryParamSchema } },
    async function (request, reply) {
      const { id } = request.params;

      return await service.update(
        id,
        Object.assign(
          {},
          convertQueryParam(request.query as CustomQueryParam),
          request.body,
        ) as T,
      );
    },
  );

  fastify.delete<{ Querystring: CustomQueryParam; Params: Identified }>(
    '/:id',
    { schema: { querystring: queryParamSchema } },
    async function (request, reply) {
      await service.delete(
        Object.assign(
          {},
          request.params,
          convertQueryParam(request.query as CustomQueryParam),
        ),
      );
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
