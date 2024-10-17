import { Static, Type } from '@sinclair/typebox';
import {
  query,
  Query,
  limit,
  DocumentReference,
  QueryConstraint,
  QueryOrderByConstraint,
  orderBy,
  getDoc,
  CollectionReference,
  doc,
  getDocs,
  getCountFromServer,
  startAt,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

export const PaginationSchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  limit: Type.Integer({ minimum: 0, default: 30 }),
});

export const PaginationQueryparamSchema = {
  querystring: PaginationSchema,
};

export type Pagination = Static<typeof PaginationSchema>;

export type PaginationDb = Omit<Pagination, 'cursor'> & {
  cursor: DocumentReference | undefined;
};

export type PaginationQuery<T> = {
  count: number;
  next?: string;
  data: T[];
};

export const paginate = async <T>(
  unpaginatedQuery: Query<T>,
  pagination: Pagination,
  collectionReference: CollectionReference,
  processQuery?: (docsSnapshot: Array<QueryDocumentSnapshot<T>>) => T[],
  ...orderByConstraint: QueryOrderByConstraint[]
): Promise<PaginationQuery<T>> => {
  async function exportQuery(query: Query<T>): Promise<PaginationQuery<T>> {
    const docsSnapshot = await getDocs<T>(query);
    const snapshot = await getCountFromServer(collectionReference);
    const docs = docsSnapshot.docs;
    let cursor = undefined;
    if (docsSnapshot.size > pagination.limit) {
      const doc = docs.pop();
      cursor = doc?.id;
    }
    return {
      count: snapshot.data().count,
      next: cursor,
      data: processQuery ? processQuery(docs) : docs.map((doc) => doc.data()),
    };
  }

  const constraints: QueryConstraint[] = [
    ...(orderByConstraint.length
      ? orderByConstraint
      : [orderBy('updated', 'desc')]),
    ...(pagination.cursor
      ? [startAt(await getDoc(doc(collectionReference, pagination.cursor)))]
      : []),
    limit(pagination.limit + 1),
  ];
  return exportQuery(query<T>(unpaginatedQuery, ...constraints));
};
