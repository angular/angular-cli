/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export class BaseException extends Error {
  constructor(message = '') {
    super(message);
  }
}


export class UnknownException extends BaseException {
  constructor(message: string) { super(message); }
}


// Exceptions
export class FileDoesNotExistException extends BaseException {
  constructor(path: string) { super(`Path "${path}" does not exist.`); }
}
export class FileAlreadyExistException extends BaseException {
  constructor(path: string) { super(`Path "${path}" already exist.`); }
}
export class PathIsDirectoryException extends BaseException {
  constructor(path: string) { super(`Path "${path}" is a directory.`); }
}
export class PathIsFileException extends BaseException {
  constructor(path: string) { super(`Path "${path}" is a file.`); }
}
export class ContentHasMutatedException extends BaseException {
  constructor(path: string) {
    super(`Content at path "${path}" has changed between the start and the end of an update.`);
  }
}
export class InvalidUpdateRecordException extends BaseException {
  constructor() { super(`Invalid record instance.`); }
}
export class MergeConflictException extends BaseException {
  constructor(path: string) {
    super(`A merge conflicted on path "${path}".`);
  }
}

export class UnimplementedException extends BaseException {
  constructor() { super('This function is unimplemented.'); }
}

export class UnsupportedPlatformException extends BaseException {
  constructor() { super('This platform is not supported by this code path.'); }
}
