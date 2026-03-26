import { admin } from '../../src/admin';
import {
  findTodaysActiveDeliveries,
  updateDelivery,
} from '../../src/db/deliveries.db';
import {
  DeliveryDb,
  DeliveryStatus,
  deliveryDbConverter,
} from '../../src/db/types/subscriptions';
import { BASE_DATE, makeDeliveryData } from '../shared';
import * as subUtil from '../../src/util/subscriptions';

// Set the emulator host
// eslint-disable-next-line node/no-process-env
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const db = admin.firestore();

// Helper to clear Firestore data
const clearFirestoreData = async () => {
  const collections = await db.listCollections();
  for (const collection of collections) {
    const docs = await collection.listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  }
};

describe('deliveries.db (Emulator)', () => {
  beforeEach(async () => {
    await clearFirestoreData();
  });

  afterAll(async () => {
    await clearFirestoreData();
  });

  describe('findTodaysActiveDeliveries', () => {
    it('should find active deliveries for today or earlier', async () => {
      jest.spyOn(subUtil, 'today').mockReturnValue(subUtil.strToDate(BASE_DATE));

      const deliveryToday = makeDeliveryData({ orderDate: BASE_DATE });
      const deliveryPast = makeDeliveryData({ orderDate: '2026-02-01', customerId: 'cust2' });
      const deliveryFuture = makeDeliveryData({ orderDate: '2026-02-15', customerId: 'cust3' });
      const deliveryInactive = makeDeliveryData({ orderDate: BASE_DATE, status: DeliveryStatus.Processing, customerId: 'cust4' });

      const delRef1 = db.collection('deliveries').doc('del1');
      const delRef2 = db.collection('deliveries').doc('del2');
      const delRef3 = db.collection('deliveries').doc('del3');
      const delRef4 = db.collection('deliveries').doc('del4');

      await delRef1.set(deliveryToday);
      await delRef2.set(deliveryPast);
      await delRef3.set(deliveryFuture);
      await delRef4.set(deliveryInactive);

      const result = await findTodaysActiveDeliveries(db);

      expect(result).toHaveLength(2);
      const orderDates = result.map(d => d.orderDate).sort();
      expect(orderDates).toEqual(['2026-02-01', BASE_DATE]);
    });
  });

  describe('updateDelivery', () => {
    it('should update a delivery status', async () => {
      const deliveryData = makeDeliveryData();
      const deliveryId = 'del-update-emu';
      const deliveryRef = db.collection('deliveries').doc(deliveryId);
      await deliveryRef.set(deliveryData);

      await updateDelivery(deliveryId, { status: DeliveryStatus.WaitingPayment }, db);

      const updatedSnap = await deliveryRef.withConverter(deliveryDbConverter).get();
      const updatedData = updatedSnap.data();
      expect(updatedData?.status).toBe(DeliveryStatus.WaitingPayment);
      expect(updatedData?.updated).toBeDefined();
    });
  });
});
