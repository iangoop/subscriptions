import { Static, Type } from '@sinclair/typebox';
import { Identified, Timestamped } from '@src/helpers/dbfunctions';
import {
  Schedule,
  ShippingMode,
  SubscriptionOption,
  SubscriptionOptionMode,
} from './Shared';

export const ProductCollection = 'products';

export const ProductSchema = Type.Object({
  id: Type.Optional(Type.String()),
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
  intervals: Type.Optional(Type.Array(Type.Enum(Schedule))),
  defaultInterval: Type.Optional(Type.String()),
  subscriptionOptionMode: Type.Enum(SubscriptionOptionMode),
  defaultSubscriptionOption: Type.Enum(SubscriptionOption),
  shippingMode: Type.Enum(ShippingMode),
});

export type IProduct = Static<typeof ProductSchema> & Timestamped & Identified;

export type IDBProduct = Omit<IProduct, 'id' | 'isInStock' | 'isOnSale'>;
