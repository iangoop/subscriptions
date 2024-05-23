import { Static, Type } from '@sinclair/typebox';
import { query, Query, startAt, limit, getDocs } from 'firebase/firestore';

export const PaginationSchema = Type.Object({
  page: Type.Integer({ minimum: 1, default: 1 }),
  itemsPerPage: Type.Integer({ minimum: 0, default: 30 }),
});

export const PaginationQueryparamSchema = {
  querystring: PaginationSchema,
};

export type Pagination = Static<typeof PaginationSchema>;

/**
 * Firestore doesn't support offset pagination, the only supported method is via cursor.
 * For the sake of integration the offset in being mimic in a not efficient way.
 * It should be changed as soon as we have control of the client code
 */
export const paginate = async <T>(
  unpaginatedQuery: Query<T>,
  pagination: Pagination,
): Promise<Query<T>> => {
  const lowerLimit = (pagination.page - 1) * pagination.itemsPerPage + 1;
  const q = query(unpaginatedQuery, limit(lowerLimit));

  const docs = await getDocs<T>(q);

  if (docs.size && docs.size == lowerLimit) {
    return query(
      unpaginatedQuery,
      startAt(docs.docs[docs.size - 1]),
      limit(pagination.itemsPerPage),
    );
  }
  return Promise.reject();
};
