/* eslint-disable @typescript-eslint/unbound-method */
import { mock, mockReset } from 'jest-mock-extended';
import { Firestore, FieldValue, DocumentData } from 'firebase-admin/firestore';
import {
  findTodaysActiveDeliveries,
  persistSubscriptionToDelivery,
  updateDelivery,
} from '../../src/db/deliveries.db';
import {
  DeliveryApp,
  DeliveryDb,
  DeliveryKey,
  DeliveryStatus,
  PaymentInfo,
  SubscriptionDb,
  SubscriptionStatus,
} from '../../src/db/types/subscriptions';
import { makeDeliveryData, BASE_DATE, makeSubData } from '../shared';
import * as subUtil from '../../src/util/subscriptions';

type SubscriptionCollectionRef =
  FirebaseFirestore.CollectionReference<SubscriptionDb>;
type SubscriptionDocRef = FirebaseFirestore.DocumentReference<SubscriptionDb>;
type SubscriptionDocSnapshot =
  FirebaseFirestore.DocumentSnapshot<SubscriptionDb>;
type DeliveryCollectionRef = FirebaseFirestore.CollectionReference<DeliveryDb>;
type DeliveryQuery = FirebaseFirestore.Query<DeliveryDb>;
type DeliveryQuerySnapshot = FirebaseFirestore.QuerySnapshot<DeliveryDb>;
type DeliveryDocRef = FirebaseFirestore.DocumentReference<DeliveryDb>;
type Transaction = FirebaseFirestore.Transaction;

// We use jest-mock-extended's `mock()` to create our mock instances
const dbMock = mock<Firestore>();
const collectionRefMock = mock<SubscriptionCollectionRef>();
const docRefMock = mock<SubscriptionDocRef>();
const docSnapshotMock = mock<SubscriptionDocSnapshot>();

// Transaction and Delivery mocks
const transactionMock = mock<Transaction>();
const deliveryCollectionRefMock = mock<DeliveryCollectionRef>();
const deliveryDocRefMock = mock<DeliveryDocRef>();
const queryMock = mock<DeliveryQuery>();
const querySnapshotMock = mock<DeliveryQuerySnapshot>();

