import { firestoreInstance } from '@src/configurations/firebase';
import { validateDoc } from '@src/helpers/dbfunctions';
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

async function validateCustomer(
  customerAddress: ICustomerAddress,
  err: string[],
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
      "Can't find customer with id " + customerAddress.customerId.toString(),
    );
  }
}

export const customerAddressValidator: IValidator<ICustomerAddress> = {
  core: validatorFactory<ICustomerAddress>(CustomerAddressSchema),
  async validate(id: string, model: ICustomerAddress): Promise<IValidation> {
    const err: string[] = this.core.verify(model);
    await validateDoc(id, CustomerAddressCollection);
    await validateCustomer(model, err);

    return processErrors(err);
  },
  async instantiable(model: ICustomerAddress): Promise<IValidation> {
    const err: string[] = this.core.verify(model);

    await validateCustomer(model, err);
    return processErrors(err);
  },
};
