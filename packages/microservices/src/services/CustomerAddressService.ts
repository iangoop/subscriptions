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
  orderBy,
  CollectionReference,
  updateDoc,
  limit,
} from 'firebase/firestore';
import {
  CrudSubcollection,
  Identified,
  Referenced,
} from '@src/helpers/dbfunctions';

import { createError, InvalidReferenceError } from '@src/helpers/errors';
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
  ICustomerAddress
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
      throw new InvalidReferenceError(createError('in002'));
    }
    const constraints: QueryConstraint[] = [orderBy('isActive', 'desc')];
    return this.processQuery(
      constraints,
      Object.assign({ customerId: customer.id }, filter),
    );
  }

  async clearDefaultFromAddressCollection(
    modelPersisted: ICustomerAddress,
    subcollectionReference: CollectionReference<ICustomerAddress>,
    property: keyof ICustomerAddress,
  ) {
    const q = query(subcollectionReference, where(property, '==', true));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
      if (doc.id != modelPersisted.id) {
        await updateDoc(doc.ref, {
          [property]: false,
        });
      }
    });
  }

  async updateDefaultAddressesStatus(
    customerId: string,
    address: ICustomerAddress,
  ) {
    const clearDefaultPromises: Promise<void>[] = [];
    if (
      address.isDefault ||
      address.isDefaultBilling ||
      address.isDefaultShipping
    ) {
      const parentRef = this.getParentReference(customerId);
      const subcollectionRef = this.getSubcollectionReference(parentRef);

      if (address.isDefault) {
        clearDefaultPromises.push(
          this.clearDefaultFromAddressCollection(
            address,
            subcollectionRef,
            'isDefault',
          ),
        );
      }
      if (address.isDefaultBilling) {
        clearDefaultPromises.push(
          this.clearDefaultFromAddressCollection(
            address,
            subcollectionRef,
            'isDefaultBilling',
          ),
        );
      }
      if (address.isDefaultShipping) {
        clearDefaultPromises.push(
          this.clearDefaultFromAddressCollection(
            address,
            subcollectionRef,
            'isDefaultShipping',
          ),
        );
      }
    }
    return Promise.all(clearDefaultPromises);
  }

  async redirectDefaults(
    collection: CollectionReference<ICustomerAddress>,
    modelArchived: ICustomerAddress,
  ) {
    const q = query(
      collection,
      where('isActive', '==', true),
      orderBy('updated', 'desc'),
      limit(1),
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const addressReference = querySnapshot.docs[0];
      const dataToUpdate: Partial<ICustomerAddress> = {};
      if (modelArchived.isDefault) {
        dataToUpdate.isDefault = true;
      }
      if (modelArchived.isDefaultBilling) {
        dataToUpdate.isDefaultBilling = true;
      }
      if (modelArchived.isDefaultShipping) {
        dataToUpdate.isDefaultShipping = true;
      }
      return updateDoc(addressReference.ref, dataToUpdate);
    }
  }

  async unsetDefaultsFromArchived(
    collection: CollectionReference<ICustomerAddress>,
    id: string,
  ) {
    const documentRefence = doc(collection, id);
    return updateDoc(documentRefence, {
      isDefault: false,
      isDefaultBilling: false,
      isDefaultShipping: false,
    });
  }

  async onArchiveRedirectDefaults(
    queryId: Identified & Referenced<'customerId'>,
    modelArchived: ICustomerAddress,
  ) {
    if (
      modelArchived.isDefault ||
      modelArchived.isDefaultBilling ||
      modelArchived.isDefaultShipping
    ) {
      const parentRef = this.getParentReference(queryId.customerId);
      const subcollectionReference = this.getSubcollectionReference(parentRef);
      await this.redirectDefaults(subcollectionReference, modelArchived);
      await this.unsetDefaultsFromArchived(subcollectionReference, queryId.id);
    }
  }

  async makeAddressDefaultIfNoneFound(
    customerId: string,
    model: ICustomerAddress,
  ) {
    if (!model.isDefault) {
      const parentRef = this.getParentReference(customerId);
      const addressCollection = this.getSubcollectionReference(parentRef);
      const q = query(addressCollection, where('isDefault', '==', true));
      const querySnapshot = await getDocs(q);
      const docRef = doc(addressCollection, model.id);
      if (querySnapshot.empty) {
        model.isDefault = true;
        return updateDoc(docRef, { isDefault: true });
      }
    }
  }

  async create(model: ICustomerAddress): Promise<ICustomerAddress> {
    const address = await super.create(model);
    await Promise.all([
      this.updateDefaultAddressesStatus(model.customerId, address),
      this.makeAddressDefaultIfNoneFound(model.customerId, address),
    ]);

    return address;
  }

  async update(id: string, model: ICustomerAddress): Promise<ICustomerAddress> {
    const address = await super.update(id, model);
    await this.updateDefaultAddressesStatus(model.customerId, address);

    return Object.assign(address, {
      isDefault: false,
      isDefaultBilling: false,
      isDefaultShipping: false,
    });
  }

  async delete(queryId: Identified & Referenced<'customerId'>) {
    const documentArchived = await super.delete(queryId);
    await this.onArchiveRedirectDefaults(queryId, documentArchived);
    return documentArchived;
  }
}

export const customerAddressService = (): CustomerAddressCrud => {
  return new CustomerAddressCrud();
};
