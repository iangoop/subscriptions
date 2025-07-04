import { firestoreInstance } from '@src/configurations/firebase';
import {
  docExists,
  validateDoc,
  validateDocInSubcollection,
} from '@src/helpers/dbfunctions';
import {
  createError,
  ErrorRecord,
  InternalErrorList,
  refineError,
} from '@src/helpers/errors';
import {
  IValidation,
  IValidator,
  processErrors,
  validatorFactory,
} from '@src/helpers/validators';
import { CustomerCollection } from '@src/models/Customer';
import {
  CustomerAddressCollection,
  CustomerAddressSchema,
  ICustomerAddress,
} from '@src/models/CustomerAddress';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'util';

async function validateCustomer(
  customerAddress: ICustomerAddress,
  err: ErrorRecord[],
) {
  const customer = await getDoc(
    doc(
      firestoreInstance,
      CustomerCollection,
      customerAddress.customerId.toString(),
    ),
  );
  if (!customer.exists()) {
    err.push(
      createError(
        'ca001',
        format(InternalErrorList.ca001, customerAddress.customerId.toString()),
      ),
    );
  }
  return customer;
}

export const customerAddressValidator: IValidator<ICustomerAddress> = {
  core: validatorFactory<ICustomerAddress>(CustomerAddressSchema),
  async validate(id: string, model: ICustomerAddress): Promise<IValidation> {
    const err = this.core.verify(model);
    if ((await validateCustomer(model, err)).exists()) {
      try {
        await validateDocInSubcollection(
          id,
          CustomerAddressCollection,
          model.customerId,
          CustomerCollection,
        );
      } catch (error) {
        refineError(err, error);
      }
    }

    return processErrors(err);
  },
  async instantiable(model: ICustomerAddress): Promise<IValidation> {
    const err = this.core.verify(model);

    await validateCustomer(model, err);
    return processErrors(err);
  },
  async exists(model: Partial<ICustomerAddress>): Promise<boolean> {
    const docSnapshot = await validateDoc(model.customerId, CustomerCollection);
    return docExists(model.id, CustomerAddressCollection, docSnapshot.ref);
  },
};
