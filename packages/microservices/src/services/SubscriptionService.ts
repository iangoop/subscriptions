import { firestoreInstance } from '@src/configurations/firebase';
import { DeliveryCollection, IDelivery } from '@src/models/Delivery';
import {
  ISubscription,
  SubscriptionCollection,
} from '@src/models/Subscription';
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { deliveryConverter } from './converters/DeliveryConverter';
import { subscriptionConverter } from './converters/SubscriptionConverter';
import { subscriptionValidator } from './validators/SubscriptionValidator';
import {
  fetchCustomerSubscriptionPlan,
  fetchNextScheduledDate,
} from './functions/SubscriptionFunction';
import { CustomerCollection } from '@src/models/Customer';
import {
  CustomerAddressCollection,
  ICustomerAddress,
} from '@src/models/CustomerAddress';
import { customerAddressConverter } from './converters/CustomerAddressConverter';
import { IProduct, ProductCollection } from '@src/models/Product';
import { productConverter } from './converters/ProductConverter';
import { ValidationError } from '@src/helpers/validators';
import { createError, InternalErrorList } from '@src/helpers/errors';
import { format } from 'util';

type SubscriptionPlanning = ISubscription & {
  isEditable: boolean;
};
type SubscriptionsGroup = {
  delivery?: IDelivery;
  subscriptions: SubscriptionPlanning[];
};

type AddressDateSubscriptionGroup = Record<string, SubscriptionsGroup>;
type AddressSubscriptionGroup = Record<string, AddressDateSubscriptionGroup>;

type SubscriptionPlanningExport = {
  planning: AddressSubscriptionGroup;
  data: {
    customerAddresses: ICustomerAddress[];
    products: IProduct[];
  };
};

export class SubscriptionService {
  async createSubscriptionForProduct(subscription: ISubscription) {
    const validation = await subscriptionValidator.instantiable(subscription);
    if (!validation.isValid()) {
      validation.throwErrors();
    }
    const docRef = await addDoc(
      collection(firestoreInstance, SubscriptionCollection),
      subscription,
    );
    docRef.withConverter(subscriptionConverter);
    return getDoc(docRef);
  }

  async skipSubscription(
    subscriptionId: string,
    customerId: string,
  ): Promise<boolean> {
    const customerDocRef = doc(
      collection(firestoreInstance, CustomerCollection),
      customerId,
    );
    const customer = await getDoc(customerDocRef);
    if (!customer.exists()) {
      throw new ValidationError(
        createError(
          'ca001',
          format(InternalErrorList.ca001, customerId.toString()),
        ),
      );
    }
    const docRef = doc(
      collection(firestoreInstance, SubscriptionCollection),
      subscriptionId,
    ).withConverter(subscriptionConverter);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      throw new ValidationError(
        createError('doc004', format(InternalErrorList.doc004)),
      );
    }
    const data = docSnapshot.data();
    if (data.customerId !== customerId) {
      throw new ValidationError(
        createError('su001', format(InternalErrorList.su001, customerId)),
      );
    }
    if (data.orderDate) {
      const nextOrderDate = await fetchNextScheduledDate(
        data.orderDate,
        data.schedule,
      );
      await updateDoc(docRef, {
        orderDate: nextOrderDate,
        scheduled: false,
      });
      return true;
    }
    return false;
  }

  async getCustomerAddressObject(
    customerId: string,
    customerAddressId: string,
  ) {
    const customerDocRef = doc(
      collection(firestoreInstance, CustomerCollection),
      customerId,
    );
    const customerAddressCollectionRef = collection(
      customerDocRef,
      CustomerAddressCollection,
    ).withConverter(customerAddressConverter);
    return getDoc(doc(customerAddressCollectionRef, customerAddressId));
  }

  async getProductObject(productId: string) {
    const productDocRef = doc(
      collection(firestoreInstance, ProductCollection).withConverter(
        productConverter,
      ),
      productId,
    );
    return getDoc(productDocRef);
  }

  extractProductIdsFromListOfSubscriptions(
    productIdsList: string[],
    subscriptionPlanningForAddress: AddressDateSubscriptionGroup,
  ) {
    for (const subscriptionGroup of Object.values(
      subscriptionPlanningForAddress,
    )) {
      productIdsList.push(
        ...subscriptionGroup.subscriptions
          .map((subscription) => subscription.productId)
          .filter((productId) => !productIdsList.includes(productId)),
      );
    }
  }

  async getCustomerSubscriptionPlanning(
    customerId: string,
    monthsToShow: number,
  ) {
    const subscriptionPlanning = (await fetchCustomerSubscriptionPlan(
      customerId,
      monthsToShow,
    )) as AddressSubscriptionGroup;
    const result: SubscriptionPlanningExport = {
      planning: subscriptionPlanning,
      data: {
        customerAddresses: [],
        products: [],
      },
    };
    const productIdsList: string[] = [];
    for (const customerAddressId of Object.keys(subscriptionPlanning)) {
      const customerAddressDocument = await this.getCustomerAddressObject(
        customerId,
        customerAddressId,
      );
      if (customerAddressDocument.exists()) {
        result.data.customerAddresses.push(customerAddressDocument.data());
      }
      this.extractProductIdsFromListOfSubscriptions(
        productIdsList,
        subscriptionPlanning[customerAddressId],
      );
    }
    const products = await Promise.all(
      productIdsList.map(async (productId) => {
        const productRef = await this.getProductObject(productId);
        if (productRef.exists()) {
          return productRef.data();
        }
        //todo - log errors
        return undefined;
      }),
    );
    result.data.products.push(
      ...products.filter((product) => product !== undefined),
    );
    return result;
  }

  getDeliveryCollection() {
    return collection(firestoreInstance, DeliveryCollection).withConverter(
      deliveryConverter,
    );
  }

  getSubscriptionCollection() {
    return collection(firestoreInstance, SubscriptionCollection).withConverter(
      subscriptionConverter,
    );
  }
}
