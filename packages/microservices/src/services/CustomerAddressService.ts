import {
  ICustomerAddress,
  CustomerAddressCollection,
} from '@src/models/CustomerAddress';
import { firestoreInstance } from '@src/configurations/firebase';
import {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
  QueryConstraint,
} from 'firebase/firestore';
import { CrudSubcollection } from '@src/helpers/dbfunctions';

import { InvalidReferenceError } from '@src/helpers/errors';
import { customerAddressConverter } from './converters/CustomerAddressConverter';
import { Pagination, PaginationQuery } from '@src/helpers/pagination';
import { CustomerCollection } from '@src/models/Customer';
import { customerAddressValidator } from './validators/CustomerAddressValidator';

type CustomerIdQueryFilter = { customerId: string };
type platformCustomerIdQueryFilter = { platformCustomerId: string };
type emailQueryFilter = { email: string };
export type customerAddressQueryFilter =
  | CustomerIdQueryFilter
  | platformCustomerIdQueryFilter
  | emailQueryFilter;

class CustomerAddressCrud extends CrudSubcollection<
  'customerId',
  ICustomerAddress,
  customerAddressQueryFilter
> {
  constructor() {
    super(
      CustomerAddressCollection,
      customerAddressConverter,
      customerAddressValidator,
      'customerId',
      CustomerCollection,
    );
  }

  async getAll<T extends Pagination = Pagination>(
    filter: T & customerAddressQueryFilter,
  ): Promise<PaginationQuery<ICustomerAddress>> {
    let customer = undefined;
    if ((filter as CustomerIdQueryFilter).customerId) {
      customer = await getDoc(
        doc(
          firestoreInstance,
          this.parentCollection,
          (filter as CustomerIdQueryFilter).customerId,
        ),
      );
    } else if ((filter as platformCustomerIdQueryFilter).platformCustomerId) {
      (
        await getDocs(
          query(
            collection(firestoreInstance, this.parentCollection),
            where(
              'platformCustomerId',
              '==',
              (filter as platformCustomerIdQueryFilter).platformCustomerId,
            ),
          ),
        )
      ).forEach((item) => {
        customer = item;
      });
    } else if ((filter as emailQueryFilter).email) {
      (
        await getDocs(
          query(
            collection(firestoreInstance, this.parentCollection),
            where(
              'email',
              '==',
              (filter as platformCustomerIdQueryFilter).platformCustomerId,
            ),
          ),
        )
      ).forEach((item) => {
        customer = item;
      });
    }
    if (!customer || !customer.exists()) {
      throw new InvalidReferenceError("Customer doesn't exist");
    }
    const constraints: QueryConstraint[] = [];
    return this.processQuery(
      constraints,
      Object.assign({ parentId: customer.id }, filter),
    );
  }
}

export const customerAddressService = (): CustomerAddressCrud => {
  return new CustomerAddressCrud();
};
