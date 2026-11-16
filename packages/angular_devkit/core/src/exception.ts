/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export class BaseException extends Error {
  constructor(message = '') {
    super(message);
  }
}

export class UnknownException extends BaseException {
  constructor(message: string) {
    super(message);
  }
}

// Exceptions
export class FileDoesNotExistException extends BaseException {
  constructor(path: string) {
    super(`Path "${path}" does not exist.`);
  }
}
export class FileAlreadyExistException extends BaseException {
  constructor(path: string) {
    super(`Path "${path}" already exist.`);
  }
}
export class PathIsDirectoryException extends BaseException {
  constructor(path: string) {
    super(`Path "${path}" is a directory.`);
  }
}
export class PathIsFileException extends BaseException {
  constructor(path: string) {
    super(`Path "${path}" is a file.`);
  }
}
export class DependencyNotFoundException extends BaseException {
  constructor() {
    super('One of the dependencies is not part of the set.');
  }
}
export class CircularDependencyFoundException extends BaseException {
  constructor() {
    super('Circular dependencies found.');
  }
}
