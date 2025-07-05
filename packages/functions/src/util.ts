// utils/validator.ts
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { Static, TSchema } from '@sinclair/typebox';

const ajv = new Ajv({ allErrors: true, coerceTypes: true });
addFormats(ajv);

type ErrorMessages<T extends TSchema> = Partial<
  Record<keyof Static<T>, string>
>;

export function validateWithMessages<T extends TSchema>(
  schema: T,
  data: unknown,
  messages: ErrorMessages<T> = {},
): { valid: true; data: Static<T> } | { valid: false; errors: string[] } {
  const validate = ajv.compile(schema);

  const isValid = validate(data);

  if (isValid) {
    return { valid: true, data: data as Static<T> };
  }

  const errors = (validate.errors || []).map((err: ErrorObject) => {
    const key =
      err.instancePath.replace(/^\//, '') ||
      (err.params &&
      typeof err.params === 'object' &&
      'missingProperty' in err.params
        ? (err.params as { missingProperty?: string }).missingProperty
        : undefined) ||
      'field';
    return (
      (messages as Record<string, string>)[key] || `Invalid value for "${key}".`
    );
  });

  return { valid: false, errors };
}
