import { DocumentReference } from 'firebase-admin/firestore';
import { firestore } from '../../src/firestore';
import {
  DATE_FORMAT,
  DeliveryApp,
  DeliveryDb,
  DeliveryStatus,
  getNextActiveDeliveriesForCustomer,
  SubscriptionDb,
  SubscriptionStatus,
  updateDelivery,
} from '../../src/db/subscriptions';
import { addDays, format, parse, startOfDay } from 'date-fns';
import waitForExpect from 'wait-for-expect';
import {
  getNextScheduledDate,
  getPreviousScheduledDate,
} from '../../src/util/subscriptions';

const subscription1Id = 'sub_001';
const subscription2Id = 'sub_002';
const subscription3Id = 'sub_003';
const subscription4Id = 'sub_004';
const customer1Id = 'cust_001';
const customer2Id = 'cust_002';
const address1Id = 'addr_001';
const address2Id = 'addr_002';
const customer2Address1Id = 'addr_004';
const product1Id = 'prod_001';
const product2Id = 'prod_002';
const product3Id = 'prod_003';
const product4Id = 'prod_004';
const delivery1Id = 'del_001';
const delivery2Id = 'del_002';
const delivery3Id = 'del_003';

const customerSample = {
  email: 'cameron11@allen.com',
  firstName: 'Naomi',
  lastName: 'Parker',
  platformId: '58N0ZS9M',
};

const customer2Sample = {
  email: 'pward@hotmail.com',
  firstName: 'Carl',
  lastName: 'Waters',
  platformId: 'FB39WH99',
};

const customer1AddressSample1 = {
  firstName: 'Naomi',
  middleName: '',
  lastName: 'Parker',
  company: 'Dodd-Reid',
  street1: 'Queen Square',
  street2: '',
  street3: '',
  city: 'Bristol',
  region: 'Bristol',
  postcode: 'BS1 5TR',
  country: 'United Kingdom',
  phone: '+44(0)116 4960083',
  isDefault: true,
  isDefaultBilling: false,
  isDefaultShipping: false,
  created: '2023-09-16T17:57:59',
  updated: '2023-09-16T17:57:59',
  isActive: true,
  platformId: 'K1WS2UHU',
};

const customer2AddressSample1 = {
  firstName: 'Carl',
  middleName: '',
  lastName: 'Waters',
  company: 'Wright-Harris',
  street1: 'Union Street',
  street2: '',
  street3: '',
  city: 'Aberdeen',
  region: 'Aberdeen City',
  postcode: 'AB10 1AB',
  country: 'United Kingdom',
  phone: '+44808 157 0787',
  isDefault: true,
  isDefaultBilling: true,
  isDefaultShipping: true,
  created: '2023-09-16T17:57:59',
  updated: '2023-09-16T17:57:59',
  isActive: true,
  platformId: '9ALD6KEI',
};

const productSample1 = {
  sku: 'PROD-001',
  name: 'Sample Product',
  shortDescription: 'This is a sample product.',
  longDescription: 'This is a longer description of the sample product.',
  thumbnailUrl: 'http://example.com/sample.jpg',
  msrp: 100,
  price: 80,
  salePrice: null,
  isOnSale: false,
  minQty: 1,
  maxQty: 10,
  qtyInStock: 100,
  isInStock: true,
  discount: null,
  isDiscountPercentage: false,
};

const productSample2 = {
  sku: 'PROD-002',
  name: 'Sample Product 2',
  shortDescription: 'This is a sample product.',
  longDescription: 'This is a longer description of the sample product.',
  thumbnailUrl: 'http://example.com/sample2.jpg',
  msrp: 100,
  price: 80,
  salePrice: null,
  isOnSale: false,
  minQty: 1,
  maxQty: 10,
  qtyInStock: 100,
  isInStock: true,
  discount: null,
  isDiscountPercentage: false,
};

const productSample3 = {
  sku: 'PROD-003',
  name: 'Sample Product 3',
  shortDescription: 'This is a sample product.',
  longDescription: 'This is a longer description of the sample product.',
  thumbnailUrl: 'http://example.com/sample3.jpg',
  msrp: 100,
  price: 80,
  salePrice: null,
  isOnSale: false,
  minQty: 1,
  maxQty: 10,
  qtyInStock: 100,
  isInStock: true,
  discount: null,
  isDiscountPercentage: false,
};

