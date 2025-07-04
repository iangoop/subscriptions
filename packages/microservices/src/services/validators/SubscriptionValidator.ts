import { docExists } from '@src/helpers/dbfunctions';
import {
  createError,
  ErrorRecord,
  InternalErrorList,
} from '@src/helpers/errors';
import {
  checkIrregularIdentifiedNewInstanceError,
  IValidation,
  IValidator,
  processErrors,
  validatorFactory,
} from '@src/helpers/validators';
import {
  ISubscription,
  SubscriptionCollection,
  SubscriptionSchema,
} from '@src/models/Subscription';
import { customerValidator } from './CustomerValidator';
import { format } from 'util';
import { customerAddressValidator } from './CustomerAddressValidator';
import { productValidator } from './ProductValidator';
async function validateDependencies(model: ISubscription, err: ErrorRecord[]) {
  if (!(await customerValidator.exists({ id: model.customerId }))) {
    err.push(
      createError('doc006', format(InternalErrorList.doc006, 'Customer')),
    );
  }
  if (
    model.shippingAddressId.length &&
    !(await customerAddressValidator.exists({
      id: model.shippingAddressId,
      customerId: model.customerId,
    }))
  ) {
    err.push(
      createError(
        'doc006',
        format(InternalErrorList.doc006, 'Customer Shipping Address'),
      ),
    );
  }
  if (
    model.billingAddressId.length &&
    !(await customerAddressValidator.exists({
      id: model.billingAddressId,
      customerId: model.customerId,
    }))
  ) {
    err.push(
      createError(
        'doc006',
        format(InternalErrorList.doc006, 'Customer Billing Address'),
      ),
    );
  }
  if (!(await productValidator.exists({ id: model.productId }))) {
    err.push(
      createError('doc006', format(InternalErrorList.doc006, 'Product')),
    );
  }
}
export const subscriptionValidator: IValidator<ISubscription> = {
  core: validatorFactory<ISubscription>(SubscriptionSchema),
  async validate(id: string, model: ISubscription): Promise<IValidation> {
    const err = this.core.verify(model);
    validateDependencies(model, err);
    return Promise.resolve(processErrors(err));
  },
  async instantiable(model: ISubscription): Promise<IValidation> {
    const err = this.core.verify(model);
    checkIrregularIdentifiedNewInstanceError(model, err);
    validateDependencies(model, err);
    return Promise.resolve(processErrors(err));
  },
  async exists(model: Partial<ISubscription>): Promise<boolean> {
    return await docExists(model.id, SubscriptionCollection);
  },
};
