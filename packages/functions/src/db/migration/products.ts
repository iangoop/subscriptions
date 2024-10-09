import path from 'path';
import * as fs from 'fs';
import * as admin from 'firebase-admin';
import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';

export const exportProduct = async () => {
  const productPath = fs.readFileSync(
    path.join(__dirname, '../../../../../database/products.json'),
  );
  const products: Record<string, string>[] = JSON.parse(
    productPath.toString(),
  ) as Record<string, string>[];
  await Promise.all(
    products.map(async (product) => {
      const querySnapshot = await admin
        .firestore()
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
            await admin
              .firestore()
              .collection('products')
              .doc(doc.id)
              .set(product);
          }),
        );
      } else {
        admin.firestore().collection('products').add(product);
      }
    }),
  );
};
