import { docExists } from '@src/helpers/dbfunctions';
import {
  IValidation,
  IValidator,
  processErrors,
  validatorFactory,
} from '@src/helpers/validators';
import {
  IProduct,
  ProductCollection,
  ProductSchema,
} from '@src/models/Product';

export const productValidator: IValidator<IProduct> = {
  core: validatorFactory<IProduct>(ProductSchema),
  async validate(id: string, model: IProduct): Promise<IValidation> {
    const err = this.core.verify(model);
    return Promise.resolve(processErrors(err));
  },
  async instantiable(model: IProduct): Promise<IValidation> {
    const err = this.core.verify(model);
    return Promise.resolve(processErrors(err));
  },
  async exists(model: Partial<IProduct>): Promise<boolean> {
    return await docExists(model.id, ProductCollection);
  },
};
