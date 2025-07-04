import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';
import { firestore } from '../../firestore';

export const exportProduct = async (data: Record<string, string>[]) => {
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
