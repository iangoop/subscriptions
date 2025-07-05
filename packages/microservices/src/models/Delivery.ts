import { Static, Type } from '@sinclair/typebox';
import { DeliveryStatus } from './Shared';
import { Identified, Timestamped } from '@src/helpers/dbfunctions';

export const DeliveryCollection = 'deliveries';

export const PaymentInfoSchema = Type.Object({
  paymentCode: Type.String(),
  errorCode: Type.Optional(Type.String()),
  attemptCount: Type.Optional(Type.Number()),
  deliveries: Type.Array(Type.String()),
});

export const DeliverySchema = Type.Object({
  id: Type.Optional(Type.String()),
  customerId: Type.String(),
  shppingAddressId: Type.String(),
  status: Type.Enum(DeliveryStatus),
  nextOrderDate: Type.Optional(Type.String({ format: 'date' })),
  paymentInfo: Type.Array(PaymentInfoSchema),
});

export type IDelivery = Static<typeof DeliverySchema> &
  Timestamped &
  Identified;

export type IDBDelivery = Omit<IDelivery, 'id'>;
