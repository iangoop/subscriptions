/* eslint-disable @typescript-eslint/unbound-method */
import { mock, mockReset } from 'jest-mock-extended';
import { Firestore, FieldValue, DocumentData } from 'firebase-admin/firestore';
import {
  getSubscription,
  updateSubscription,
  createSubscription,
  findTodaysActiveSubscriptionsOnTimeFreeze,
} from '../../src/db/subscriptions.db';
import * as subDb from '../../src/db/subscriptions.db';
import {
  SubscriptionDb,
  SubscriptionStatus,
  DeliveryDb,
  SubscriptionApp,
} from '../../src/db/types/subscriptions';
import { makeSubData, BASE_DATE } from '../shared';
import * as subUtil from '../../src/util/subscriptions';

type SubscriptionCollectionRef =
  FirebaseFirestore.CollectionReference<SubscriptionDb>;
type SubscriptionDocRef = FirebaseFirestore.DocumentReference<SubscriptionDb>;
type SubscriptionDocSnapshot =
  FirebaseFirestore.DocumentSnapshot<SubscriptionDb>;
type SubscriptionQuery = FirebaseFirestore.Query<SubscriptionDb>;
type SubscriptionQuerySnapshot =
  FirebaseFirestore.QuerySnapshot<SubscriptionDb>;
type DeliveryCollectionRef = FirebaseFirestore.CollectionReference<DeliveryDb>;
type DeliveryDocRef = FirebaseFirestore.DocumentReference<DeliveryDb>;
type Transaction = FirebaseFirestore.Transaction;

// We use jest-mock-extended's `mock()` to create our mock instances
const dbMock = mock<Firestore>();
const collectionRefMock = mock<SubscriptionCollectionRef>();
const docRefMock = mock<SubscriptionDocRef>();
const docSnapshotMock = mock<SubscriptionDocSnapshot>();
const queryMock = mock<SubscriptionQuery>();
const querySnapshotMock = mock<SubscriptionQuerySnapshot>();

// Transaction and Delivery mocks
const transactionMock = mock<Transaction>();
const deliveryCollectionRefMock = mock<DeliveryCollectionRef>();
const deliveryDocRefMock = mock<DeliveryDocRef>();

