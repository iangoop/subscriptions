import { firestoreInstance } from '@src/configurations/firebase';
import { docExists, validateDoc } from '@src/helpers/dbfunctions';
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
import {
  createError,
  ErrorRecord,
  InternalErrorList,
  refineError,
} from '@src/helpers/errors';
import { format } from 'util';

async function getDocSnapshotByEmail(customer: ICustomer) {
  const q = query(
    collection(firestoreInstance, CustomerCollection),
    where('email', '==', customer.email),
  ).withConverter(customerConverter);

  return getDocs(q);
}

async function validateEmail(
  customer: ICustomer,
  err: ErrorRecord[],
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
    err.push(
      createError('cu001', format(InternalErrorList.cu001, customer.email)),
    );
  }
}

export const customerValidator: IValidator<ICustomer> = {
  core: validatorFactory<ICustomer>(CustomerSchema),
  async validate(id: string, model: ICustomer): Promise<IValidation> {
    const err: ErrorRecord[] = this.core.verify(model);

    try {
      await validateDoc(id, CustomerCollection);
    } catch (error) {
      refineError(err, error);
    }
    await validateEmail(model, err, id);

    return processErrors(err);
  },

  async instantiable(model: ICustomer): Promise<IValidation> {
    const err: ErrorRecord[] = this.core.verify(model);
    if (model.id) {
      err.push(createError('doc001'));
    } else {
      await validateEmail(model, err);
    }
    return processErrors(err);
  },

  async exists(model: Partial<ICustomer>): Promise<boolean> {
    return await docExists(model.id, CustomerCollection);
  },
};
