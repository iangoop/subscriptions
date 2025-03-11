import { firestoreInstance } from '@src/configurations/firebase';
import { format } from 'date-fns';
import {
  DocumentSnapshot,
  doc,
  getDoc,
  FirestoreDataConverter,
  DocumentReference,
  DocumentData,
  QueryDocumentSnapshot,
  query,
  collection,
  addDoc,
  updateDoc,
  UpdateData,
  deleteDoc,
  QueryConstraint,
  CollectionReference,
} from 'firebase/firestore';
import { InvalidReferenceError } from './errors';
import {
  paginate,
  Pagination,
  PaginationDb,
  PaginationQuery,
} from './pagination';
import { IValidator, ValidationError } from './validators';

export type Timestamped = {
  updated: string;
  created: string;
};

export type Identified = {
  id: string;
};

export type Referenced<T extends string> = {
  [P in T]: string;
};

function getFormattedTime() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

export function setUpdated(document: Timestamped) {
  document.updated = getFormattedTime();
}

export function setCreated(document: Timestamped) {
  document.created = getFormattedTime();
}

export const fromQuery = <T extends Identified>(
  snapshot: Array<QueryDocumentSnapshot<T>>,
): T[] => {
  const result: T[] = [];
  snapshot.forEach((doc) => {
    const object = doc.data();
    object.id = doc.id;

    result.push(object);
  });
  return result;
};

export const fromDoc = <T extends Identified>(
  snapshot: DocumentSnapshot<T>,
): T => {
  if (snapshot.exists()) {
    const object = snapshot.data();
    object.id = snapshot.id;
    return object;
  }
  throw new Error('Document does not exist');
};

export const validateDoc = async <T = DocumentData>(
  id: string,
  collection: string | CollectionReference,
  converter?: FirestoreDataConverter<T>,
): Promise<QueryDocumentSnapshot<T>> => {
  if (!id) {
    throw new ValidationError('Id paramater can not be empty');
  }
  let docRef = (
    collection instanceof CollectionReference
      ? doc(collection, id)
      : doc(firestoreInstance, collection, id)
  ) as DocumentReference<T>;
  if (converter) {
    docRef = docRef.withConverter(converter);
  }
  const docSnapshot = await getDoc(docRef);
  if (!docSnapshot.exists()) {
    throw new InvalidReferenceError('Document not found');
  }
  return docSnapshot;
};

export const validateDocInSubcollection = async <T = DocumentData>(
  id: string,
  collectionName: string,
  parentId: string,
  parentCollection: string | CollectionReference,
  converter?: FirestoreDataConverter<T>,
): Promise<QueryDocumentSnapshot<T>> => {
  if (!id) {
    throw new ValidationError('Id paramater can not be empty');
  }
  if (!parentId) {
    throw new ValidationError('Parent Id paramater can not be empty');
  }

  const parentDocRef: DocumentReference =
    parentCollection instanceof CollectionReference
      ? doc(parentCollection, parentId)
      : doc(firestoreInstance, parentCollection, parentId);
  const subcollection = collection(parentDocRef, collectionName);
  let docRef = doc(subcollection, id) as DocumentReference<T>;

  if (converter) {
    docRef = docRef.withConverter(converter);
  }
  const docSnapshot = await getDoc(docRef);
  if (!docSnapshot.exists()) {
    throw new InvalidReferenceError('Document not found');
  }
  return docSnapshot;
};

export class Crud<T extends Identified & Timestamped> {
  collection: string;
  converter: FirestoreDataConverter<T>;
  validator: IValidator<T>;

  constructor(
    collection: string,
    converter: FirestoreDataConverter<T>,
    validator: IValidator<T>,
  ) {
    this.collection = collection;
    this.converter = converter;
    this.validator = validator;
  }

  getDocRefById(id: string) {
    return doc(firestoreInstance, this.collection, id).withConverter(
      this.converter,
    );
  }

  getCollectionRef() {
    return collection(firestoreInstance, this.collection).withConverter(
      this.converter,
    );
  }

  preparePagination<U extends Pagination>(filter: U): PaginationDb {
    const cursor = filter.cursor
      ? doc(firestoreInstance, this.collection, filter.cursor)
      : undefined;
    return Object.assign({}, filter, { cursor: cursor }) as PaginationDb;
  }

  async processQuery<U extends Pagination>(
    constraints: QueryConstraint[],
    filter: U,
  ): Promise<PaginationQuery<T>> {
    try {
      const collectionRef = this.getCollectionRef();
      return paginate(
        query(collectionRef, ...constraints).withConverter(this.converter),
        filter,
        collectionRef,
        (docsSnapshot: Array<QueryDocumentSnapshot<T>>) => {
          return fromQuery(docsSnapshot);
        },
      );
    } catch (error) {
      return {} as PaginationQuery<T>;
    }
  }

  async getAll<U extends Pagination>(filter: U): Promise<PaginationQuery<T>> {
    try {
      const collectionRef = this.getCollectionRef();
      return paginate(
        query(collectionRef).withConverter(this.converter),
        filter,
        collectionRef,
        (docsSnapshot: Array<QueryDocumentSnapshot<T>>) => {
          return fromQuery(docsSnapshot);
        },
      );
    } catch (error) {
      return {} as PaginationQuery<T>;
    }
  }