describe('subscriptions.db (Mock)', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockReset(dbMock);
    mockReset(collectionRefMock);
    mockReset(docRefMock);
    mockReset(docSnapshotMock);
    mockReset(queryMock);
    mockReset(querySnapshotMock);
    mockReset(transactionMock);
    mockReset(deliveryCollectionRefMock);
    mockReset(deliveryDocRefMock);

    // Default mock chain for a standard query
    collectionRefMock.withConverter.mockReturnValue(collectionRefMock);
    collectionRefMock.doc.mockReturnValue(docRefMock);
    collectionRefMock.where.mockReturnValue(queryMock);
    queryMock.where.mockReturnValue(queryMock);
    queryMock.get.mockResolvedValue(querySnapshotMock);
    docRefMock.get.mockResolvedValue(docSnapshotMock);

    // Setup collection mock for different types (deliveries vs others)
    dbMock.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'deliveries') {
        return deliveryCollectionRefMock as unknown as FirebaseFirestore.CollectionReference<DocumentData>;
      }
      return collectionRefMock as unknown as FirebaseFirestore.CollectionReference<DocumentData>;
    });

    // Default doc return values for both collections
    deliveryCollectionRefMock.doc.mockReturnValue(deliveryDocRefMock);

    // Mock runTransaction to execute the callback immediately
    dbMock.runTransaction.mockImplementation(
      <T>(callback: (tx: Transaction) => Promise<T>) => {
        return callback(transactionMock);
      },
    );

    jest.spyOn(subDb, 'getFreezeTimeInDays').mockResolvedValue(5);
  });

  describe('findTodaysActiveSubscriptionsOnTimeFreeze', () => {
    it('should return subscriptions in the freeze window', async () => {
      // Mock today to BASE_DATE ('2026-02-08')
      jest
        .spyOn(subUtil, 'today')
        .mockReturnValue(subUtil.strToDate(BASE_DATE));
      // freezeTime = 5 days, so freezeEndDate = '2026-02-13'

      const subData = makeSubData({
        orderDate: '2026-02-10',
      }) as SubscriptionApp;
      const docMock =
        mock<FirebaseFirestore.QueryDocumentSnapshot<SubscriptionApp>>();
      docMock.data.mockReturnValue(subData);

      Object.defineProperty(querySnapshotMock, 'empty', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(querySnapshotMock, 'docs', {
        value: [
          docMock as unknown as FirebaseFirestore.QueryDocumentSnapshot<SubscriptionDb>,
        ],
        configurable: true,
      });

      const result = await findTodaysActiveSubscriptionsOnTimeFreeze(dbMock);

      expect(result).toEqual([subData]);
      expect(dbMock.collection).toHaveBeenCalledWith('subscriptions');
      expect(collectionRefMock.where).toHaveBeenCalledWith(
        'orderDate',
        '<=',
        '2026-02-13',
      );
      expect(queryMock.where).toHaveBeenCalledWith(
        'status',
        '==',
        SubscriptionStatus.Active,
      );
    });

    it('should return empty array if no subscriptions found', async () => {
      Object.defineProperty(querySnapshotMock, 'empty', {
        value: true,
        configurable: true,
      });

      const result = await findTodaysActiveSubscriptionsOnTimeFreeze(dbMock);

      expect(result).toEqual([]);
    });
  });

  describe('getSubscription', () => {
    it('should return a subscription if the document exists', async () => {
      const subId = 'sub1';
      const subData: SubscriptionDb = makeSubData();

      Object.defineProperty(docSnapshotMock, 'exists', {
        value: true,
        configurable: true,
      });
      (docSnapshotMock.data as jest.Mock).mockReturnValue(subData);

      const result = await getSubscription(subId, dbMock);

      expect(result).toEqual(subData);
      expect(dbMock.collection).toHaveBeenCalledWith('subscriptions');
      expect(collectionRefMock.doc).toHaveBeenCalledWith(subId);
      expect(docRefMock.get).toHaveBeenCalled();
    });

    it('should return undefined if the document does not exist', async () => {
      Object.defineProperty(docSnapshotMock, 'exists', {
        value: false,
        configurable: true,
      });

      const result = await getSubscription('sub1', dbMock);

      expect(result).toBeUndefined();
    });
  });

  describe('updateSubscription', () => {
    it('should call update on the correct document with the correct data', async () => {
      const subId = 'sub1';
      const updateData = { status: 'Paused' as SubscriptionStatus };

      const serverTimestampSpy = jest.spyOn(FieldValue, 'serverTimestamp');
      const mockTimestamp = 'MOCKED_TIMESTAMP';
      serverTimestampSpy.mockReturnValue(
        mockTimestamp as unknown as FieldValue,
      );

      await updateSubscription(subId, updateData, dbMock);

      expect(dbMock.collection).toHaveBeenCalledWith('subscriptions');
      expect(collectionRefMock.doc).toHaveBeenCalledWith(subId);
      expect(docRefMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updateData,
          updated: mockTimestamp,
        }),
      );
      serverTimestampSpy.mockRestore();
    });
  });

  describe('createSubscription', () => {
    it('should call add on the collection and return the new id', async () => {
      const newSubData: SubscriptionDb = makeSubData();
      const newId = 'newSubId';
      const newDocRef = mock<SubscriptionDocRef>();
      Object.defineProperty(newDocRef, 'id', { value: newId });
      collectionRefMock.add.mockResolvedValue(newDocRef);

      const result = await createSubscription(newSubData, dbMock);

      expect(result).toBe(newId);
      expect(dbMock.collection).toHaveBeenCalledWith('subscriptions');
      expect(collectionRefMock.add).toHaveBeenCalledWith(newSubData);
    });
  });
});
