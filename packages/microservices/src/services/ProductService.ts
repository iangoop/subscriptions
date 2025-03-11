import { Crud } from '@src/helpers/dbfunctions';
import { IProduct, ProductCollection } from '@src/models/Product';
import { productConverter } from './converters/ProductConverter';
import { productValidator } from './validators/ProductValidator';

class ProductCrud extends Crud<IProduct> {
  constructor() {
    super(ProductCollection, productConverter, productValidator);
  }
}

export const productService = (): ProductCrud => {
  return new ProductCrud();
};
