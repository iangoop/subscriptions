import * as admin from 'firebase-admin';
import { DocumentReference, QuerySnapshot } from 'firebase-admin/firestore';
import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';
import { isEqual, omit } from 'lodash';

export type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  addressList: CustomerAddress[];
};
export type CustomerAddress = {
  customerId: string;
  firstName: string;
  middleName: string | undefined;
  lastName: string;
  company: string | undefined;
  street1: string | undefined;
  street2: string | undefined;
  street3: string | undefined;
  city: string | undefined;
  region: string | undefined;
  postcode: string | undefined;
  country: string | undefined;
  phone: string | undefined;
  isDefault: boolean;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
  updated: string;
  created: string;
};
export const exportCustomer = async (data: Customer[]) => {
  await Promise.all(
    data.map(async (item) => {
      const { addressList, ...customer } = item;
      const querySnapshot = await admin
        .firestore()
        .collection('customers')
        .where('email', '==', item.email)
        .get();
      if (querySnapshot && !querySnapshot.empty) {
        const docs: QueryDocumentSnapshot[] = [];
        querySnapshot.forEach((doc) => {
          docs.push(doc);
        });
        await Promise.all(
          docs.map(async (doc) => {
            await admin
              .firestore()
              .collection('customers')
              .doc(doc.id)
              .set(item);

            saveAddressList(doc.ref, addressList);
          }),
        );
      } else {
        const customerRef = await admin
          .firestore()
          .collection('customers')
          .add(customer);
        saveAddressList(customerRef, addressList);
      }
    }),
  );
};
const getRawAddress = (address: CustomerAddress) => {
  return omit(address, [
    'isDefault',
    'isDefaultBilling',
    'isDefaultShipping',
    'created',
    'updated',
  ]);
};

const findAddress = (
  address: CustomerAddress,
  currentAddressList: QuerySnapshot,
): QueryDocumentSnapshot | undefined => {
  let docFound = undefined;
  const rawAddress = getRawAddress(address);
  currentAddressList.forEach((item) => {
    const docAddress = getRawAddress(item.data() as CustomerAddress);
    if (isEqual(rawAddress, docAddress)) {
      docFound = item;
    }
  });
  return docFound;
};

const saveAddressList = async (
  customerRef: DocumentReference,
  addressList: CustomerAddress[],
) => {
  for (let i = 0; i < addressList.length; i++) {
    const address = addressList[i];
    const found = findAddress(
      address,
      await customerRef.collection('addressList').get(),
    );
    if (found) {
      const dataFound = found.data();
      const merge = Object.assign({}, dataFound, address);
      customerRef.collection('addressList').doc(found.id).set(merge);
    } else {
      customerRef.collection('addressList').add(address);
    }
  }
};