  async getById(queryId: Identified): Promise<T> {
    const docSnapshot = await validateDoc<T>(
      queryId.id,
      this.collection,
      this.converter,
    );
    return docSnapshot.data();
  }

  async prepareCreate(model: T): Promise<boolean> {
    setCreated(model);
    setUpdated(model);
    model = this.validator.core.value(model);
    const validation = await this.validator.instantiable(model);
    if (validation.isValid()) {
      return true;
    }
    throw validation.throwErrors();
  }

  async create(model: T): Promise<T> {
    await this.prepareCreate(model);
    const docRef = await addDoc(this.getCollectionRef(), model);
    return fromDoc(await getDoc(docRef));
  }

  async prepareUpdate(id: string, model: T): Promise<boolean> {
    setUpdated(model);
    model = this.validator.core.value(model);
    const validation = await this.validator.validate(id, model);
    if (validation.isValid()) {
      return true;
    }
    throw validation.throwErrors();
  }

  async update(id: string, model: T): Promise<T> {
    await this.prepareUpdate(id, model);
    const docRef = this.getDocRefById(id);
    await updateDoc(docRef, model as UpdateData<T>);
    return fromDoc(await getDoc(docRef));
  }

  async delete(queryId: Identified) {
    const docSnapshot = await validateDoc(queryId.id, this.collection);
    deleteDoc(docSnapshot.ref);
  }
}

export type ParentIdentified = {
  parentId: string;
};

export type SubcollectionIdentity = Identified & ParentIdentified;

function isParentIdentified<T extends object>(
  filter: T,
): filter is T & ParentIdentified {
  return typeof (filter as Partial<ParentIdentified>)?.parentId === 'string';
}

export class CrudSubcollection<
  K extends Exclude<string, 'id'>,
  T extends Identified & Timestamped & Referenced<K>,
  F = ParentIdentified,
> extends Crud<T> {
  parentKey: K;
  parentCollection: string;

  constructor(
    collection: string,
    converter: FirestoreDataConverter<T>,
    validator: IValidator<T>,
    parentKey: K,
    parentCollection: string,
  ) {
    super(collection, converter, validator);
    this.parentKey = parentKey;
    this.parentCollection = parentCollection;
  }

  getSubcollectionRef(parentRef: string | DocumentReference<DocumentData>) {
    return parentRef instanceof DocumentReference
      ? collection(parentRef, this.collection).withConverter(this.converter)
      : collection(this.getParentRef(parentRef), this.collection).withConverter(
          this.converter,
        );
  }

  getParentRef(parentId: string) {
    return doc(firestoreInstance, this.parentCollection, parentId);
  }

  async processQuery<U extends Pagination>(
    constraints: QueryConstraint[],
    filter: U & ParentIdentified,
  ): Promise<PaginationQuery<T>> {
    try {
      const subcollectionRef = this.getSubcollectionRef(filter.parentId);
      return paginate(
        query(subcollectionRef, ...constraints).withConverter(this.converter),
        filter,
        subcollectionRef,
        (docsSnapshot: Array<QueryDocumentSnapshot<T>>) => {
          return fromQuery(docsSnapshot);
        },
      );
    } catch (error) {
      return {} as PaginationQuery<T>;
    }
  }

  async getById(queryId: SubcollectionIdentity): Promise<T> {
    const subcollectionRef = this.getSubcollectionRef(queryId.parentId);

    const docSnapshot = await validateDoc<T>(
      queryId.id,
      subcollectionRef,
      this.converter,
    );
    return docSnapshot.data();
  }

  async getAll<U extends Pagination>(
    filter: U & F,
  ): Promise<PaginationQuery<T>> {
    try {
      if (isParentIdentified(filter)) {
        const subcollectionRef = this.getSubcollectionRef(filter.parentId);
        return paginate(
          subcollectionRef,
          filter,
          subcollectionRef,
          (docsSnapshot: Array<QueryDocumentSnapshot<T>>) => {
            return fromQuery(docsSnapshot);
          },
        );
      }
      return {} as PaginationQuery<T>;
    } catch (error) {
      return {} as PaginationQuery<T>;
    }
  }

  async create(model: T): Promise<T> {
    await this.prepareCreate(model);
    const { [this.parentKey]: parentKey, ...toPersist } = model;

    const parentRef = this.getParentRef(parentKey);
    const subcollectionRef = this.getSubcollectionRef(parentRef);

    const docRef = await addDoc(subcollectionRef, toPersist as T);
    const docSnapshot = await getDoc(docRef);
    return fromDoc(docSnapshot);
  }

  async update(id: string, model: T): Promise<T> {
    await this.prepareUpdate(id, model);
    const { [this.parentKey]: parentKey, ...toPersist } = model;

    const parentRef = this.getParentRef(parentKey);
    const subcollectionRef = this.getSubcollectionRef(parentRef);
    const docRef = doc(subcollectionRef, id);
    await updateDoc(docRef, toPersist as UpdateData<T>);
    return fromDoc(await getDoc(docRef));
  }

  async delete(queryId: SubcollectionIdentity) {
    const subcollectionRef = this.getSubcollectionRef(queryId.parentId);

    const docSnapshot = await validateDoc<T>(
      queryId.id,
      subcollectionRef,
      this.converter,
    );
    deleteDoc(docSnapshot.ref);
  }
}
