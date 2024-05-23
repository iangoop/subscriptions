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
  orderBy,
  DocumentReference,
} from 'firebase/firestore';
import { fromQuery, Crud } from '@src/helpers/dbfunctions';

import { InvalidReferenceError } from '@src/helpers/errors';
import { customerAddressConverter } from './converters/CustomerAddressConverter';
import { Pagination, paginate } from '@src/helpers/pagination';
import { CustomerCollection } from '@src/models/Customer';
import { customerAddressValidator } from './validators/CustomerAddressValidator';
import { normalize, ObjectArr, QueryObjectNorm } from '@src/helpers/filters';

const queryFilter = ['id', 'platformSpecificCustomerId', 'email'] as const;
export type customerAddressQueryFilter = ObjectArr<typeof queryFilter>;
export type customerAddressQueryFilterWithPagination =
  customerAddressQueryFilter & Pagination;

async function getAllMatchingDocuments(
  queryFilter: QueryObjectNorm<customerAddressQueryFilter>,
): Promise<DocumentReference[]> {
  const customerList: DocumentReference[] = [];
  if (queryFilter.hasId()) {
    await Promise.all(
      queryFilter.getId().map(async (id) => {
        const cDoc = await getDoc(
          doc(firestoreInstance, CustomerCollection, id),
        );
        if (!cDoc.exists()) {
          throw new InvalidReferenceError("Customer doesn't exist");
        }
        customerList.push(cDoc.ref);
      }),
    );
  }
  if (queryFilter.hasEmail()) {
    await Promise.all(
      queryFilter.getEmail().map(async (email) => {
        const docs = await getDocs(
          query(
            collection(firestoreInstance, CustomerCollection),
            where('email', '==', email),
          ),
        );
        if (docs.size && docs.docs[0].exists()) {
          customerList.push(docs.docs[0].ref);
        } else {
          throw new InvalidReferenceError("Customer doesn't exist");
        }
      }),
    );
  }
  return customerList;
}

class CustomerAddressCrud extends Crud<ICustomerAddress> {
  constructor() {
    super(
      CustomerAddressCollection,
      customerAddressConverter,
      customerAddressValidator,
    );
  }

  async getAll(
    filter: customerAddressQueryFilterWithPagination,
  ): Promise<ICustomerAddress[]> {
    const customers = await getAllMatchingDocuments(
      normalize<customerAddressQueryFilter>(queryFilter, filter),
    );
    const constraints = [];
    if (customers.length) {
      constraints.push(where('customerId', 'in', customers));
    }
    constraints.push(orderBy('updated', 'desc'));
    return this.processQuery(constraints, filter);
  }
}

export const customerAddressService = (): CustomerAddressCrud => {
  return new CustomerAddressCrud();
};