describe('deliveries.db (Mock)', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockReset(dbMock);
    mockReset(collectionRefMock);
    mockReset(docRefMock);
    mockReset(docSnapshotMock);
    mockReset(transactionMock);
    mockReset(deliveryCollectionRefMock);
    mockReset(deliveryDocRefMock);
    mockReset(queryMock);
    mockReset(querySnapshotMock);

    // Default mock chain for a standard query
    collectionRefMock.withConverter.mockReturnValue(collectionRefMock);
    collectionRefMock.doc.mockReturnValue(docRefMock);
    docRefMock.get.mockResolvedValue(docSnapshotMock);

    deliveryCollectionRefMock.withConverter.mockReturnValue(
      deliveryCollectionRefMock,
    );
    deliveryCollectionRefMock.where.mockReturnValue(queryMock);
    queryMock.where.mockReturnValue(queryMock);
    queryMock.get.mockResolvedValue(querySnapshotMock);

    // Setup collection mock for different types (deliveries vs others)
    dbMock.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'deliveries') {
        return deliveryCollectionRefMock as FirebaseFirestore.CollectionReference<DocumentData>;
      }
      return collectionRefMock as FirebaseFirestore.CollectionReference<DocumentData>;
    });

    // Default doc return values for both collections
    deliveryCollectionRefMock.doc.mockReturnValue(deliveryDocRefMock);

    // Mock runTransaction to execute the callback immediately
    dbMock.runTransaction.mockImplementation(
      <T>(callback: (tx: Transaction) => Promise<T>) => {
        return callback(transactionMock);
      },
    );
  });

  describe('persistSubscriptionToDelivery', () => {
    it('should throw an error if subscriptionId already has an archive suffix', async () => {
      const archivedSubId = 'sub_001_2026-02-08';
      const subscriptionData: DeliveryKey & SubscriptionDb = {
        ...makeSubData(),
        orderDate: BASE_DATE,
      };

      await expect(
        persistSubscriptionToDelivery(
          archivedSubId,
          subscriptionData,
          true,
          dbMock,
        ),
      ).rejects.toThrow(
        'Cannot create archive from an already-archived subscription id',
      );
    });

    it('should run a transaction and create subscription archive and delivery', async () => {
      const subId = 'sub_001';
      const subscriptionData: DeliveryKey & SubscriptionDb = {
        ...makeSubData(),
        orderDate: BASE_DATE,
        recurringOrderCount: 1,
      };

      const deliverySnapshotMock =
        mock<FirebaseFirestore.DocumentSnapshot<DeliveryDb>>();
      Object.defineProperty(deliverySnapshotMock, 'exists', { value: false });
      (transactionMock.get as unknown as jest.Mock).mockResolvedValue(
        deliverySnapshotMock,
      );

      await persistSubscriptionToDelivery(
        subId,
        subscriptionData,
        true,
        dbMock,
      );

      expect(dbMock.runTransaction).toHaveBeenCalled();
      expect(transactionMock.set).toHaveBeenCalledTimes(2);
      expect(transactionMock.update).toHaveBeenCalled();
    });

    it('should handle first-time delivery flag correctly', async () => {
      const subId = 'sub_002';
      const subscriptionData: DeliveryKey & SubscriptionDb = {
        ...makeSubData(),
        orderDate: BASE_DATE,
      };

      const deliverySnapshotMock =
        mock<FirebaseFirestore.DocumentSnapshot<DeliveryDb>>();
      Object.defineProperty(deliverySnapshotMock, 'exists', { value: false });
      (transactionMock.get as unknown as jest.Mock).mockResolvedValue(
        deliverySnapshotMock,
      );

      collectionRefMock.doc.mockImplementation((docId?: string) => {
        if (docId === `${subId}_${BASE_DATE}`) {
          return {
            id: `${subId}_${BASE_DATE}`,
          } as unknown as SubscriptionDocRef;
        } else if (docId === subId) {
          return {
            id: subId,
          } as unknown as SubscriptionDocRef;
        }
        return docRefMock;
      });
      await persistSubscriptionToDelivery(
        subId,
        subscriptionData,
        true,
        dbMock,
      );

      expect(dbMock.runTransaction).toHaveBeenCalled();
      // creation of subscription archive
      expect(transactionMock.set).toHaveBeenCalledWith(
        collectionRefMock.doc(`${subId}_${BASE_DATE}`),
        expect.objectContaining({
          status: SubscriptionStatus.OnGoing,
        }),
      );
      // creation of delivery with first-time flag and subscription added to paymentInfo
      expect(transactionMock.set).toHaveBeenCalledWith(
        deliveryDocRefMock,
        expect.objectContaining({
          paymentInfo: expect.arrayContaining([
            expect.objectContaining({
              paymentCode: subscriptionData.paymentCode,
              deliveries: [subId],
            }),
          ]) as PaymentInfo[],
          isFirstDelivery: true,
        }),
      );
      // moving orderDate to next month for the subscription document
      expect(transactionMock.update).toHaveBeenCalledWith(
        collectionRefMock.doc(subId),
        expect.objectContaining({
          orderDate: '2026-03-08',
          previousOrderDate: BASE_DATE,
          recurringOrderCount: 1,
        }),
      );
    });

    it('should handle non-first-time delivery flag correctly', async () => {
      const subId = 'sub_003';
      const subscriptionData: DeliveryKey & SubscriptionDb = {
        ...makeSubData(),
        orderDate: BASE_DATE,
        recurringOrderCount: 5,
      };

      const deliverySnapshotMock =
        mock<FirebaseFirestore.DocumentSnapshot<DeliveryDb>>();
      Object.defineProperty(deliverySnapshotMock, 'exists', { value: false });
      (transactionMock.get as unknown as jest.Mock).mockResolvedValue(
        deliverySnapshotMock,
      );

      await persistSubscriptionToDelivery(
        subId,
        subscriptionData,
        false,
        dbMock,
      );

      expect(dbMock.runTransaction).toHaveBeenCalled();
      expect(transactionMock.set).toHaveBeenCalledWith(
        deliveryDocRefMock,
        expect.objectContaining({
          isFirstDelivery: false,
        }),
      );
    });

    it('should update existing delivery with subscription info', async () => {
      const subId = 'sub_004';
      const subscriptionData: DeliveryKey & SubscriptionDb = {
        ...makeSubData(),
        orderDate: BASE_DATE,
        recurringOrderCount: 3,
      };

      const existingDelivery: DeliveryDb = {
        ...makeDeliveryData(),
        orderDate: BASE_DATE,
        paymentInfo: [
          {
            paymentCode: 'other_payment',
            deliveries: ['sub_other'],
          },
        ],
      };

      const deliverySnapshotMock =
        mock<FirebaseFirestore.DocumentSnapshot<DeliveryDb>>();
      Object.defineProperty(deliverySnapshotMock, 'exists', { value: true });
      deliverySnapshotMock.data.mockReturnValue(existingDelivery);
      (transactionMock.get as unknown as jest.Mock).mockResolvedValue(
        deliverySnapshotMock,
      );

      await persistSubscriptionToDelivery(
        subId,
        subscriptionData,
        false,
        dbMock,
      );

      expect(dbMock.runTransaction).toHaveBeenCalled();
      expect(transactionMock.update).toHaveBeenCalledWith(
        deliveryDocRefMock,
        expect.objectContaining({
          paymentInfo: expect.arrayContaining([
            expect.objectContaining({
              paymentCode: subscriptionData.paymentCode,
              deliveries: [subId],
            }),
            expect.objectContaining({
              paymentCode: 'other_payment',
              deliveries: ['sub_other'],
            }),
          ]) as PaymentInfo[],
        }),
      );
    });

    it('should update existing delivery merging subscription info', async () => {
      const subId = 'sub_004';
      const subscriptionData: DeliveryKey & SubscriptionDb = {
        ...makeSubData(),
        orderDate: BASE_DATE,
        recurringOrderCount: 3,
      };

      const existingDelivery: DeliveryDb = {
        ...makeDeliveryData(),
        orderDate: BASE_DATE,
        paymentInfo: [
          {
            paymentCode: subscriptionData.paymentCode,
            deliveries: ['sub_other'],
          },
        ],
      };

      const deliverySnapshotMock =
        mock<FirebaseFirestore.DocumentSnapshot<DeliveryDb>>();
      Object.defineProperty(deliverySnapshotMock, 'exists', { value: true });
      deliverySnapshotMock.data.mockReturnValue(existingDelivery);
      (transactionMock.get as unknown as jest.Mock).mockResolvedValue(
        deliverySnapshotMock,
      );

      await persistSubscriptionToDelivery(
        subId,
        subscriptionData,
        false,
        dbMock,
      );

      expect(dbMock.runTransaction).toHaveBeenCalled();
      expect(transactionMock.update).toHaveBeenCalledWith(
        deliveryDocRefMock,
        expect.objectContaining({
          paymentInfo: expect.arrayContaining([
            expect.objectContaining({
              paymentCode: subscriptionData.paymentCode,
              deliveries: expect.arrayContaining([
                'sub_other',
                subId,
              ]) as string[],
            }),
          ]) as PaymentInfo[],
        }),
      );
    });
  });

  describe('findTodaysActiveDeliveries', () => {
    it('should return active deliveries for today or earlier', async () => {
      jest
        .spyOn(subUtil, 'today')
        .mockReturnValue(subUtil.strToDate(BASE_DATE));

      const deliveryData = makeDeliveryData({
        orderDate: BASE_DATE,
      }) as DeliveryApp;
      const docMock =
        mock<FirebaseFirestore.QueryDocumentSnapshot<DeliveryApp>>();
      docMock.data.mockReturnValue(deliveryData);

      Object.defineProperty(querySnapshotMock, 'empty', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(querySnapshotMock, 'docs', {
        value: [
          docMock as unknown as FirebaseFirestore.QueryDocumentSnapshot<DeliveryDb>,
        ],
        configurable: true,
      });

      const result = await findTodaysActiveDeliveries(dbMock);

      expect(result).toEqual([deliveryData]);
      expect(dbMock.collection).toHaveBeenCalledWith('deliveries');
      expect(deliveryCollectionRefMock.where).toHaveBeenCalledWith(
        'orderDate',
        '<=',
        BASE_DATE,
      );
      expect(queryMock.where).toHaveBeenCalledWith(
        'status',
        '==',
        DeliveryStatus.Active,
      );
    });

    it('should return empty array if no deliveries found', async () => {
      Object.defineProperty(querySnapshotMock, 'empty', {
        value: true,
        configurable: true,
      });

      const result = await findTodaysActiveDeliveries(dbMock);

      expect(result).toEqual([]);
    });
  });

  describe('updateDelivery', () => {
    it('should call update on the correct document with the correct data', async () => {
      const deliveryId = 'del1';
      const updateData = { status: DeliveryStatus.WaitingPayment };

      const serverTimestampSpy = jest.spyOn(FieldValue, 'serverTimestamp');
      const mockTimestamp = 'MOCKED_TIMESTAMP';
      serverTimestampSpy.mockReturnValue(
        mockTimestamp as unknown as FieldValue,
      );

      await updateDelivery(deliveryId, updateData, dbMock);

      expect(dbMock.collection).toHaveBeenCalledWith('deliveries');
      expect(deliveryCollectionRefMock.doc).toHaveBeenCalledWith(deliveryId);
      expect(deliveryDocRefMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updateData,
          updated: mockTimestamp,
        }),
      );
      serverTimestampSpy.mockRestore();
    });
  });
});
