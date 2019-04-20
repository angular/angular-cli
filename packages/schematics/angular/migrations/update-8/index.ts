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
import { updateES5Projects } from './differential-loading';
import { dropES2015Polyfills } from './drop-es6-polyfills';

export { updateLazyModulePaths } from './update-lazy-module-paths';

export default function(): Rule {
  return () => {
    return chain([
      updateTsLintConfig(),
      updatePackageJson(),
      dropES2015Polyfills(),
      updateES5Projects(),
    ]);
  };
}
