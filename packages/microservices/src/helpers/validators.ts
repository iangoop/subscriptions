import { TObject } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { TypeCompiler } from '@sinclair/typebox/compiler';

export interface IValidator<T> {
  validate(id: string, model: T): Promise<IValidation>;
  instantiable(model: T): Promise<IValidation>;
  core: ValidatorFactoryReturn<T>;
}

export interface IValidation {
  readonly errors: string[];
  isValid(): boolean;
  throwErrors(): Error;
}

export class ValidationError extends Error {
  errors: string[];
  constructor(errors?: string[] | string) {
    super();
    this.errors = errors ? new Array<string>().concat(errors) : [];
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export const processErrors = (errors: string[]): IValidation => {
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
  verify: (data: T) => string[];
  value: (data: T) => T;
}

export const validatorFactory = <T>(
  schema: TObject,
): ValidatorFactoryReturn<T> => {
  const C = TypeCompiler.Compile(schema);

  const value = (data: T): T => {
    return Value.Cast(schema, data) as T;
  };

  const verify = (data: T): string[] => {
    //let _errors: string[] = [];
    C.Check(data);

    return [...C.Errors(data)].map(
      ({ path, message }) => message + ' for property ' + path,
    );
  };

  return { schema, verify, value };
};
