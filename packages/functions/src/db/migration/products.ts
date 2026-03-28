import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { firestore } from '../../firestore';
export type Product = {
  sku: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  thumbnailUrl: string | null;
  msrp: number | null;
  price: number;
  salePrice: number | null;
  isOnSale: boolean | null;
  minQty: number | null;
  maxQty: number | null;
  qtyInStock: number | null;
  isInStock: boolean | null;
  discount: number | null;
  isDiscountPercentage: boolean | null;
  intervals: string[] | null;
  defaultInterval: string | null;
  subscriptionOptionMode: string;
  defaultSubscriptionOption: string;
  shippingMode: string;
};
export const exportProduct = async (data: Product[]) => {
  await Promise.all(
    data.map(async (product) => {
      const querySnapshot = await firestore
        .collection('products')
        .where('sku', '==', product.sku)
        .get();
      if (querySnapshot && !querySnapshot.empty) {
        const docs: QueryDocumentSnapshot[] = [];
        querySnapshot.forEach((doc) => {
          docs.push(doc);
        });
        await Promise.all(
          docs.map(async (doc) => {
            await firestore.collection('products').doc(doc.id).set(product);
          }),
        );
      } else {
        firestore.collection('products').add(product);
      }
    }),
  );
};
