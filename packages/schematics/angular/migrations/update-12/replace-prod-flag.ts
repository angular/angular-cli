/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';

export default function (): Rule {
  return (tree) => {
    const file = new JSONFile(tree, 'package.json');
    const scripts = file.get(['scripts']);
    if (!scripts || typeof scripts !== 'object') {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const updatedScripts = Object.entries(scripts!).map(([key, value]) => [
      key,
      typeof value === 'string'
        ? value.replace(/ --prod(?!\w)/g, ' --configuration production')
        : value,
    ]);

    file.modify(['scripts'], Object.fromEntries(updatedScripts));
  };
}
