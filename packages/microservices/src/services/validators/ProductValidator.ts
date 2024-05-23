import {
  IValidation,
  IValidator,
  processErrors,
  validatorFactory,
} from '@src/helpers/validators';
import { IProduct, ProductSchema } from '@src/models/Product';

export const productValidator: IValidator<IProduct> = {
  core: validatorFactory<IProduct>(ProductSchema),
  async validate(id: string, model: IProduct): Promise<IValidation> {
    const err: string[] = this.core.verify(model);
    return Promise.resolve(processErrors(err));
  },
  async instantiable(model: IProduct): Promise<IValidation> {
    const err: string[] = this.core.verify(model);
    return Promise.resolve(processErrors(err));
  },
};
