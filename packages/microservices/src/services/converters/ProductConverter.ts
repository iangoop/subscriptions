import { IDBProduct, IProduct } from '@src/models/Product';
import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

export const productConverter: FirestoreDataConverter<IProduct> = {
  toFirestore(product: IProduct): DocumentData {
    return product;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot<IDBProduct>,
    options: SnapshotOptions,
  ): IProduct {
    const data = snapshot.data(options);
    data.isInStock = data.qtyInStock != undefined && data.qtyInStock > 0;
    data.isOnSale = data.salePrice != undefined && data.salePrice < data.price;
    return data as IProduct;
  },
};
