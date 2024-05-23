import { Static, Type } from '@sinclair/typebox';
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { customerAddressService } from '@src/services/CustomerAddressService';
import {
  CustomerAddressSchema,
  ICustomerAddress,
} from '@src/models/CustomerAddress';
import { crudRest } from '@src/helpers/routes';
import { Pagination, PaginationSchema } from '@src/helpers/pagination';

const addCustomerAddressSchema = Type.Pick(CustomerAddressSchema, [
  'customerId',
  'firstName',
  'middleName',
  'lastName',
  'company',
  'street1',
  'street2',
  'street3',
  'city',
  'region',
  'postcode',
  'country',
  'phone',
]);

const getAllParamSchema = Type.Union([
  Type.Object({
    id: Type.Union([Type.String(), Type.Array(Type.String())]),
  }),
  Type.Object({
    platformSpecificCustomerId: Type.Union([
      Type.String(),
      Type.Array(Type.String()),
    ]),
  }),
  Type.Object({
    email: Type.Union([Type.String(), Type.Array(Type.String())]),
  }),
]);

const getAllSchema = { ...PaginationSchema, ...getAllParamSchema };

type QueryFilter = Static<typeof getAllParamSchema> & Pagination;

const customerAddressess: FastifyPluginAsyncTypebox = async (
  fastify,
  opts,
): Promise<void> => {
  crudRest<ICustomerAddress, QueryFilter>(
    fastify,
    customerAddressService(),
    getAllSchema,
    addCustomerAddressSchema,
  );

  return Promise.resolve();
};

export default customerAddressess;
