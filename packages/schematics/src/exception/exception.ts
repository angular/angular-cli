// Starting with TS 2.1, Error cannot be properly extended anymore, so we implement the same
// interface but in a different package.
export class BaseException extends Error {
  constructor(message = '') {
    super(message);
  }
}


// Exceptions
export class FileDoesNotExistException extends BaseException {
  constructor(path: string) { super(`Path "${path}" does not exist.`); }
}
export class FileAlreadyExistException extends BaseException {
  constructor(path: string) { super(`Path "${path}" already exist.`); }
}
export class ContentHasMutatedException extends BaseException {
  constructor(path: string) {
    super(`Content at path "${path}" has changed between the start and the end of an update.`);
  }
}
export class InvalidUpdateRecordException extends BaseException {
  constructor() { super(`Invalid record instance.`); }
}
