export class InvalidReferenceError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidReferenceError';
    Object.setPrototypeOf(this, InvalidReferenceError.prototype);
  }
}

export class UniqueConstraintViolationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'UniqueConstraintViolationError';
    Object.setPrototypeOf(this, UniqueConstraintViolationError.prototype);
  }
}
