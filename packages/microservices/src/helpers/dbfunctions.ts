import { firestoreInstance } from '@src/configurations/firebase';
import { format } from 'date-fns';
import {
  QuerySnapshot,
  DocumentSnapshot,
  doc,
  getDoc,
  FirestoreDataConverter,
  DocumentReference,
  DocumentData,
  QueryDocumentSnapshot,
  query,
  collection,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  UpdateData,
  deleteDoc,
  QueryConstraint,
} from 'firebase/firestore';
import { InvalidReferenceError } from './errors';
import { paginate, Pagination } from './pagination';
import { IValidator, ValidationError } from './validators';

export type Timestamped = {
  updated: string;
  created: string;
};

export type Identified = {
  id: string;
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
  snapshot: QuerySnapshot<T>,
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
  collection: string,
  converter?: FirestoreDataConverter<T>,
): Promise<QueryDocumentSnapshot<T>> => {
  if (!id) {
    throw new ValidationError('Id paramater can not be empty');
  }
  let docRef: DocumentReference<DocumentData | T> = doc(
    firestoreInstance,
    collection,
    id,
  );
  if (converter) {
    docRef = docRef.withConverter(converter);
  }
  const docSnapshot = await getDoc(docRef);
  if (!docSnapshot.exists()) {
    throw new InvalidReferenceError('Document not found');
  }
  return docSnapshot as QueryDocumentSnapshot<T>;
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

  async processQuery<U extends Pagination>(
    constraints: QueryConstraint[],
    filter: U,
  ) {
    try {
      const q = await paginate(
        query(
          collection(firestoreInstance, this.collection),
          ...constraints,
        ).withConverter(this.converter),
        filter,
      );

      const docsSnapshot = await getDocs<T>(q);
      return fromQuery(docsSnapshot);
    } catch (error) {
      return [];
    }
  }

  async getAll<U extends Pagination>(filter: U): Promise<T[]> {
    try {
      const q = await paginate(
        query(
          collection(firestoreInstance, this.collection),
          orderBy('updated', 'desc'),
        ).withConverter(this.converter),
        filter,
      );

      const docsSnapshot = await getDocs<T>(q);
      return fromQuery(docsSnapshot);
    } catch (error) {
      return [];
    }
  }

  async getById(id: string): Promise<T> {
    const docSnapshot = await validateDoc<T>(
      id,
      this.collection,
      this.converter,
    );
    return docSnapshot.data();
  }

  async create(model: T): Promise<T> {
    setUpdated(model);
    setCreated(model);
    model = this.validator.core.value(model);
    const validation = await this.validator.instantiable(model);
    if (validation.isValid()) {
      const docRef = await addDoc(this.getCollectionRef(), model);
      return fromDoc(await getDoc(docRef));
    }
    throw validation.throwErrors();
  }

  async update(id: string, model: T): Promise<T> {
    setUpdated(model);
    const validation = await this.validator.validate(id, model);
    if (validation.isValid()) {
      const docRef = this.getDocRefById(id);
      await updateDoc(docRef, model as UpdateData<T>);
      return fromDoc(await getDoc(docRef));
    }
    throw validation.throwErrors();
  }

  async delete(id: string) {
    const docSnapshot = await validateDoc(id, this.collection);
    deleteDoc(docSnapshot.ref);
  }
}
