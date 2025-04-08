import { TObject } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { ApiError, ErrorRecord, InternalErrorList } from './errors';
import { format } from 'util';

export interface IValidator<T> {
  validate(id: string, model: T): Promise<IValidation>;
  instantiable(model: T): Promise<IValidation>;
  core: ValidatorFactoryReturn<T>;
}

export interface IValidation {
  readonly errors: ErrorRecord[];
  isValid(): boolean;
  throwErrors(): Error;
}

export class ValidationError extends ApiError {
  constructor(errors?: ErrorRecord[] | ErrorRecord) {
    super(errors);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export const processErrors = (errors: ErrorRecord[]): IValidation => {
  return {
    errors: errors,
    isValid: () => {
      return !errors.length;
    },
    throwErrors: () => {
      return new ValidationError(errors);
    },
  };
};

export interface ValidatorFactoryReturn<T> {
  schema: TObject;
  verify: (data: T) => ErrorRecord[];
  value: (data: T) => T;
}

export const validatorFactory = <T>(
  schema: TObject,
): ValidatorFactoryReturn<T> => {
  const C = TypeCompiler.Compile(schema);

  const value = (data: T): T => {
    return Value.Cast(schema, data) as T;
  };

  const verify = (data: T): ErrorRecord[] => {
    C.Check(data);

    return [...C.Errors(data)].map(({ path, message }) => {
      return {
        code: 'in001',
        text: format(InternalErrorList.in001, message, path),
      };
    });
  };

  return { schema, verify, value };
};
