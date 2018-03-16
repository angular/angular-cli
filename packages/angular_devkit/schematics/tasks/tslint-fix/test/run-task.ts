/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Rule,
  SchematicContext,
  Tree,
} from '@angular-devkit/schematics';  // tslint:disable-line:no-implicit-dependencies
import {
  TslintFixTask,
} from '@angular-devkit/schematics/tasks';  // tslint:disable-line:no-implicit-dependencies

export default function(): Rule {
  return (_: Tree, context: SchematicContext) => {
    context.addTask(new TslintFixTask({
      rules: {
        'max-line-length': [true, 80],
      },
    }, {
      includes: '*.ts',
      silent: false,
    }));
  };
}
