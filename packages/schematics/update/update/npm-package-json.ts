/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonSchemaForNpmPackageJsonFiles } from './package-json';

export interface NpmRepositoryPackageJson {
  name: string;
  requestedName: string;
  description: string;

  'dist-tags': {
    [name: string]: string;
  };
  versions: {
    [version: string]: JsonSchemaForNpmPackageJsonFiles;
  };
  time: {
    modified: string;
    created: string;

    [version: string]: string;
  };
}
