import { Static, Type } from '@sinclair/typebox';
import { Identified, Timestamped } from '@src/helpers/dbfunctions';

export const ProductCollection = 'products';

export const ProductSchema = Type.Object({
  id: Type.Optional(Type.String()),
  environmentId: Type.Optional(Type.Integer()),
  configProfileId: Type.Optional(Type.String()),
  sku: Type.String(),
  name: Type.String(),
  shortDescription: Type.String(),
  longDescription: Type.String(),
  thumbnailUrl: Type.Optional(Type.String()),
  msrp: Type.Optional(Type.Number()),
  price: Type.Number(),
  salePrice: Type.Optional(Type.Number()),
  isOnSale: Type.Optional(Type.Boolean()),
  minQty: Type.Optional(Type.Integer()),
  maxQty: Type.Optional(Type.Integer()),
  qtyInStock: Type.Optional(Type.Integer()),
  isInStock: Type.Optional(Type.Boolean()),
  discount: Type.Optional(Type.Number()),
  isDiscountPercentage: Type.Optional(Type.Boolean()),
  intervals: Type.Optional(Type.Array(Type.String())),
  defaultInterval: Type.Optional(Type.String()),
  subscriptionOptionMode: Type.Optional(
    Type.Union([
      Type.Literal('subscription_only'),
      Type.Literal('subscription_and_onetime_purchase'),
    ]),
  ),
  defaultSubscriptionOption: Type.Optional(
    Type.Union([
      Type.Literal('subscription'),
      Type.Literal('onetime_purchase'),
    ]),
  ),
  shippingMode: Type.Optional(
    Type.Union([
      Type.Literal('requires_shipping'),
      Type.Literal('no_shipping'),
    ]),
  ),
});

export type IProduct = Static<typeof ProductSchema> & Timestamped & Identified;

export type IDBProduct = Omit<IProduct, 'id'>;
