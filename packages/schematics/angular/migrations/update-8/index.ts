/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Rule,
  chain,
} from '@angular-devkit/schematics';
import { updatePackageJson, updateTsLintConfig } from './codelyzer-5';
import { dropES2015Polyfills } from './drop-es6-polyfills';

export default function(): Rule {
  return () => {
    return chain([
      updateTsLintConfig(),
      updatePackageJson(),
      dropES2015Polyfills(),
    ]);
  };
}
