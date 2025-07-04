import { firestoreInstance } from '@src/configurations/firebase';
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
import {
  createError,
  InvalidReferenceError,
  NotArchivableEntryError,
} from './errors';
import {
  paginate,
  Pagination,
  PaginationDb,
  PaginationQuery,
} from './pagination';
import { IValidator, ValidationError } from './validators';
import { getFormattedTime } from './util';

export type Timestamped = {
  updated: string;
  created: string;
};

export type Identified = {
  id: string;
};

export type IsActive = {
  isActive: boolean;
};

export type Referenced<T extends string> = {
  [P in T]: string;
};

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
  throw new InvalidReferenceError(createError('doc004'));
};

export const docExists = async (
  id: string | undefined,
  collectionName: string,
  parent?: DocumentReference,
): Promise<boolean> => {
  if (!id) {
    throw new ValidationError(createError('doc002'));
  }
  let docRef = parent
    ? doc(collection(parent, collectionName), id)
    : doc(firestoreInstance, collectionName, id);

  const docSnapshot = await getDoc(docRef);
  return docSnapshot.exists();
};

export const validateDoc = async <T = DocumentData>(
  id: string | undefined,
  collectionName: string | CollectionReference,
  converter?: FirestoreDataConverter<T>,
): Promise<QueryDocumentSnapshot<T>> => {
  if (!id) {
    throw new ValidationError(createError('doc002'));
  }
  let docRef = (
    collectionName instanceof CollectionReference
      ? doc(collectionName, id)
      : doc(firestoreInstance, collectionName, id)
  ) as DocumentReference<T>;
  if (converter) {
    docRef = docRef.withConverter(converter);
  }
  const docSnapshot = await getDoc(docRef);
  if (!docSnapshot.exists()) {
    throw new InvalidReferenceError(createError('doc004'));
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
    throw new ValidationError(createError('doc002'));
  }
  if (!parentId) {
    throw new ValidationError(createError('doc003'));
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
    throw new InvalidReferenceError(createError('doc004'));
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

  getCollectionReference() {
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
      const collectionRef = this.getCollectionReference();
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
      const collectionRef = this.getCollectionReference();
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
    const docRef = await addDoc(this.getCollectionReference(), model);
    return fromDoc<T>(await getDoc(docRef));
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
    return fromDoc<T>(await getDoc(docRef));
  }

  async delete(queryId: Identified): Promise<T> {
    const docSnapshot = await validateDoc(
      queryId.id,
      this.collection,
      this.converter,
    );
    const document = docSnapshot.data();
    if (this.isEntityArchivable(document)) {
      updateDoc(docSnapshot.ref, { isActive: false } as UpdateData<T>);
      document.isActive = false;
    } else {
      deleteDoc(docSnapshot.ref);
    }
    return document;
  }

  async unarchive(queryId: Identified) {
    const docSnapshot = await validateDoc(
      queryId.id,
      this.collection,
      this.converter,
    );
    if (this.isEntityArchivable(docSnapshot.data())) {
      updateDoc(docSnapshot.ref, { isActive: true } as UpdateData<T>);
    } else {
      throw new NotArchivableEntryError(createError('doc005'));
    }
  }

  isEntityArchivable(entity: T): entity is T & IsActive {
    return 'isActive' in entity;
  }
}

export class CrudSubcollection<
  K extends Exclude<string, 'id'>,
  T extends Identified & Timestamped & Referenced<K>,
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

  getSubcollectionReference(
    parentRef: string | DocumentReference<DocumentData>,
  ) {
    return parentRef instanceof DocumentReference
      ? collection(parentRef, this.collection).withConverter(this.converter)
      : collection(
          this.getParentReference(parentRef),
          this.collection,
        ).withConverter(this.converter);
  }

  getParentReference(parentId: string) {
    return doc(firestoreInstance, this.parentCollection, parentId);
  }

  async processQuery<U extends Pagination>(
    constraints: QueryConstraint[],
    filter: U & Referenced<K>,
  ): Promise<PaginationQuery<T>> {
    try {
      const subcollectionRef = this.getSubcollectionReference(
        filter[this.parentKey],
      );
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

  async getById(queryId: Identified & Referenced<K>): Promise<T> {
    const subcollectionRef = this.getSubcollectionReference(
      queryId[this.parentKey],
    );

    const docSnapshot = await validateDoc<T>(
      queryId.id,
      subcollectionRef,
      this.converter,
    );
    return docSnapshot.data();
  }

  async getAll<U extends Pagination>(
    filter: U & Referenced<K>,
  ): Promise<PaginationQuery<T>> {
    try {
      const subcollectionRef = this.getSubcollectionReference(
        filter[this.parentKey],
      );
      return paginate(
        subcollectionRef,
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

  async create(model: T): Promise<T> {
    await this.prepareCreate(model);
    const { [this.parentKey]: parentKey, ...toPersist } = model;

    const parentRef = this.getParentReference(parentKey);
    const subcollectionRef = this.getSubcollectionReference(parentRef);

    const docRef = await addDoc(subcollectionRef, toPersist);
    const docSnapshot = await getDoc(docRef.withConverter(this.converter));
    return fromDoc(docSnapshot);
  }

  async update(id: string, model: T): Promise<T> {
    await this.prepareUpdate(id, model);
    const { [this.parentKey]: parentKey, ...toPersist } = model;

    const parentRef = this.getParentReference(parentKey);
    const subcollectionRef = this.getSubcollectionReference(parentRef);
    const docRef = doc(subcollectionRef, id).withConverter(this.converter);
    await updateDoc(docRef, toPersist);
    return fromDoc(await getDoc(docRef));
  }

  async delete(queryId: Identified & Referenced<K>): Promise<T> {
    const subcollectionRef = this.getSubcollectionReference(
      queryId[this.parentKey],
    );

    const docSnapshot = await validateDoc(
      queryId.id,
      subcollectionRef,
      this.converter,
    );
    const document = docSnapshot.data();
    if (this.isEntityArchivable(document)) {
      updateDoc(docSnapshot.ref, { isActive: false });
      document.isActive = false;
    } else {
      deleteDoc(docSnapshot.ref);
    }
    return document;
  }

  async unarchive(queryId: Identified & Referenced<K>) {
    const subcollectionRef = this.getSubcollectionReference(
      queryId[this.parentKey],
    );

    const docSnapshot = await validateDoc(
      queryId.id,
      subcollectionRef,
      this.converter,
    );
    if (this.isEntityArchivable(docSnapshot.data())) {
      updateDoc(docSnapshot.ref, { isActive: true });
    } else {
      throw new NotArchivableEntryError(createError('doc005'));
    }
  }
}
