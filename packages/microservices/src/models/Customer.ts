import { Timestamped, Identified } from '@src/helpers/dbfunctions';
import { Static, Type } from '@sinclair/typebox';
import { DocumentReference } from 'firebase/firestore';

export const CustomerCollection = 'customers';

export const CustomerSchema = Type.Object({
  id: Type.Optional(Type.String()),
  environmentId: Type.Optional(Type.Integer()),
  email: Type.String(),
  firstName: Type.String(),
  lastName: Type.String(),
  defaultAddressId: Type.Optional(Type.String()),
  defaultBillingAddressId: Type.Optional(Type.String()),
  defaultShippingAddressId: Type.Optional(Type.String()),
});

export type ICustomer = Static<typeof CustomerSchema> &
  Timestamped &
  Identified;

export type IDBCustomer = Omit<
  ICustomer,
  | 'id'
  | 'defaultAddressId'
  | 'defaultBillingAddressId'
  | 'defaultShippingAddressId'
> & {
  defaultAddressId: DocumentReference | string;
  defaultBillingAddressId: DocumentReference | string;
  defaultShippingAddressId: DocumentReference | string;
};
