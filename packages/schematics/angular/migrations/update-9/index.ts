/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, chain } from '@angular-devkit/schematics';
import { UpdateWorkspaceConfig } from './update-workspace-config';

export default function(): Rule {
  return () => {
    return chain([
      UpdateWorkspaceConfig(),
    ]);
  };
}
