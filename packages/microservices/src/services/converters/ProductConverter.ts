import { createConverter } from '@src/helpers/converters';
import { IDBProduct, IProduct } from '@src/models/Product';
import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

export const productConverter: FirestoreDataConverter<IProduct, IDBProduct> =
  createConverter({
    mapFromDb(partialAppModel, dbModel, snapshot) {
      partialAppModel.isInStock =
        partialAppModel.qtyInStock != undefined &&
        partialAppModel.qtyInStock > 0;
      partialAppModel.isOnSale =
        partialAppModel.salePrice != undefined &&
        partialAppModel.salePrice < partialAppModel.price;
      return partialAppModel;
    },
  });
