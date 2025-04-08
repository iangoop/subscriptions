export class ApiError extends Error {
  errors: ErrorRecord[];
  constructor(errors?: ErrorRecord[] | ErrorRecord) {
    super();
    this.errors = errors ? new Array<ErrorRecord>().concat(errors) : [];
  }
}
export class InvalidReferenceError extends ApiError {
  constructor(errors?: ErrorRecord[] | ErrorRecord) {
    super(errors);
    this.name = 'InvalidReferenceError';
    Object.setPrototypeOf(this, InvalidReferenceError.prototype);
  }
}

export class NotArchivableEntryError extends ApiError {
  constructor(errors?: ErrorRecord[] | ErrorRecord) {
    super(errors);
    this.name = 'NotArchivableEntryError';
    Object.setPrototypeOf(this, NotArchivableEntryError.prototype);
  }
}

export class UniqueConstraintViolationError extends ApiError {
  constructor(errors?: ErrorRecord[] | ErrorRecord) {
    super(errors);
    this.name = 'UniqueConstraintViolationError';
    Object.setPrototypeOf(this, UniqueConstraintViolationError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return !!(error as ApiError).errors;
}

export function refineError(errors: ErrorRecord[], error: unknown) {
  if (isApiError(error)) {
    errors.concat(error.errors);
  } else {
    errors.push(createError('unk001', error as string));
  }
}

export const InternalErrorList = {
  unk001: 'Internal error',
  in001: '%s for property %s',
  in002: 'No documents associated with the queried value',
  doc001:
    'You are trying to create a entity with an id already associated to a document',
  doc002: 'Id paramater can not be empty',
  doc003: 'Parent Id paramater can not be empty',
  doc004: 'Document not found',
  doc005: 'Entry does not have isActive property defined',
  cu001: 'Email %s can not be set for the customer',
  ca001: "Can't find customer with id %s",
} as const;

export type ErrorCode = keyof typeof InternalErrorList;
export type ErrorRecord = {
  code: ErrorCode;
  text: string;
};
export function createError(code: ErrorCode, text?: string): ErrorRecord {
  return {
    code: code,
    text: text ? text : InternalErrorList[code],
  };
}
