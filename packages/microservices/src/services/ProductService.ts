import { Crud } from '@src/helpers/dbfunctions';
import { ObjectArr } from '@src/helpers/filters';
import { Pagination } from '@src/helpers/pagination';
import { IProduct, ProductCollection } from '@src/models/Product';
import { productConverter } from './converters/ProductConverter';
import { productValidator } from './validators/ProductValidator';

const queryFilter = ['id', 'sku', 'configProfile'] as const;
export type productQueryFilter = ObjectArr<typeof queryFilter>;
export type productQueryFilterWithPagination = productQueryFilter & Pagination;

class ProductCrud extends Crud<IProduct> {
  constructor() {
    super(ProductCollection, productConverter, productValidator);
  }
}

export const productService = (): ProductCrud => {
  return new ProductCrud();
};
