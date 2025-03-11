import { firestoreInstance } from '@src/configurations/firebase';
import { validateDoc } from '@src/helpers/dbfunctions';
import {
  IValidation,
  IValidator,
  processErrors,
  validatorFactory,
} from '@src/helpers/validators';
import {
  CustomerCollection,
  CustomerSchema,
  ICustomer,
} from '@src/models/Customer';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { customerConverter } from '../converters/CustomerConverter';

async function getDocSnapshotByEmail(customer: ICustomer) {
  const q = query(
    collection(firestoreInstance, CustomerCollection),
    where('email', '==', customer.email),
  ).withConverter(customerConverter);

  return getDocs<ICustomer>(q);
}

async function validateEmail(
  customer: ICustomer,
  err: string[],
  id?: string,
): Promise<void> {
  const snapshot = await getDocSnapshotByEmail(customer);
  let isFree = snapshot.empty;
  if (!isFree) {
    isFree = true;
    snapshot.forEach((doc) => {
      isFree = isFree && id == doc.id;
    });
  }
  if (!isFree) {
    err.push('Email ' + customer.email + ' can not be set for the customer');
  }
}

export const customerValidator: IValidator<ICustomer> = {
  core: validatorFactory<ICustomer>(CustomerSchema),
  async validate(id: string, model: ICustomer): Promise<IValidation> {
    const err: string[] = this.core.verify(model);

    try {
      await validateDoc(id, CustomerCollection);
    } catch (error) {
      err.push(error as string);
    }
    await validateEmail(model, err, id);

    return processErrors(err);
  },

  async instantiable(model: ICustomer): Promise<IValidation> {
    const err: string[] = this.core.verify(model);
    if (model.id) {
      err.push('Customer already associated with a doc');
    } else {
      await validateEmail(model, err);
    }
    return processErrors(err);
  },
};
