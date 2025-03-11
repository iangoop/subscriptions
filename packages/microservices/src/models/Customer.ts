import { Timestamped, Identified } from '@src/helpers/dbfunctions';
import { Static, Type } from '@sinclair/typebox';

export const CustomerCollection = 'customers';

export const CustomerSchema = Type.Object({
  id: Type.Optional(Type.String()),
  environmentId: Type.Optional(Type.Integer()),
  email: Type.String(),
  firstName: Type.String(),
  lastName: Type.String(),
});

export type ICustomer = Static<typeof CustomerSchema> &
  Timestamped &
  Identified;

export type IDBCustomer = Omit<ICustomer, 'id'>;
