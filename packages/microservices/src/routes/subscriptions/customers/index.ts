import { Type } from '@sinclair/typebox';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { customerService } from '@src/services/CustomerService';
import { CustomerSchema, ICustomer } from '@src/models/Customer';
import { Pagination, PaginationSchema } from '@src/helpers/pagination';
import { crudRest } from '@src/helpers/routes';

const addCustomerSchema = Type.Pick(CustomerSchema, [
  'email',
  'firstName',
  'lastName',
]);

const updateCustomerSchema = Type.Pick(CustomerSchema, [
  'email',
  'firstName',
  'lastName',
  'defaultAddressId',
  'defaultBillingAddressId',
  'defaultShippingAddressId',
]);

const customers: FastifyPluginAsyncTypebox = async (
  fastify,
  opts,
): Promise<void> => {
  crudRest<ICustomer, Pagination>(
    fastify,
    customerService(),
    PaginationSchema,
    addCustomerSchema,
    updateCustomerSchema,
  );

  return Promise.resolve();
};

export default customers;
