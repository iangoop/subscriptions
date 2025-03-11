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
  'isDefault',
  'isDefaultBilling',
  'isDefaultShipping',
]);

const getAllParamSchema = Type.Union([
  Type.Object({
    customerId: Type.String(),
  }),
  Type.Object({
    platformCustomerId: Type.String(),
  }),
  Type.Object({
    email: Type.String(),
  }),
]);

const getAllSchema = { ...PaginationSchema, ...getAllParamSchema };

type QueryFilter = Static<typeof getAllParamSchema> & Pagination;

const customerDependencyParamSchema = Type.Object({
  customerId: Type.String(),
});

type CustomerIdQueryString = Static<typeof customerDependencyParamSchema>;

const convertQueryString = (
  param: CustomerIdQueryString,
): Pick<ICustomerAddress, 'customerId'> => {
  return {
    customerId: param.customerId,
  };
};

const customerAddressess: FastifyPluginAsyncTypebox = async (
  fastify,
  opts,
): Promise<void> => {
  crudRest<
    ICustomerAddress,
    QueryFilter,
    CustomerIdQueryString,
    Pick<ICustomerAddress, 'customerId'>
  >(
    fastify,
    customerAddressService(),
    addCustomerAddressSchema,
    addCustomerAddressSchema,
    getAllSchema,
    customerDependencyParamSchema,
    convertQueryString,
  );

  return Promise.resolve();
};

export default customerAddressess;
