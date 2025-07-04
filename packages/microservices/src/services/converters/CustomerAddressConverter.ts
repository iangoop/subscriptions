import { FirestoreDataConverter } from 'firebase/firestore';
import {
  ICustomerAddress,
  IDBCustomerAddress,
} from '@src/models/CustomerAddress';
import { createConverter } from '@src/helpers/converters';

export const customerAddressConverter: FirestoreDataConverter<
  ICustomerAddress,
  IDBCustomerAddress
> = createConverter({
  mapToDb(partialDbModel, fullAppModel) {
    const { customerId, ...rest } = partialDbModel as ICustomerAddress;
    return rest;
  },
  mapFromDb(partialAppModel, dbModel, snapshot) {
    const customerId = snapshot.ref.parent.parent?.id;
    partialAppModel.customerId = customerId || '';
    return partialAppModel;
  },
});
