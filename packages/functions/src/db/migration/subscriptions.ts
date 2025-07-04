import { DocumentSnapshot } from 'firebase-functions/v1/firestore';
import { firestore } from '../../firestore';
import {
  DeliveryDb,
  OneOfId,
  OneOfProductId,
  SubscriptionDb,
  SubscriptionPayload,
} from '../subscriptions';

const findCustomerReference = async (
  identifier: OneOfId,
): Promise<DocumentSnapshot | null> => {
  let customerRef = null;
  if (identifier.id) {
    customerRef = firestore.collection('customers').doc(identifier.id).get();
  } else if (identifier.platformId) {
    const query = await firestore
      .collection('customers')
      .where('platformId', '==', identifier.platformId)
      .get();
    if (!query.empty) {
      customerRef = query.docs[0];
    }
  }
  return customerRef;
};

const findAddressReference = async (
  customer: DocumentSnapshot,
  addressIdentifier: OneOfId,
): Promise<DocumentSnapshot | null> => {
  let addressId = null;
  if (addressIdentifier.id) {
    addressId = customer.ref
      .collection('addressList')
      .doc(addressIdentifier.id)
      .get();
  } else if (addressIdentifier.platformId) {
    const query = await customer.ref
      .collection('addressList')
      .where('platformId', '==', addressIdentifier.platformId)
      .get();
    if (!query.empty) {
      addressId = query.docs[0];
    }
  }
  return addressId;
};

const findProductReference = async (
  identifier: OneOfProductId,
): Promise<DocumentSnapshot | null> => {
  let productRef = null;
  if (identifier.id) {
    productRef = firestore.collection('products').doc(identifier.id).get();
  } else if (identifier.sku) {
    const query = await firestore
      .collection('products')
      .where('sku', '==', identifier.sku)
      .get();
    if (!query.empty) {
      productRef = query.docs[0];
    }
  }
  return productRef;
};

const stringfyAddressReference = async (
  customer: DocumentSnapshot,
  addressIdentifier?: OneOfId,
) => {
  const shippingAddressRef = addressIdentifier
    ? await findAddressReference(customer, addressIdentifier)
    : null;
  return shippingAddressRef ? shippingAddressRef.id : '';
};

const saveDeliveries = async (data: SubscriptionPayload) => {
  return Promise.all(
    data.deliveries.map(async (delivery) => {
      const customerRef = await findCustomerReference(delivery.customerId);
      if (customerRef) {
        const shippingAddress = await stringfyAddressReference(
          customerRef,
          delivery.shippingAddressId,
        );
        const deliveryDb = Object.assign({}, delivery, {
          customerId: customerRef.id,
          shippingAddressId: shippingAddress,
        }) as DeliveryDb;

        const queryDelivery = await firestore
          .collection('deliveries')
          .where('shippingAddressId', '==', deliveryDb.shippingAddressId)
          .where('customerId', '==', deliveryDb.customerId)
          .where('nextOrderDate', '==', deliveryDb.nextOrderDate)
          .get();
        if (queryDelivery.empty) {
          const savedDelivery = await firestore
            .collection('deliveries')
            .add(deliveryDb);
          return savedDelivery;
        } else {
          const currentDelivery = queryDelivery.docs[0];
          const savedDelivery = Object.assign(
            {},
            currentDelivery.data(),
            deliveryDb,
          );

          await firestore
            .collection('deliveries')
            .doc(currentDelivery.id)
            .set(savedDelivery);

          return savedDelivery;
        }
      } else {
        // TODO - LOG ERRORS
        return null;
      }
    }),
  );
};

const saveSubscriptions = async (data: SubscriptionPayload) => {
  for (const subscription of data.subscriptions) {
    const customerRef = await findCustomerReference(subscription.customerId);
    const productRef = await findProductReference(subscription.productId);
    if (customerRef && productRef) {
      const shippingAddressId = await stringfyAddressReference(
        customerRef,
        subscription.shippingAddressId,
      );
      const subscriptionDb = Object.assign({}, subscription, {
        customerId: customerRef.id,
        shippingAddressId: shippingAddressId,
        productId: productRef.id,
      }) as SubscriptionDb;

      const querySubscription = await firestore
        .collection('subscriptions')
        .where('shippingAddressId', '==', subscriptionDb.shippingAddressId)
        .where('customerId', '==', subscriptionDb.customerId)
        .where('productId', '==', subscriptionDb.productId)
        .where('schedule', '==', subscriptionDb.schedule)
        .where('quantity', '==', subscriptionDb.quantity)
        .get();
      if (querySubscription.empty) {
        await firestore.collection('subscriptions').add(subscriptionDb);
      } else {
        const currentSubscription = querySubscription.docs[0];
        const savedSubscription = Object.assign(
          {},
          currentSubscription.data(),
          subscriptionDb,
        );

        await firestore
          .collection('subscriptions')
          .doc(currentSubscription.id)
          .set(savedSubscription);
      }
    } else {
      // TODO - LOG ERRORS
    }
  }
};

export const exportSubscriptions = async (data: SubscriptionPayload) => {
  await saveDeliveries(data);
  await saveSubscriptions(data);
};
