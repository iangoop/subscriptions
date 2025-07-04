import { Static, Type } from '@sinclair/typebox';
import { Schedule, SubscriptionStatus } from './Shared';
import { Identified, Timestamped } from '@src/helpers/dbfunctions';

export const SubscriptionCollection = 'subscriptions';

export const SubscriptionSchema = Type.Object({
  id: Type.String(),
  customerId: Type.String(),
  productId: Type.String(),
  quantity: Type.Number(),
  shippingAddressId: Type.String(),
  billingAddressId: Type.String(),
  paymentMethodCode: Type.String(),
  status: Type.Enum(SubscriptionStatus),
  schedule: Type.Enum(Schedule),
  scheduled: Type.Boolean({ default: false }),
  shippingMethodCode: Type.String(),
  couponCode: Type.Optional(Type.String()),
  useFixedPrice: Type.Boolean({ default: false }),
  currency: Type.Optional(Type.String()),
  fixedPrice: Type.Optional(Type.Number()),
  expirationDate: Type.Optional(Type.Date()),
  recurringOrderCount: Type.Number({ default: 0 }),
  previousOrderDate: Type.Optional(Type.Date()),
  nextOrderDate: Type.Optional(Type.String({ format: 'date' })),
});

export type ISubscription = Static<typeof SubscriptionSchema> &
  Timestamped &
  Identified;

export type IDBSubscription = Omit<ISubscription, 'id'>;