describe('onSubscriptionWrittenDatabase', () => {
  let customer1Ref: DocumentReference = {} as DocumentReference;
  let customer1address1Ref: DocumentReference = {} as DocumentReference;
  let customer1address2Ref: DocumentReference = {} as DocumentReference;
  let customer2Ref: DocumentReference = {} as DocumentReference;
  let customer2address1Ref: DocumentReference = {} as DocumentReference;
  let product1Ref: DocumentReference = {} as DocumentReference;
  let product2Ref: DocumentReference = {} as DocumentReference;
  let product3Ref: DocumentReference = {} as DocumentReference;
  let product4Ref: DocumentReference = {} as DocumentReference;

  function makeDeliveryData(overrides: Partial<DeliveryDb> = {}): DeliveryDb {
    return {
      customerId: customer1Ref.id,
      shippingAddressId: customer1address1Ref.id,
      status: DeliveryStatus.Active,
      paymentInfo: [],
      ...overrides,
    };
  }

  function makeSubData(
    overrides: Partial<SubscriptionDb> = {},
  ): SubscriptionDb {
    return {
      customerId: customer1Ref.id,
      shippingAddressId: customer1address1Ref.id,
      paymentCode: 'abcd',
      productId: product1Ref.id,
      quantity: 1,
      schedule: '1M',
      status: SubscriptionStatus.Active,
      shippingMethodCode: 'nextday',
      ...overrides,
    } as SubscriptionDb;
  }

  async function removeCustomerSubscriptions(customerId: string) {
    const deliveries = await firestore
      .collection('deliveries')
      .where('customerId', '==', customerId)
      .get();
    await Promise.all(
      deliveries.docs.map(async (doc) => {
        await doc.ref.delete();
      }),
    );

    const subscriptions = await firestore
      .collection('subscriptions')
      .where('customerId', '==', customerId)
      .get();
    await Promise.all(
      subscriptions.docs.map(async (doc) => {
        await doc.ref.delete();
      }),
    );
  }

  beforeEach(async () => {
    //jest.setSystemTime(new Date(BASE_DATE + 'T00:00:00'));
    customer1Ref = firestore.collection('customers').doc(customer1Id);
    customer1address1Ref = customer1Ref
      .collection('addressList')
      .doc(address1Id);
    customer1address2Ref = customer1Ref
      .collection('addressList')
      .doc(address2Id);
    product1Ref = firestore.collection('products').doc(product1Id);
    product2Ref = firestore.collection('products').doc(product2Id);
    product3Ref = firestore.collection('products').doc(product3Id);
    product4Ref = firestore.collection('products').doc(product4Id);
    customer2Ref = firestore.collection('customers').doc(customer2Id);
    customer2address1Ref = customer2Ref
      .collection('addressList')
      .doc(customer2Address1Id);
    await customer1Ref.set(customerSample);
    await customer1address1Ref.set(customer1AddressSample1);
    await product1Ref.set(productSample1);
    await product2Ref.set(productSample2);
    await product3Ref.set(productSample3);
    await customer2Ref.set(customer2Sample);
    await customer2address1Ref.set(customer2AddressSample1);

    await removeCustomerSubscriptions(customer1Id);
    await removeCustomerSubscriptions(customer2Id);
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    await customer1address1Ref.delete();
    await customer1address2Ref.delete();
    await customer1Ref.delete();
    await product1Ref.delete();
    await product2Ref.delete();
    await product3Ref.delete();
    await product4Ref.delete();
    await customer2address1Ref.delete();
    await customer2Ref.delete();
  });

  beforeAll(async () => {
    //jest.useFakeTimers();
    await removeCustomerSubscriptions(customer1Id);
    await removeCustomerSubscriptions(customer2Id);
  });

  afterAll(async () => {
    //jest.useRealTimers();
    await removeCustomerSubscriptions(customer1Id);
    await removeCustomerSubscriptions(customer2Id);
  });

  it('should return active delivieries', async () => {
    const delivery1Ref = firestore.collection('deliveries').doc(delivery1Id);
    const delivery1Data = makeDeliveryData({
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery1Ref.set(delivery1Data);

    const delivery2Ref = firestore.collection('deliveries').doc(delivery2Id);
    const delivery2Data = makeDeliveryData({
      nextOrderDate: format(
        getNextScheduledDate(
          startOfDay(parse('2025-06-15', DATE_FORMAT, new Date())),
          '1M',
        ),
        DATE_FORMAT,
      ),
    });

    // Seed delivery
    await delivery2Ref.set(delivery2Data);

    const delivery3Ref = firestore.collection('deliveries').doc(delivery3Id);
    const delivery3Data = makeDeliveryData({
      status: DeliveryStatus.Completed,
      nextOrderDate: format(
        getPreviousScheduledDate(
          startOfDay(parse('2025-06-15', DATE_FORMAT, new Date())),
          '1M',
        ),
        DATE_FORMAT,
      ),
    });

    // Seed delivery
    await delivery3Ref.set(delivery3Data);

    const deliveryResult = await getNextActiveDeliveriesForCustomer(
      customer1Ref.id,
      customer1address1Ref.id,
    );
    expect(deliveryResult.length).toBe(2);
  });

  it('should return active delivieries from particular address', async () => {
    const delivery1Ref = firestore.collection('deliveries').doc(delivery1Id);
    const delivery1Data = makeDeliveryData({
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery1Ref.set(delivery1Data);

    const delivery2Ref = firestore.collection('deliveries').doc(delivery2Id);
    const delivery2Data = makeDeliveryData({
      shippingAddressId: customer1address2Ref.id,
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery2Ref.set(delivery2Data);

    const delivery3Ref = firestore.collection('deliveries').doc(delivery3Id);
    const delivery3Data = makeDeliveryData({
      status: DeliveryStatus.Completed,
      nextOrderDate: format(
        getPreviousScheduledDate(
          startOfDay(parse('2025-06-15', DATE_FORMAT, new Date())),
          '1M',
        ),
        DATE_FORMAT,
      ),
    });

    // Seed delivery
    await delivery3Ref.set(delivery3Data);

    const deliveryResult = await getNextActiveDeliveriesForCustomer(
      customer1Ref.id,
      customer1address1Ref.id,
    );
    expect(deliveryResult.length).toBe(1);
  });

  it('should return active delivieries from one customer', async () => {
    const delivery1Ref = firestore.collection('deliveries').doc(delivery1Id);
    const delivery1Data = makeDeliveryData({
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery1Ref.set(delivery1Data);

    const delivery2Ref = firestore.collection('deliveries').doc(delivery2Id);
    const delivery2Data = makeDeliveryData({
      customerId: customer1Ref.id,
      shippingAddressId: customer1address2Ref.id,
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery2Ref.set(delivery2Data);

    const delivery3Ref = firestore.collection('deliveries').doc(delivery3Id);
    const delivery3Data = makeDeliveryData({
      customerId: customer2Ref.id,
      shippingAddressId: customer2address1Ref.id,
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery3Ref.set(delivery3Data);

    const deliveryResult1 = await getNextActiveDeliveriesForCustomer(
      customer1Ref.id,
      customer1address1Ref.id,
    );
    expect(deliveryResult1.length).toBe(1);
    expect(deliveryResult1[0].id).toBe(delivery1Ref.id);

    const deliveryResult2 = await getNextActiveDeliveriesForCustomer(
      customer1Ref.id,
      customer1address2Ref.id,
    );
    expect(deliveryResult2.length).toBe(1);
    expect(deliveryResult2[0].id).toBe(delivery2Ref.id);

    const deliveryResult3 = await getNextActiveDeliveriesForCustomer(
      customer2Ref.id,
      customer2address1Ref.id,
    );
    expect(deliveryResult3.length).toBe(1);
    expect(deliveryResult3[0].id).toBe(delivery3Ref.id);
  });

  it('should return the one with no shipping address', async () => {
    const delivery1Ref = firestore.collection('deliveries').doc(delivery1Id);
    const delivery1Data = makeDeliveryData({
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery1Ref.set(delivery1Data);

    const delivery2Ref = firestore.collection('deliveries').doc(delivery2Id);
    const delivery2Data = makeDeliveryData({
      shippingAddressId: customer1address2Ref.id,
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery2Ref.set(delivery2Data);

    const delivery3Ref = firestore.collection('deliveries').doc(delivery3Id);
    const delivery3Data = makeDeliveryData({
      shippingAddressId: '',
      nextOrderDate: '2025-06-15',
    });

    // Seed delivery
    await delivery3Ref.set(delivery3Data);

    const deliveryResult = await getNextActiveDeliveriesForCustomer(
      customer1Ref.id,
      '',
    );
    expect(deliveryResult.length).toBe(1);
    expect(deliveryResult[0].id).toBe(delivery3Ref.id);
  });

  it('should trigger subscription and deliveries onWritten events', async () => {
    /**
     * Subscription 1: will create new delivery for the date chosen
     */
    const nextMonthlySub = addDays(startOfDay(new Date()), 15);
    const subscription1Data = makeSubData({
      productId: product1Ref.id,
      quantity: 2,
      schedule: '1M',
      nextOrderDate: format(nextMonthlySub, DATE_FORMAT),
    });

    const subscription2Data = makeSubData({
      productId: product2Ref.id,
      quantity: 1,
      schedule: '2M',
      nextOrderDate: format(
        getNextScheduledDate(nextMonthlySub, '1M'),
        DATE_FORMAT,
      ),
    });

    const subscription3Data = makeSubData({
      productId: product3Ref.id,
      quantity: 1,
      schedule: '2W',
    });

    const subscription4Data = makeSubData({
      productId: product4Ref.id,
      quantity: 1,
      schedule: '2M',
    });

    await firestore
      .collection('subscriptions')
      .doc(subscription1Id)
      .set(subscription1Data);
    await waitForExpect(
      async () => {
        const doc = await firestore
          .collection('subscriptions')
          .doc(subscription1Id)
          .get();
        expect(doc.data()!.scheduled).toBe(true);
      },
      15000,
      1000,
    );
    await firestore
      .collection('subscriptions')
      .doc(subscription2Id)
      .set(subscription2Data);
    await waitForExpect(
      async () => {
        const doc = await firestore
          .collection('subscriptions')
          .doc(subscription2Id)
          .get();
        expect(doc.data()!.scheduled).toBe(true);
      },
      15000,
      1000,
    );
    await firestore
      .collection('subscriptions')
      .doc(subscription3Id)
      .set(subscription3Data);
    await waitForExpect(
      async () => {
        const doc = await firestore
          .collection('subscriptions')
          .doc(subscription3Id)
          .get();
        expect(doc.data()!.scheduled).toBe(true);
      },
      15000,
      1000,
    );
    await firestore
      .collection('subscriptions')
      .doc(subscription4Id)
      .set(subscription4Data);
    await waitForExpect(
      async () => {
        const doc = await firestore
          .collection('subscriptions')
          .doc(subscription4Id)
          .get();
        expect(doc.data()!.scheduled).toBe(true);
      },
      15000,
      1000,
    );

    let orderedDeliveries: DeliveryApp[] =
      await getNextActiveDeliveriesForCustomer(
        customer1Ref.id,
        customer1address1Ref.id,
      );

    expect(orderedDeliveries.length).toBe(3);
    expect(orderedDeliveries[0].paymentInfo).toEqual([
      {
        paymentCode: 'abcd',
        deliveries: [subscription3Id],
      },
    ]);
    expect(orderedDeliveries[1].paymentInfo).toEqual([
      {
        paymentCode: 'abcd',
        deliveries: [subscription4Id, subscription1Id],
      },
    ]);
    expect(orderedDeliveries[2].paymentInfo).toEqual([
      {
        paymentCode: 'abcd',
        deliveries: [subscription2Id],
      },
    ]);
    let subscription3NextOrderDate = getNextScheduledDate(
      startOfDay(
        parse(orderedDeliveries[0].nextOrderDate!, DATE_FORMAT, new Date()),
      ),
      subscription3Data.schedule,
    );

    await updateDelivery(orderedDeliveries[0].id, {
      status: DeliveryStatus.Processing,
    });

    await waitForExpect(
      async () => {
        const updatedSub = await firestore
          .collection('subscriptions')
          .doc(subscription3Id)
          .get();
        expect((updatedSub.data() as SubscriptionDb).nextOrderDate).toBe(
          format(subscription3NextOrderDate, DATE_FORMAT),
        );
      },
      15000,
      1000,
    );
    await waitForExpect(
      async () => {
        orderedDeliveries = await getNextActiveDeliveriesForCustomer(
          customer1Ref.id,
          customer1address1Ref.id,
        );

        return expect(orderedDeliveries[0].paymentInfo[0].deliveries).toContain(
          subscription3Id,
        );
      },
      15000,
      1000,
    );

    await updateDelivery(orderedDeliveries[0].id, {
      status: DeliveryStatus.Processing,
    });

    subscription3NextOrderDate = getNextScheduledDate(
      subscription3NextOrderDate,
      subscription3Data.schedule,
    );
    await waitForExpect(
      async () => {
        const updatedSub = await firestore
          .collection('subscriptions')
          .doc(subscription3Id)
          .get();
        expect((updatedSub.data() as SubscriptionDb).nextOrderDate).toBe(
          format(subscription3NextOrderDate, DATE_FORMAT),
        );
      },
      15000,
      1000,
    );
  }, 70000);
});
