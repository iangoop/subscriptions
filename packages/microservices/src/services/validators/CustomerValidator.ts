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
import { CustomerAddressCollection } from '@src/models/CustomerAddress';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { customerAddressConverter } from '../converters/CustomerAddressConverter';
import { customerConverter } from '../converters/CustomerConverter';

async function getDocSnapshotByEmail(customer: ICustomer) {
  const q = query(
    collection(firestoreInstance, CustomerCollection),
    where('email', '==', customer.email),
  ).withConverter(customerConverter);

  return getDocs<ICustomer>(q);
}

async function validateAddress(
  customer: ICustomer,
  field: string,
  err: string[],
): Promise<boolean> {
  const key = field as keyof typeof customer;
  if (!customer[key]) {
    throw new Error('No value for field ' + field);
  }
  const addressId = customer[key] as string;
  const docSnapshot = await getDoc(
    doc(firestoreInstance, CustomerAddressCollection, addressId).withConverter(
      customerAddressConverter,
    ),
  );
  if (!docSnapshot.exists()) {
    err.push('No Address found with id ' + addressId + ' for property ' + key);
    return false;
  }
  if (docSnapshot.data().customerId != customer.id) {
    err.push(
      'Address in property ' + key + ' can not be linked to the customer',
    );
    return false;
  }
  return true;
}

async function validateAddresses(
  customer: ICustomer,
  err: string[],
): Promise<void> {
  if (customer.defaultAddressId) {
    await validateAddress(customer, 'defaultAddressId', err);
  }
  if (customer.defaultBillingAddressId) {
    await validateAddress(customer, 'defaultBillingAddressId', err);
  }
  if (customer.defaultShippingAddressId) {
    await validateAddress(customer, 'defaultShippingAddressId', err);
  }
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

    await validateDoc(id, CustomerCollection);
    await validateEmail(model, err, id);
    await validateAddresses(model, err);

    return processErrors(err);
  },

  async instantiable(model: ICustomer): Promise<IValidation> {
    const err: string[] = this.core.verify(model);
    if (model.id) {
      err.push('Customer already associated with a doc');
    } else {
      await validateEmail(model, err);
      await validateAddresses(model, err);
    }
    return processErrors(err);
  },
};
