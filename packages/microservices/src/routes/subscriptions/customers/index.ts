import { Type } from '@sinclair/typebox';
import {
  FastifyPluginAsyncTypebox,
  TypeBoxTypeProvider,
} from '@fastify/type-provider-typebox';
import { customerService } from '@src/services/CustomerService';
import { CustomerSchema, ICustomer } from '@src/models/Customer';
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
]);

const customers: FastifyPluginAsyncTypebox = async (
  fastify,
  opts,
): Promise<void> => {
  crudRest<ICustomer>(
    fastify.withTypeProvider<TypeBoxTypeProvider>(),
    customerService(),
    addCustomerSchema,
    updateCustomerSchema,
  );

  return Promise.resolve();
};

export default customers;
