import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { Pagination, PaginationSchema } from '@src/helpers/pagination';
import { crudRest } from '@src/helpers/routes';
import { IProduct, ProductSchema } from '@src/models/Product';
import { productService } from '@src/services/ProductService';

const addProductAddressSchema = Type.Pick(ProductSchema, [
  'configProfileId',
  'sku',
  'name',
  'shortDescription',
  'longDescription',
  'thumbnailUrl',
  'msrp',
  'price',
  'salePrice',
  'minQty',
  'maxQty',
  'qtyInStock',
  'discount',
  'isDiscountPercentage',
  'intervals',
  'defaultInterval',
  'subscriptionOptionMode',
  'defaultSubscriptionOption',
  'shippingMode',
]);

const products: FastifyPluginAsyncTypebox = async (
  fastify,
  opts,
): Promise<void> => {
  crudRest<IProduct, Pagination>(
    fastify,
    productService(),
    PaginationSchema,
    addProductAddressSchema,
  );

  return Promise.resolve();
};

export default products;
