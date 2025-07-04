import { Type } from '@sinclair/typebox';

export const ConfigurationCollection = 'configurations';

export const ConfigurationSchema = Type.Object({
  id: Type.String(),
  config: Type.String(),
  value: Type.String(),
});
