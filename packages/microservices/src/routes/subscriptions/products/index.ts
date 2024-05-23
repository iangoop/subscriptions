import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Static, Type } from '@sinclair/typebox';
import { functions } from '@src/configurations/firebase';
import { Pagination, PaginationSchema } from '@src/helpers/pagination';
import { crudRest } from '@src/helpers/routes';
import { IProduct, ProductSchema } from '@src/models/Product';
import { productService } from '@src/services/ProductService';
import { httpsCallable } from 'firebase/functions';

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

const getAllParamSchema = Type.Union([
  Type.Object({
    id: Type.Union([Type.String(), Type.Array(Type.String())]),
  }),
  Type.Object({
    sku: Type.Union([Type.String(), Type.Array(Type.String())]),
  }),
  Type.Object({
    configProfile: Type.Union([Type.String(), Type.Array(Type.String())]),
  }),
]);

const getAllSchema = { ...PaginationSchema, ...getAllParamSchema };

type QueryFilter = Static<typeof getAllParamSchema> & Pagination;

const products: FastifyPluginAsyncTypebox = async (
  fastify,
  opts,
): Promise<void> => {
  crudRest<IProduct, QueryFilter>(
    fastify,
    productService(),
    getAllSchema,
    addProductAddressSchema,
  );

  fastify.get('/teste', async function (request, reply) {
    const migrate = httpsCallable(functions, 'test');
    return migrate().then((result) => {
      // Read result of the Cloud Function.
      /** @type {any} */
      console.log(result);
      const data = result.data;
      console.log(data);
    });
  });

  return Promise.resolve();
};

export default products;
