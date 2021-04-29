/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { TslintFixTask } from '@angular-devkit/schematics/tasks'; // eslint-disable-line import/no-extraneous-dependencies

export default function (): Rule {
  return (_: Tree, context: SchematicContext) => {
    context.addTask(
      new TslintFixTask(
        {
          rules: {
            'max-line-length': [true, 80],
          },
        },
        {
          includes: '*.ts',
          silent: false,
        },
      ),
    );
  };
}
