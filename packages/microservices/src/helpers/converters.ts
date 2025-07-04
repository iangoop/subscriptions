import { Identified } from '@src/helpers/dbfunctions';
import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

type ConverterHooks<
  AppModel extends Identified,
  DbModel extends DocumentData,
> = {
  /** Hook to post-process the DB model before saving to Firestore */
  mapToDb?: (partialDbModel: DbModel, fullAppModel: AppModel) => DbModel;
  /** Hook to post-process the Model after loading from Firestore */
  mapFromDb?: (
    partialAppModel: AppModel,
    dbModel: DbModel,
    snapshot: QueryDocumentSnapshot,
  ) => AppModel;
};

export function createConverter<
  AppModel extends Identified,
  DbModel extends DocumentData,
>(
  hooks: ConverterHooks<AppModel, DbModel> = {},
): FirestoreDataConverter<AppModel, DbModel> {
  return {
    toFirestore(model: AppModel): DbModel {
      const { id, ...rest } = model;
      let dbModel = rest as unknown as DbModel;
      if (hooks.mapToDb) {
        dbModel = hooks.mapToDb(dbModel, model);
      }
      return dbModel;
    },

    fromFirestore(
      snapshot: QueryDocumentSnapshot<DbModel>,
      options: SnapshotOptions,
    ): AppModel {
      const dbData = snapshot.data(options);
      let model = { id: snapshot.id, ...dbData } as unknown as AppModel;
      if (hooks.mapFromDb) {
        model = hooks.mapFromDb(model, dbData, snapshot);
      }
      return model;
    },
  };
}
