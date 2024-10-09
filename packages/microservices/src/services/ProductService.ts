import { firestoreInstance } from '@src/configurations/firebase';
import { Crud, fromQuery } from '@src/helpers/dbfunctions';
import { InvalidReferenceError } from '@src/helpers/errors';
import { normalize, ObjectArr, QueryObjectNorm } from '@src/helpers/filters';
import { paginate, Pagination } from '@src/helpers/pagination';
import { IProduct, ProductCollection } from '@src/models/Product';
import {
  collection,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { productConverter } from './converters/ProductConverter';
import { productValidator } from './validators/ProductValidator';

const queryFilter = ['id', 'sku', 'configProfile'] as const;
export type productQueryFilter = ObjectArr<typeof queryFilter>;
export type productQueryFilterWithPagination = productQueryFilter & Pagination;

/*async function getAllMatchingDocuments(
  queryFilter: QueryObjectNorm<productQueryFilter>,
): Promise<DocumentReference[]> {
  const productList: DocumentReference[] = [];
  if (queryFilter.hasId()) {
    await Promise.all(
      queryFilter.getId().map(async (id) => {
        const cDoc = await getDoc(
          doc(firestoreInstance, ProductCollection, id),
        );
        if (!cDoc.exists()) {
          throw new InvalidReferenceError("Product doesn't exist");
        }
        productList.push(cDoc.ref);
      }),
    );
  }
  if (queryFilter.hasSku()) {
    await Promise.all(
      queryFilter.getSku().map(async (sku) => {
        const docs = await getDocs(
          query(
            collection(firestoreInstance, ProductCollection),
            where('sku', '==', sku),
          ),
        );
        if (docs.size && docs.docs[0].exists()) {
          productList.push(docs.docs[0].ref);
        } else {
          throw new InvalidReferenceError("Product doesn't exist");
        }
      }),
    );
  }
  if (queryFilter.hasConfigProfile()) {
    await Promise.all(
      queryFilter.getConfigProfile().map(async (configProfile) => {
        const docs = await getDocs(
          query(
            collection(firestoreInstance, ProductCollection),
            where('configProfile', '==', configProfile),
          ),
        );
        if (docs.size && docs.docs[0].exists()) {
          productList.push(docs.docs[0].ref);
        } else {
          throw new InvalidReferenceError("Product doesn't exist");
        }
      }),
    );
  }
  return productList;
}*/

class ProductCrud extends Crud<IProduct> {
  constructor() {
    super(ProductCollection, productConverter, productValidator);
  }
  /*async getAll(filter: productQueryFilterWithPagination): Promise<IProduct[]> {
    const products = await getAllMatchingDocuments(
      normalize<productQueryFilter>(queryFilter, filter),
    );
    const constraints = [];
    if (products.length) {
      constraints.push(where('id', 'in', products));
    }
    constraints.push(orderBy('updated', 'desc'));
    return this.processQuery(constraints, filter);
  }*/
}

export const productService = (): ProductCrud => {
  return new ProductCrud();
};
