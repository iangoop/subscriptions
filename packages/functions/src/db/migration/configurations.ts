import { firestore } from '../../firestore';
import { omit } from 'lodash';
import { Firestore } from 'firebase-admin/firestore';

export enum ConfigurationKeys {
  subscriptionFreezeTimeInDays = 'subscriptionFreezeTimeInDays',
}

export type Configuration = {
  config: ConfigurationKeys;
  value: string;
};

export const exportConfigurations = async (
  data: Configuration[],
  db: Firestore = firestore,
) => {
  await Promise.all(
    data.map(async (item) => {
      await db
        .collection('configurations')
        .doc(item.config)
        .set(omit(item, 'config'));
    }),
  );
};

export const getConfigurationValue = async (
  config: ConfigurationKeys,
  db: Firestore = firestore,
): Promise<string | null> => {
  const doc = await db.collection('configurations').doc(config).get();
  if (doc.exists) {
    const configData = doc.data() as Configuration;
    return configData.value;
  }
  return null;
};
