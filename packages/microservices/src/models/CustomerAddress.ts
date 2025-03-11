import { Timestamped, Identified } from '@src/helpers/dbfunctions';
import { Static, Type } from '@sinclair/typebox';

export const CustomerAddressCollection = 'addressList';

export const CustomerAddressSchema = Type.Object({
  id: Type.Optional(Type.String()),
  customerId: Type.String(),
  firstName: Type.String(),
  middleName: Type.Optional(Type.String()),
  lastName: Type.String(),
  company: Type.Optional(Type.String()),
  street1: Type.String(),
  street2: Type.Optional(Type.String()),
  street3: Type.Optional(Type.String()),
  city: Type.String(),
  region: Type.Optional(Type.String()),
  postcode: Type.String(),
  country: Type.String(),
  phone: Type.Optional(Type.String()),
  isDefault: Type.Boolean({ default: false }),
  isDefaultBilling: Type.Boolean({ default: false }),
  isDefaultShipping: Type.Boolean({ default: false }),
});

export type ICustomerAddress = Static<typeof CustomerAddressSchema> &
  Timestamped &
  Identified;

export type IDBCustomerAddress = Omit<ICustomerAddress, 'id' | 'customerId'>;
