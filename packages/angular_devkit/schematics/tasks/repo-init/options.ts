/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const RepositoryInitializerName = 'repo-init';

export interface RepositoryInitializerTaskFactoryOptions {
  rootDirectory?: string;
}

export interface RepositoryInitializerTaskOptions {
  workingDirectory?: string;
  commit?: boolean;
  message?: string;
  authorName?: string;
  authorEmail?: string;
}
